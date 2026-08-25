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
  ['checkoutExecutionClaimed', [
    'checkoutExecutionClaimed',
    'checkout_execution_claimed',
    'executionClaimed',
    'execution_claimed',
  ]],
]);

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function suppliedAliasValues(input, aliases) {
  return aliases
    .filter((alias) => Object.hasOwn(input, alias))
    .map((alias) => input[alias]);
}

function consistentScalarAliases(input, aliases, normalize) {
  const supplied = suppliedAliasValues(input, aliases);
  if (supplied.length === 0) return { valid: true, value: undefined };
  const normalized = supplied.map(normalize);
  if (normalized.some((value) => value === null || value === undefined)) {
    return { valid: false, value: null };
  }
  const unique = [...new Set(normalized)];
  return {
    valid: unique.length === 1,
    value: unique.length === 1 ? unique[0] : null,
  };
}

function exactBooleanAliases(input, aliases) {
  return consistentScalarAliases(
    input,
    aliases,
    (value) => (typeof value === 'boolean' ? value : null),
  );
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

function canonicalHttpsEndpoint(value) {
  const normalized = normalizedString(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (
      url.protocol !== 'https:'
      || !url.hostname
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null;
    }
    url.pathname = url.pathname.replace(/\/+$/u, '');
    return url.toString().replace(/\/$/u, '');
  } catch {
    return null;
  }
}

function canonicalHttpsOrigin(value) {
  const normalized = normalizedString(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (
      url.protocol !== 'https:'
      || !url.hostname
      || url.username
      || url.password
      || url.search
      || url.hash
      || !['', '/'].includes(url.pathname)
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function sameHttpOrigin(left, right) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
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

function validateMajorUnitAmount(
  value,
  currency,
  path,
  { allowZero = false, requireString = false } = {},
) {
  if (requireString && typeof value !== 'string') {
    throw new TypeError(`${path} must be a positive major-unit decimal string`);
  }
  let raw;
  if (typeof value === 'string') {
    raw = value.trim();
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    raw = String(value);
    if (/e/iu.test(raw)) throw new TypeError(`${path} must be a plain decimal amount`);
  } else {
    throw new TypeError(`${path} must be a decimal amount`);
  }
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/u.exec(raw);
  if (!match || !currency) {
    throw new TypeError(`${path} must be a decimal amount`);
  }
  if (match[1] === '-') throw new TypeError(`${path} must be a non-negative amount`);
  const integerPart = match[2];
  const fractionPart = match[3] ?? '';
  const fractionDigits = currencyFractionDigits(currency);
  if (/[1-9]/u.test(fractionPart.slice(fractionDigits))) {
    throw new TypeError(`${path} exceeds ${currency} currency precision`);
  }
  const scale = 10n ** BigInt(fractionDigits);
  const minorUnits = BigInt(integerPart) * scale
    + BigInt(fractionPart.slice(0, fractionDigits).padEnd(fractionDigits, '0') || '0');
  if (
    minorUnits < 0n
    || (!allowZero && minorUnits === 0n)
    || minorUnits > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new TypeError(`${path} is outside the safe amount range`);
  }
}

function validateNestedMoneyFields(value, currency, path) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      validateNestedMoneyFields(entry, currency, `${path}[${index}]`);
    });
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, fieldValue] of Object.entries(value)) {
    const fieldPath = `${path}.${key}`;
    if (key === 'amount' || key === 'price') {
      validateMajorUnitAmount(fieldValue, currency, fieldPath, {
        allowZero: true,
        requireString: true,
      });
    }
    if (fieldValue && typeof fieldValue === 'object') {
      validateNestedMoneyFields(fieldValue, currency, fieldPath);
    }
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
    validateMajorUnitAmount(item.price, currency, `lineItems[${index}].item.price`, {
      requireString: true,
    });
    if (!Number.isSafeInteger(lineItem.quantity) || lineItem.quantity <= 0) {
      throw new TypeError(`lineItems[${index}].quantity must be a positive integer`);
    }
  }
  validateNestedMoneyFields(lineItems, currency, '$.lineItems');
  return lineItems;
}

function normalizedBuyer(value) {
  if (value === undefined || value === null) return null;
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('buyer must be a JSON object');
  }
  return canonicalJsonValue(parsed, '$.buyer');
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
    `CLINK_BASE_URL=${shellQuote(frozenRequest.walletBaseUrl)} clink ucp-checkout run`,
    `--endpoint ${shellQuote(frozenRequest.endpoint)}`,
    `--merchant-url ${shellQuote(frozenRequest.merchantUrl)}`,
    `--merchant-category-code ${shellQuote(frozenRequest.merchantCategoryCode)}`,
    `--currency ${shellQuote(frozenRequest.currency)}`,
    `--line-items ${shellQuote(JSON.stringify(frozenRequest.lineItems))}`,
    frozenRequest.buyer
      ? `--buyer ${shellQuote(JSON.stringify(frozenRequest.buyer))}`
      : null,
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
  const merchantUrlResolution = consistentScalarAliases(
    input,
    ['merchantUrl', 'merchant_url', 'selectedItemUrl', 'selected_item_url'],
    (value) => (typeof value === 'string' ? validHttpUrl(value) : null),
  );
  const endpointResolution = consistentScalarAliases(
    input,
    ['endpoint', 'checkoutEndpoint', 'checkout_endpoint'],
    (value) => (typeof value === 'string' ? canonicalHttpsEndpoint(value) : null),
  );
  const walletBaseUrlResolution = consistentScalarAliases(
    input,
    ['walletBaseUrl', 'wallet_base_url'],
    (value) => (typeof value === 'string' ? canonicalHttpsOrigin(value) : null),
  );
  const routeResolution = consistentScalarAliases(
    input,
    ['checkoutRoute', 'checkout_route', 'route'],
    (value) => (typeof value === 'string' ? normalizedRoute(value) : null),
  );
  const merchantCategoryResolution = consistentScalarAliases(
    input,
    ['merchantCategoryCode', 'merchant_category_code', 'mcc'],
    (value) => (typeof value === 'string' ? normalizedMerchantCategoryCode(value) : null),
  );
  const currencyResolution = consistentScalarAliases(
    input,
    ['currency'],
    (value) => (typeof value === 'string' ? normalizedCurrency(value) : null),
  );
  const paymentInstrumentResolution = consistentScalarAliases(
    input,
    ['paymentInstrumentId', 'payment_instrument_id'],
    (value) => (typeof value === 'string' ? safeIdentifier(value) : null),
  );
  const fulfillmentResolution = consistentScalarAliases(
    input,
    ['fulfillmentType', 'fulfillment_type'],
    (value) => (typeof value === 'string' ? normalizedString(value)?.toUpperCase() : null),
  );
  const attemptResolution = consistentScalarAliases(
    input,
    ['checkoutAttemptId', 'checkout_attempt_id', 'attemptId', 'attempt_id'],
    (value) => (typeof value === 'string' ? safeIdentifier(value) : null),
  );
  const digitalDeliveryResolution = exactBooleanAliases(
    input,
    ['digitalDeliveryExpected', 'digital_delivery_expected'],
  );
  const digitalContractResolution = exactBooleanAliases(
    input,
    ['digitalDeliveryContractVerified', 'digital_delivery_contract_verified'],
  );

  const merchantUrl = merchantUrlResolution.value ?? null;
  const endpoint = endpointResolution.value ?? null;
  const walletBaseUrl = walletBaseUrlResolution.value ?? null;
  const checkoutRoute = routeResolution.value ?? null;
  const merchantCategoryCode = merchantCategoryResolution.value ?? null;
  const currency = currencyResolution.value ?? null;
  const paymentInstrumentId = paymentInstrumentResolution.value ?? null;
  const fulfillmentType = fulfillmentResolution.value ?? null;
  const checkoutAttemptId = attemptResolution.value ?? null;
  const digitalDeliveryExpected = digitalDeliveryResolution.value ?? false;

  const invalid = [];
  if (!merchantUrlResolution.valid || !merchantUrl) invalid.push('merchantUrl');
  if (!routeResolution.valid || !checkoutRoute) invalid.push('checkoutRoute');
  if (!endpointResolution.valid || !endpoint) invalid.push('endpoint');
  if (!walletBaseUrlResolution.valid || !walletBaseUrl) invalid.push('walletBaseUrl');
  if (endpoint && walletBaseUrl && !sameHttpOrigin(endpoint, walletBaseUrl)) {
    invalid.push('endpointWalletOrigin');
  }
  if (!merchantCategoryResolution.valid || !merchantCategoryCode) {
    invalid.push('merchantCategoryCode');
  }
  if (!currencyResolution.valid || !currency) invalid.push('currency');
  if (!paymentInstrumentResolution.valid || !paymentInstrumentId) {
    invalid.push('paymentInstrumentId');
  }
  if (!attemptResolution.valid || !checkoutAttemptId) invalid.push('checkoutAttemptId');
  if (!digitalDeliveryResolution.valid) invalid.push('digitalDeliveryExpected');
  if (!digitalContractResolution.valid) invalid.push('digitalDeliveryContractVerified');
  if (!fulfillmentType || !VALID_FULFILLMENT_TYPES.has(fulfillmentType)) {
    invalid.push('fulfillmentType');
  }

  let lineItems = null;
  try {
    const lineItemInputs = suppliedAliasValues(input, ['lineItems', 'line_items']);
    const normalizedLineItems = lineItemInputs.map((value) => normalizeLineItems(value, currency));
    if (normalizedLineItems.length !== 1
      && new Set(normalizedLineItems.map((value) => JSON.stringify(value))).size !== 1) {
      throw new TypeError('lineItems aliases conflict');
    }
    [lineItems] = normalizedLineItems;
    if (!lineItems) throw new TypeError('lineItems are required');
  } catch {
    invalid.push('lineItems');
  }

  let buyer = null;
  try {
    const buyerInputs = suppliedAliasValues(input, ['buyer', 'buyerData', 'buyer_data']);
    const normalizedBuyers = buyerInputs.map(normalizedBuyer);
    if (new Set(normalizedBuyers.map((value) => JSON.stringify(value))).size > 1) {
      throw new TypeError('buyer aliases conflict');
    }
    [buyer = null] = normalizedBuyers;
  } catch {
    invalid.push('buyer');
  }

  let shippingAddress = null;
  try {
    const shippingInputs = suppliedAliasValues(input, ['shippingAddress', 'shipping_address']);
    const normalizedAddresses = shippingInputs.map(normalizedShippingAddress);
    if (new Set(normalizedAddresses.map((value) => JSON.stringify(value))).size > 1) {
      throw new TypeError('shippingAddress aliases conflict');
    }
    [shippingAddress = null] = normalizedAddresses;
  } catch {
    invalid.push('shippingAddress');
  }
  if (fulfillmentType === 'PHYSICAL_GOODS_REQUIRES_SHIPPING' && !shippingAddress) {
    invalid.push('shippingAddress');
  }
  if (
    digitalDeliveryExpected
    && digitalContractResolution.value !== true
  ) {
    invalid.push('digitalDeliveryContractVerified');
  }

  if (invalid.length > 0) {
    return { ok: false, invalid: [...new Set(invalid)] };
  }

  const frozenRequest = deepFreeze({
    checkoutRoute,
    checkoutAttemptId,
    checkoutExecutionClaimed: true,
    merchantUrl,
    endpoint,
    walletBaseUrl,
    merchantCategoryCode,
    currency,
    lineItems,
    buyer,
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
  const classified = classifyUcpCheckoutRunRequest(input);
  if (classified.action !== UcpCheckoutRunAction.RUN_UCP_CHECKOUT) {
    const details = classified.invalid ?? classified.missing ?? [classified.reason];
    throw new TypeError(`unauthorized ucp-checkout run request: ${details.join(', ')}`);
  }
  return classified.command;
}

export function classifyUcpCheckoutRunRequest(input = {}) {
  const purchaseAuthorization = exactBooleanAliases(input, [
    'explicitPurchaseAuthorized',
    'explicit_purchase_authorized',
    'purchaseConfirmed',
    'purchase_confirmed',
  ]);
  if (!purchaseAuthorization.valid) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID,
      action: UcpCheckoutRunAction.FIX_CHECKOUT_RUN_INPUT,
      terminal: false,
      reason: 'checkout_run_authorization_alias_invalid',
      invalid: ['explicitPurchaseAuthorized'],
    };
  }
  if (purchaseAuthorization.value !== true) {
    return {
      state: UcpCheckoutRunState.PURCHASE_CONFIRMATION_REQUIRED,
      action: UcpCheckoutRunAction.ASK_FOR_PURCHASE_AUTHORIZATION,
      terminal: false,
      reason: 'explicit_purchase_confirmation_required',
      missing: ['explicitPurchaseAuthorized'],
    };
  }

  const gateResolutions = REQUIRED_GATES.map(([field, aliases]) => [
    field,
    exactBooleanAliases(input, aliases),
  ]);
  const invalidGates = gateResolutions
    .filter(([, resolution]) => !resolution.valid)
    .map(([field]) => field);
  if (invalidGates.length > 0) {
    return {
      state: UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID,
      action: UcpCheckoutRunAction.FIX_CHECKOUT_RUN_INPUT,
      terminal: false,
      reason: 'checkout_run_gate_alias_invalid',
      invalid: invalidGates,
    };
  }
  const missingGates = gateResolutions
    .filter(([, resolution]) => resolution.value !== true)
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
        const escaped = raw[index];
        word += '$`"\\'.includes(escaped) ? escaped : `\\${escaped}`;
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
    if ('*?[{}!'.includes(character) || (character === '~' && !active)) return null;
    if (character === '#' && !active) return null;
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
  if (!words) {
    return { safe: false, reason: 'resume_command_invalid_shell' };
  }
  if (!words[0]?.startsWith('CLINK_BASE_URL=')) {
    return { safe: false, reason: 'resume_command_environment_missing' };
  }
  const baseUrlOverride = canonicalHttpsOrigin(words[0].slice('CLINK_BASE_URL='.length));
  if (!baseUrlOverride) return { safe: false, reason: 'resume_command_environment_invalid' };
  const commandWords = words.slice(1);
  if (commandWords[0] !== 'clink') {
    return { safe: false, reason: 'resume_command_invalid_shell' };
  }

  if (commandWords[1] === 'ucp-checkout' && commandWords[2] === 'get') {
    const options = parseStrictOptions(
      commandWords.slice(3),
      new Set(['--endpoint', '--checkout-id', '--format']),
    );
    const endpoint = canonicalHttpsEndpoint(options?.['--endpoint']);
    if (
      !options
      || !safeIdentifier(options['--checkout-id'])
      || !endpoint
      || !sameHttpOrigin(endpoint, baseUrlOverride)
      || options['--format'] !== 'json'
    ) {
      return { safe: false, reason: 'checkout_resume_command_invalid' };
    }
    return {
      safe: true,
      kind: 'CHECKOUT_GET',
      checkoutId: safeIdentifier(options['--checkout-id']),
      endpoint,
      baseUrlOverride,
      command,
    };
  }

  if (commandWords[1] === 'ucp-order' && commandWords[2] === 'wait-delivery') {
    const options = parseStrictOptions(
      commandWords.slice(3),
      new Set(['--order-id', '--max-wait', '--format']),
    );
    if (
      !options
      || !safeIdentifier(options['--order-id'])
      || options['--max-wait'] !== String(DIGITAL_DELIVERY_MAX_WAIT_SECONDS)
      || options['--format'] !== 'json'
    ) {
      return { safe: false, reason: 'delivery_resume_command_invalid' };
    }
    return {
      safe: true,
      kind: 'DELIVERY_WAIT',
      ucpOrderId: safeIdentifier(options['--order-id']),
      maxWaitSeconds: DIGITAL_DELIVERY_MAX_WAIT_SECONDS,
      baseUrlOverride,
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
  const present = values.filter((value) => value !== undefined);
  if (present.some((value) => typeof value !== 'string' || !safeIdentifier(value))) {
    return { valid: false, value: null };
  }
  const unique = [...new Set(present.map((value) => safeIdentifier(value)))];
  return {
    valid: unique.length <= 1,
    value: unique.length === 1 ? unique[0] : null,
  };
}

function orderIdentityValues(
  evidence,
  {
    includeAggregateOrderId = false,
    includeOrderCompatibility = false,
  } = {},
) {
  if (!plainObject(evidence)) return { valid: true, values: [] };
  if (evidence.ucp !== undefined && !plainObject(evidence.ucp)) {
    return { valid: false, values: [] };
  }
  if (
    includeOrderCompatibility
    && evidence.order !== undefined
    && !plainObject(evidence.order)
  ) {
    return { valid: false, values: [] };
  }
  const values = [
    evidence.ucpOrderId,
    evidence.ucp_order_id,
    evidence.omsOrderId,
    evidence.ucp?.ucpOrderId,
    evidence.ucp?.ucp_order_id,
  ];
  if (includeAggregateOrderId) values.push(evidence.orderId);
  if (includeOrderCompatibility) {
    values.push(evidence.order?.id);
  }
  return { valid: true, values };
}

function responseIdentity(data, stage, status) {
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
  const topLevelOrder = orderIdentityValues(data, {
    includeAggregateOrderId: true,
    includeOrderCompatibility: stage === 'delivery' || status === 'completed',
  });
  const createOrder = orderIdentityValues(data.create, {
    includeOrderCompatibility: objectStatus(data.create) === 'completed',
  });
  const completeOrder = orderIdentityValues(data.complete, {
    includeOrderCompatibility: objectStatus(data.complete) === 'completed',
  });
  const order = topLevelOrder.valid && createOrder.valid && completeOrder.valid
    ? consistentIdentifier([
      ...topLevelOrder.values,
      ...createOrder.values,
      ...completeOrder.values,
    ])
    : { valid: false, value: null };
  return { checkout, order };
}

function objectStatus(value) {
  return plainObject(value) ? normalizedString(value.status)?.toLowerCase() ?? null : null;
}

function stageCheckoutIdentity(value) {
  if (!plainObject(value)) return { valid: false, value: null };
  return consistentIdentifier([value.id, value.checkoutId, value.checkout_id]);
}

function isCompleteReconciliation(data, stage, status) {
  return stage === 'complete'
    && status === 'unknown'
    && data.complete === undefined
    && data.reconciliationRequired === true
    && data.resumeReadOnly === true
    && data.paymentRetryAllowed === false;
}

function aggregateStageEvidenceError(data, stage, status) {
  if (!plainObject(data.create)) return 'checkout_run_create_evidence_missing';
  const createIdentity = stageCheckoutIdentity(data.create);
  if (!createIdentity.valid || !createIdentity.value) {
    return 'checkout_run_create_identifier_missing';
  }
  const createStatus = objectStatus(data.create);
  if (!createStatus) return 'checkout_run_create_status_invalid';
  if (stage === 'create' && createStatus !== status) {
    return 'checkout_run_create_status_mismatch';
  }
  if (stage !== 'create' && createStatus !== 'ready_for_complete') {
    return 'checkout_run_create_status_mismatch';
  }

  if (stage === 'complete' || stage === 'delivery') {
    if (!isCompleteReconciliation(data, stage, status)) {
      if (!plainObject(data.complete)) return 'checkout_run_complete_evidence_missing';
      const completeIdentity = stageCheckoutIdentity(data.complete);
      if (!completeIdentity.valid || !completeIdentity.value) {
        return 'checkout_run_complete_identifier_missing';
      }
      const completeStatus = objectStatus(data.complete);
      if (!completeStatus) return 'checkout_run_complete_status_invalid';
      if (stage === 'complete' && completeStatus !== status) {
        return 'checkout_run_complete_status_mismatch';
      }
      if (stage === 'delivery' && completeStatus !== 'completed') {
        return 'checkout_run_delivery_complete_not_completed';
      }
    }
  }

  if (stage === 'delivery') {
    const readyResolution = exactBooleanAliases(data, ['ready']);
    const timedOutResolution = exactBooleanAliases(data, ['timedOut', 'timed_out']);
    if (
      !readyResolution.valid
      || readyResolution.value === undefined
      || !timedOutResolution.valid
      || timedOutResolution.value === undefined
    ) {
      return 'digital_delivery_boolean_invalid';
    }
    if (
      (status === 'ready'
        && (readyResolution.value !== true || timedOutResolution.value !== false))
      || (status === 'failed'
        && (readyResolution.value !== false || timedOutResolution.value !== false))
      || (status === 'timeout'
        && (readyResolution.value !== false || timedOutResolution.value !== true))
    ) {
      return 'digital_delivery_boolean_status_mismatch';
    }
    if (!['ready', 'failed', 'timeout'].includes(status)) {
      return 'digital_delivery_status_invalid';
    }

    const suppliedDeliveries = [data.delivery, data.order?.digital_delivery]
      .filter((delivery) => delivery !== undefined);
    if (status !== 'timeout' && suppliedDeliveries.length === 0) {
      return 'digital_delivery_result_invalid';
    }
    const deliveries = suppliedDeliveries.filter((delivery) => delivery !== null);
    if (deliveries.some((delivery) => !plainObject(delivery))) {
      return 'digital_delivery_result_invalid';
    }
    if (status !== 'timeout' && deliveries.length !== suppliedDeliveries.length) {
      return 'digital_delivery_result_invalid';
    }
    const deliveryStatuses = deliveries.map(objectStatus);
    if (deliveryStatuses.some((deliveryStatus) => !deliveryStatus)) {
      return 'digital_delivery_status_invalid';
    }
    if (new Set(deliveryStatuses).size > 1) return 'digital_delivery_status_mismatch';
    if (status === 'ready' || status === 'failed') {
      if (deliveryStatuses.some((deliveryStatus) => deliveryStatus !== status)) {
        return 'digital_delivery_status_mismatch';
      }
    } else if (deliveryStatuses.some(
      (deliveryStatus) => !['pending', 'syncing', 'retryable'].includes(deliveryStatus),
    )) {
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

function baseResult(data, stage, status, identity, endpoint, expectedRequest) {
  return {
    stage,
    status,
    checkoutAttemptId: expectedRequest.checkoutAttemptId,
    checkoutAttemptState: 'CONSUMED',
    replayAllowed: false,
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
    checkoutAttemptId: expectedRequest.checkoutAttemptId,
    checkoutId: fields.checkoutId,
    endpoint: fields.endpoint,
    walletBaseUrl: expectedRequest.walletBaseUrl,
    ucpOrderId: fields.ucpOrderId ?? null,
    digitalDeliveryExpected: expectedRequest.digitalDeliveryExpected === true,
    maxWaitSeconds: expectedRequest.digitalDeliveryExpected === true
      ? DIGITAL_DELIVERY_MAX_WAIT_SECONDS
      : null,
    resumeCommand,
  });
}

function deliveryResumeContext(fields, walletBaseUrl, resumeCommand) {
  return deepFreeze({
    kind: 'DELIVERY_WAIT',
    checkoutAttemptId: fields.checkoutAttemptId,
    checkoutId: fields.checkoutId ?? null,
    endpoint: fields.endpoint ?? null,
    walletBaseUrl,
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
  if (resume.baseUrlOverride !== expectedRequest.walletBaseUrl) {
    return invalidObservation('checkout_pending_resume_environment_mismatch', fields);
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

function readOnlyDeliveryResume(
  data,
  fields,
  expectedRequest,
  reason = 'digital_delivery_wait_timed_out',
) {
  const resumeCommand = normalizedString(data.resumeCommand ?? data.resume_command);
  const resume = classifyUcpCheckoutResumeCommand(resumeCommand);
  if (!resume.safe) return invalidObservation(resume.reason, fields);
  if (resume.kind !== 'DELIVERY_WAIT') {
    return invalidObservation('delivery_pending_resume_is_not_delivery_wait', fields);
  }
  if (!fields.ucpOrderId || resume.ucpOrderId !== fields.ucpOrderId) {
    return invalidObservation('delivery_pending_resume_order_id_mismatch', fields);
  }
  if (resume.baseUrlOverride !== expectedRequest.walletBaseUrl) {
    return invalidObservation('delivery_pending_resume_environment_mismatch', fields);
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
    resumeContext: deliveryResumeContext(fields, expectedRequest.walletBaseUrl, resumeCommand),
  };
}

function parsedSuccessData(observation, failurePrefix) {
  const exitCodeRaw = observation.exitCode ?? observation.exit_code ?? observation.code;
  const exitCode = exitCodeRaw === undefined || exitCodeRaw === null || exitCodeRaw === ''
    ? null
    : Number(exitCodeRaw);
  const envelopeSource = observation.stdout
    ?? observation.result
    ?? (plainObject(observation) && Object.hasOwn(observation, 'ok')
      ? observation
      : observation.data ?? observation.stderr);
  const raw = parseMaybeJson(
    envelopeSource,
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
  const walletBaseUrl = canonicalHttpsOrigin(continuation.walletBaseUrl);
  const checkoutAttemptId = safeIdentifier(continuation.checkoutAttemptId);
  if (
    !walletBaseUrl
    || !checkoutAttemptId
    || resume.baseUrlOverride !== walletBaseUrl
  ) return null;
  if (expectedKind === 'CHECKOUT_GET') {
    const checkoutId = typeof continuation.checkoutId === 'string'
      ? safeIdentifier(continuation.checkoutId)
      : null;
    const endpoint = canonicalHttpsEndpoint(continuation.endpoint);
    const continuationOrderId = continuation.ucpOrderId;
    const ucpOrderId = continuationOrderId === undefined || continuationOrderId === null
      ? null
      : typeof continuationOrderId === 'string'
        ? safeIdentifier(continuationOrderId)
        : null;
    if (
      !checkoutId
      || !endpoint
      || (continuationOrderId !== undefined && continuationOrderId !== null && !ucpOrderId)
      || resume.checkoutId !== checkoutId
      || resume.endpoint !== endpoint
      || !sameHttpOrigin(endpoint, walletBaseUrl)
    ) {
      return null;
    }
    return {
      ...continuation,
      checkoutAttemptId,
      checkoutId,
      endpoint,
      walletBaseUrl,
      ucpOrderId,
      digitalDeliveryExpected: continuation.digitalDeliveryExpected === true,
      maxWaitSeconds: continuation.digitalDeliveryExpected === true
        ? DIGITAL_DELIVERY_MAX_WAIT_SECONDS
        : null,
      resumeCommand,
    };
  }
  const ucpOrderId = typeof continuation.ucpOrderId === 'string'
    ? safeIdentifier(continuation.ucpOrderId)
    : null;
  const checkoutId = typeof continuation.checkoutId === 'string'
    ? safeIdentifier(continuation.checkoutId)
    : null;
  const endpoint = canonicalHttpsEndpoint(continuation.endpoint);
  if (
    !ucpOrderId
    || !checkoutId
    || !endpoint
    || continuation.paymentConfirmed !== true
    || resume.ucpOrderId !== ucpOrderId
    || resume.maxWaitSeconds !== DIGITAL_DELIVERY_MAX_WAIT_SECONDS
    || !sameHttpOrigin(endpoint, walletBaseUrl)
  ) {
    return null;
  }
  return {
    ...continuation,
    checkoutAttemptId,
    checkoutId,
    endpoint,
    walletBaseUrl,
    ucpOrderId,
    maxWaitSeconds: DIGITAL_DELIVERY_MAX_WAIT_SECONDS,
    paymentConfirmed: true,
    resumeCommand,
  };
}

function checkoutResumeFields(data, continuation) {
  const checkout = consistentIdentifier([data.id, data.checkoutId, data.checkout_id]);
  if (!checkout.valid || checkout.value !== continuation.checkoutId) {
    return { ok: false, reason: 'checkout_resume_checkout_id_mismatch' };
  }
  const checkoutStatusResolution = consistentScalarAliases(
    data,
    ['status', 'state', 'checkoutStatus', 'checkout_status'],
    (value) => (typeof value === 'string' ? normalizedString(value)?.toLowerCase() : null),
  );
  if (!checkoutStatusResolution.valid || !checkoutStatusResolution.value) {
    return { ok: false, reason: 'checkout_resume_status_invalid' };
  }
  const orderValues = orderIdentityValues(data, {
    includeOrderCompatibility: checkoutStatusResolution.value === 'completed',
  });
  const order = orderValues.valid
    ? consistentIdentifier(orderValues.values)
    : { valid: false, value: null };
  if (!order.valid) return { ok: false, reason: 'checkout_resume_order_id_invalid' };
  if (continuation.ucpOrderId && order.value && order.value !== continuation.ucpOrderId) {
    return { ok: false, reason: 'checkout_resume_order_id_mismatch' };
  }
  const ucpOrderId = continuation.ucpOrderId ?? order.value;
  return {
    ok: true,
    fields: {
      checkoutAttemptId: continuation.checkoutAttemptId,
      checkoutAttemptState: 'CONSUMED',
      replayAllowed: false,
      checkoutId: checkout.value,
      ...(ucpOrderId ? { ucpOrderId, omsOrderId: ucpOrderId } : {}),
      endpoint: continuation.endpoint,
      checkoutStatus: checkoutStatusResolution.value.toUpperCase(),
      mutationRetryAllowed: false,
      createRetryAllowed: false,
      completeRetryAllowed: false,
      paymentRetryAllowed: false,
    },
  };
}

function deliveryResumeCommand(orderId, walletBaseUrl) {
  return [
    `CLINK_BASE_URL=${shellQuote(walletBaseUrl)} clink ucp-order wait-delivery`,
    `--order-id ${shellQuote(orderId)}`,
    `--max-wait ${DIGITAL_DELIVERY_MAX_WAIT_SECONDS}`,
    '--format json',
  ].join(' ');
}

function classifyCheckoutGetResumeObservation(data, continuation) {
  const resumed = checkoutResumeFields(data, continuation);
  if (!resumed.ok) return invalidObservation(resumed.reason);
  const fields = resumed.fields;
  if (!fields.checkoutStatus) return invalidObservation('checkout_resume_status_invalid', fields);
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
      resumeContext: checkoutResumeContext(fields, continuation, continuation.resumeCommand),
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
    const resumeCommand = deliveryResumeCommand(fields.ucpOrderId, continuation.walletBaseUrl);
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
      resumeContext: deliveryResumeContext(fields, continuation.walletBaseUrl, resumeCommand),
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
  const deliveryStatusResolution = consistentScalarAliases(
    data,
    ['deliveryStatus', 'delivery_status'],
    (value) => (typeof value === 'string' ? normalizedString(value)?.toLowerCase() : null),
  );
  const rawDelivery = data.order.digital_delivery;
  if (rawDelivery !== undefined && rawDelivery !== null && !plainObject(rawDelivery)) {
    return invalidObservation('delivery_resume_status_invalid');
  }
  const nestedDeliveryStatus = plainObject(rawDelivery)
    ? (typeof rawDelivery.status === 'string'
      ? normalizedString(rawDelivery.status)?.toLowerCase()
      : null)
    : undefined;
  if (
    !deliveryStatusResolution.valid
    || (plainObject(rawDelivery) && !nestedDeliveryStatus)
  ) {
    return invalidObservation('delivery_resume_status_invalid');
  }
  const deliveryStatuses = [deliveryStatusResolution.value, nestedDeliveryStatus]
    .filter((value) => value !== undefined && value !== null);
  const deliveryStatus = new Set(deliveryStatuses).size === 1
    ? deliveryStatuses[0]
    : null;
  const readyResolution = exactBooleanAliases(data, ['ready']);
  const timedOutResolution = exactBooleanAliases(data, ['timedOut', 'timed_out']);
  const ready = readyResolution.value;
  const timedOut = timedOutResolution.value;
  if (
    !deliveryStatus
    || !readyResolution.valid
    || ready === undefined
    || !timedOutResolution.valid
    || timedOut === undefined
  ) {
    return invalidObservation('delivery_resume_status_invalid');
  }
  const fields = {
    checkoutAttemptId: continuation.checkoutAttemptId,
    checkoutAttemptState: 'CONSUMED',
    replayAllowed: false,
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
  const delivery = rawDelivery ?? null;

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
      || resume.baseUrlOverride !== continuation.walletBaseUrl
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
      resumeContext: deliveryResumeContext(fields, continuation.walletBaseUrl, resumeCommand),
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

  const endpoint = canonicalHttpsEndpoint(data.endpoint);
  const expectedEndpoint = expectedRequest.endpoint
    ? canonicalHttpsEndpoint(expectedRequest.endpoint)
    : null;
  const expectedWalletBaseUrl = canonicalHttpsOrigin(expectedRequest.walletBaseUrl);
  const expectedCheckoutAttemptId = safeIdentifier(expectedRequest.checkoutAttemptId);
  if (!endpoint || !expectedEndpoint || endpoint !== expectedEndpoint) {
    return invalidObservation('checkout_run_endpoint_mismatch', {
      expectedEndpoint,
      observedEndpoint: endpoint,
    });
  }
  if (
    !expectedWalletBaseUrl
    || !sameHttpOrigin(endpoint, expectedWalletBaseUrl)
  ) {
    return invalidObservation('checkout_run_environment_mismatch', {
      expectedWalletBaseUrl,
      observedEndpoint: endpoint,
    });
  }
  if (!expectedCheckoutAttemptId || expectedRequest.checkoutExecutionClaimed !== true) {
    return invalidObservation('checkout_run_attempt_claim_invalid', {
      expectedCheckoutAttemptId,
    });
  }
  const normalizedExpectedRequest = {
    ...expectedRequest,
    endpoint: expectedEndpoint,
    walletBaseUrl: expectedWalletBaseUrl,
    checkoutAttemptId: expectedCheckoutAttemptId,
    checkoutExecutionClaimed: true,
  };

  const identity = responseIdentity(data, stage, status);
  if (!identity.checkout.valid || !identity.order.valid || !identity.checkout.value) {
    return invalidObservation('checkout_run_identifier_invalid');
  }
  const stageEvidenceError = aggregateStageEvidenceError(data, stage, status);
  if (stageEvidenceError) return invalidObservation(stageEvidenceError);
  const fields = baseResult(
    data,
    stage,
    status,
    identity,
    endpoint,
    normalizedExpectedRequest,
  );
  const expectedDigitalDelivery = normalizedExpectedRequest.digitalDeliveryExpected === true;

  if (stage === 'delivery') {
    if (!expectedDigitalDelivery) return invalidObservation('unexpected_digital_delivery_result', fields);
    if (!identity.order.value || !plainObject(data.order)) {
      return invalidObservation('digital_delivery_order_invalid', fields);
    }
    const delivery = data.delivery ?? data.order.digital_delivery ?? null;

    if (status === 'timeout') {
      return readOnlyDeliveryResume(
        data,
        fields,
        normalizedExpectedRequest,
        'digital_delivery_wait_timed_out',
      );
    }
    if (status === 'failed') {
      if (!plainObject(delivery)) {
        return invalidObservation('digital_delivery_result_invalid', fields);
      }
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
      if (
        !plainObject(delivery)
        || !Array.isArray(delivery.artifacts)
        || delivery.artifacts.length === 0
      ) {
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

  if (stage === 'create' && [
    'ready_for_complete',
    'complete_in_progress',
    'processing',
    'pending',
  ].includes(status)) {
    if (normalizedString(data.resumeCommand ?? data.resume_command)) {
      return invalidObservation('checkout_create_resume_not_allowed', fields);
    }
    return {
      state: UcpCheckoutRunState.CHECKOUT_FAILED,
      action: UcpCheckoutRunAction.STOP_CHECKOUT_FAILURE,
      terminal: true,
      paymentConfirmed: false,
      paymentSubmitted: false,
      reason: `checkout_create_${status}_payment_not_submitted`,
      ...fields,
      create: data.create,
      readOnlyResumeAllowed: false,
    };
  }

  if (isCompleteReconciliation(data, stage, status)) {
    return readOnlyCheckoutResume(data, fields, normalizedExpectedRequest);
  }

  if (['ready_for_complete', 'complete_in_progress', 'processing', 'pending'].includes(status)) {
    return readOnlyCheckoutResume(data, fields, normalizedExpectedRequest);
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
    const order = plainObject(data.order)
      ? data.order
      : plainObject(data.complete?.order)
        ? data.complete.order
        : plainObject(data.create?.order)
          ? data.create.order
          : null;
    return {
      state: UcpCheckoutRunState.CHECKOUT_COMPLETED,
      action: UcpCheckoutRunAction.RETURN_UCP_CHECKOUT_COMPLETED,
      terminal: true,
      paymentConfirmed: true,
      deliveryConfirmed: false,
      checkoutStatus: 'COMPLETED',
      reason: 'digital_delivery_wait_not_started',
      ...fields,
      order,
      warning: normalizedString(data.deliveryWait?.reason)
        ?? 'Payment completed, but digital delivery could not be verified.',
    };
  }

  const order = plainObject(data.order)
    ? data.order
    : plainObject(data.complete?.order)
      ? data.complete.order
      : plainObject(data.create?.order)
        ? data.create.order
        : null;
  return {
    state: UcpCheckoutRunState.CHECKOUT_COMPLETED,
    action: UcpCheckoutRunAction.RETURN_UCP_CHECKOUT_COMPLETED,
    terminal: true,
    paymentConfirmed: true,
    checkoutStatus: 'COMPLETED',
    reason: stage === 'create' ? 'checkout_completed_during_create' : 'checkout_completed',
    ...fields,
    order,
  };
}

export function formatUcpCheckoutRunFsmMarker(workflow, marker = 'UCP_CHECKOUT_RUN_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
