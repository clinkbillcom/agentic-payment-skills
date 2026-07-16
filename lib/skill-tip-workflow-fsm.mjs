import { formatWorkflowMarker } from './workflow-marker.mjs';
import {
  SKILL_LIST_CONTEXT_TTL_MS,
  normalizeSkillListRows as normalizeRows,
  recentDisplayedSkillListSnapshot as recentDisplayedSnapshot,
  renderSkillListTable as skillListTable,
  resolvedSkillIdentity as resolvedIdentity,
  sameSkillContextIdentity as sameContextIdentity,
  skillContextIdentity as contextIdentity,
  skillContextTimestampMs as timestampMs,
} from './skill-list-context.mjs';

const ACCOUNT_CREATED_POLL_COMMAND = 'clink-cli events poll --type account-created --max-wait 60 --format json';
const ACCOUNT_RELOADED_POLL_COMMAND = 'clink-cli events poll --type account-reloaded --max-wait 60 --format json';

export const SkillTipState = Object.freeze({
  TIP_LIST_READY: 'TIP_LIST_READY',
  TIP_LIST_EMPTY: 'TIP_LIST_EMPTY',
  TIP_LIST_REQUIRED: 'TIP_LIST_REQUIRED',
  TIP_INPUT_REQUIRED: 'TIP_INPUT_REQUIRED',
  TIP_CONFIRMATION_REQUIRED: 'TIP_CONFIRMATION_REQUIRED',
  TIP_CONFIRMATION_ACCEPTED: 'TIP_CONFIRMATION_ACCEPTED',
  TIP_CONFIRMATION_REJECTED: 'TIP_CONFIRMATION_REJECTED',
  TIP_CONFIRMATION_EXPIRED: 'TIP_CONFIRMATION_EXPIRED',
  TIP_CONFIRMATION_ALREADY_HANDLED: 'TIP_CONFIRMATION_ALREADY_HANDLED',
  TIP_EXECUTION_READY: 'TIP_EXECUTION_READY',
  TIP_AUTHORIZATION_PENDING: 'TIP_AUTHORIZATION_PENDING',
  TIP_PAYMENT_SUCCEEDED: 'TIP_PAYMENT_SUCCEEDED',
  TIP_PAYMENT_FAILED: 'TIP_PAYMENT_FAILED',
  TIP_3DS_REQUIRED: 'TIP_3DS_REQUIRED',
  TIP_PAYMENT_UNKNOWN: 'TIP_PAYMENT_UNKNOWN',
  TIP_ACCOUNT_CREATED: 'TIP_ACCOUNT_CREATED',
  TIP_ACCOUNT_RELOADED: 'TIP_ACCOUNT_RELOADED',
  TIP_ACCOUNT_EVENT_WAITING: 'TIP_ACCOUNT_EVENT_WAITING',
  TIP_ACCOUNT_EVENT_NOT_OBSERVED: 'TIP_ACCOUNT_EVENT_NOT_OBSERVED',
  TIP_ACCOUNT_EVENT_POLL_ERROR: 'TIP_ACCOUNT_EVENT_POLL_ERROR',
  TIP_ERROR: 'TIP_ERROR',
});

export const SkillTipAction = Object.freeze({
  RETURN_SKILL_TABLE: 'RETURN_SKILL_TABLE',
  RETURN_EMPTY_SKILL_LIST: 'RETURN_EMPTY_SKILL_LIST',
  RUN_SKILL_TIP_LIST_WORKFLOW: 'RUN_SKILL_TIP_LIST_WORKFLOW',
  ASK_FOR_SKILL_TIP_INPUT: 'ASK_FOR_SKILL_TIP_INPUT',
  ASK_FOR_TIP_CONFIRMATION: 'ASK_FOR_TIP_CONFIRMATION',
  CLAIM_PENDING_TIP: 'CLAIM_PENDING_TIP',
  CANCEL_PENDING_TIP: 'CANCEL_PENDING_TIP',
  RETURN_PENDING_TIP_ALREADY_HANDLED: 'RETURN_PENDING_TIP_ALREADY_HANDLED',
  RUN_SKILL_TIP: 'RUN_SKILL_TIP',
  SEND_PASSKEY_AND_WAIT: 'SEND_PASSKEY_AND_WAIT',
  START_OPTIONAL_ACCOUNT_EVENT_WATCH: 'START_OPTIONAL_ACCOUNT_EVENT_WATCH',
  RETURN_TIP_FAILURE: 'RETURN_TIP_FAILURE',
  SEND_3DS_AND_WAIT_EVENT: 'SEND_3DS_AND_WAIT_EVENT',
  VERIFY_BEFORE_RETRY: 'VERIFY_BEFORE_RETRY',
  RETURN_TIP_SUCCESS: 'RETURN_TIP_SUCCESS',
  WAIT_OPTIONAL_ACCOUNT_EVENT: 'WAIT_OPTIONAL_ACCOUNT_EVENT',
  RETURN_TIP_SUCCESS_WITHOUT_ACCOUNT_EVENT: 'RETURN_TIP_SUCCESS_WITHOUT_ACCOUNT_EVENT',
  RETURN_TIP_SUCCESS_WITH_WARNING: 'RETURN_TIP_SUCCESS_WITH_WARNING',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function parseMaybeJson(value, envelope = 'first') {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const parsedLines = trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((line) => line !== null);
    if (parsedLines.length === 0) return value;
    return envelope === 'last' ? parsedLines.at(-1) : parsedLines[0];
  }
}

function observationEnvelope(observation = {}, envelope = 'first') {
  const source = observation.stdout ?? observation.result ?? observation;
  const parsed = parseMaybeJson(source, envelope);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function envelopeData(observation = {}, envelope = 'first') {
  const parsed = observationEnvelope(observation, envelope);
  if (parsed.data && typeof parsed.data === 'object') return parsed.data;
  if (parsed.result && typeof parsed.result === 'object') return parsed.result;
  return parsed;
}

export function classifySkillListObservation(observation = {}) {
  const exitCode = Number(observation.exitCode ?? observation.exit_code ?? 0);
  if (exitCode !== 0) {
    return {
      state: SkillTipState.TIP_ERROR,
      action: SkillTipAction.SURFACE_ERROR,
      terminal: true,
      reason: 'skill_list_cli_error',
      exitCode,
    };
  }

  const envelope = observationEnvelope(observation);
  if (envelope.ok === false) {
    return {
      state: SkillTipState.TIP_ERROR,
      action: SkillTipAction.SURFACE_ERROR,
      terminal: true,
      reason: 'skill_list_cli_error',
      error: envelope.error,
    };
  }
  const payload = envelope.data ?? envelope;
  if (!Array.isArray(payload)) {
    return {
      state: SkillTipState.TIP_ERROR,
      action: SkillTipAction.SURFACE_ERROR,
      terminal: true,
      reason: 'invalid_skill_list_payload',
    };
  }
  const rows = normalizeRows(payload);
  if (rows === null) {
    return {
      state: SkillTipState.TIP_ERROR,
      action: SkillTipAction.SURFACE_ERROR,
      terminal: true,
      reason: 'invalid_skill_list_row',
    };
  }
  if (rows.length === 0) {
    return {
      state: SkillTipState.TIP_LIST_EMPTY,
      action: SkillTipAction.RETURN_EMPTY_SKILL_LIST,
      terminal: true,
      reason: 'skill_list_empty',
      rows,
      snapshot: { scope: 'tippable', rows },
    };
  }
  return {
    state: SkillTipState.TIP_LIST_READY,
    action: SkillTipAction.RETURN_SKILL_TABLE,
    terminal: true,
    reason: 'skill_list_ready',
    rows,
    table: skillListTable(rows),
    snapshot: { scope: 'tippable', rows },
  };
}

function positiveAmount(value) {
  const normalized = normalizedString(value);
  if (!normalized || !/^\d+(?:\.\d+)?$/u.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? normalized : null;
}

function canonicalPositiveAmount(value) {
  const normalized = positiveAmount(value);
  if (normalized === null) return null;
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const integer = integerPart.replace(/^0+(?=\d)/u, '');
  const decimal = decimalPart.replace(/0+$/u, '');
  return decimal ? `${integer}.${decimal}` : integer;
}

function shellWord(value) {
  const stringValue = String(value);
  if (/^[A-Za-z0-9._+-]+$/u.test(stringValue)) return stringValue;
  return `'${stringValue.replaceAll("'", "'\\''")}'`;
}

function inputRequired(reason, missing) {
  return {
    state: SkillTipState.TIP_INPUT_REQUIRED,
    action: SkillTipAction.ASK_FOR_SKILL_TIP_INPUT,
    terminal: false,
    reason,
    missing,
  };
}

function validSkillVersion(value) {
  return value === null || /^[A-Za-z0-9._+-]{1,128}$/u.test(value);
}

function identityCommand(target, amount) {
  const versionNo = normalizedString(target.versionNo ?? target.version_no);
  const versionFlag = versionNo ? ` --version ${shellWord(versionNo)}` : '';
  return `clink-cli skills tip --publisher ${shellWord(target.publisher)}`
    + ` --name ${shellWord(target.skillName)}${versionFlag}`
    + ` --amount ${shellWord(amount)} --format json`;
}

function expectedTipBinding(target, amount) {
  return {
    publisher: target.publisher,
    skillName: target.skillName,
    ...(target.skillId ? { skillId: target.skillId } : {}),
    ...(target.versionNo ? { versionNo: target.versionNo } : {}),
    amount,
    currency: 'USD',
  };
}

function listRequired(tipDraft, number, reason) {
  const confirmationTipDraft = {
    ...tipDraft,
    confirmationRequired: true,
  };
  return {
    state: SkillTipState.TIP_LIST_REQUIRED,
    action: SkillTipAction.RUN_SKILL_TIP_LIST_WORKFLOW,
    terminal: false,
    reason,
    number,
    tipDraft: confirmationTipDraft,
    confirmationRequired: true,
    command: 'clink-cli skills list --all --tippable --format json',
  };
}

function pendingIsCurrent(pending, context) {
  const now = timestampMs(context.now ?? context.nowMs ?? context.now_ms);
  const createdAt = timestampMs(
    pending.createdAtMs ?? pending.created_at_ms ?? pending.createdAt ?? pending.created_at,
  );
  const expiresAt = timestampMs(
    pending.expiresAtMs ?? pending.expires_at_ms ?? pending.expiresAt ?? pending.expires_at,
  );
  return now !== null
    && createdAt !== null
    && expiresAt !== null
    && createdAt <= now
    && now <= expiresAt
    && sameContextIdentity(context, pending);
}

function classifyPendingConfirmation(input, context) {
  const confirmation = normalizedString(input.confirmation)?.toUpperCase();
  if (!confirmation) return null;
  const pending = context.pendingTipConfirmation ?? context.pending_tip_confirmation;
  if (!pending || typeof pending !== 'object' || Array.isArray(pending)) {
    return inputRequired('skill_tip_confirmation_missing', ['pendingTipConfirmation']);
  }
  const pendingId = normalizedString(pending.pendingId ?? pending.pending_id);
  if (!pendingId) {
    return inputRequired('invalid_pending_skill_tip_confirmation', ['pendingTipConfirmation']);
  }
  if (!pendingIsCurrent(pending, context)) {
    return {
      state: SkillTipState.TIP_CONFIRMATION_EXPIRED,
      action: SkillTipAction.ASK_FOR_SKILL_TIP_INPUT,
      terminal: false,
      reason: 'skill_tip_confirmation_expired_or_context_mismatch',
    };
  }

  if (confirmation === 'CANCELLED') {
    if (pending.status !== 'AWAITING_CONFIRMATION') {
      return {
        state: SkillTipState.TIP_CONFIRMATION_ALREADY_HANDLED,
        action: SkillTipAction.RETURN_PENDING_TIP_ALREADY_HANDLED,
        terminal: true,
        reason: 'skill_tip_confirmation_already_handled',
      };
    }
    return {
      state: SkillTipState.TIP_CONFIRMATION_REJECTED,
      action: SkillTipAction.CANCEL_PENDING_TIP,
      terminal: true,
      reason: 'skill_tip_confirmation_rejected',
      pendingTransition: {
        pendingId,
        from: 'AWAITING_CONFIRMATION',
        to: 'CANCELLED',
      },
    };
  }

  if (confirmation === 'CONFIRMED') {
    if (pending.status !== 'AWAITING_CONFIRMATION') {
      return {
        state: SkillTipState.TIP_CONFIRMATION_ALREADY_HANDLED,
        action: SkillTipAction.RETURN_PENDING_TIP_ALREADY_HANDLED,
        terminal: true,
        reason: 'skill_tip_confirmation_already_handled',
      };
    }
    return {
      state: SkillTipState.TIP_CONFIRMATION_ACCEPTED,
      action: SkillTipAction.CLAIM_PENDING_TIP,
      terminal: false,
      reason: 'skill_tip_confirmation_claim_required',
      pendingTransition: {
        pendingId,
        from: 'AWAITING_CONFIRMATION',
        to: 'EXECUTING',
      },
    };
  }

  if (confirmation !== 'CLAIMED' || pending.status !== 'EXECUTING') {
    return {
      state: SkillTipState.TIP_CONFIRMATION_ALREADY_HANDLED,
      action: SkillTipAction.RETURN_PENDING_TIP_ALREADY_HANDLED,
      terminal: true,
      reason: 'skill_tip_confirmation_not_claimed',
    };
  }

  const target = pending.resolvedTarget;
  const amount = positiveAmount(pending.amount ?? pending.request?.amount);
  const currency = normalizedString(pending.currency ?? pending.request?.currency)?.toUpperCase();
  const publisher = normalizedString(target?.publisher);
  const skillName = normalizedString(target?.skillName ?? target?.skill_name);
  const skillId = normalizedString(target?.skillId ?? target?.skill_id);
  const versionNo = normalizedString(target?.versionNo ?? target?.version_no);
  const number = Number(pending.number);
  if (
    !publisher
    || !skillName
    || !skillId
    || !Number.isSafeInteger(number)
    || number <= 0
    || !amount
    || currency !== 'USD'
    || !validSkillVersion(versionNo)
  ) {
    return inputRequired('invalid_pending_skill_tip_confirmation', ['pendingTipConfirmation']);
  }
  const resolvedTarget = {
    publisher,
    skillName,
    skillId,
    ...(versionNo ? { versionNo } : {}),
  };
  return {
    state: SkillTipState.TIP_EXECUTION_READY,
    action: SkillTipAction.RUN_SKILL_TIP,
    terminal: false,
    reason: 'claimed_skill_tip_confirmation_ready',
    command: identityCommand(resolvedTarget, amount),
    resolvedTarget,
    expectedTip: expectedTipBinding(resolvedTarget, amount),
    pendingId,
  };
}

export function classifySkillTipPrerequisites(input = {}) {
  const context = input.context && typeof input.context === 'object' ? input.context : {};
  const pendingResult = classifyPendingConfirmation(input, context);
  if (pendingResult) return pendingResult;

  const tip = input.tip && typeof input.tip === 'object' ? input.tip : {};
  const confirmationRequired = input.confirmationRequired === true
    || tip.confirmationRequired === true;
  const amount = positiveAmount(tip.amount);
  const currency = normalizedString(tip.currency)?.toUpperCase();
  const target = tip.target && typeof tip.target === 'object' ? tip.target : null;

  if (currency && currency !== 'USD') return inputRequired('skill_tip_currency_unsupported', ['currency_USD']);
  const missing = [];
  if (!target || !['identity', 'number'].includes(target.kind)) missing.push('target');
  if (!amount) missing.push('amount');
  if (!currency) missing.push('currency');
  if (tip.explicitlyAuthorized !== true) missing.push('authorization');
  if (missing.length > 0) return inputRequired('skill_tip_input_missing', missing);

  if (target.kind === 'identity') {
    const publisher = normalizedString(target.publisher);
    const skillName = normalizedString(target.skillName);
    const versionNo = normalizedString(target.versionNo ?? target.version_no);
    if (!publisher || !skillName) return inputRequired('skill_tip_input_missing', ['target']);
    if (!validSkillVersion(versionNo)) return inputRequired('skill_tip_version_invalid', ['version']);
    const resolvedTarget = {
      kind: 'identity',
      publisher,
      skillName,
      ...(versionNo ? { versionNo } : {}),
    };
    return {
      state: SkillTipState.TIP_EXECUTION_READY,
      action: SkillTipAction.RUN_SKILL_TIP,
      terminal: false,
      reason: 'skill_tip_identity_ready',
      command: identityCommand(resolvedTarget, amount),
      resolvedTarget,
      expectedTip: expectedTipBinding(resolvedTarget, amount),
    };
  }

  const number = Number(target.number);
  if (!Number.isSafeInteger(number) || number <= 0) return inputRequired('skill_tip_input_missing', ['target']);
  const snapshot = recentDisplayedSnapshot(context, { allowedScopes: ['tippable'] });
  if (!snapshot) return listRequired(tip, number, 'recent_skill_list_snapshot_missing');
  const row = snapshot.rows.find((item) => item.number === number);
  if (!row) {
    if (confirmationRequired) {
      return inputRequired('skill_number_not_in_fresh_list', ['available_skill_number']);
    }
    return listRequired(tip, number, 'skill_number_not_in_recent_snapshot');
  }
  const resolvedTarget = resolvedIdentity(row);

  if (confirmationRequired) {
    const pendingId = normalizedString(input.pendingId ?? input.pending_id);
    if (!pendingId) return inputRequired('skill_tip_pending_id_missing', ['pendingId']);
    const now = timestampMs(context.now ?? context.nowMs ?? context.now_ms);
    const expiresAt = snapshot.displayedAtMs + SKILL_LIST_CONTEXT_TTL_MS;
    const identity = contextIdentity(context);
    const pendingTipConfirmation = {
      pendingId,
      status: 'AWAITING_CONFIRMATION',
      number,
      resolvedTarget,
      amount,
      currency,
      snapshotId: snapshot.snapshotId,
      ...identity,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    };
    const versionSuffix = resolvedTarget.versionNo ? `@${resolvedTarget.versionNo}` : '';
    return {
      state: SkillTipState.TIP_CONFIRMATION_REQUIRED,
      action: SkillTipAction.ASK_FOR_TIP_CONFIRMATION,
      terminal: false,
      reason: 'fresh_skill_list_requires_confirmation',
      pendingTipConfirmation,
      confirmationPrompt: `确认打赏第 ${number} 号 ${resolvedTarget.publisher}/${resolvedTarget.skillName}${versionSuffix} ${amount} USD 吗？`,
    };
  }

  return {
    state: SkillTipState.TIP_EXECUTION_READY,
    action: SkillTipAction.RUN_SKILL_TIP,
    terminal: false,
    reason: 'skill_tip_number_context_resolved',
    command: identityCommand(resolvedTarget, amount),
    resolvedTarget,
    expectedTip: expectedTipBinding(resolvedTarget, amount),
    snapshotId: snapshot.snapshotId,
    number,
  };
}

function paymentExpectedResource(data = {}, observation = {}) {
  const supplied = observation.expectedResource ?? observation.expected_resource ?? {};
  const orderId = normalizedString(
    data.payment?.orderId
      ?? data.payment?.order_id
      ?? data.orderId
      ?? data.order_id
      ?? supplied.orderId
      ?? supplied.order_id,
  );
  const customerId = normalizedString(
    data.payment?.customerId
      ?? data.payment?.customer_id
      ?? data.customerId
      ?? data.customer_id
      ?? supplied.customerId
      ?? supplied.customer_id,
  );
  const merchantId = normalizedString(
    data.merchantId
      ?? data.merchant_id
      ?? data.payment?.merchantId
      ?? data.payment?.merchant_id
      ?? supplied.merchantId
      ?? supplied.merchant_id,
  );
  const skillId = normalizedString(
    data.skillId
      ?? data.skill_id
      ?? supplied.skillId
      ?? supplied.skill_id,
  );
  return Object.fromEntries([
    ['orderId', orderId],
    ['customerId', customerId],
    ['merchantId', merchantId],
    ['skillId', skillId],
  ].filter(([, value]) => value !== null));
}

function tipAuthorizationBindingMatches(data = {}, expectedTip = {}) {
  const expectedPublisher = normalizedString(expectedTip.publisher);
  const expectedSkillName = normalizedString(expectedTip.skillName ?? expectedTip.skill_name);
  const expectedSkillId = normalizedString(expectedTip.skillId ?? expectedTip.skill_id);
  const expectedVersionNo = normalizedString(expectedTip.versionNo ?? expectedTip.version_no);
  const expectedAmount = canonicalPositiveAmount(expectedTip.amount);
  const expectedCurrency = normalizedString(expectedTip.currency)?.toUpperCase();
  const actualPublisher = normalizedString(data.publisher);
  const actualSkillName = normalizedString(data.skillName ?? data.skill_name);
  const actualSkillId = normalizedString(data.skillId ?? data.skill_id);
  const actualVersionNo = normalizedString(data.versionNo ?? data.version_no);
  const actualAmount = canonicalPositiveAmount(data.amount);
  const actualCurrency = normalizedString(data.currency)?.toUpperCase();
  return (expectedPublisher === null
      || actualPublisher?.toLowerCase() === expectedPublisher.toLowerCase())
    && (expectedSkillName === null
      || actualSkillName?.toLowerCase() === expectedSkillName.toLowerCase())
    && (expectedSkillId === null || actualSkillId === expectedSkillId)
    && (expectedVersionNo === null || actualVersionNo === expectedVersionNo)
    && (expectedAmount === null || actualAmount === expectedAmount)
    && (expectedCurrency === null || actualCurrency === expectedCurrency);
}

function validExpectedTipBinding(expectedTip) {
  if (!expectedTip || typeof expectedTip !== 'object' || Array.isArray(expectedTip)) return false;
  const publisher = normalizedString(expectedTip.publisher);
  const skillName = normalizedString(expectedTip.skillName ?? expectedTip.skill_name);
  const versionNo = normalizedString(expectedTip.versionNo ?? expectedTip.version_no);
  const amount = positiveAmount(expectedTip.amount);
  const currency = normalizedString(expectedTip.currency)?.toUpperCase();
  return publisher !== null
    && skillName !== null
    && validSkillVersion(versionNo)
    && amount !== null
    && currency === 'USD';
}

function paymentFailureResult(data) {
  return {
    state: SkillTipState.TIP_PAYMENT_FAILED,
    action: SkillTipAction.RETURN_TIP_FAILURE,
    terminal: true,
    reason: 'skill_tip_payment_failed',
    paymentStatus: 'FAILED',
    payment: data.payment,
  };
}

export function classifySkillTipObservation(observation = {}) {
  const exitCode = Number(observation.exitCode ?? observation.exit_code ?? 0);
  const data = envelopeData(observation, 'first');

  if (exitCode === 6) {
    return {
      state: SkillTipState.TIP_PAYMENT_UNKNOWN,
      action: SkillTipAction.VERIFY_BEFORE_RETRY,
      terminal: false,
      reason: 'skill_tip_payment_state_unknown',
      paymentStatus: 'UNKNOWN',
      exitCode,
    };
  }
  if (exitCode === 7) {
    return {
      state: SkillTipState.TIP_3DS_REQUIRED,
      action: SkillTipAction.SEND_3DS_AND_WAIT_EVENT,
      terminal: false,
      reason: 'skill_tip_3ds_required',
      paymentStatus: 'PENDING_3DS',
      redirectUrl: data.redirectUrl,
      expectedResource: paymentExpectedResource(data, observation),
    };
  }
  if (exitCode === 5 && data.status === 'payment_failed') {
    return paymentFailureResult(data);
  }
  if (exitCode !== 0) {
    return {
      state: SkillTipState.TIP_ERROR,
      action: SkillTipAction.SURFACE_ERROR,
      terminal: true,
      reason: 'skill_tip_cli_error',
      paymentStatus: 'NOT_PAID',
      exitCode,
    };
  }
  if (data.status === 'three_ds_required') {
    return {
      state: SkillTipState.TIP_3DS_REQUIRED,
      action: SkillTipAction.SEND_3DS_AND_WAIT_EVENT,
      terminal: false,
      reason: 'skill_tip_3ds_required',
      paymentStatus: 'PENDING_3DS',
      redirectUrl: data.redirectUrl,
      expectedResource: paymentExpectedResource(data, observation),
    };
  }
  if (data.status === 'authorization_pending') {
    return {
      state: SkillTipState.TIP_AUTHORIZATION_PENDING,
      action: SkillTipAction.SEND_PASSKEY_AND_WAIT,
      terminal: false,
      reason: 'skill_tip_authorization_pending',
      paymentStatus: 'NOT_PAID',
      instructionId: data.instructionId,
      passkeyUrl: data.passkeyUrl,
      resumeCommand: data.resumeCommand,
    };
  }
  if (data.status === 'payment_failed') {
    return paymentFailureResult(data);
  }
  if (data.status === 'payment_unknown') {
    return {
      state: SkillTipState.TIP_PAYMENT_UNKNOWN,
      action: SkillTipAction.VERIFY_BEFORE_RETRY,
      terminal: false,
      reason: 'skill_tip_payment_state_unknown',
      paymentStatus: 'UNKNOWN',
    };
  }
  if (data.status === 'paid') {
    if (Number(data.payment?.status) !== 1) {
      return {
        state: SkillTipState.TIP_ERROR,
        action: SkillTipAction.SURFACE_ERROR,
        terminal: true,
        reason: 'paid_without_agent_pay_success',
        paymentStatus: 'UNKNOWN',
      };
    }
    const expectedTip = observation.expectedTip ?? observation.expected_tip;
    if (!validExpectedTipBinding(expectedTip)) {
      return {
        state: SkillTipState.TIP_PAYMENT_UNKNOWN,
        action: SkillTipAction.VERIFY_BEFORE_RETRY,
        terminal: false,
        reason: 'skill_tip_authorization_binding_missing',
        paymentStatus: 'UNKNOWN',
      };
    }
    if (!tipAuthorizationBindingMatches(data, expectedTip)) {
      return {
        state: SkillTipState.TIP_PAYMENT_UNKNOWN,
        action: SkillTipAction.VERIFY_BEFORE_RETRY,
        terminal: false,
        reason: 'skill_tip_authorization_binding_mismatch',
        paymentStatus: 'UNKNOWN',
      };
    }
    return {
      state: SkillTipState.TIP_PAYMENT_SUCCEEDED,
      action: SkillTipAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH,
      terminal: false,
      reason: 'agent_pay_sync_succeeded',
      paymentStatus: 'PAID',
      paymentTerminal: true,
      accountEventStatus: 'PENDING',
      data,
      payment: data.payment,
      expectedResource: paymentExpectedResource(data, observation),
      pollCommands: [ACCOUNT_CREATED_POLL_COMMAND, ACCOUNT_RELOADED_POLL_COMMAND],
    };
  }
  return {
    state: SkillTipState.TIP_ERROR,
    action: SkillTipAction.SURFACE_ERROR,
    terminal: true,
    reason: 'unrecognized_skill_tip_status',
    paymentStatus: 'UNKNOWN',
  };
}

export function classifySkillTipAccountEventObservation(input = {}) {
  const paymentStatus = input.paymentStatus ?? 'UNKNOWN';
  if (paymentStatus !== 'PAID') {
    return {
      state: SkillTipState.TIP_ERROR,
      action: SkillTipAction.SURFACE_ERROR,
      terminal: true,
      reason: 'account_event_without_paid_tip',
      paymentStatus,
      accountEventStatus: 'NOT_STARTED',
    };
  }
  const observations = Array.isArray(input.pollObservations) ? input.pollObservations : [];
  const matchedCreated = observations.find((item) => item?.eventType === 'account-created' && item?.matched === true);
  const matchedReloaded = observations.find((item) => item?.eventType === 'account-reloaded' && item?.matched === true);
  if (matchedCreated && matchedReloaded) {
    return {
      state: SkillTipState.TIP_ACCOUNT_EVENT_POLL_ERROR,
      action: SkillTipAction.RETURN_TIP_SUCCESS_WITH_WARNING,
      terminal: true,
      reason: 'mutually_exclusive_account_events_conflict',
      paymentStatus: 'PAID',
      accountEventStatus: 'POLL_ERROR',
      events: [matchedCreated.event, matchedReloaded.event].filter(Boolean),
    };
  }
  if (matchedCreated) {
    return {
      state: SkillTipState.TIP_ACCOUNT_CREATED,
      action: SkillTipAction.RETURN_TIP_SUCCESS,
      terminal: true,
      reason: 'account_created_correlated',
      paymentStatus: 'PAID',
      accountEventStatus: 'CONFIRMED_CREATED',
      event: matchedCreated.event,
    };
  }
  if (matchedReloaded) {
    return {
      state: SkillTipState.TIP_ACCOUNT_RELOADED,
      action: SkillTipAction.RETURN_TIP_SUCCESS,
      terminal: true,
      reason: 'account_reloaded_correlated',
      paymentStatus: 'PAID',
      accountEventStatus: 'CONFIRMED_RELOADED',
      event: matchedReloaded.event,
    };
  }

  const pollError = (item) => item?.error
    || item?.state === 'EVENT_INVALID'
    || item?.action === 'SURFACE_EVENT_ERROR';
  const pollSettled = (eventType) => observations.some((item) => (
    item?.eventType === eventType
      && (item?.timedOut === true || item?.state === 'EVENT_TIMEOUT' || pollError(item))
  ));
  if (!pollSettled('account-created') || !pollSettled('account-reloaded')) {
    return {
      state: SkillTipState.TIP_ACCOUNT_EVENT_WAITING,
      action: SkillTipAction.WAIT_OPTIONAL_ACCOUNT_EVENT,
      terminal: false,
      reason: 'optional_account_event_waiting',
      paymentStatus: 'PAID',
      accountEventStatus: 'PENDING',
    };
  }
  if (observations.some(pollError)) {
    return {
      state: SkillTipState.TIP_ACCOUNT_EVENT_POLL_ERROR,
      action: SkillTipAction.RETURN_TIP_SUCCESS_WITH_WARNING,
      terminal: true,
      reason: 'optional_account_event_poll_error',
      paymentStatus: 'PAID',
      accountEventStatus: 'POLL_ERROR',
    };
  }
  return {
    state: SkillTipState.TIP_ACCOUNT_EVENT_NOT_OBSERVED,
    action: SkillTipAction.RETURN_TIP_SUCCESS_WITHOUT_ACCOUNT_EVENT,
    terminal: true,
    reason: 'optional_account_event_not_observed',
    paymentStatus: 'PAID',
    accountEventStatus: 'NOT_OBSERVED',
  };
}

export function formatSkillTipFsmMarker(workflow) {
  return formatWorkflowMarker('SKILL_TIP_FSM', workflow);
}
