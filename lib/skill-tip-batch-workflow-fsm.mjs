import { formatWorkflowMarker } from './workflow-marker.mjs';
import {
  SKILL_LIST_CONTEXT_TTL_MS,
  recentDisplayedSkillListSnapshot,
  sameSkillContextIdentity,
  skillContextIdentity,
  skillContextTimestampMs,
} from './skill-list-context.mjs';
import { classifySkillTipPrerequisites } from './skill-tip-workflow-fsm.mjs';

export const SkillTipBatchState = Object.freeze({
  BATCH_INPUT_REQUIRED: 'BATCH_INPUT_REQUIRED',
  BATCH_CONFIRMATION_REQUIRED: 'BATCH_CONFIRMATION_REQUIRED',
  BATCH_CONFIRMATION_ACCEPTED: 'BATCH_CONFIRMATION_ACCEPTED',
  BATCH_CONFIRMATION_REJECTED: 'BATCH_CONFIRMATION_REJECTED',
  BATCH_CONFIRMATION_ALREADY_HANDLED: 'BATCH_CONFIRMATION_ALREADY_HANDLED',
  BATCH_EXECUTION_READY: 'BATCH_EXECUTION_READY',
  BATCH_ITEM_CONTINUATION_REQUIRED: 'BATCH_ITEM_CONTINUATION_REQUIRED',
  BATCH_IN_PROGRESS: 'BATCH_IN_PROGRESS',
  BATCH_COMPLETED: 'BATCH_COMPLETED',
});

export const SkillTipBatchAction = Object.freeze({
  ASK_FOR_SKILL_TIP_BATCH_INPUT: 'ASK_FOR_SKILL_TIP_BATCH_INPUT',
  ASK_FOR_TIP_BATCH_CONFIRMATION: 'ASK_FOR_TIP_BATCH_CONFIRMATION',
  CLAIM_PENDING_TIP_BATCH: 'CLAIM_PENDING_TIP_BATCH',
  CANCEL_PENDING_TIP_BATCH: 'CANCEL_PENDING_TIP_BATCH',
  RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED: 'RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED',
  RUN_NEXT_SKILL_TIP: 'RUN_NEXT_SKILL_TIP',
  WAIT_FOR_SKILL_TIP_ITEM: 'WAIT_FOR_SKILL_TIP_ITEM',
  CONTINUE_SKILL_TIP_BATCH: 'CONTINUE_SKILL_TIP_BATCH',
  RETURN_SKILL_TIP_BATCH_RESULT: 'RETURN_SKILL_TIP_BATCH_RESULT',
});

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function canonicalPositiveAmount(value) {
  const normalized = normalizedString(value);
  if (!normalized || !/^\d+(?:\.\d+)?$/u.test(normalized)) return null;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const [rawInteger, rawDecimal = ''] = normalized.split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/u, '');
  const decimal = rawDecimal.replace(/0+$/u, '');
  return decimal ? `${integer}.${decimal}` : integer;
}

function addCanonicalAmounts(amounts) {
  const parts = amounts.map((amount) => {
    const [integer, decimal = ''] = amount.split('.');
    return { integer, decimal };
  });
  const scale = Math.max(...parts.map((part) => part.decimal.length));
  const total = parts.reduce((sum, part) => (
    sum + BigInt(`${part.integer}${part.decimal.padEnd(scale, '0')}`)
  ), 0n);
  const digits = total.toString().padStart(scale + 1, '0');
  if (scale === 0) return digits;
  const integer = digits.slice(0, -scale);
  const decimal = digits.slice(-scale).replace(/0+$/u, '');
  return decimal ? `${integer}.${decimal}` : integer;
}

function inputRequired(reason, missing) {
  return {
    state: SkillTipBatchState.BATCH_INPUT_REQUIRED,
    action: SkillTipBatchAction.ASK_FOR_SKILL_TIP_BATCH_INPUT,
    terminal: false,
    reason,
    missing,
  };
}

function targetFromEntry(entry = {}) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  if (entry.target && typeof entry.target === 'object' && !Array.isArray(entry.target)) {
    return entry.target;
  }
  if (entry.kind === 'number' || entry.number !== undefined) {
    return { kind: 'number', number: entry.number };
  }
  return {
    kind: entry.kind ?? 'identity',
    publisher: entry.publisher,
    skillName: entry.skillName ?? entry.skill_name ?? entry.name,
    ...(entry.skillId ?? entry.skill_id
      ? { skillId: entry.skillId ?? entry.skill_id }
      : {}),
  };
}

function rawBatchEntries(batch = {}) {
  const source = Array.isArray(batch.tips)
    ? batch.tips
    : (Array.isArray(batch.targets) ? batch.targets : null);
  if (!source || source.length === 0) return null;
  return source.map((entry) => ({
    target: targetFromEntry(entry),
    amount: entry && typeof entry === 'object' && !Array.isArray(entry)
      ? (entry.amount ?? batch.amount)
      : batch.amount,
    currency: entry && typeof entry === 'object' && !Array.isArray(entry)
      ? (entry.currency ?? batch.currency)
      : batch.currency,
  }));
}

function normalizeBatch(batch, context) {
  if (!batch || typeof batch !== 'object' || Array.isArray(batch)) {
    return inputRequired('skill_tip_batch_input_missing', ['batch']);
  }
  const currency = normalizedString(batch.currency)?.toUpperCase();
  if (currency && currency !== 'USD') {
    return inputRequired('skill_tip_batch_currency_unsupported', ['currency_USD']);
  }
  if (batch.explicitlyAuthorized !== true) {
    return inputRequired('skill_tip_batch_input_missing', ['authorization']);
  }
  const entries = rawBatchEntries(batch);
  if (!entries) return inputRequired('skill_tip_batch_input_missing', ['targets']);

  const needsSnapshot = entries.some((entry) => entry.target?.kind === 'number');
  const snapshot = needsSnapshot
    ? recentDisplayedSkillListSnapshot(context, { allowedScopes: ['tippable'] })
    : null;
  if (needsSnapshot && !snapshot) {
    return inputRequired('skill_tip_batch_number_snapshot_missing', ['recent_tippable_skill_list']);
  }

  const resolvedEntries = [];
  for (const [index, entry] of entries.entries()) {
    const amount = canonicalPositiveAmount(entry.amount);
    const itemCurrency = normalizedString(entry.currency ?? currency)?.toUpperCase();
    if (!amount || itemCurrency !== 'USD') {
      return inputRequired('skill_tip_batch_item_invalid', [`tips[${index}]`]);
    }
    if (entry.target?.kind === 'number') {
      const number = Number(entry.target.number);
      if (!Number.isSafeInteger(number) || number <= 0) {
        return inputRequired('skill_tip_batch_item_invalid', [`tips[${index}].target`]);
      }
      const row = snapshot.rows.find((candidate) => candidate.number === number);
      if (!row) {
        return inputRequired('skill_tip_batch_number_unresolved', [`tips[${index}].target`]);
      }
      resolvedEntries.push({
        originalIndex: index + 1,
        number,
        publisher: row.publisher,
        skillName: row.skillName,
        skillId: row.skillId,
        amount,
        currency: 'USD',
      });
      continue;
    }
    if (entry.target?.kind !== 'identity') {
      return inputRequired('skill_tip_batch_item_invalid', [`tips[${index}].target`]);
    }
    const publisher = normalizedString(entry.target.publisher);
    const skillName = normalizedString(entry.target.skillName ?? entry.target.skill_name);
    if (!publisher || !skillName) {
      return inputRequired('skill_tip_batch_item_invalid', [`tips[${index}].target`]);
    }
    resolvedEntries.push({
      originalIndex: index + 1,
      publisher,
      skillName,
      amount,
      currency: 'USD',
    });
  }

  const seen = new Map();
  const items = [];
  const ignoredDuplicates = [];
  for (const entry of resolvedEntries) {
    const key = `${entry.publisher.toLowerCase()}\u0000${entry.skillName.toLowerCase()}`;
    const kept = seen.get(key);
    if (kept) {
      ignoredDuplicates.push({
        duplicateIndex: entry.originalIndex,
        keptIndex: kept.originalIndex,
        publisher: entry.publisher,
        skillName: entry.skillName,
        ignoredAmount: entry.amount,
      });
      continue;
    }
    seen.set(key, entry);
    items.push(entry);
  }

  if (items.length === 0) return inputRequired('skill_tip_batch_input_missing', ['targets']);
  return {
    items,
    ignoredDuplicates,
    authorizedTotal: addCanonicalAmounts(items.map((item) => item.amount)),
    snapshot,
  };
}

function pendingIsCurrent(pending, context) {
  const now = skillContextTimestampMs(context.now ?? context.nowMs ?? context.now_ms);
  const createdAt = skillContextTimestampMs(
    pending.createdAtMs ?? pending.created_at_ms ?? pending.createdAt ?? pending.created_at,
  );
  const expiresAt = skillContextTimestampMs(
    pending.expiresAtMs ?? pending.expires_at_ms ?? pending.expiresAt ?? pending.expires_at,
  );
  return now !== null
    && createdAt !== null
    && expiresAt !== null
    && createdAt <= now
    && now <= expiresAt
    && sameSkillContextIdentity(context, pending);
}

function validatePendingItems(pending) {
  if (!Array.isArray(pending.items) || pending.items.length === 0) return null;
  const items = [];
  for (const item of pending.items) {
    const itemId = normalizedString(item?.itemId ?? item?.item_id);
    const publisher = normalizedString(item?.publisher);
    const skillName = normalizedString(item?.skillName ?? item?.skill_name);
    const skillId = normalizedString(item?.skillId ?? item?.skill_id);
    const amount = canonicalPositiveAmount(item?.amount);
    const currency = normalizedString(item?.currency)?.toUpperCase();
    if (!itemId || !publisher || !skillName || !amount || currency !== 'USD') return null;
    items.push({
      itemId,
      publisher,
      skillName,
      ...(skillId ? { skillId } : {}),
      amount,
      currency,
    });
  }
  return items;
}

function executionPlanFromPending(pending) {
  const items = validatePendingItems(pending);
  if (!items) return null;
  const authorizedTotal = canonicalPositiveAmount(pending.authorizedTotal ?? pending.authorized_total);
  if (!authorizedTotal || addCanonicalAmounts(items.map((item) => item.amount)) !== authorizedTotal) return null;

  const executionItems = items.map((item) => {
    const single = classifySkillTipPrerequisites({
      tip: {
        target: {
          kind: 'identity',
          publisher: item.publisher,
          skillName: item.skillName,
        },
        amount: item.amount,
        currency: 'USD',
        explicitlyAuthorized: true,
      },
    });
    if (!single.command || !single.expectedTip) return null;
    return {
      ...item,
      command: single.command,
      expectedTip: {
        ...single.expectedTip,
        ...(item.skillId ? { skillId: item.skillId } : {}),
      },
    };
  });
  if (executionItems.some((item) => item === null)) return null;
  return { items, executionItems, authorizedTotal };
}

function classifyPendingConfirmation(input, context) {
  const confirmation = normalizedString(input.confirmation)?.toUpperCase();
  if (!confirmation) return null;
  const pending = context.pendingTipBatchConfirmation ?? context.pending_tip_batch_confirmation;
  if (!pending || typeof pending !== 'object' || Array.isArray(pending)) {
    return inputRequired('skill_tip_batch_confirmation_missing', ['pendingTipBatchConfirmation']);
  }
  const batchId = normalizedString(pending.batchId ?? pending.batch_id);
  if (!batchId) {
    return inputRequired('invalid_pending_skill_tip_batch_confirmation', ['pendingTipBatchConfirmation']);
  }
  if (!pendingIsCurrent(pending, context)) {
    return inputRequired(
      'skill_tip_batch_confirmation_expired_or_context_mismatch',
      ['pendingTipBatchConfirmation'],
    );
  }

  if (confirmation === 'CANCELLED') {
    if (pending.status !== 'AWAITING_CONFIRMATION') {
      return {
        state: SkillTipBatchState.BATCH_CONFIRMATION_ALREADY_HANDLED,
        action: SkillTipBatchAction.RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED,
        terminal: true,
        reason: 'skill_tip_batch_confirmation_already_handled',
      };
    }
    return {
      state: SkillTipBatchState.BATCH_CONFIRMATION_REJECTED,
      action: SkillTipBatchAction.CANCEL_PENDING_TIP_BATCH,
      terminal: true,
      reason: 'skill_tip_batch_confirmation_rejected',
      pendingTransition: { batchId, from: 'AWAITING_CONFIRMATION', to: 'CANCELLED' },
    };
  }

  if (confirmation === 'CONFIRMED') {
    if (pending.status !== 'AWAITING_CONFIRMATION') {
      return {
        state: SkillTipBatchState.BATCH_CONFIRMATION_ALREADY_HANDLED,
        action: SkillTipBatchAction.RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED,
        terminal: true,
        reason: 'skill_tip_batch_confirmation_already_handled',
      };
    }
    return {
      state: SkillTipBatchState.BATCH_CONFIRMATION_ACCEPTED,
      action: SkillTipBatchAction.CLAIM_PENDING_TIP_BATCH,
      terminal: false,
      reason: 'skill_tip_batch_confirmation_claim_required',
      pendingTransition: { batchId, from: 'AWAITING_CONFIRMATION', to: 'EXECUTING' },
    };
  }

  if (confirmation !== 'CLAIMED' || pending.status !== 'EXECUTING') {
    return {
      state: SkillTipBatchState.BATCH_CONFIRMATION_ALREADY_HANDLED,
      action: SkillTipBatchAction.RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED,
      terminal: true,
      reason: 'skill_tip_batch_confirmation_not_claimed',
    };
  }

  const plan = executionPlanFromPending(pending);
  if (!plan) {
    return inputRequired('invalid_pending_skill_tip_batch_confirmation', ['pendingTipBatchConfirmation']);
  }
  const progress = {
    batchId,
    status: 'EXECUTING',
    currency: 'USD',
    authorizedTotal: plan.authorizedTotal,
    currentIndex: 0,
    executionItems: plan.executionItems,
    results: [],
    ignoredDuplicates: Array.isArray(pending.ignoredDuplicates) ? pending.ignoredDuplicates : [],
    ...skillContextIdentity(pending),
  };
  return {
    state: SkillTipBatchState.BATCH_EXECUTION_READY,
    action: SkillTipBatchAction.RUN_NEXT_SKILL_TIP,
    terminal: false,
    reason: 'claimed_skill_tip_batch_ready',
    command: plan.executionItems[0].command,
    currentItem: plan.executionItems[0],
    progress,
  };
}

export function classifySkillTipBatchPrerequisites(input = {}) {
  const context = input.context && typeof input.context === 'object' ? input.context : {};
  const pendingResult = classifyPendingConfirmation(input, context);
  if (pendingResult) return pendingResult;

  const batchId = normalizedString(input.batchId ?? input.batch_id ?? input.pendingId ?? input.pending_id);
  if (!batchId) return inputRequired('skill_tip_batch_id_missing', ['batchId']);
  const now = skillContextTimestampMs(context.now ?? context.nowMs ?? context.now_ms);
  const contextIdentity = skillContextIdentity(context);
  if (now === null || Object.values(contextIdentity).some((value) => value === null)) {
    return inputRequired('skill_tip_batch_context_missing', ['context']);
  }
  const normalized = normalizeBatch(input.batch, context);
  if (normalized.state) return normalized;

  const snapshotExpiry = normalized.snapshot
    ? normalized.snapshot.displayedAtMs + SKILL_LIST_CONTEXT_TTL_MS
    : Number.POSITIVE_INFINITY;
  const expiresAt = Math.min(now + SKILL_LIST_CONTEXT_TTL_MS, snapshotExpiry);
  const items = normalized.items.map((item, index) => ({
    itemId: `${batchId}:${index + 1}`,
    publisher: item.publisher,
    skillName: item.skillName,
    ...(item.skillId ? { skillId: item.skillId } : {}),
    amount: item.amount,
    currency: 'USD',
  }));
  const pendingTipBatchConfirmation = {
    batchId,
    status: 'AWAITING_CONFIRMATION',
    items,
    ignoredDuplicates: normalized.ignoredDuplicates,
    authorizedTotal: normalized.authorizedTotal,
    currency: 'USD',
    ...(normalized.snapshot ? { snapshotId: normalized.snapshot.snapshotId } : {}),
    ...contextIdentity,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  };
  return {
    state: SkillTipBatchState.BATCH_CONFIRMATION_REQUIRED,
    action: SkillTipBatchAction.ASK_FOR_TIP_BATCH_CONFIRMATION,
    terminal: false,
    reason: 'skill_tip_batch_confirmation_required',
    pendingTipBatchConfirmation,
    confirmation: {
      items,
      authorizedTotal: normalized.authorizedTotal,
      currency: 'USD',
      paymentCalls: items.length,
      ignoredDuplicates: normalized.ignoredDuplicates,
      continueAfterFailureOrUnknown: true,
    },
  };
}

export function formatSkillTipBatchFsmMarker(workflow) {
  return formatWorkflowMarker('SKILL_TIP_BATCH_FSM', workflow);
}
