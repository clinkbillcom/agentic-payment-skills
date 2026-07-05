import { formatWorkflowMarker } from './workflow-marker.mjs';

export const UcpCheckoutWorkflowState = Object.freeze({
  PRODUCT_INPUT_MISSING: 'PRODUCT_INPUT_MISSING',
  PRODUCT_FROZEN: 'PRODUCT_FROZEN',
  FULFILLMENT_INPUT_MISSING: 'FULFILLMENT_INPUT_MISSING',
  FULFILLMENT_CLASSIFIED: 'FULFILLMENT_CLASSIFIED',
  PAYMENT_INSTRUMENT_REQUIRED: 'PAYMENT_INSTRUMENT_REQUIRED',
  PAYMENT_INSTRUMENT_READY: 'PAYMENT_INSTRUMENT_READY',
  AUTHORIZATION_LIST_REQUIRED: 'AUTHORIZATION_LIST_REQUIRED',
  AUTHORIZATION_MATCHED: 'AUTHORIZATION_MATCHED',
  AUTHORIZATION_DRAFT_REQUIRED: 'AUTHORIZATION_DRAFT_REQUIRED',
  ITEM_ID_REQUIRED: 'ITEM_ID_REQUIRED',
  ITEM_ID_EXTRACTED: 'ITEM_ID_EXTRACTED',
  CHECKOUT_CREATE_READY: 'CHECKOUT_CREATE_READY',
  CHECKOUT_CREATED: 'CHECKOUT_CREATED',
  CHECKOUT_READY_TO_COMPLETE: 'CHECKOUT_READY_TO_COMPLETE',
  CHECKOUT_COMPLETED: 'CHECKOUT_COMPLETED',
  CHECKOUT_PENDING: 'CHECKOUT_PENDING',
  CHECKOUT_FAILED: 'CHECKOUT_FAILED',
  CHECKOUT_UNKNOWN: 'CHECKOUT_UNKNOWN',
  PAYMENT_SUCCESS_EVENT_REQUIRED: 'PAYMENT_SUCCESS_EVENT_REQUIRED',
  PAYMENT_SUCCESS_EVENT_RECEIVED: 'PAYMENT_SUCCESS_EVENT_RECEIVED',
  CLI_ERROR: 'CLI_ERROR',
});

export const UcpCheckoutWorkflowAction = Object.freeze({
  ASK_FOR_PRODUCT_INPUT: 'ASK_FOR_PRODUCT_INPUT',
  FREEZE_PRODUCT: 'FREEZE_PRODUCT',
  ASK_FOR_FULFILLMENT: 'ASK_FOR_FULFILLMENT',
  REFRESH_PAYMENT_INSTRUMENT: 'REFRESH_PAYMENT_INSTRUMENT',
  LIST_AUTHORIZATIONS: 'LIST_AUTHORIZATIONS',
  START_AUTHORIZATION_DRAFT_AND_WAIT: 'START_AUTHORIZATION_DRAFT_AND_WAIT',
  EXTRACT_ITEM_ID: 'EXTRACT_ITEM_ID',
  CREATE_CHECKOUT: 'CREATE_CHECKOUT',
  COMPLETE_CHECKOUT: 'COMPLETE_CHECKOUT',
  POLL_PAYMENT_SUCCESS_EVENT: 'POLL_PAYMENT_SUCCESS_EVENT',
  RETURN_PAYMENT_SUCCESS_EVENT: 'RETURN_PAYMENT_SUCCESS_EVENT',
  WAIT_CHECKOUT: 'WAIT_CHECKOUT',
  VERIFY_CHECKOUT_BEFORE_RETRY: 'VERIFY_CHECKOUT_BEFORE_RETRY',
  STOP_CHECKOUT_FAILURE: 'STOP_CHECKOUT_FAILURE',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

const PAYMENT_SUCCESS_POLL_COMMAND = 'clink-cli events poll --type agent_order.succeeded --format json';

const VALID_FULFILLMENT_TYPES = new Set([
  'PHYSICAL_GOODS_REQUIRES_SHIPPING',
  'NO_SHIPPING_REQUIRED',
]);

const CURRENCY_DECIMALS = new Map([
  ['BHD', 3],
  ['IQD', 3],
  ['JOD', 3],
  ['KWD', 3],
  ['LYD', 3],
  ['OMR', 3],
  ['TND', 3],
  ['CLP', 0],
  ['DJF', 0],
  ['GNF', 0],
  ['JPY', 0],
  ['KMF', 0],
  ['KRW', 0],
  ['MGA', 0],
  ['PYG', 0],
  ['RWF', 0],
  ['UGX', 0],
  ['VND', 0],
  ['VUV', 0],
  ['XAF', 0],
  ['XOF', 0],
  ['XPF', 0],
]);

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function unwrapCliEnvelope(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  if (parsed.data && typeof parsed.data === 'object') return parsed.data;
  if (parsed.error && typeof parsed.error === 'object') return parsed.error;
  return parsed;
}

function numericValue(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function checkoutIdOf(data = {}) {
  return normalizedString(data.checkoutId ?? data.checkout_id ?? data.id);
}

function statusOf(data = {}) {
  return normalizedString(data.status ?? data.state ?? data.checkoutStatus)?.toLowerCase() || '';
}

function eventTypeOf(event = {}) {
  return normalizedString(event.eventType ?? event.data?.type ?? event.type) || '';
}

function eventPayloadOf(event = {}) {
  return event.data && typeof event.data === 'object' ? event.data : event;
}

function currencyDecimals(currency) {
  const code = String(currency || '').trim().toUpperCase();
  if (!code) throw new Error('currency is required');
  return CURRENCY_DECIMALS.has(code) ? CURRENCY_DECIMALS.get(code) : 2;
}

function integerMinorUnit(value) {
  const raw = String(value).trim().replaceAll(',', '');
  if (!/^\d+$/.test(raw)) throw new Error('minor-unit amount must be a non-negative integer');
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount)) throw new Error('minor-unit amount exceeds safe integer range');
  return amount;
}

export function normalizeUcpAmountToMinorUnitLong({ amount, currency, scale = 'major' } = {}) {
  if (amount === undefined || amount === null || amount === '') throw new Error('amount is required');
  if (scale === 'minor') return integerMinorUnit(amount);

  const decimals = currencyDecimals(currency);
  const raw = String(amount).trim().replaceAll(',', '');
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error('amount must be a non-negative decimal');

  const [whole, fraction = ''] = raw.split('.');
  if (fraction.length > decimals) {
    throw new Error(`amount has too many decimal places for ${String(currency).toUpperCase()}`);
  }

  const paddedFraction = fraction.padEnd(decimals, '0');
  const minor = Number(`${whole}${paddedFraction || ''}`);
  if (!Number.isSafeInteger(minor)) throw new Error('minor-unit amount exceeds safe integer range');
  return minor;
}

function amountMinorOf(input = {}) {
  const direct = input.amountMinor ?? input.amount_minor ?? input.totalMinor ?? input.total_minor;
  if (direct !== undefined && direct !== null && direct !== '') return integerMinorUnit(direct);
  const userAmount = input.amount ?? input.totalAmount ?? input.unitPrice;
  if (userAmount !== undefined && userAmount !== null && userAmount !== '') {
    return normalizeUcpAmountToMinorUnitLong({ amount: userAmount, currency: input.currency });
  }
  return null;
}

function extractUrl(text = '') {
  const match = String(text).match(/https?:\/\/[^\s"'<>]+/i);
  return match?.[0]?.replace(/[),.;，。]+$/u, '') || null;
}

function hasPurchaseIntent(text = '', url = '') {
  const lowered = String(text).toLowerCase();
  return (
    lowered.includes('clink pay')
    || lowered.includes('clink checkout')
    || lowered.includes('buy')
    || lowered.includes('purchase')
    || lowered.includes('order')
    || lowered.includes('checkout')
    || lowered.includes('买')
    || lowered.includes('购买')
    || lowered.includes('下单')
    || /\/(products?|checkout|cart)(\/|$)/i.test(url)
  );
}

export function classifyUcpProductIntent(input = {}) {
  const text = input.text ?? input.prompt ?? '';
  const productUrl = normalizedString(input.productUrl ?? input.url) || extractUrl(text);
  if (productUrl && hasPurchaseIntent(text, productUrl)) {
    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.FREEZE_PRODUCT,
      terminal: false,
      reason: 'product_url_purchase_intent',
      productUrl,
    };
  }

  return {
    state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
    action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
    terminal: false,
    reason: productUrl ? 'missing_purchase_intent' : 'missing_product_url',
  };
}

export function classifyUcpCheckoutPrerequisites(input = {}) {
  const missing = [];
  for (const [field, value] of [
    ['productUrl', input.productUrl ?? input.url],
    ['merchantUrl', input.merchantUrl ?? input.merchant_url],
    ['title', input.title ?? input.productTitle],
    ['currency', input.currency],
  ]) {
    if (normalizedString(value) === null) missing.push(field);
  }

  let amountMinor = null;
  try {
    amountMinor = amountMinorOf(input);
  } catch {
    missing.push('amountMinor');
  }
  if (amountMinor === null) missing.push('amountMinor');

  if (numericValue(input.quantity) === null) missing.push('quantity');
  if (normalizedString(input.fulfillmentType) === null) missing.push('fulfillmentType');

  if (missing.length > 0) {
    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
      terminal: false,
      reason: 'missing_product_input',
      missing,
    };
  }

  if (input.fulfillmentType === 'UNKNOWN') {
    return {
      state: UcpCheckoutWorkflowState.FULFILLMENT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_FULFILLMENT,
      terminal: false,
      reason: 'unknown_fulfillment_type',
      missing: ['fulfillmentType'],
    };
  }

  if (!VALID_FULFILLMENT_TYPES.has(input.fulfillmentType)) {
    return {
      state: UcpCheckoutWorkflowState.FULFILLMENT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_FULFILLMENT,
      terminal: false,
      reason: 'invalid_fulfillment_type',
      missing: ['fulfillmentType'],
    };
  }

  if (input.fulfillmentType === 'PHYSICAL_GOODS_REQUIRES_SHIPPING' && !input.shippingAddress) {
    return {
      state: UcpCheckoutWorkflowState.FULFILLMENT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_FULFILLMENT,
      terminal: false,
      reason: 'shipping_address_required',
      missing: ['shippingAddress'],
    };
  }

  if (normalizedString(input.paymentInstrumentId ?? input.payment_instrument_id) === null) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_INSTRUMENT_REQUIRED,
      action: UcpCheckoutWorkflowAction.REFRESH_PAYMENT_INSTRUMENT,
      terminal: false,
      reason: 'payment_instrument_required',
    };
  }

  return {
    state: UcpCheckoutWorkflowState.AUTHORIZATION_LIST_REQUIRED,
    action: UcpCheckoutWorkflowAction.LIST_AUTHORIZATIONS,
    terminal: false,
    reason: 'ready_to_list_authorizations',
  };
}

function selectedAuthorization(input = {}) {
  if (input.selected && typeof input.selected === 'object') return input.selected;
  if (input.instructionId || input.instruction_id || input.purchaseInstructionId) return input;
  return null;
}

export function classifyAuthorizationSelection(input = {}) {
  const selected = selectedAuthorization(input);
  if (!selected) {
    return {
      state: UcpCheckoutWorkflowState.AUTHORIZATION_DRAFT_REQUIRED,
      action: UcpCheckoutWorkflowAction.START_AUTHORIZATION_DRAFT_AND_WAIT,
      terminal: false,
      reason: 'no_matching_authorization',
    };
  }

  const instructionId = normalizedString(
    selected.instructionId ?? selected.instruction_id ?? selected.purchaseInstructionId,
  );
  const mandateId = normalizedString(selected.mandateId ?? selected.mandate_id);
  if (!instructionId || !mandateId) {
    return {
      state: UcpCheckoutWorkflowState.AUTHORIZATION_DRAFT_REQUIRED,
      action: UcpCheckoutWorkflowAction.START_AUTHORIZATION_DRAFT_AND_WAIT,
      terminal: false,
      reason: 'authorization_missing_instruction_or_mandate',
    };
  }

  return {
    state: UcpCheckoutWorkflowState.AUTHORIZATION_MATCHED,
    action: UcpCheckoutWorkflowAction.EXTRACT_ITEM_ID,
    terminal: false,
    reason: 'authorization_matched',
    instructionId,
    mandateId,
  };
}

function resourceFields(data = {}) {
  const fields = {};
  for (const [target, value] of [
    ['checkoutId', checkoutIdOf(data)],
    ['orderId', data.orderId ?? data.order_id],
    ['sessionId', data.sessionId ?? data.session_id],
  ]) {
    const normalized = normalizedString(value);
    if (normalized !== null) fields[target] = normalized;
  }
  return fields;
}

function classifyCheckoutStatus(status, checkoutId, operation, data = {}) {
  if (status === 'completed' || status === 'complete' || status === 'succeeded' || status === 'success') {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_REQUIRED,
      action: UcpCheckoutWorkflowAction.POLL_PAYMENT_SUCCESS_EVENT,
      terminal: false,
      reason: 'completed_poll_payment_success_event',
      ...resourceFields(data),
      pollCommand: PAYMENT_SUCCESS_POLL_COMMAND,
    };
  }

  if (status === 'ready_for_complete') {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_READY_TO_COMPLETE,
      action: UcpCheckoutWorkflowAction.COMPLETE_CHECKOUT,
      terminal: false,
      reason: 'ready_for_complete',
      checkoutId,
    };
  }

  if (status === 'complete_in_progress' || status === 'processing' || status === 'pending') {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_PENDING,
      action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
      terminal: false,
      reason: status || 'checkout_pending',
      checkoutId,
    };
  }

  if (status === 'requires_escalation' || status === 'canceled' || status === 'cancelled' || status === 'failed') {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_FAILED,
      action: UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE,
      terminal: true,
      reason: status,
      checkoutId,
    };
  }

  if (operation === 'create' && checkoutId) {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_CREATED,
      action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
      terminal: false,
      reason: status ? `status_${status}` : 'checkout_created_status_missing',
      checkoutId,
    };
  }

  return {
    state: UcpCheckoutWorkflowState.CHECKOUT_UNKNOWN,
    action: UcpCheckoutWorkflowAction.VERIFY_CHECKOUT_BEFORE_RETRY,
    terminal: false,
    reason: status ? `status_${status}_unknown` : 'checkout_status_missing',
    ...(checkoutId ? { checkoutId } : {}),
  };
}

export function classifyUcpCheckoutObservation(observation = {}) {
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  if (exitCode !== null && exitCode !== 0) {
    if (exitCode === 6) {
      return {
        state: UcpCheckoutWorkflowState.CHECKOUT_UNKNOWN,
        action: UcpCheckoutWorkflowAction.VERIFY_CHECKOUT_BEFORE_RETRY,
        terminal: false,
        reason: 'exit_6_unknown',
      };
    }

    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: `exit_${exitCode}_cli_error`,
    };
  }

  const data = unwrapCliEnvelope(observation.stdout ?? observation.data ?? observation.result ?? {});
  const checkoutId = checkoutIdOf(data);
  const status = statusOf(data);

  if (!checkoutId && (observation.operation === 'create' || observation.operation === 'complete')) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'missing_checkout_id',
    };
  }

  return classifyCheckoutStatus(status, checkoutId, observation.operation, data);
}

function expectedEventFields(expectedResource = {}) {
  return Object.entries({
    checkoutId: expectedResource.checkoutId ?? expectedResource.checkout_id,
    orderId: expectedResource.orderId ?? expectedResource.order_id,
    sessionId: expectedResource.sessionId ?? expectedResource.session_id,
  }).filter(([, value]) => normalizedString(value) !== null);
}

function eventFieldValue(event = {}, key) {
  const payload = eventPayloadOf(event);
  switch (key) {
    case 'checkoutId':
      return normalizedString(payload.checkoutId ?? payload.checkout_id ?? event.checkoutId ?? event.checkout_id);
    case 'orderId':
      return normalizedString(payload.orderId ?? payload.order_id ?? event.orderId ?? event.order_id);
    case 'sessionId':
      return normalizedString(payload.sessionId ?? payload.session_id ?? event.sessionId ?? event.session_id);
    default:
      return null;
  }
}

function matchesExpectedEvent(event = {}, expectedResource = {}) {
  const expectedFields = expectedEventFields(expectedResource);
  if (expectedFields.length === 0) return true;
  return expectedFields.some(([key, expectedValue]) => eventFieldValue(event, key) === normalizedString(expectedValue));
}

function successMessageFor(event = {}) {
  const payload = eventPayloadOf(event);
  const orderId = normalizedString(payload.orderId ?? payload.order_id ?? event.orderId ?? event.order_id);
  const checkoutId = normalizedString(payload.checkoutId ?? payload.checkout_id ?? event.checkoutId ?? event.checkout_id);
  if (orderId) return `Payment succeeded for order ${orderId}.`;
  if (checkoutId) return `Payment succeeded for checkout ${checkoutId}.`;
  return 'Payment succeeded.';
}

export function classifyUcpPaymentSuccessEventObservation(observation = {}, expectedResource = {}) {
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  if (exitCode !== null && exitCode !== 0) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: `exit_${exitCode}_cli_error`,
    };
  }

  const data = unwrapCliEnvelope(observation.stdout ?? observation.data ?? observation.result ?? {});
  const events = Array.isArray(data.events) ? data.events : [];
  const successEvent = events.find((event) => (
    eventTypeOf(event) === 'agent_order.succeeded' && matchesExpectedEvent(event, expectedResource)
  ));

  if (successEvent) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_EVENT,
      terminal: true,
      reason: 'agent_order.succeeded',
      event: successEvent,
      message: successMessageFor(successEvent),
    };
  }

  if (data.timedOut === true || data.ready === false) {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_PENDING,
      action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
      terminal: false,
      reason: 'payment_success_event_timeout',
      resumeCommand: normalizedString(data.resumeCommand) || PAYMENT_SUCCESS_POLL_COMMAND,
    };
  }

  return {
    state: UcpCheckoutWorkflowState.CHECKOUT_PENDING,
    action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
    terminal: false,
    reason: 'payment_success_event_not_observed',
    resumeCommand: PAYMENT_SUCCESS_POLL_COMMAND,
  };
}

export function formatUcpCheckoutFsmMarker(workflow, marker = 'UCP_CHECKOUT_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
