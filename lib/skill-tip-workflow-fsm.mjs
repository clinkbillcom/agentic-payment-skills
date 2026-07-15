import { formatWorkflowMarker } from './workflow-marker.mjs';

const ACCOUNT_CREATED_POLL_COMMAND = 'clink-cli events poll --type account-created --max-wait 60 --format json';
const ACCOUNT_RELOADED_POLL_COMMAND = 'clink-cli events poll --type account-reloaded --max-wait 60 --format json';

export const SkillTipState = Object.freeze({
  TIP_LIST_READY: 'TIP_LIST_READY',
  TIP_LIST_EMPTY: 'TIP_LIST_EMPTY',
  TIP_INPUT_REQUIRED: 'TIP_INPUT_REQUIRED',
  TIP_NUMBER_REFRESH_REQUIRED: 'TIP_NUMBER_REFRESH_REQUIRED',
  TIP_NUMBER_CHANGED: 'TIP_NUMBER_CHANGED',
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
  ASK_FOR_SKILL_TIP_INPUT: 'ASK_FOR_SKILL_TIP_INPUT',
  REFRESH_SKILL_LIST: 'REFRESH_SKILL_LIST',
  ASK_FOR_REAUTHORIZATION: 'ASK_FOR_REAUTHORIZATION',
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

function markdownCell(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replace(/\r?\n/gu, ' ');
}

function normalizeSkillListRow(row = {}) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const numberValue = row.Number ?? row.number;
  const number = Number(numberValue);
  const publisher = normalizedString(row.publisher);
  const skillName = normalizedString(row.name ?? row.skillName ?? row.skill_name);
  const skillId = normalizedString(row.skillId ?? row.skill_id);
  if (!Number.isSafeInteger(number) || number <= 0 || !publisher || !skillName || !skillId) return null;
  return { number, publisher, skillName, skillId };
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return null;
  const normalized = rows.map(normalizeSkillListRow);
  if (normalized.some((row) => row === null)) return null;
  if (new Set(normalized.map((row) => row.number)).size !== normalized.length) return null;
  return normalized;
}

function skillListTable(rows) {
  const header = [
    '| 序号 | 发布者 | Skill 名称 | skill_id |',
    '| ---: | --- | --- | --- |',
  ];
  const body = rows.map((row) => (
    `| ${row.number} | ${markdownCell(row.publisher)} | ${markdownCell(row.skillName)} | ${markdownCell(row.skillId)} |`
  ));
  return [...header, ...body].join('\n');
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
      snapshot: { rows },
    };
  }
  return {
    state: SkillTipState.TIP_LIST_READY,
    action: SkillTipAction.RETURN_SKILL_TABLE,
    terminal: true,
    reason: 'skill_list_ready',
    rows,
    table: skillListTable(rows),
    snapshot: { rows },
  };
}

function positiveAmount(value) {
  const normalized = normalizedString(value);
  if (!normalized || !/^\d+(?:\.\d+)?$/u.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? normalized : null;
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

function sameSkillRow(left, right) {
  return left.number === right.number
    && left.publisher === right.publisher
    && left.skillName === right.skillName
    && left.skillId === right.skillId;
}

export function classifySkillTipPrerequisites(input = {}) {
  const tip = input.tip && typeof input.tip === 'object' ? input.tip : {};
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
    if (!publisher || !skillName) return inputRequired('skill_tip_input_missing', ['target']);
    return {
      state: SkillTipState.TIP_EXECUTION_READY,
      action: SkillTipAction.RUN_SKILL_TIP,
      terminal: false,
      reason: 'skill_tip_identity_ready',
      command: `clink-cli skills tip --publisher ${shellWord(publisher)} --name ${shellWord(skillName)} --amount ${shellWord(amount)} --format json`,
      resolvedTarget: { kind: 'identity', publisher, skillName },
    };
  }

  const number = Number(target.number);
  if (!Number.isSafeInteger(number) || number <= 0) return inputRequired('skill_tip_input_missing', ['target']);
  const listedRows = normalizeRows(input.listedRows);
  if (!listedRows) return inputRequired('skill_number_snapshot_missing', ['skillListSnapshot']);
  const listed = listedRows.find((row) => row.number === number);
  if (!listed) return inputRequired('skill_number_not_in_snapshot', ['skillListSnapshot']);
  if (!Array.isArray(input.refreshedRows)) {
    return {
      state: SkillTipState.TIP_NUMBER_REFRESH_REQUIRED,
      action: SkillTipAction.REFRESH_SKILL_LIST,
      terminal: false,
      reason: 'skill_number_refresh_required',
      number,
      command: 'clink-cli skills list --all --format json',
      listedTarget: listed,
    };
  }
  const refreshedRows = normalizeRows(input.refreshedRows);
  const refreshed = refreshedRows?.find((row) => row.number === number);
  if (!refreshed || !sameSkillRow(listed, refreshed)) {
    return {
      state: SkillTipState.TIP_NUMBER_CHANGED,
      action: SkillTipAction.ASK_FOR_REAUTHORIZATION,
      terminal: false,
      reason: refreshed ? 'skill_number_target_changed' : 'skill_number_target_missing',
      listedTarget: listed,
      refreshedTarget: refreshed ?? null,
    };
  }
  return {
    state: SkillTipState.TIP_EXECUTION_READY,
    action: SkillTipAction.RUN_SKILL_TIP,
    terminal: false,
    reason: 'skill_tip_number_ready',
    command: `clink-cli skills tip --number ${number} --amount ${shellWord(amount)} --format json`,
    resolvedTarget: refreshed,
  };
}

function paymentExpectedResource(data = {}) {
  const orderId = normalizedString(data.payment?.orderId ?? data.payment?.order_id ?? data.orderId ?? data.order_id);
  const merchantId = normalizedString(data.merchantId ?? data.merchant_id);
  return Object.fromEntries([
    ['orderId', orderId],
    ['merchantId', merchantId],
  ].filter(([, value]) => value !== null));
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
  if (exitCode === 7 || data.status === 'three_ds_required') {
    return {
      state: SkillTipState.TIP_3DS_REQUIRED,
      action: SkillTipAction.SEND_3DS_AND_WAIT_EVENT,
      terminal: false,
      reason: 'skill_tip_3ds_required',
      paymentStatus: 'PENDING_3DS',
      redirectUrl: data.redirectUrl,
      expectedResource: paymentExpectedResource(data),
    };
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
    return {
      state: SkillTipState.TIP_PAYMENT_FAILED,
      action: SkillTipAction.RETURN_TIP_FAILURE,
      terminal: true,
      reason: 'skill_tip_payment_failed',
      paymentStatus: 'FAILED',
      payment: data.payment,
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
    return {
      state: SkillTipState.TIP_PAYMENT_SUCCEEDED,
      action: SkillTipAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH,
      terminal: false,
      reason: 'agent_pay_sync_succeeded',
      paymentStatus: 'PAID',
      data,
      payment: data.payment,
      expectedResource: paymentExpectedResource(data),
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
  const matchedReloaded = observations.find((item) => item?.eventType === 'account-reloaded' && item?.matched === true);
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

  const pollSettled = (eventType) => observations.some((item) => (
    item?.eventType === eventType && (item?.timedOut === true || item?.error)
  ));
  if (!pollSettled('account-created') || !pollSettled('account-reloaded')) {
    return {
      state: SkillTipState.TIP_ACCOUNT_EVENT_WAITING,
      action: SkillTipAction.WAIT_OPTIONAL_ACCOUNT_EVENT,
      terminal: false,
      reason: 'optional_account_event_waiting',
      paymentStatus: 'PAID',
      accountEventStatus: 'NOT_STARTED',
    };
  }
  if (observations.some((item) => item?.error)) {
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
