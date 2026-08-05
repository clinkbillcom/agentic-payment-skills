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
});

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
    verifyCommand: `clink-cli instruction get --purchase-instruction-id ${shellQuoteIfNeeded(instructionId)} --format json`,
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

    return {
      state: AuthorizationWorkflowState.AUTHORIZATION_DRAFT_REQUIRED,
      action: AuthorizationWorkflowAction.START_AUTHORIZATION_DRAFT_AND_WAIT,
      terminal: false,
      reason: 'authorization_missing_instruction_or_mandate',
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
