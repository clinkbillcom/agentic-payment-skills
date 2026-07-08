import { formatWorkflowMarker } from './workflow-marker.mjs';
import { pollCommandForWaitSpec } from './event-workflow-fsm.mjs';

export const AuthorizationWorkflowState = Object.freeze({
  PAYMENT_INSTRUMENT_REFRESH_REQUIRED: 'PAYMENT_INSTRUMENT_REFRESH_REQUIRED',
  AUTHORIZATION_BYPASSED: 'AUTHORIZATION_BYPASSED',
  AUTHORIZATION_LIST_REQUIRED: 'AUTHORIZATION_LIST_REQUIRED',
  AUTHORIZATION_MATCHED: 'AUTHORIZATION_MATCHED',
  AUTHORIZATION_DRAFT_REQUIRED: 'AUTHORIZATION_DRAFT_REQUIRED',
  AUTHORIZATION_ACTIVATION_WAIT_REQUIRED: 'AUTHORIZATION_ACTIVATION_WAIT_REQUIRED',
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
  START_AUTHORIZATION_ACTIVATION_WATCH: 'START_AUTHORIZATION_ACTIVATION_WATCH',
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

function instructionWaitSpec(instructionId) {
  const expectedResource = {
    instructionId,
    purchaseInstructionId: instructionId,
  };
  const base = {
    eventType: 'purchase_instruction.activated',
    expectedResource,
    verifyCommand: `clink-cli instruction get --purchase-instruction-id ${instructionId} --format json`,
  };
  return {
    ...base,
    pollCommand: pollCommandForWaitSpec(base),
  };
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
  return {
    state: AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_WAIT_REQUIRED,
    action: AuthorizationWorkflowAction.START_AUTHORIZATION_ACTIVATION_WATCH,
    terminal: false,
    reason: 'authorization_activation_wait_required',
    paymentInstrumentId,
    instructionId,
    passkeyUrl,
    waitSpec,
    pollCommand: waitSpec.pollCommand,
    verifyCommand: waitSpec.verifyCommand,
  };
}

export function classifyAuthorizationActiveVerification(observation = {}, waitSpec = {}) {
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
    reason: status ? 'authorization_not_active' : 'authorization_status_missing',
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
