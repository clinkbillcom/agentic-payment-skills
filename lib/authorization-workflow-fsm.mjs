import { formatWorkflowMarker } from './workflow-marker.mjs';
import { pollCommandForWaitSpec } from './event-workflow-fsm.mjs';

export const AuthorizationWorkflowState = Object.freeze({
  PAYMENT_INSTRUMENT_REFRESH_REQUIRED: 'PAYMENT_INSTRUMENT_REFRESH_REQUIRED',
  AUTHORIZATION_BYPASSED: 'AUTHORIZATION_BYPASSED',
  AUTHORIZATION_LIST_REQUIRED: 'AUTHORIZATION_LIST_REQUIRED',
  AUTHORIZATION_MATCHED: 'AUTHORIZATION_MATCHED',
  AUTHORIZATION_DRAFT_REQUIRED: 'AUTHORIZATION_DRAFT_REQUIRED',
  AUTHORIZATION_ACTIVATION_WAIT_REQUIRED: 'AUTHORIZATION_ACTIVATION_WAIT_REQUIRED',
  AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED: 'AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED',
  AUTHORIZATION_ACTIVATION_PENDING: 'AUTHORIZATION_ACTIVATION_PENDING',
  AUTHORIZATION_READY: 'AUTHORIZATION_READY',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  SCHEDULED_SCOPE_INPUT_MISSING: 'SCHEDULED_SCOPE_INPUT_MISSING',
  SCHEDULED_SCOPE_RESOLVED: 'SCHEDULED_SCOPE_RESOLVED',
  SCHEDULED_AUTHORIZATION_REUSABLE: 'SCHEDULED_AUTHORIZATION_REUSABLE',
  SCHEDULED_AUTHORIZATION_DRAFT_REQUIRED: 'SCHEDULED_AUTHORIZATION_DRAFT_REQUIRED',
  UNATTENDED_AUTHORIZATION_GAP: 'UNATTENDED_AUTHORIZATION_GAP',
});

export const AuthorizationWorkflowAction = Object.freeze({
  REFRESH_PAYMENT_INSTRUMENT_LIST: 'REFRESH_PAYMENT_INSTRUMENT_LIST',
  RUN_PAY_WITHOUT_AUTHORIZATION: 'RUN_PAY_WITHOUT_AUTHORIZATION',
  LIST_AUTHORIZATIONS: 'LIST_AUTHORIZATIONS',
  RUN_PAY_WITH_AUTHORIZATION: 'RUN_PAY_WITH_AUTHORIZATION',
  START_AUTHORIZATION_DRAFT_AND_WAIT: 'START_AUTHORIZATION_DRAFT_AND_WAIT',
  SEND_PASSKEY_URL_AND_AWAIT_BUILT_IN_WATCH: 'SEND_PASSKEY_URL_AND_AWAIT_BUILT_IN_WATCH',
  VERIFY_AUTHORIZATION_ACTIVATION: 'VERIFY_AUTHORIZATION_ACTIVATION',
  VERIFY_AUTHORIZATION_AFTER_WATCH_GAP: 'VERIFY_AUTHORIZATION_AFTER_WATCH_GAP',
  WAIT_AUTHORIZATION_ACTIVATION: 'WAIT_AUTHORIZATION_ACTIVATION',
  RESUME_AUTHORIZED_PAYMENT: 'RESUME_AUTHORIZED_PAYMENT',
  SURFACE_AUTHORIZATION_ERROR: 'SURFACE_AUTHORIZATION_ERROR',
  ASK_FOR_SCHEDULE_SCOPE: 'ASK_FOR_SCHEDULE_SCOPE',
  CREATE_SCHEDULED_AUTHORIZATION_DRAFT: 'CREATE_SCHEDULED_AUTHORIZATION_DRAFT',
  PIN_SCHEDULED_AUTHORIZATION: 'PIN_SCHEDULED_AUTHORIZATION',
  SURFACE_UNATTENDED_AUTHORIZATION_GAP: 'SURFACE_UNATTENDED_AUTHORIZATION_GAP',
});

// The backend accepts only these three recurring cycles; there is no DAILY frequency. A daily task
// therefore has to fold its per-day cap into a WEEKLY cycle budget.
export const RecurringFrequency = Object.freeze({
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
});

export const ScheduledAuthorizationMode = Object.freeze({
  RECURRING: 'RECURRING',
  NON_RECURRING: 'NON_RECURRING',
});

// Task cadence -> the recurring cycle that can carry it, and how many runs land in one cycle.
const CADENCE_TO_CYCLE = new Map([
  ['DAILY', { frequency: RecurringFrequency.WEEKLY, runsPerCycle: 7 }],
  ['WEEKLY', { frequency: RecurringFrequency.WEEKLY, runsPerCycle: 1 }],
  ['MONTHLY', { frequency: RecurringFrequency.MONTHLY, runsPerCycle: 1 }],
  ['YEARLY', { frequency: RecurringFrequency.YEARLY, runsPerCycle: 1 }],
]);

const CADENCE_RUN_INTERVAL_MS = new Map([
  ['DAILY', 24 * 60 * 60 * 1000],
  ['WEEKLY', 7 * 24 * 60 * 60 * 1000],
  ['MONTHLY', 30 * 24 * 60 * 60 * 1000],
  ['YEARLY', 365 * 24 * 60 * 60 * 1000],
]);

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstJsonLine = trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => {
        try {
          JSON.parse(line);
          return true;
        } catch {
          return false;
        }
      });
    if (firstJsonLine) return JSON.parse(firstJsonLine);
    return value;
  }
}

function parseJsonEnvelopes(value) {
  if (typeof value !== 'string') return [value];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return [JSON.parse(trimmed)];
  } catch {
    return trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
  }
}

function unwrapCliEnvelope(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  if (parsed.data && typeof parsed.data === 'object') return parsed.data;
  return parsed;
}

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function booleanValue(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function paymentInstrumentList(input = {}) {
  const data = unwrapCliEnvelope(input.stdout ?? input.data ?? input.result ?? input);
  const candidates = [
    data.paymentMethodsVoList,
    data.payment_methods_vo_list,
    data.paymentMethods,
    data.payment_methods,
    data.cards,
    input.paymentMethodsVoList,
    input.payment_methods_vo_list,
    input.paymentMethods,
    input.payment_methods,
    input.cards,
  ];
  return candidates.find((candidate) => Array.isArray(candidate)) || [];
}

function paymentInstrumentIdOf(card = {}) {
  return normalizedString(
    card.paymentInstrumentId
      ?? card.payment_instrument_id
      ?? card.paymentMethodId
      ?? card.payment_method_id
      ?? card.id,
  );
}

function selectedPaymentInstrumentId(input = {}) {
  return normalizedString(
    input.paymentInstrumentId
      ?? input.payment_instrument_id
      ?? input.selectedPaymentInstrumentId
      ?? input.selected_payment_instrument_id,
  );
}

function isDefaultCard(card = {}) {
  return [
    card.isDefault,
    card.is_default,
    card.default,
    card.defaultPaymentMethod,
    card.default_payment_method,
    card.defaultFlag,
  ].some((value) => booleanValue(value) === true);
}

function choosePaymentInstrument(input = {}) {
  const cards = paymentInstrumentList(input);
  if (cards.length === 0) return null;

  const selectedId = selectedPaymentInstrumentId(input);
  if (selectedId) {
    const selected = cards.find((card) => paymentInstrumentIdOf(card) === selectedId);
    if (selected) return selected;
    return null;
  }

  return cards.find(isDefaultCard) || cards[0];
}

function cardBrandText(card = {}) {
  return [
    card.brand,
    card.cardBrand,
    card.card_brand,
    card.network,
    card.cardNetwork,
    card.card_network,
    card.scheme,
    card.cardScheme,
    card.card_scheme,
    card.paymentMethodSubType,
    card.payment_method_sub_type,
  ].map((value) => normalizedString(value)?.toLowerCase()).filter(Boolean).join(' ');
}

function isVisaCard(card = {}) {
  return /\bvisa\b/u.test(cardBrandText(card));
}

function isVicEnabled(card = {}) {
  return [
    card.visaRegistrationSucceeded,
    card.visa_registration_succeeded,
    card.vicReady,
    card.vic_ready,
    card.vicEnabled,
    card.vic_enabled,
    card.registrationSucceeded,
    card.registration_succeeded,
  ].some((value) => booleanValue(value) === true);
}

function selectedAuthorization(input = {}) {
  if (input.selected && typeof input.selected === 'object') return input.selected;
  if (input.authorization && typeof input.authorization === 'object') return input.authorization;
  if (input.matchedAuthorization && typeof input.matchedAuthorization === 'object') return input.matchedAuthorization;
  if (input.matched_authorization && typeof input.matched_authorization === 'object') return input.matched_authorization;
  if (input.instructionId || input.instruction_id || input.purchaseInstructionId || input.mandateId || input.mandate_id) {
    return input;
  }
  return null;
}

function authorizationIds(input = {}) {
  return {
    instructionId: normalizedString(input.instructionId ?? input.instruction_id ?? input.purchaseInstructionId),
    mandateId: normalizedString(input.mandateId ?? input.mandate_id),
  };
}

function instructionIdOf(input = {}) {
  return normalizedString(
    input.instructionId
      ?? input.instruction_id
      ?? input.purchaseInstructionId
      ?? input.purchase_instruction_id
      ?? input.id,
  );
}

function instructionIdFromPasskeyUrl(url) {
  const stringUrl = normalizedString(url);
  if (!stringUrl) return null;
  try {
    const parsed = new URL(stringUrl);
    return normalizedString(
      parsed.searchParams.get('instructionId')
        ?? parsed.searchParams.get('instruction_id')
        ?? parsed.searchParams.get('purchaseInstructionId')
        ?? parsed.searchParams.get('purchase_instruction_id'),
    );
  } catch {
    return null;
  }
}

function passkeyUrlOf(input = {}) {
  return normalizedString(
    input.passkeyUrl
      ?? input.passkey_url
      ?? input.signUrl
      ?? input.sign_url
      ?? input.signingUrl
      ?? input.signing_url
      ?? input.activationUrl
      ?? input.activation_url
      ?? input.authorizationUrl
      ?? input.authorization_url
      ?? input.url
      ?? input.links?.passkeyUrl
      ?? input.links?.passkey_url
      ?? input.links?.signUrl
      ?? input.links?.sign_url,
  );
}

function statusOf(input = {}) {
  return normalizedString(input.status ?? input.state ?? input.instructionStatus ?? input.instruction_status)?.toUpperCase() || '';
}

const AUTHORIZATION_ACTIVATION_PENDING_STATUSES = new Set(['CREATED', 'PENDING', 'INPROGRESS']);
const AUTHORIZATION_TERMINAL_NON_ACTIVE_STATUSES = new Set([
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'DECLINED',
]);

function shellQuoteIfNeeded(value) {
  const raw = String(value);
  if (/^[A-Za-z0-9_./:@%+=-]+$/u.test(raw)) return raw;
  return `'${raw.replaceAll("'", "'\\''")}'`;
}

function instructionWaitSpec(instructionId) {
  const expectedResource = {
    instructionId,
    purchaseInstructionId: instructionId,
  };
  const base = {
    eventType: 'purchase_instruction.activated',
    expectedResource,
    verifyCommand: `clink instruction get --purchase-instruction-id ${shellQuoteIfNeeded(instructionId)} --format json`,
  };
  return {
    ...base,
    pollCommand: pollCommandForWaitSpec(base),
  };
}

// `instruction create` / `sign-url` keep their built-in watch: the CLI prints the draft envelope,
// then blocks polling and prints a second envelope carrying the correlated activation. That second
// envelope is `{watched, url, timedOut, events, ackedEventIds}` — the shape watchEvents returns.
function asWatchEnvelope(value) {
  const data = unwrapCliEnvelope(value);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (data.watched === undefined && !Array.isArray(data.events)) return null;
  return data;
}

function watchEnvelopeOf(observation = {}) {
  const raw = observation.watchStdout
    ?? observation.watch_stdout
    ?? observation.watchResult
    ?? observation.watch_result
    ?? observation.watch;
  if (raw !== undefined && raw !== null && raw !== '') {
    for (const envelope of parseJsonEnvelopes(raw)) {
      const watchEnvelope = asWatchEnvelope(envelope);
      if (watchEnvelope) return watchEnvelope;
    }
  }

  // A completed CLI invocation returns both envelopes in stdout as NDJSON. The first is the draft
  // consumed above; any later watch-shaped envelope is the result of the built-in listener.
  const stdout = observation.stdout ?? observation.data ?? observation.result ?? observation;
  for (const envelope of parseJsonEnvelopes(stdout).slice(1)) {
    const watchEnvelope = asWatchEnvelope(envelope);
    if (watchEnvelope) return watchEnvelope;
  }
  return null;
}

function authorizationWatchEnded(observation = {}) {
  const exitCode = observation.exitCode ?? observation.exit_code;
  if (exitCode !== undefined && exitCode !== null && exitCode !== '') return true;
  return booleanValue(observation.running) === false;
}

function authorizationVerificationFailure(observation = {}) {
  const exitCodeValue = observation.exitCode ?? observation.exit_code;
  const hasExitCode = exitCodeValue !== undefined && exitCodeValue !== null && exitCodeValue !== '';
  const exitCode = hasExitCode ? Number(exitCodeValue) : null;

  const candidates = [
    observation.stderr,
    observation.stdout,
    observation.result,
    observation.data,
  ];
  for (const raw of candidates) {
    const parsed = parseMaybeJson(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    if (parsed.ok === false || (parsed.error !== undefined && parsed.error !== null)) {
      return {
        ...(hasExitCode ? { exitCode } : {}),
        error: parsed.error ?? parsed,
      };
    }
  }

  if (observation.error !== undefined && observation.error !== null) {
    return {
      ...(hasExitCode ? { exitCode } : {}),
      error: parseMaybeJson(observation.error),
    };
  }

  if (hasExitCode && (!Number.isFinite(exitCode) || exitCode !== 0)) {
    return { exitCode };
  }
  return null;
}

function activationEventFor(watchEnvelope, instructionId) {
  const events = Array.isArray(watchEnvelope?.events) ? watchEnvelope.events : [];
  return events.find((event) => {
    if (!event || typeof event !== 'object') return false;
    if (normalizedString(event.eventType ?? event.event_type) !== 'purchase_instruction.activated') return false;
    // The CLI already filtered by expectedResource, but re-checking the id here keeps a mismatched
    // envelope from resuming a payment against a different instruction.
    const candidates = [
      event.resourceId,
      event.resource_id,
      event.data?.instructionId,
      event.data?.instruction_id,
      event.data?.purchaseInstructionId,
      event.data?.purchase_instruction_id,
    ].map(normalizedString).filter(Boolean);
    return candidates.length === 0 || candidates.includes(instructionId);
  }) ?? null;
}

function wasAuthorizationListChecked(input = {}) {
  return [
    input.authorizationListChecked,
    input.authorization_list_checked,
    input.authorizationsListed,
    input.authorizations_listed,
    input.instructionsListed,
    input.instructions_listed,
  ].some((value) => booleanValue(value) === true);
}

function baseResult(card = {}) {
  const paymentInstrumentId = paymentInstrumentIdOf(card);
  return paymentInstrumentId ? { paymentInstrumentId } : {};
}

function numberValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// Instruction/mandate expiries are the backend's UTC `yyyy-MM-dd HH:mm:ss` strings. Bare-space form
// is not portably parseable, so normalize it to ISO before comparing horizons.
function utcDateTimeMs(value) {
  const raw = normalizedString(value);
  if (!raw) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(raw.trim())
    ? `${raw.trim().replace(' ', 'T')}Z`
    : raw.trim();
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
}

// A scheduled run happens with nobody watching, so the Passkey signature that turns a draft into an
// ACTIVE instruction cannot be collected. Any branch that would ask for one has to stop instead.
function isUnattended(input = {}) {
  return [
    input.unattended,
    input.isUnattended,
    input.is_unattended,
    input.scheduled,
    input.scheduledRun,
    input.scheduled_run,
  ].some((value) => booleanValue(value) === true);
}

// Returns null when the response carries no mandate list at all, so the caller can tell "field
// absent" (tolerated) apart from "list present but the pinned mandate is gone" (a gap).
function mandateListOf(instruction = {}) {
  for (const key of ['mandates', 'mandateList', 'mandateVoList']) {
    if (Array.isArray(instruction[key])) return instruction[key];
  }
  return null;
}

function scheduledScopeInput(input = {}) {
  return {
    cadence: normalizedString(input.cadence ?? input.scheduleCadence ?? input.schedule_cadence)?.toUpperCase() || null,
    perRunCap: numberValue(input.perRunCap ?? input.per_run_cap ?? input.perRunLimit ?? input.per_run_limit),
    currency: normalizedString(input.currency ?? input.currencyCode ?? input.currency_code)?.toUpperCase() || null,
    totalBudget: numberValue(input.totalBudget ?? input.total_budget ?? input.totalLimitAmount ?? input.total_limit_amount),
    runsPerCycle: numberValue(input.runsPerCycle ?? input.runs_per_cycle),
    expectedRunCount: numberValue(input.expectedRunCount ?? input.expected_run_count),
    scheduleStartTime: normalizedString(input.scheduleStartTime ?? input.schedule_start_time),
    scheduleEndTime: normalizedString(input.scheduleEndTime ?? input.schedule_end_time),
  };
}

function projectedRunCount(scope) {
  if (scope.expectedRunCount !== null && scope.expectedRunCount > 0) {
    return Math.ceil(scope.expectedRunCount);
  }
  const startMs = utcDateTimeMs(scope.scheduleStartTime);
  const endMs = utcDateTimeMs(scope.scheduleEndTime);
  const intervalMs = CADENCE_RUN_INTERVAL_MS.get(scope.cadence);
  if (startMs === null || endMs === null || !intervalMs || endMs <= startMs) return null;
  return Math.ceil((endMs - startMs) / intervalMs);
}

/**
 * Decide the instruction type and mandate amount limit for a recurring/scheduled purchase task,
 * before any schedule is created. A recurring instruction resets its limit every cycle and can run
 * forever; a one-time instruction spends its limit down and then stops, so an open-ended schedule
 * built on one dies mid-flight with nobody present to re-authorize.
 */
export function classifyScheduledAuthorizationScope(input = {}) {
  const scope = scheduledScopeInput(input);

  const missing = [];
  if (!scope.cadence || !CADENCE_TO_CYCLE.has(scope.cadence)) missing.push('cadence');
  if (scope.perRunCap === null || scope.perRunCap <= 0) missing.push('perRunCap');
  if (!scope.currency) missing.push('currency');
  if (missing.length > 0) {
    return {
      state: AuthorizationWorkflowState.SCHEDULED_SCOPE_INPUT_MISSING,
      action: AuthorizationWorkflowAction.ASK_FOR_SCHEDULE_SCOPE,
      terminal: false,
      reason: `scheduled_scope_missing_${missing.join('_')}`,
      missing,
    };
  }

  const cycle = CADENCE_TO_CYCLE.get(scope.cadence);
  const openEnded = scope.scheduleEndTime === null;
  const runCount = projectedRunCount(scope);
  const warnings = [];

  // An explicit total budget is the user asking for a hard lifetime ceiling, which is exactly what a
  // one-time instruction enforces. Everything else stays recurring so it survives the whole schedule.
  if (scope.totalBudget !== null) {
    if (scope.totalBudget <= 0) {
      return {
        state: AuthorizationWorkflowState.SCHEDULED_SCOPE_INPUT_MISSING,
        action: AuthorizationWorkflowAction.ASK_FOR_SCHEDULE_SCOPE,
        terminal: false,
        reason: 'scheduled_scope_invalid_total_budget',
        missing: ['totalBudget'],
      };
    }

    const projectedTotal = runCount === null ? null : scope.perRunCap * runCount;
    if (projectedTotal !== null && projectedTotal > scope.totalBudget + 1e-9) {
      warnings.push('total_budget_below_projected_spend');
    }
    if (projectedTotal === null && openEnded) {
      warnings.push('open_ended_schedule_on_one_time_authorization');
    }

    return {
      state: AuthorizationWorkflowState.SCHEDULED_SCOPE_RESOLVED,
      action: AuthorizationWorkflowAction.CREATE_SCHEDULED_AUTHORIZATION_DRAFT,
      terminal: false,
      reason: 'scheduled_scope_non_recurring_total_budget',
      mode: ScheduledAuthorizationMode.NON_RECURRING,
      isRecurring: false,
      recurringFrequency: null,
      amountLimit: scope.totalBudget,
      currency: scope.currency,
      perRunCap: scope.perRunCap,
      effectiveUntilTime: scope.scheduleEndTime,
      projectedRunCount: runCount,
      projectedTotal,
      // The epsilon absorbs float division noise (1.2 / 0.4 -> 2.999...) so a budget that exactly
      // covers N runs reports N, not N - 1.
      exhaustsAfterRuns: Math.floor(scope.totalBudget / scope.perRunCap + 1e-9),
      computation: `totalBudget ${scope.totalBudget} ${scope.currency} used as the one-time amountLimit`
        + (projectedTotal === null
          ? '; projected spend unknown without a run count'
          : `; projected spend ${scope.perRunCap} x ${runCount} = ${projectedTotal} ${scope.currency}`),
      warnings,
    };
  }

  const runsPerCycle = scope.runsPerCycle !== null && scope.runsPerCycle > 0
    ? Math.ceil(scope.runsPerCycle)
    : cycle.runsPerCycle;
  const amountLimit = scope.perRunCap * runsPerCycle;

  return {
    state: AuthorizationWorkflowState.SCHEDULED_SCOPE_RESOLVED,
    action: AuthorizationWorkflowAction.CREATE_SCHEDULED_AUTHORIZATION_DRAFT,
    terminal: false,
    reason: 'scheduled_scope_recurring_cycle_budget',
    mode: ScheduledAuthorizationMode.RECURRING,
    isRecurring: true,
    recurringFrequency: cycle.frequency,
    amountLimit,
    currency: scope.currency,
    perRunCap: scope.perRunCap,
    runsPerCycle,
    effectiveUntilTime: scope.scheduleEndTime,
    projectedRunCount: runCount,
    computation: `perRunCap ${scope.perRunCap} x ${runsPerCycle} run(s) per ${cycle.frequency} cycle`
      + ` = ${amountLimit} ${scope.currency}, reset every cycle`,
    warnings,
  };
}

function rejectScheduledCandidate(candidate, scope, paymentInstrumentId) {
  if (normalizedString(candidate.status)?.toUpperCase() !== 'ACTIVE') {
    return 'candidate_not_active';
  }
  const candidateInstrument = paymentInstrumentIdOf(candidate);
  if (paymentInstrumentId && candidateInstrument && candidateInstrument !== paymentInstrumentId) {
    return 'candidate_payment_instrument_mismatch';
  }
  const candidateCurrency = normalizedString(candidate.currencyCode ?? candidate.currency_code ?? candidate.currency)?.toUpperCase();
  if (!candidateCurrency || candidateCurrency !== scope.currency) {
    return 'candidate_currency_mismatch';
  }
  // Merchant/title/description coverage is agent judgment, so the caller must assert it explicitly.
  // An unasserted candidate is treated as uncovered rather than silently reused.
  if (booleanValue(candidate.merchantScopeCovered ?? candidate.merchant_scope_covered) !== true) {
    return 'candidate_merchant_scope_not_covered';
  }

  const candidateRecurring = booleanValue(candidate.isRecurring ?? candidate.is_recurring) === true;
  if (scope.mode === ScheduledAuthorizationMode.RECURRING) {
    if (!candidateRecurring) return 'candidate_not_recurring';
    const candidateFrequency = normalizedString(
      candidate.recurringFrequency ?? candidate.recurring_frequency,
    )?.toUpperCase();
    if (candidateFrequency !== scope.recurringFrequency) return 'candidate_recurring_frequency_mismatch';
  } else if (candidateRecurring) {
    // A recurring mandate never enforces the lifetime ceiling a stated total budget asked for.
    return 'candidate_recurring_cannot_enforce_total_budget';
  }

  const candidateLimit = numberValue(candidate.amountLimit ?? candidate.amount_limit);
  if (candidateLimit === null || candidateLimit + 1e-9 < scope.amountLimit) {
    return 'candidate_amount_limit_below_schedule_need';
  }

  const horizonEndMs = utcDateTimeMs(scope.effectiveUntilTime);
  const candidateEndMs = utcDateTimeMs(candidate.effectiveUntilTime ?? candidate.effective_until_time);
  if (horizonEndMs !== null && (candidateEndMs === null || candidateEndMs < horizonEndMs)) {
    return 'candidate_expires_before_schedule_horizon';
  }

  return null;
}

/**
 * Gate reuse of an existing instruction for a whole schedule, not for one run. Reusing something
 * that only covers the next purchase is what forces a re-authorization mid-schedule, at the exact
 * moment nobody is present to give one — so any uncovered dimension means create a new instruction
 * now, while the user is still here.
 */
export function classifyScheduledAuthorizationReuse(input = {}) {
  const scope = input.scope ?? input;
  const paymentInstrumentId = selectedPaymentInstrumentId(input) ?? null;
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];

  const rejected = [];
  const usable = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const instructionId = normalizedString(
      candidate.instructionId ?? candidate.instruction_id ?? candidate.purchaseInstructionId,
    );
    const mandateId = normalizedString(candidate.mandateId ?? candidate.mandate_id);
    if (!instructionId || !mandateId) {
      rejected.push({ instructionId, mandateId, reason: 'candidate_missing_instruction_or_mandate' });
      continue;
    }
    const rejection = rejectScheduledCandidate(candidate, scope, paymentInstrumentId);
    if (rejection) {
      rejected.push({ instructionId, mandateId, reason: rejection });
      continue;
    }
    usable.push({ candidate, instructionId, mandateId });
  }

  if (usable.length === 0) {
    return {
      state: AuthorizationWorkflowState.SCHEDULED_AUTHORIZATION_DRAFT_REQUIRED,
      action: AuthorizationWorkflowAction.CREATE_SCHEDULED_AUTHORIZATION_DRAFT,
      terminal: false,
      reason: candidates.length === 0
        ? 'no_scheduled_authorization_candidates'
        : 'no_full_horizon_authorization',
      ...(paymentInstrumentId ? { paymentInstrumentId } : {}),
      rejected,
    };
  }

  // Most headroom first: the latest expiry survives the schedule longest.
  usable.sort((a, b) => {
    const aEnd = utcDateTimeMs(a.candidate.effectiveUntilTime ?? a.candidate.effective_until_time) ?? 0;
    const bEnd = utcDateTimeMs(b.candidate.effectiveUntilTime ?? b.candidate.effective_until_time) ?? 0;
    return bEnd - aEnd;
  });
  const [{ candidate, instructionId, mandateId }] = usable;

  const warnings = [];
  const candidateEnd = normalizedString(candidate.effectiveUntilTime ?? candidate.effective_until_time);
  if (!scope.effectiveUntilTime && candidateEnd) {
    // Open-ended schedule against a bounded authorization: reuse is correct today, but the schedule
    // will need a fresh instruction at that date and the user should hear it now, not then.
    warnings.push('authorization_expiry_bounds_open_ended_schedule');
  }

  return {
    state: AuthorizationWorkflowState.SCHEDULED_AUTHORIZATION_REUSABLE,
    action: AuthorizationWorkflowAction.PIN_SCHEDULED_AUTHORIZATION,
    terminal: false,
    reason: 'scheduled_authorization_reusable',
    ...(paymentInstrumentId ? { paymentInstrumentId } : {}),
    instructionId,
    mandateId,
    ...(candidateEnd ? { effectiveUntilTime: candidateEnd } : {}),
    rejected,
    warnings,
  };
}

/**
 * Verify a scheduled run's pinned authorization before it spends money unattended. Matching is by
 * the exact ids frozen at setup, never by re-running a semantic search — a run must not drift onto
 * some other mandate that merely happens to fit.
 */
export function classifyUnattendedAuthorization(input = {}) {
  const expectedInstructionId = normalizedString(
    input.pinnedInstructionId ?? input.pinned_instruction_id ?? input.instructionId ?? input.instruction_id,
  );
  const expectedMandateId = normalizedString(
    input.pinnedMandateId ?? input.pinned_mandate_id ?? input.mandateId ?? input.mandate_id,
  );

  const gap = (reason, extra = {}) => ({
    state: AuthorizationWorkflowState.UNATTENDED_AUTHORIZATION_GAP,
    action: AuthorizationWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP,
    terminal: true,
    reason,
    ...(expectedInstructionId ? { instructionId: expectedInstructionId } : {}),
    ...(expectedMandateId ? { mandateId: expectedMandateId } : {}),
    ...extra,
  });

  if (!expectedInstructionId || !expectedMandateId) {
    return gap('scheduled_authorization_not_pinned');
  }

  const observation = input.observation ?? input;
  const verificationFailure = authorizationVerificationFailure(observation);
  if (verificationFailure) {
    return gap('scheduled_authorization_verification_failed', verificationFailure);
  }

  const data = unwrapCliEnvelope(
    observation.stdout ?? observation.data ?? observation.result ?? observation,
  );
  const observedInstructionId = instructionIdOf(data);
  if (observedInstructionId && observedInstructionId !== expectedInstructionId) {
    return gap('scheduled_authorization_instruction_mismatch', {
      observedInstructionId,
    });
  }

  const status = statusOf(data);
  if (status !== 'ACTIVE') {
    return gap('scheduled_authorization_not_active', { status });
  }

  const expectedInstrument = selectedPaymentInstrumentId(input);
  const observedInstrument = paymentInstrumentIdOf(data);
  if (expectedInstrument && observedInstrument && observedInstrument !== expectedInstrument) {
    return gap('scheduled_authorization_payment_instrument_mismatch', {
      paymentInstrumentId: observedInstrument,
      expectedPaymentInstrumentId: expectedInstrument,
    });
  }

  const mandates = mandateListOf(data);
  if (mandates !== null) {
    const mandate = mandates.find(
      (entry) => normalizedString(entry?.mandateId ?? entry?.mandate_id) === expectedMandateId,
    );
    if (!mandate) {
      return gap('scheduled_authorization_mandate_missing', { status });
    }
  }

  return {
    state: AuthorizationWorkflowState.AUTHORIZATION_READY,
    action: AuthorizationWorkflowAction.RESUME_AUTHORIZED_PAYMENT,
    terminal: false,
    reason: 'scheduled_authorization_active',
    instructionId: expectedInstructionId,
    mandateId: expectedMandateId,
    ...(observedInstrument ? { paymentInstrumentId: observedInstrument } : {}),
    status,
    authorization: data,
  };
}

export function classifyPaymentAuthorizationResolver(input = {}) {
  const card = choosePaymentInstrument(input);
  if (!card) {
    return {
      state: AuthorizationWorkflowState.PAYMENT_INSTRUMENT_REFRESH_REQUIRED,
      action: AuthorizationWorkflowAction.REFRESH_PAYMENT_INSTRUMENT_LIST,
      terminal: false,
      reason: 'payment_instrument_refresh_required',
    };
  }

  if (!isVisaCard(card)) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_BYPASSED,
      action: AuthorizationWorkflowAction.RUN_PAY_WITHOUT_AUTHORIZATION,
      terminal: false,
      reason: 'payment_instrument_not_visa_bypass_authorization',
      ...baseResult(card),
    };
  }

  if (!isVicEnabled(card)) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_BYPASSED,
      action: AuthorizationWorkflowAction.RUN_PAY_WITHOUT_AUTHORIZATION,
      terminal: false,
      reason: 'visa_vic_not_enabled_bypass_authorization',
      ...baseResult(card),
    };
  }

  const authorization = selectedAuthorization(input);
  if (authorization) {
    const { instructionId, mandateId } = authorizationIds(authorization);
    if (instructionId && mandateId) {
      return {
        state: AuthorizationWorkflowState.AUTHORIZATION_MATCHED,
        action: AuthorizationWorkflowAction.RUN_PAY_WITH_AUTHORIZATION,
        terminal: false,
        reason: 'authorization_matched',
        ...baseResult(card),
        instructionId,
        mandateId,
      };
    }

    if (isUnattended(input)) {
      return {
        state: AuthorizationWorkflowState.UNATTENDED_AUTHORIZATION_GAP,
        action: AuthorizationWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP,
        terminal: true,
        reason: 'unattended_authorization_missing_instruction_or_mandate',
        ...baseResult(card),
      };
    }

    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_DRAFT_REQUIRED,
      action: AuthorizationWorkflowAction.START_AUTHORIZATION_DRAFT_AND_WAIT,
      terminal: false,
      reason: 'authorization_missing_instruction_or_mandate',
      ...baseResult(card),
    };
  }

  // A scheduled run has no user to sign a Passkey, and it must not go shopping the instruction list
  // for some other mandate that happens to fit. Without pinned ids it stops here.
  if (isUnattended(input)) {
    return {
      state: AuthorizationWorkflowState.UNATTENDED_AUTHORIZATION_GAP,
      action: AuthorizationWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP,
      terminal: true,
      reason: 'unattended_authorization_not_pinned',
      ...baseResult(card),
    };
  }

  if (wasAuthorizationListChecked(input)) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_DRAFT_REQUIRED,
      action: AuthorizationWorkflowAction.START_AUTHORIZATION_DRAFT_AND_WAIT,
      terminal: false,
      reason: 'no_matching_authorization',
      ...baseResult(card),
    };
  }

  return {
    state: AuthorizationWorkflowState.AUTHORIZATION_LIST_REQUIRED,
    action: AuthorizationWorkflowAction.LIST_AUTHORIZATIONS,
    terminal: false,
    reason: 'visa_vic_ready_list_authorizations',
    ...baseResult(card),
  };
}

export function classifyAuthorizationDraftObservation(observation = {}) {
  const data = unwrapCliEnvelope(observation.stdout ?? observation.data ?? observation.result ?? observation);
  const passkeyUrl = passkeyUrlOf(data);
  const instructionId = instructionIdOf(data) || instructionIdFromPasskeyUrl(passkeyUrl);
  const paymentInstrumentId = paymentInstrumentIdOf(data);

  if (!instructionId || !passkeyUrl) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_ERROR,
      action: AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR,
      terminal: false,
      reason: !instructionId ? 'authorization_draft_missing_instruction_id' : 'authorization_draft_missing_passkey_url',
      paymentInstrumentId,
      instructionId,
    };
  }

  const waitSpec = instructionWaitSpec(instructionId);
  const watchEnvelope = watchEnvelopeOf(observation);

  // No second envelope yet: the draft just printed and the CLI's own watch is still polling. The
  // Passkey URL goes out now, and this same process is the listener — do not start another one.
  // For backward compatibility, an observation without process-state fields is treated as live.
  if (!watchEnvelope && !authorizationWatchEnded(observation)) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_WAIT_REQUIRED,
      action: AuthorizationWorkflowAction.SEND_PASSKEY_URL_AND_AWAIT_BUILT_IN_WATCH,
      terminal: false,
      reason: 'authorization_activation_wait_required',
      paymentInstrumentId,
      instructionId,
      passkeyUrl,
      waitSpec,
      verifyCommand: waitSpec.verifyCommand,
    };
  }

  const activationEvent = activationEventFor(watchEnvelope, instructionId);
  if (activationEvent) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED,
      action: AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_ACTIVATION,
      terminal: false,
      reason: 'authorization_activation_event_observed',
      paymentInstrumentId,
      instructionId,
      waitSpec,
      verifyCommand: waitSpec.verifyCommand,
      activationEvent,
    };
  }

  // The watch ended without the activation: it timed out at 15 min, the process was killed, or the
  // runtime cut the foreground command short. None of those mean authorization failed — the user
  // may have completed the Passkey anyway — so ask the instruction itself instead of guessing.
  return {
    state: AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED,
    action: AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_AFTER_WATCH_GAP,
    terminal: false,
    reason: watchEnvelope?.timedOut ? 'authorization_watch_timed_out' : 'authorization_watch_ended_without_event',
    paymentInstrumentId,
    instructionId,
    waitSpec,
    verifyCommand: waitSpec.verifyCommand,
    pollCommand: waitSpec.pollCommand,
  };
}

export function classifyAuthorizationActiveVerification(observation = {}, waitSpec = {}) {
  const verificationFailure = authorizationVerificationFailure(observation);
  if (verificationFailure) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_ERROR,
      action: AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR,
      terminal: false,
      reason: 'authorization_verification_cli_error',
      instructionId: instructionIdOf(waitSpec.expectedResource || {}),
      ...verificationFailure,
    };
  }

  const data = unwrapCliEnvelope(observation.stdout ?? observation.data ?? observation.result ?? observation);
  const observedInstructionId = instructionIdOf(data);
  const expectedInstructionId = instructionIdOf(waitSpec.expectedResource || {});
  const instructionId = observedInstructionId || expectedInstructionId;
  const paymentInstrumentId = paymentInstrumentIdOf(data);
  const status = statusOf(data);

  if (observedInstructionId && expectedInstructionId && observedInstructionId !== expectedInstructionId) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_ERROR,
      action: AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR,
      terminal: false,
      reason: 'authorization_instruction_mismatch',
      paymentInstrumentId,
      instructionId: observedInstructionId,
      expectedInstructionId,
      status,
    };
  }

  if (status === 'ACTIVE') {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_READY,
      action: AuthorizationWorkflowAction.RESUME_AUTHORIZED_PAYMENT,
      terminal: false,
      reason: 'authorization_active',
      paymentInstrumentId,
      instructionId,
      status,
      authorization: data,
    };
  }

  if (!AUTHORIZATION_ACTIVATION_PENDING_STATUSES.has(status)) {
    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_ERROR,
      action: AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR,
      terminal: false,
      reason: AUTHORIZATION_TERMINAL_NON_ACTIVE_STATUSES.has(status)
        ? 'authorization_terminal_without_activation'
        : 'authorization_verification_invalid_status',
      paymentInstrumentId,
      instructionId,
      status,
    };
  }

  const fallbackWaitSpec = instructionId
    ? instructionWaitSpec(instructionId)
    : {
        eventType: 'purchase_instruction.activated',
        expectedResource: waitSpec.expectedResource || {},
      };
  const pollCommand = waitSpec.pollCommand ?? waitSpec.poll_command ?? pollCommandForWaitSpec(fallbackWaitSpec);

  return {
    state: AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_PENDING,
    action: AuthorizationWorkflowAction.WAIT_AUTHORIZATION_ACTIVATION,
    terminal: false,
    reason: 'authorization_not_active',
    paymentInstrumentId,
    instructionId,
    status,
    pollCommand,
    verifyCommand: waitSpec.verifyCommand ?? waitSpec.verify_command ?? fallbackWaitSpec.verifyCommand,
  };
}

export function formatAuthorizationFsmMarker(workflow, marker = 'AUTHORIZATION_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
