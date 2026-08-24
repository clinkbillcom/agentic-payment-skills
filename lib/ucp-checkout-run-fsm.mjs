import { formatWorkflowMarker } from './workflow-marker.mjs';

export const UcpCheckoutRunState = Object.freeze({
  PURCHASE_CONFIRMATION_REQUIRED: 'PURCHASE_CONFIRMATION_REQUIRED',
  CHECKOUT_RUN_GATES_INCOMPLETE: 'CHECKOUT_RUN_GATES_INCOMPLETE',
  CHECKOUT_RUN_INPUT_INVALID: 'CHECKOUT_RUN_INPUT_INVALID',
  CHECKOUT_RUN_READY: 'CHECKOUT_RUN_READY',
  CHECKOUT_COMPLETED: 'CHECKOUT_COMPLETED',
  CHECKOUT_COMPLETE_IN_PROGRESS: 'CHECKOUT_COMPLETE_IN_PROGRESS',
  DIGITAL_DELIVERY_READY: 'DIGITAL_DELIVERY_READY',
  DIGITAL_DELIVERY_PENDING: 'DIGITAL_DELIVERY_PENDING',
  DIGITAL_DELIVERY_FAILED: 'DIGITAL_DELIVERY_FAILED',
  CHECKOUT_FAILED: 'CHECKOUT_FAILED',
  CLI_ERROR: 'CLI_ERROR',
});

export const UcpCheckoutRunAction = Object.freeze({
  ASK_FOR_PURCHASE_AUTHORIZATION: 'ASK_FOR_PURCHASE_AUTHORIZATION',
  ASK_FOR_PURCHASE_CONFIRMATION: 'ASK_FOR_PURCHASE_AUTHORIZATION',
  FIX_CHECKOUT_RUN_GATES: 'FIX_CHECKOUT_RUN_GATES',
  FIX_CHECKOUT_RUN_INPUT: 'FIX_CHECKOUT_RUN_INPUT',
  RUN_UCP_CHECKOUT: 'RUN_UCP_CHECKOUT',
  RETURN_UCP_CHECKOUT_COMPLETED: 'RETURN_UCP_CHECKOUT_COMPLETED',
  RETURN_UCP_DELIVERY_READY: 'RETURN_UCP_DELIVERY_READY',
  RETURN_UCP_DELIVERY_FAILED: 'RETURN_UCP_DELIVERY_FAILED',
  RESUME_UCP_CHECKOUT_READ_ONLY: 'RESUME_UCP_CHECKOUT_READ_ONLY',
  STOP_CHECKOUT_FAILURE: 'STOP_CHECKOUT_FAILURE',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

const INTERNAL_ROUTE = 'INTERNAL_UCP_CHECKOUT';
const EXTERNAL_ROUTE = 'EXTERNAL_UCP_CHECKOUT';
const DIGITAL_DELIVERY_MAX_WAIT_SECONDS = 900;
const CURRENCY_FRACTION_DIGIT_CACHE = new Map();
const REQUIRED_POSTAL_ADDRESS_FIELDS = Object.freeze([
  'street_address',
  'address_locality',
  'address_region',
  'address_country',
  'postal_code',
]);
const VALID_FULFILLMENT_TYPES = new Set([
  'PHYSICAL_GOODS_REQUIRES_SHIPPING',
  'NO_SHIPPING_REQUIRED',
]);
const REQUIRED_GATES = Object.freeze([
  ['productSelectionFrozen', [
    'productSelectionFrozen',
    'product_selection_frozen',
    'productResolved',
    'product_resolved',
  ]],
  ['fulfillmentAndAddressReady', [
    'fulfillmentAndAddressReady',
    'fulfillment_and_address_ready',
    'addressResolved',
    'address_resolved',
  ]],
  ['paymentInstrumentReady', [
    'paymentInstrumentReady',
    'payment_instrument_ready',
    'paymentInstrumentResolved',
    'payment_instrument_resolved',
  ]],
  ['authorizationGatePassed', [
    'authorizationGatePassed',
    'authorization_gate_passed',
    'instructionGatePassed',
    'instruction_gate_passed',
  ]],
  ['restrictedCategoryGatePassed', [
    'restrictedCategoryGatePassed',
    'restricted_category_gate_passed',
    'safetyGatePassed',
    'safety_gate_passed',
  ]],
  ['checkoutRouteResolved', [
    'checkoutRouteResolved',
    'checkout_route_resolved',
    'routeResolved',
    'route_resolved',
  ]],
]);

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

function firstDefined(input, aliases) {
  for (const alias of aliases) {
    if (input[alias] !== undefined) return input[alias];
  }
  return undefined;
}

function shellQuote(value) {
  const raw = String(value);
  if (/^[A-Za-z0-9_./:@%+=-]+$/u.test(raw)) return raw;
  return `'${raw.replaceAll("'", "'\\''")}'`;
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function canonicalJsonValue(value, path = '$', seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must contain only finite numbers`);
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`${path} contains a non-JSON value`);
  }
  if (seen.has(value)) throw new TypeError(`${path} contains a circular reference`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) => canonicalJsonValue(entry, `${path}[${index}]`, seen));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only plain JSON objects`);
    }
    const result = {};
    for (const key of Object.keys(value).sort()) {
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        value: canonicalJsonValue(value[key], `${path}.${key}`, seen),
        writable: true,
      });
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function validHttpUrl(value, { allowQuery = true } = {}) {
  const normalized = normalizedString(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!['http:', 'https:'].includes(url.protocol)
      || !url.hostname
      || url.username
      || url.password
      || url.hash
      || (!allowQuery && url.search)) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

function safeIdentifier(value) {
  const normalized = normalizedString(value);
  if (!normalized
    || normalized.length > 256
    || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizedRoute(value) {
  const route = normalizedString(value)?.toUpperCase();
  if (route === INTERNAL_ROUTE || route === EXTERNAL_ROUTE) return route;
  return null;
}

function normalizedCurrency(value) {
  const currency = normalizedString(value)?.toUpperCase();
  return currency && /^[A-Z]{3}$/u.test(currency) ? currency : null;
}

function normalizedMerchantCategoryCode(value) {
  const merchantCategoryCode = normalizedString(value);
  return merchantCategoryCode && /^\d{4}$/u.test(merchantCategoryCode)
    ? merchantCategoryCode
    : null;
}

function currencyFractionDigits(currency) {
  const cached = CURRENCY_FRACTION_DIGIT_CACHE.get(currency);
  if (cached !== undefined) return cached;
  try {
    const fractionDigits = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    CURRENCY_FRACTION_DIGIT_CACHE.set(currency, fractionDigits);
    return fractionDigits;
  } catch {
    throw new TypeError(`unsupported currency: ${currency}`);
  }
}

function validateMajorUnitAmount(value, currency, path) {
  if (typeof value !== 'string') {
    throw new TypeError(`${path} must be a positive major-unit decimal string`);
  }
  const raw = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/u.exec(raw);
  if (!match || !currency) {
    throw new TypeError(`${path} must be a positive major-unit decimal string`);
  }
  const integerPart = match[1];
  const fractionPart = match[2] ?? '';
  const fractionDigits = currencyFractionDigits(currency);
  if (/[1-9]/u.test(fractionPart.slice(fractionDigits))) {
    throw new TypeError(`${path} exceeds ${currency} currency precision`);
  }
  const scale = 10n ** BigInt(fractionDigits);
  const minorUnits = BigInt(integerPart) * scale
    + BigInt(fractionPart.slice(0, fractionDigits).padEnd(fractionDigits, '0') || '0');
  if (minorUnits <= 0n || minorUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError(`${path} is outside the safe positive amount range`);
  }
}

function normalizeLineItems(value, currency) {
  const parsed = parseMaybeJson(value);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new TypeError('lineItems must be a non-empty JSON array');
  }
  const lineItems = canonicalJsonValue(parsed, '$.lineItems');
  for (const [index, lineItem] of lineItems.entries()) {
    if (!lineItem || typeof lineItem !== 'object' || Array.isArray(lineItem)) {
      throw new TypeError(`lineItems[${index}] must be an object`);
    }
    const item = lineItem.item;
    if (!normalizedString(lineItem.id)) {
      throw new TypeError(`lineItems[${index}].id is required`);
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TypeError(`lineItems[${index}].item must be an object`);
    }
    for (const field of ['id', 'title']) {
      if (!normalizedString(item[field])) {
        throw new TypeError(`lineItems[${index}].item.${field} is required`);
      }
    }
    validateMajorUnitAmount(item.price, currency, `lineItems[${index}].item.price`);
    if (!Number.isSafeInteger(lineItem.quantity) || lineItem.quantity <= 0) {
      throw new TypeError(`lineItems[${index}].quantity must be a positive integer`);
    }
  }
  return lineItems;
}

function normalizedShippingAddress(value) {
  if (value === undefined || value === null) return null;
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('shippingAddress must be a JSON object');
  }
  const canonical = canonicalJsonValue(parsed, '$.shippingAddress');
  const normalized = { ...canonical };
  for (const field of REQUIRED_POSTAL_ADDRESS_FIELDS) {
    if (typeof canonical[field] !== 'string' || canonical[field].trim().length === 0) {
      throw new TypeError(`shippingAddress.${field} must be a non-empty string`);
    }
    normalized[field] = canonical[field].trim();
  }
  if (!/^[A-Za-z]{2}$/u.test(normalized.address_country)) {
    throw new TypeError('shippingAddress.address_country must be ISO 3166-1 alpha-2');
  }
  normalized.address_country = normalized.address_country.toUpperCase();
  return canonicalJsonValue(normalized, '$.shippingAddress');
}

function commandForFrozenRequest(frozenRequest) {
  return [
    'clink ucp-checkout run',
    `--endpoint ${shellQuote(frozenRequest.endpoint)}`,
    `--merchant-url ${shellQuote(frozenRequest.merchantUrl)}`,
    `--merchant-category-code ${shellQuote(frozenRequest.merchantCategoryCode)}`,
    `--currency ${shellQuote(frozenRequest.currency)}`,
    `--line-items ${shellQuote(JSON.stringify(frozenRequest.lineItems))}`,
    `--payment-instrument-id ${shellQuote(frozenRequest.paymentInstrumentId)}`,
    frozenRequest.shippingAddress
      ? `--shipping-address ${shellQuote(JSON.stringify(frozenRequest.shippingAddress))}`
      : null,
    '--confirm-purchase',
    frozenRequest.digitalDeliveryExpected ? '--wait-delivery --max-wait 900' : null,
    '--format json',
  ].filter(Boolean).join(' ');
}

function prepareRunRequest(input = {}) {
  const merchantUrl = validHttpUrl(
    input.merchantUrl ?? input.merchant_url ?? input.selectedItemUrl ?? input.selected_item_url,
  );
  const endpointInput = input.endpoint ?? input.checkoutEndpoint ?? input.checkout_endpoint;
  const endpoint = validHttpUrl(endpointInput, { allowQuery: false });
  const checkoutRoute = normalizedRoute(input.checkoutRoute ?? input.checkout_route ?? input.route);
  const merchantCategoryCode = normalizedMerchantCategoryCode(
    input.merchantCategoryCode ?? input.merchant_category_code ?? input.mcc,
  );
  const currency = normalizedCurrency(input.currency);
  const paymentInstrumentId = safeIdentifier(
    input.paymentInstrumentId ?? input.payment_instrument_id,
  );
  const fulfillmentType = normalizedString(
    input.fulfillmentType ?? input.fulfillment_type,
  )?.toUpperCase() ?? null;
  const digitalDeliveryInput = input.digitalDeliveryExpected
    ?? input.digital_delivery_expected
    ?? false;
  const digitalDeliveryExpected = digitalDeliveryInput === true;

  const invalid = [];
  if (!merchantUrl) invalid.push('merchantUrl');
  if (!checkoutRoute) invalid.push('checkoutRoute');
  if (!endpoint) invalid.push('endpoint');
  if (!merchantCategoryCode) invalid.push('merchantCategoryCode');
  if (!currency) invalid.push('currency');
  if (!paymentInstrumentId) invalid.push('paymentInstrumentId');
  if (typeof digitalDeliveryInput !== 'boolean') invalid.push('digitalDeliveryExpected');
  if (!fulfillmentType || !VALID_FULFILLMENT_TYPES.has(fulfillmentType)) {
    invalid.push('fulfillmentType');
  }

  let lineItems = null;
  try {
    lineItems = normalizeLineItems(input.lineItems ?? input.line_items, currency);
  } catch {
    invalid.push('lineItems');
  }

  let shippingAddress = null;
  try {
    shippingAddress = normalizedShippingAddress(
      input.shippingAddress ?? input.shipping_address,
    );
  } catch {
    invalid.push('shippingAddress');
  }
  if (fulfillmentType === 'PHYSICAL_GOODS_REQUIRES_SHIPPING' && !shippingAddress) {
    invalid.push('shippingAddress');
  }
  if (
    digitalDeliveryExpected
    && booleanValue(
      input.digitalDeliveryContractVerified ?? input.digital_delivery_contract_verified,
    ) !== true
  ) {
    invalid.push('digitalDeliveryContractVerified');
  }

  if (invalid.length > 0) {
    return { ok: false, invalid: [...new Set(invalid)] };
  }

  const frozenRequest = deepFreeze({
    checkoutRoute,
    merchantUrl,
    endpoint,
    merchantCategoryCode,
    currency,
    lineItems,
    paymentInstrumentId,
    fulfillmentType,
    shippingAddress,
    digitalDeliveryExpected,
    maxWaitSeconds: digitalDeliveryExpected ? DIGITAL_DELIVERY_MAX_WAIT_SECONDS : null,
  });
  return {
    ok: true,
    frozenRequest,
    command: commandForFrozenRequest(frozenRequest),
  };
}

export function buildUcpCheckoutRunCommand(input = {}) {
  const prepared = prepareRunRequest(input);
  if (!prepared.ok) {
    throw new TypeError(`invalid ucp-checkout run request: ${prepared.invalid.join(', ')}`);
  }
  return prepared.command;
}

export function classifyUcpCheckoutRunRequest(input = {}) {
  if (booleanValue(
    input.explicitPurchaseAuthorized
      ?? input.explicit_purchase_authorized
      ?? input.purchaseConfirmed
      ?? input.purchase_confirmed,
  ) !== true) {
    return {
      state: UcpCheckoutRunState.PURCHASE_CONFIRMATION_REQUIRED,
      action: UcpCheckoutRunAction.ASK_FOR_PURCHASE_AUTHORIZATION,
      terminal: false,
      reason: 'explicit_purchase_confirmation_required',
      missing: ['explicitPurchaseAuthorized'],
    };
  }

  const missingGates = REQUIRED_GATES
    .filter(([, aliases]) => booleanValue(firstDefined(input, aliases)) !== true)
    .map(([field]) => field);
  if (missingGates.length > 0) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_RUN_GATES_INCOMPLETE,
      action: UcpCheckoutRunAction.FIX_CHECKOUT_RUN_GATES,
      terminal: false,
      reason: 'checkout_run_gates_incomplete',
      missing: missingGates,
    };
  }

  const prepared = prepareRunRequest(input);
  if (!prepared.ok) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID,
      action: UcpCheckoutRunAction.FIX_CHECKOUT_RUN_INPUT,
      terminal: false,
      reason: 'checkout_run_input_invalid',
      invalid: prepared.invalid,
    };
  }

  return {
    state: UcpCheckoutRunState.CHECKOUT_RUN_READY,
    action: UcpCheckoutRunAction.RUN_UCP_CHECKOUT,
    terminal: false,
    reason: 'checkout_run_ready',
    command: prepared.command,
    runCommand: prepared.command,
    frozenRequest: prepared.frozenRequest,
    expectedRun: prepared.frozenRequest,
  };
}

export function classifyUcpCheckoutRunPrerequisites(input = {}) {
  return classifyUcpCheckoutRunRequest(input);
}

function parseShellWords(command) {
  const raw = normalizedString(command);
  if (!raw || /[\r\n\0]/u.test(raw)) return null;
  const words = [];
  let word = '';
  let active = false;
  let quote = null;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (quote === "'") {
      if (character === "'") quote = null;
      else word += character;
      active = true;
      continue;
    }
    if (quote === '"') {
      if (character === '"') {
        quote = null;
      } else if (character === '\\') {
        index += 1;
        if (index >= raw.length) return null;
        word += raw[index];
      } else {
        if (character === '$' || character === '`') return null;
        word += character;
      }
      active = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      active = true;
      continue;
    }
    if (/\s/u.test(character)) {
      if (active) {
        words.push(word);
        word = '';
        active = false;
      }
      continue;
    }
    if (';&|<>()`$'.includes(character)) return null;
    if (character === '\\') {
      index += 1;
      if (index >= raw.length) return null;
      word += raw[index];
      active = true;
      continue;
    }
    word += character;
    active = true;
  }
  if (quote !== null) return null;
  if (active) words.push(word);
  return words;
}

function parseStrictOptions(tokens, allowedOptions) {
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const name = tokens[index];
    if (!allowedOptions.has(name) || options[name] !== undefined) return null;
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) return null;
    options[name] = value;
    index += 1;
  }
  return options;
}

export function classifyUcpCheckoutResumeCommand(command) {
  const words = parseShellWords(command);
  if (!words || words[0] !== 'clink') {
    return { safe: false, reason: 'resume_command_invalid_shell' };
  }

  if (words[1] === 'ucp-checkout' && words[2] === 'get') {
    const options = parseStrictOptions(
      words.slice(3),
      new Set(['--endpoint', '--checkout-id', '--format']),
    );
    if (
      !options
      || !normalizedString(options['--checkout-id'])
      || !options['--endpoint']
      || options['--format'] !== 'json'
      || !validHttpUrl(options['--endpoint'], { allowQuery: false })
    ) {
      return { safe: false, reason: 'checkout_resume_command_invalid' };
    }
    return {
      safe: true,
      kind: 'CHECKOUT_GET',
      checkoutId: options['--checkout-id'],
      endpoint: options['--endpoint'] ?? null,
      command,
    };
  }

  if (words[1] === 'ucp-order' && words[2] === 'wait-delivery') {
    const options = parseStrictOptions(
      words.slice(3),
      new Set(['--order-id', '--max-wait', '--format']),
    );
    if (
      !options
      || !normalizedString(options['--order-id'])
      || options['--max-wait'] !== String(DIGITAL_DELIVERY_MAX_WAIT_SECONDS)
      || options['--format'] !== 'json'
    ) {
      return { safe: false, reason: 'delivery_resume_command_invalid' };
    }
    return {
      safe: true,
      kind: 'DELIVERY_WAIT',
      ucpOrderId: options['--order-id'],
      maxWaitSeconds: DIGITAL_DELIVERY_MAX_WAIT_SECONDS,
      command,
    };
  }

  return { safe: false, reason: 'resume_command_is_not_read_only' };
}

function invalidObservation(reason, fields = {}) {
  return {
    state: UcpCheckoutRunState.CLI_ERROR,
    action: UcpCheckoutRunAction.SURFACE_ERROR,
    terminal: true,
    paymentConfirmed: false,
    mutationRetryAllowed: false,
    createRetryAllowed: false,
    completeRetryAllowed: false,
    paymentRetryAllowed: false,
    reason,
    ...fields,
  };
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function consistentIdentifier(values) {
  const present = values.filter((value) => value !== undefined && value !== null);
  if (present.some((value) => typeof value !== 'string' || value.trim().length === 0)) {
    return { valid: false, value: null };
  }
  const unique = [...new Set(present.map((value) => value.trim()))];
  return {
    valid: unique.length <= 1,
    value: unique.length === 1 ? unique[0] : null,
  };
}

function responseIdentity(data) {
  const checkout = consistentIdentifier([
    data.checkoutId,
    data.checkout_id,
    data.create?.id,
    data.create?.checkoutId,
    data.create?.checkout_id,
    data.complete?.id,
    data.complete?.checkoutId,
    data.complete?.checkout_id,
  ]);
  const order = consistentIdentifier([
    data.orderId,
    data.order_id,
    data.order?.id,
    data.order?.orderId,
    data.order?.order_id,
    data.complete?.order?.id,
    data.complete?.order?.orderId,
    data.complete?.order?.order_id,
  ]);
  return { checkout, order };
}

function objectStatus(value) {
  return plainObject(value) ? normalizedString(value.status)?.toLowerCase() ?? null : null;
}

function aggregateStageEvidenceError(data, stage, status) {
  if (!plainObject(data.create)) return 'checkout_run_create_evidence_missing';
  const createStatus = objectStatus(data.create);
  if (!createStatus) return 'checkout_run_create_status_invalid';
  if (stage === 'create' && createStatus !== status) {
    return 'checkout_run_create_status_mismatch';
  }
  if (stage !== 'create' && createStatus !== 'ready_for_complete') {
    return 'checkout_run_create_status_mismatch';
  }

  if (stage === 'complete' || stage === 'delivery') {
    if (!plainObject(data.complete)) return 'checkout_run_complete_evidence_missing';
    const completeStatus = objectStatus(data.complete);
    if (!completeStatus) return 'checkout_run_complete_status_invalid';
    if (stage === 'complete' && completeStatus !== status) {
      return 'checkout_run_complete_status_mismatch';
    }
    if (stage === 'delivery' && completeStatus !== 'completed') {
      return 'checkout_run_delivery_complete_not_completed';
    }
  }

  if (stage === 'delivery') {
    const deliveries = [data.delivery, data.order?.digital_delivery]
      .filter((delivery) => delivery !== undefined && delivery !== null);
    if (deliveries.length === 0 || deliveries.some((delivery) => !plainObject(delivery))) {
      return 'digital_delivery_result_invalid';
    }
    const deliveryStatuses = deliveries.map(objectStatus);
    if (deliveryStatuses.some((deliveryStatus) => !deliveryStatus)) {
      return 'digital_delivery_status_invalid';
    }
    if (new Set(deliveryStatuses).size !== 1) return 'digital_delivery_status_mismatch';
    const [deliveryStatus] = deliveryStatuses;
    if (['ready', 'failed'].includes(status) && deliveryStatus !== status) {
      return 'digital_delivery_status_mismatch';
    }
    if (status === 'timeout' && !['pending', 'syncing', 'retryable'].includes(deliveryStatus)) {
      return 'digital_delivery_status_mismatch';
    }
    if (
      ['pending', 'syncing', 'retryable'].includes(status)
      && !['pending', 'syncing', 'retryable'].includes(deliveryStatus)
    ) {
      return 'digital_delivery_status_mismatch';
    }
  }
  return null;
}

function attemptsValid(data, stage) {
  if (!plainObject(data.attempts)) return false;
  if (data.attempts.create !== 1 || ![0, 1].includes(data.attempts.complete)) return false;
  if (stage === 'create') return data.attempts.complete === 0;
  if (data.attempts.complete !== 1) return false;
  if (stage === 'delivery') {
    return Number.isSafeInteger(data.attempts.delivery) && data.attempts.delivery >= 1;
  }
  return data.attempts.delivery === undefined;
}

function baseResult(data, stage, status, identity, endpoint) {
  return {
    stage,
    status,
    checkoutStatus: stage === 'delivery' ? 'COMPLETED' : status.toUpperCase(),
    ...(identity.checkout.value ? { checkoutId: identity.checkout.value } : {}),
    ...(identity.order.value
      ? { ucpOrderId: identity.order.value, omsOrderId: identity.order.value }
      : {}),
    endpoint,
    attempts: data.attempts,
    mutationRetryAllowed: false,
    createRetryAllowed: false,
    completeRetryAllowed: false,
    paymentRetryAllowed: false,
  };
}

function checkoutResumeContext(fields, expectedRequest, resumeCommand) {
  return deepFreeze({
    kind: 'CHECKOUT_GET',
    checkoutId: fields.checkoutId,
    endpoint: fields.endpoint,
    digitalDeliveryExpected: expectedRequest.digitalDeliveryExpected === true,
    maxWaitSeconds: expectedRequest.digitalDeliveryExpected === true
      ? DIGITAL_DELIVERY_MAX_WAIT_SECONDS
      : null,
    resumeCommand,
  });
}

function deliveryResumeContext(fields, resumeCommand) {
  return deepFreeze({
    kind: 'DELIVERY_WAIT',
    checkoutId: fields.checkoutId ?? null,
    endpoint: fields.endpoint ?? null,
    ucpOrderId: fields.ucpOrderId,
    maxWaitSeconds: DIGITAL_DELIVERY_MAX_WAIT_SECONDS,
    paymentConfirmed: true,
    resumeCommand,
  });
}

function readOnlyCheckoutResume(data, fields, expectedRequest) {
  const resumeCommand = normalizedString(data.resumeCommand ?? data.resume_command);
  const resume = classifyUcpCheckoutResumeCommand(resumeCommand);
  if (!resume.safe) return invalidObservation(resume.reason, fields);
  if (resume.kind !== 'CHECKOUT_GET') {
    return invalidObservation('checkout_pending_resume_is_not_checkout_get', fields);
  }
  if (!fields.checkoutId || resume.checkoutId !== fields.checkoutId) {
    return invalidObservation('checkout_pending_resume_checkout_id_mismatch', fields);
  }
  if (resume.endpoint !== fields.endpoint) {
    return invalidObservation('checkout_pending_resume_endpoint_mismatch', fields);
  }
  return {
    state: UcpCheckoutRunState.CHECKOUT_COMPLETE_IN_PROGRESS,
    action: UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY,
    terminal: false,
    paymentConfirmed: false,
    reason: `checkout_${fields.stage}_${fields.status}`,
    ...fields,
    readOnlyResumeAllowed: true,
    resumeCommand,
    resumeContext: checkoutResumeContext(fields, expectedRequest, resumeCommand),
  };
}

function readOnlyDeliveryResume(data, fields, reason = 'digital_delivery_wait_timed_out') {
  const resumeCommand = normalizedString(data.resumeCommand ?? data.resume_command);
  const resume = classifyUcpCheckoutResumeCommand(resumeCommand);
  if (!resume.safe) return invalidObservation(resume.reason, fields);
  if (resume.kind !== 'DELIVERY_WAIT') {
    return invalidObservation('delivery_pending_resume_is_not_delivery_wait', fields);
  }
  if (!fields.ucpOrderId || resume.ucpOrderId !== fields.ucpOrderId) {
    return invalidObservation('delivery_pending_resume_order_id_mismatch', fields);
  }
  return {
    state: UcpCheckoutRunState.DIGITAL_DELIVERY_PENDING,
    action: UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY,
    terminal: false,
    paymentConfirmed: true,
    deliveryStatus: 'PENDING',
    reason,
    ...fields,
    order: data.order,
    delivery: data.delivery ?? data.order?.digital_delivery ?? null,
    readOnlyResumeAllowed: true,
    resumeCommand,
    resumeContext: deliveryResumeContext(fields, resumeCommand),
  };
}

function parsedSuccessData(observation, failurePrefix) {
  const exitCodeRaw = observation.exitCode ?? observation.exit_code ?? observation.code;
  const exitCode = exitCodeRaw === undefined || exitCodeRaw === null || exitCodeRaw === ''
    ? null
    : Number(exitCodeRaw);
  const raw = parseMaybeJson(
    observation.stdout ?? observation.data ?? observation.result ?? observation.stderr,
  );
  const validEnvelope = raw && typeof raw === 'object' && !Array.isArray(raw)
    && raw.ok === true && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data);
  if ((exitCode !== null && exitCode !== 0) || !validEnvelope) {
    return {
      ok: false,
      result: invalidObservation(
        exitCode !== null && exitCode !== 0
          ? `${failurePrefix}_exit_${exitCode}`
          : `${failurePrefix}_invalid_success_envelope`,
      ),
    };
  }
  return { ok: true, data: raw.data };
}

function validateResumeContext(continuation, expectedKind) {
  if (!plainObject(continuation) || continuation.kind !== expectedKind) return null;
  const resumeCommand = normalizedString(continuation.resumeCommand);
  const resume = classifyUcpCheckoutResumeCommand(resumeCommand);
  if (!resume.safe || resume.kind !== expectedKind) return null;
  if (expectedKind === 'CHECKOUT_GET') {
    const checkoutId = safeIdentifier(continuation.checkoutId);
    const endpoint = validHttpUrl(continuation.endpoint, { allowQuery: false });
    if (!checkoutId || !endpoint || resume.checkoutId !== checkoutId || resume.endpoint !== endpoint) {
      return null;
    }
    return {
      ...continuation,
      checkoutId,
      endpoint,
      digitalDeliveryExpected: continuation.digitalDeliveryExpected === true,
      maxWaitSeconds: continuation.digitalDeliveryExpected === true
        ? DIGITAL_DELIVERY_MAX_WAIT_SECONDS
        : null,
      resumeCommand,
    };
  }
  const ucpOrderId = safeIdentifier(continuation.ucpOrderId);
  const checkoutId = safeIdentifier(continuation.checkoutId);
  const endpoint = validHttpUrl(continuation.endpoint, { allowQuery: false });
  if (
    !ucpOrderId
    || !checkoutId
    || !endpoint
    || continuation.paymentConfirmed !== true
    || resume.ucpOrderId !== ucpOrderId
    || resume.maxWaitSeconds !== DIGITAL_DELIVERY_MAX_WAIT_SECONDS
  ) {
    return null;
  }
  return {
    ...continuation,
    checkoutId,
    endpoint,
    ucpOrderId,
    maxWaitSeconds: DIGITAL_DELIVERY_MAX_WAIT_SECONDS,
    paymentConfirmed: true,
    resumeCommand,
  };
}

function checkoutResumeFields(data, continuation) {
  const checkout = consistentIdentifier([data.id, data.checkoutId, data.checkout_id]);
  if (!checkout.valid || checkout.value !== continuation.checkoutId) return null;
  const order = consistentIdentifier([
    data.orderId,
    data.order_id,
    data.order?.id,
    data.order?.orderId,
    data.order?.order_id,
  ]);
  if (!order.valid) return null;
  return {
    checkoutId: checkout.value,
    ...(order.value ? { ucpOrderId: order.value, omsOrderId: order.value } : {}),
    endpoint: continuation.endpoint,
    checkoutStatus: normalizedString(
      data.status ?? data.state ?? data.checkoutStatus ?? data.checkout_status,
    )?.toUpperCase() ?? null,
    mutationRetryAllowed: false,
    createRetryAllowed: false,
    completeRetryAllowed: false,
    paymentRetryAllowed: false,
  };
}

function deliveryResumeCommand(orderId) {
  return [
    'clink ucp-order wait-delivery',
    `--order-id ${shellQuote(orderId)}`,
    `--max-wait ${DIGITAL_DELIVERY_MAX_WAIT_SECONDS}`,
    '--format json',
  ].join(' ');
}

function classifyCheckoutGetResumeObservation(data, continuation) {
  const fields = checkoutResumeFields(data, continuation);
  if (!fields || !fields.checkoutStatus) {
    return invalidObservation('checkout_resume_identity_or_status_invalid');
  }
  const status = fields.checkoutStatus.toLowerCase();
  if (['complete_in_progress', 'processing', 'pending', 'ready_for_complete'].includes(status)) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_COMPLETE_IN_PROGRESS,
      action: UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY,
      terminal: false,
      paymentConfirmed: false,
      reason: `checkout_resume_${status}`,
      ...fields,
      readOnlyResumeAllowed: true,
      resumeCommand: continuation.resumeCommand,
      resumeContext: deepFreeze({ ...continuation }),
    };
  }
  if ([
    'failed',
    'canceled',
    'cancelled',
    'expired',
    'rejected',
    'requires_escalation',
  ].includes(status)) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_FAILED,
      action: UcpCheckoutRunAction.STOP_CHECKOUT_FAILURE,
      terminal: true,
      paymentConfirmed: false,
      reason: `checkout_resume_${status}`,
      ...fields,
      checkout: data,
    };
  }
  if (status !== 'completed') {
    return invalidObservation(`checkout_resume_status_${status}_invalid`, fields);
  }

  if (continuation.digitalDeliveryExpected === true && fields.ucpOrderId) {
    const resumeCommand = deliveryResumeCommand(fields.ucpOrderId);
    return {
      state: UcpCheckoutRunState.DIGITAL_DELIVERY_PENDING,
      action: UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY,
      terminal: false,
      paymentConfirmed: true,
      deliveryStatus: 'PENDING',
      reason: 'checkout_resume_completed_delivery_wait_required',
      ...fields,
      checkout: data,
      readOnlyResumeAllowed: true,
      resumeCommand,
      resumeContext: deliveryResumeContext(fields, resumeCommand),
    };
  }

  return {
    state: UcpCheckoutRunState.CHECKOUT_COMPLETED,
    action: UcpCheckoutRunAction.RETURN_UCP_CHECKOUT_COMPLETED,
    terminal: true,
    paymentConfirmed: true,
    reason: continuation.digitalDeliveryExpected === true
      ? 'digital_delivery_wait_not_started'
      : 'checkout_completed_after_read_only_resume',
    ...fields,
    checkout: data,
    order: plainObject(data.order) ? data.order : null,
    ...(continuation.digitalDeliveryExpected === true
      ? {
        deliveryConfirmed: false,
        warning: 'Payment completed, but digital delivery could not be started without an order ID.',
      }
      : {}),
  };
}

function classifyDeliveryWaitResumeObservation(data, continuation) {
  if (!plainObject(data.order)) return invalidObservation('delivery_resume_order_invalid');
  const order = consistentIdentifier([
    data.order.id,
    data.order.orderId,
    data.order.order_id,
  ]);
  if (!order.valid || order.value !== continuation.ucpOrderId) {
    return invalidObservation('delivery_resume_order_id_mismatch');
  }
  const deliveryStatus = normalizedString(
    data.deliveryStatus ?? data.delivery_status ?? data.order.digital_delivery?.status,
  )?.toLowerCase();
  const ready = booleanValue(data.ready);
  const timedOut = booleanValue(data.timedOut ?? data.timed_out);
  if (!deliveryStatus || ready === null || timedOut === null) {
    return invalidObservation('delivery_resume_status_invalid');
  }
  const fields = {
    checkoutId: continuation.checkoutId,
    ucpOrderId: continuation.ucpOrderId,
    omsOrderId: continuation.ucpOrderId,
    endpoint: continuation.endpoint,
    checkoutStatus: 'COMPLETED',
    mutationRetryAllowed: false,
    createRetryAllowed: false,
    completeRetryAllowed: false,
    paymentRetryAllowed: false,
  };
  const delivery = data.order.digital_delivery ?? null;

  if (deliveryStatus === 'ready' && ready === true && timedOut === false) {
    if (!plainObject(delivery)
      || !Array.isArray(delivery.artifacts)
      || delivery.artifacts.length === 0) {
      return invalidObservation('delivery_resume_ready_artifacts_missing', fields);
    }
    return {
      state: UcpCheckoutRunState.DIGITAL_DELIVERY_READY,
      action: UcpCheckoutRunAction.RETURN_UCP_DELIVERY_READY,
      terminal: true,
      paymentConfirmed: true,
      deliveryConfirmed: true,
      deliveryStatus: 'READY',
      reason: 'digital_delivery_ready_after_read_only_resume',
      ...fields,
      order: data.order,
      delivery,
    };
  }
  if (deliveryStatus === 'failed' && ready === false && timedOut === false) {
    return {
      state: UcpCheckoutRunState.DIGITAL_DELIVERY_FAILED,
      action: UcpCheckoutRunAction.RETURN_UCP_DELIVERY_FAILED,
      terminal: true,
      paymentConfirmed: true,
      deliveryStatus: 'FAILED',
      reason: 'digital_delivery_failed_after_read_only_resume',
      ...fields,
      order: data.order,
      delivery,
      warning: 'Payment completed, but digital delivery failed.',
    };
  }
  if (deliveryStatus === 'pending' && ready === false && timedOut === true) {
    const resumeCommand = normalizedString(data.resumeCommand ?? data.resume_command);
    const resume = classifyUcpCheckoutResumeCommand(resumeCommand);
    if (
      !resume.safe
      || resume.kind !== 'DELIVERY_WAIT'
      || resume.ucpOrderId !== continuation.ucpOrderId
      || resume.maxWaitSeconds !== DIGITAL_DELIVERY_MAX_WAIT_SECONDS
    ) {
      return invalidObservation('delivery_resume_command_invalid', fields);
    }
    return {
      state: UcpCheckoutRunState.DIGITAL_DELIVERY_PENDING,
      action: UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY,
      terminal: false,
      paymentConfirmed: true,
      deliveryStatus: 'PENDING',
      reason: 'digital_delivery_wait_timed_out',
      ...fields,
      order: data.order,
      delivery,
      readOnlyResumeAllowed: true,
      resumeCommand,
      resumeContext: deliveryResumeContext(fields, resumeCommand),
    };
  }
  return invalidObservation('delivery_resume_status_conflict', fields);
}

export function classifyUcpCheckoutRunResumeObservation(observation = {}, continuation = {}) {
  const parsed = parsedSuccessData(observation, 'checkout_run_resume');
  if (!parsed.ok) return parsed.result;
  const checkoutContinuation = validateResumeContext(continuation, 'CHECKOUT_GET');
  if (checkoutContinuation) {
    return classifyCheckoutGetResumeObservation(parsed.data, checkoutContinuation);
  }
  const deliveryContinuation = validateResumeContext(continuation, 'DELIVERY_WAIT');
  if (deliveryContinuation) {
    return classifyDeliveryWaitResumeObservation(parsed.data, deliveryContinuation);
  }
  return invalidObservation('checkout_run_resume_context_invalid');
}

export function classifyUcpCheckoutRunObservation(observation = {}, expected = {}) {
  const parsed = parsedSuccessData(observation, 'checkout_run');
  if (!parsed.ok) return parsed.result;

  const expectedRequest = expected.frozenRequest ?? expected;
  const data = parsed.data;
  const stage = normalizedString(data.stage)?.toLowerCase();
  const status = normalizedString(data.status)?.toLowerCase();
  if (!['create', 'complete', 'delivery'].includes(stage) || !status) {
    return invalidObservation('checkout_run_stage_or_status_invalid');
  }
  if (!attemptsValid(data, stage)) return invalidObservation('checkout_run_attempt_count_invalid');

  const endpoint = validHttpUrl(data.endpoint, { allowQuery: false });
  const expectedEndpoint = expectedRequest.endpoint
    ? validHttpUrl(expectedRequest.endpoint, { allowQuery: false })
    : null;
  if (!endpoint || !expectedEndpoint || endpoint !== expectedEndpoint) {
    return invalidObservation('checkout_run_endpoint_mismatch', {
      expectedEndpoint,
      observedEndpoint: endpoint,
    });
  }

  const identity = responseIdentity(data);
  if (!identity.checkout.valid || !identity.order.valid || !identity.checkout.value) {
    return invalidObservation('checkout_run_identifier_invalid');
  }
  const stageEvidenceError = aggregateStageEvidenceError(data, stage, status);
  if (stageEvidenceError) return invalidObservation(stageEvidenceError);
  const fields = baseResult(data, stage, status, identity, endpoint);
  const expectedDigitalDelivery = expectedRequest.digitalDeliveryExpected === true;

  if (stage === 'delivery') {
    if (!expectedDigitalDelivery) return invalidObservation('unexpected_digital_delivery_result', fields);
    if (!identity.order.value || !plainObject(data.order)) {
      return invalidObservation('digital_delivery_order_invalid', fields);
    }
    const delivery = data.delivery ?? data.order.digital_delivery;
    if (!plainObject(delivery)) return invalidObservation('digital_delivery_result_invalid', fields);

    if (['timeout', 'pending', 'syncing', 'retryable'].includes(status)) {
      return readOnlyDeliveryResume(
        data,
        fields,
        status === 'timeout' ? 'digital_delivery_wait_timed_out' : 'digital_delivery_pending',
      );
    }
    if (status === 'failed') {
      return {
        state: UcpCheckoutRunState.DIGITAL_DELIVERY_FAILED,
        action: UcpCheckoutRunAction.RETURN_UCP_DELIVERY_FAILED,
        terminal: true,
        paymentConfirmed: true,
        deliveryStatus: 'FAILED',
        reason: 'digital_delivery_failed',
        ...fields,
        order: data.order,
        delivery,
        warning: 'Payment completed, but digital delivery failed.',
      };
    }
    if (status === 'ready') {
      if (!Array.isArray(delivery.artifacts) || delivery.artifacts.length === 0) {
        return invalidObservation('digital_delivery_ready_artifacts_missing', fields);
      }
      return {
        state: UcpCheckoutRunState.DIGITAL_DELIVERY_READY,
        action: UcpCheckoutRunAction.RETURN_UCP_DELIVERY_READY,
        terminal: true,
        paymentConfirmed: true,
        deliveryConfirmed: true,
        deliveryStatus: 'READY',
        reason: 'digital_delivery_ready',
        ...fields,
        order: data.order,
        delivery,
      };
    }
    return invalidObservation(`digital_delivery_status_${status}_invalid`, fields);
  }

  if (['complete_in_progress', 'processing', 'pending'].includes(status)) {
    return readOnlyCheckoutResume(data, fields, expectedRequest);
  }
  if ([
    'failed',
    'canceled',
    'cancelled',
    'expired',
    'rejected',
    'requires_escalation',
  ].includes(status)) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_FAILED,
      action: UcpCheckoutRunAction.STOP_CHECKOUT_FAILURE,
      terminal: true,
      paymentConfirmed: false,
      reason: `checkout_${stage}_${status}`,
      ...fields,
    };
  }
  if (status !== 'completed') {
    return invalidObservation(`checkout_${stage}_status_${status}_invalid`, fields);
  }

  if (expectedDigitalDelivery) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_COMPLETED,
      action: UcpCheckoutRunAction.RETURN_UCP_CHECKOUT_COMPLETED,
      terminal: true,
      paymentConfirmed: true,
      deliveryConfirmed: false,
      checkoutStatus: 'COMPLETED',
      reason: 'digital_delivery_wait_not_started',
      ...fields,
      order: plainObject(data.order) ? data.order : null,
      warning: normalizedString(data.deliveryWait?.reason)
        ?? 'Payment completed, but digital delivery could not be verified.',
    };
  }

  return {
    state: UcpCheckoutRunState.CHECKOUT_COMPLETED,
    action: UcpCheckoutRunAction.RETURN_UCP_CHECKOUT_COMPLETED,
    terminal: true,
    paymentConfirmed: true,
    checkoutStatus: 'COMPLETED',
    reason: stage === 'create' ? 'checkout_completed_during_create' : 'checkout_completed',
    ...fields,
    order: plainObject(data.order) ? data.order : null,
  };
}

export function formatUcpCheckoutRunFsmMarker(workflow, marker = 'UCP_CHECKOUT_RUN_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
