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
  UNATTENDED_AUTHORIZATION_GAP: 'UNATTENDED_AUTHORIZATION_GAP',
  PARSE_ITEM_REQUIRED: 'PARSE_ITEM_REQUIRED',
  ITEM_SELECTION_REQUIRED: 'ITEM_SELECTION_REQUIRED',
  ITEM_SELECTED: 'ITEM_SELECTED',
  ITEM_ID_REQUIRED: 'ITEM_ID_REQUIRED',
  ITEM_ID_EXTRACTED: 'ITEM_ID_EXTRACTED',
  CHECKOUT_ROUTE_REQUIRED: 'CHECKOUT_ROUTE_REQUIRED',
  CHECKOUT_CREATE_READY: 'CHECKOUT_CREATE_READY',
  CHECKOUT_CREATED: 'CHECKOUT_CREATED',
  CHECKOUT_READY_TO_COMPLETE: 'CHECKOUT_READY_TO_COMPLETE',
  CHECKOUT_COMPLETED: 'CHECKOUT_COMPLETED',
  CHECKOUT_PENDING: 'CHECKOUT_PENDING',
  CHECKOUT_FAILED: 'CHECKOUT_FAILED',
  CHECKOUT_UNKNOWN: 'CHECKOUT_UNKNOWN',
  PAYMENT_SUCCESS_EVENT_REQUIRED: 'PAYMENT_SUCCESS_EVENT_REQUIRED',
  PAYMENT_SUCCESS_EVENT_RECEIVED: 'PAYMENT_SUCCESS_EVENT_RECEIVED',
  UCP_ORDER_ID_RESOLUTION_REQUIRED: 'UCP_ORDER_ID_RESOLUTION_REQUIRED',
  UCP_ORDER_PROJECTION_PENDING: 'UCP_ORDER_PROJECTION_PENDING',
  ORDER_FETCH_REQUIRED: 'ORDER_FETCH_REQUIRED',
  ORDER_FETCH_FAILED: 'ORDER_FETCH_FAILED',
  CLI_ERROR: 'CLI_ERROR',
});

export const UcpCheckoutWorkflowAction = Object.freeze({
  ASK_FOR_PRODUCT_INPUT: 'ASK_FOR_PRODUCT_INPUT',
  FREEZE_PRODUCT: 'FREEZE_PRODUCT',
  ASK_FOR_FULFILLMENT: 'ASK_FOR_FULFILLMENT',
  REFRESH_PAYMENT_INSTRUMENT: 'REFRESH_PAYMENT_INSTRUMENT',
  LIST_AUTHORIZATIONS: 'LIST_AUTHORIZATIONS',
  START_AUTHORIZATION_DRAFT_AND_WAIT: 'START_AUTHORIZATION_DRAFT_AND_WAIT',
  SURFACE_UNATTENDED_AUTHORIZATION_GAP: 'SURFACE_UNATTENDED_AUTHORIZATION_GAP',
  PARSE_ITEM: 'PARSE_ITEM',
  ASK_FOR_ITEM_SELECTION: 'ASK_FOR_ITEM_SELECTION',
  SELECT_ITEM_BY_CONTEXT: 'SELECT_ITEM_BY_CONTEXT',
  RESOLVE_CHECKOUT_ROUTE: 'RESOLVE_CHECKOUT_ROUTE',
  EXTRACT_ITEM_ID: 'EXTRACT_ITEM_ID',
  CREATE_CHECKOUT: 'CREATE_CHECKOUT',
  COMPLETE_CHECKOUT: 'COMPLETE_CHECKOUT',
  POLL_PAYMENT_SUCCESS_EVENT: 'POLL_PAYMENT_SUCCESS_EVENT',
  RETURN_PAYMENT_SUCCESS_EVENT: 'RETURN_PAYMENT_SUCCESS_EVENT',
  GET_CHECKOUT_FOR_UCP_ORDER: 'GET_CHECKOUT_FOR_UCP_ORDER',
  WAIT_UCP_ORDER_PROJECTION: 'WAIT_UCP_ORDER_PROJECTION',
  // Preserve the original wire value for dispatchers that switch on FETCH_OMS_ORDER.
  FETCH_UCP_ORDER: 'FETCH_OMS_ORDER',
  RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING: 'RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING',
  // Deprecated name; new source code uses FETCH_UCP_ORDER.
  FETCH_OMS_ORDER: 'FETCH_OMS_ORDER',
  WAIT_CHECKOUT: 'WAIT_CHECKOUT',
  VERIFY_CHECKOUT_BEFORE_RETRY: 'VERIFY_CHECKOUT_BEFORE_RETRY',
  STOP_CHECKOUT_FAILURE: 'STOP_CHECKOUT_FAILURE',
  SURFACE_ERROR: 'SURFACE_ERROR',
});

// 900s matches the 15-minute built-in watch window; async order success can take minutes.
function paymentSuccessPollCommand(checkoutId) {
  return [
    'clink events poll --type agent_order.succeeded',
    checkoutId ? `--checkout-id ${shellQuoteIfNeeded(checkoutId)}` : null,
    '--max-wait 900 --format json',
  ].filter(Boolean).join(' ');
}
// Five total read-only checkout observations: immediate, then 1s / 2s / 4s / 8s retries.
const UCP_ORDER_PROJECTION_RETRY_DELAYS_SECONDS = Object.freeze([1, 2, 4, 8]);

function shellQuoteIfNeeded(value) {
  const raw = String(value);
  if (/^[A-Za-z0-9_./:@%+=-]+$/u.test(raw)) return raw;
  return `'${raw.replaceAll("'", "'\\''")}'`;
}

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

function classifyIdentifierAliases(values = []) {
  const malformed = values.some(
    (value) => value !== undefined
      && (typeof value !== 'string' || value.trim().length === 0),
  );
  const normalized = values
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const unique = [...new Set(normalized)];
  return {
    present: malformed || normalized.length > 0,
    consistent: !malformed && unique.length <= 1,
    value: !malformed && unique.length === 1 ? unique[0] : null,
  };
}

function checkoutIdAliasesOf(data = {}, { includeId = true } = {}) {
  return classifyIdentifierAliases([
    data.checkoutId,
    data.checkout_id,
    ...(includeId ? [data.id] : []),
  ]);
}

function checkoutIdOf(data = {}) {
  const aliases = checkoutIdAliasesOf(data);
  return aliases.consistent ? aliases.value : null;
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

function parseUrl(value) {
  try {
    return new URL(String(value));
  } catch {
    return null;
  }
}

export function extractShopifyVariantIdFromUrl(productUrl) {
  const url = parseUrl(productUrl);
  return url?.searchParams.get('variant')?.trim() || null;
}

export function shopifyProductJsonUrl(productUrl) {
  const url = parseUrl(productUrl);
  if (!url) return null;

  const normalizedPath = url.pathname.replace(/\/+$/u, '');
  const productPathMatch = normalizedPath.match(/^(.*\/products\/[^/]+?)(?:\.js)?$/iu);
  if (!productPathMatch) return null;

  const productPath = productPathMatch[1].replace(/\.js$/iu, '');
  url.pathname = `${productPath}.js`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function isShopifyProductContext(input = {}, productUrl) {
  if (input.isShopify === true || input.is_shopify === true) return true;
  const siteType = normalizedString(input.siteType ?? input.site_type ?? input.platform)?.toLowerCase();
  if (siteType === 'shopify') return true;

  const url = parseUrl(productUrl);
  return url?.hostname.toLowerCase().endsWith('.myshopify.com') === true;
}

function canonicalOptionName(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/gu, '');
}

function productOptionDefinitions(productJson = {}) {
  if (!Array.isArray(productJson.options)) return [];
  return productJson.options.map((option, index) => ({
    name: normalizedString(option?.name ?? option) || `option${index + 1}`,
  }));
}

function variantIdOf(variant = {}) {
  return normalizedString(variant.id ?? variant.variantId ?? variant.variant_id);
}

function variantOptionMap(productJson = {}, variant = {}) {
  const optionDefinitions = productOptionDefinitions(productJson);
  const options = {};

  for (let index = 0; index < 3; index += 1) {
    const value = variant[`option${index + 1}`] ?? (Array.isArray(variant.options) ? variant.options[index] : undefined);
    const normalizedValue = normalizedString(value);
    if (normalizedValue === null) continue;

    const name = optionDefinitions[index]?.name || `option${index + 1}`;
    options[name] = normalizedValue;
  }

  return options;
}

function variantOptionLookup(productJson = {}, variant = {}) {
  const options = variantOptionMap(productJson, variant);
  const lookup = new Map();
  let index = 1;
  for (const [name, value] of Object.entries(options)) {
    lookup.set(canonicalOptionName(name), value);
    lookup.set(`option${index}`, value);
    index += 1;
  }
  return lookup;
}

function summarizeShopifyVariant(productJson = {}, variant = {}) {
  return {
    id: variantIdOf(variant),
    title: normalizedString(variant.title) || variantIdOf(variant),
    available: variant.available !== false,
    options: variantOptionMap(productJson, variant),
  };
}

function selectionVariantId(selection = {}) {
  return normalizedString(selection.variantId ?? selection.variant_id ?? selection.id);
}

function selectionOptionObject(selection = {}) {
  const rawOptions = selection.options ?? selection.variantOptions ?? selection.variant_options;
  if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) return rawOptions;

  const ignoredKeys = new Set([
    'id',
    'variantId',
    'variant_id',
    'options',
    'variantOptions',
    'variant_options',
    'optionValues',
    'option_values',
    'selectedOptions',
    'selected_options',
    'text',
    'userSelection',
    'user_selection',
  ]);
  const inferred = {};
  for (const [key, value] of Object.entries(selection)) {
    if (ignoredKeys.has(key) || normalizedString(value) === null || typeof value === 'object') continue;
    inferred[key] = value;
  }
  return Object.keys(inferred).length > 0 ? inferred : null;
}

function selectionOptionValues(selection = {}) {
  const values = selection.optionValues ?? selection.option_values ?? selection.selectedOptions ?? selection.selected_options;
  if (!Array.isArray(values)) return [];
  return values.map((value) => normalizedString(value)).filter((value) => value !== null);
}

function variantMatchesOptionObject(productJson = {}, variant = {}, optionObject = {}) {
  const lookup = variantOptionLookup(productJson, variant);
  return Object.entries(optionObject).every(([name, value]) => {
    const selectedValue = normalizedString(value);
    if (selectedValue === null) return true;
    return normalizedString(lookup.get(canonicalOptionName(name)))?.toLowerCase() === selectedValue.toLowerCase();
  });
}

function variantMatchesOptionValues(productJson = {}, variant = {}, optionValues = []) {
  const values = Object.values(variantOptionMap(productJson, variant)).map((value) => value.toLowerCase());
  if (optionValues.length === 0) return false;
  return optionValues.every((value) => values.includes(value.toLowerCase()));
}

function variantMatchesSelectionText(productJson = {}, variant = {}, text) {
  const normalizedText = normalizedString(text);
  if (!normalizedText) return false;
  const haystack = [
    variant.title,
    ...Object.values(variantOptionMap(productJson, variant)),
  ].map((value) => normalizedString(value)?.toLowerCase()).filter(Boolean).join(' ');
  return normalizedText
    .toLowerCase()
    .split(/[\s,/|]+/u)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function selectedVariantResult(reason, productJson, variant) {
  return {
    status: 'selected',
    reason,
    variant,
    variantId: variantIdOf(variant),
  };
}

function ambiguousVariantResult(productJson, variants, reason = 'shopify_variant_selection_required') {
  return {
    status: 'selection_required',
    reason,
    variants: variants.map((variant) => summarizeShopifyVariant(productJson, variant)),
  };
}

export function selectShopifyVariant(productJsonInput = {}, selection = {}) {
  const productJson = parseMaybeJson(productJsonInput);
  const variants = Array.isArray(productJson?.variants) ? productJson.variants : [];
  if (variants.length === 0) {
    return {
      status: 'not_found',
      reason: 'shopify_variants_missing',
      variants: [],
    };
  }

  const variantId = selectionVariantId(selection);
  if (variantId) {
    const variant = variants.find((candidate) => variantIdOf(candidate) === variantId);
    if (!variant) {
      return {
        status: 'not_found',
        reason: 'shopify_variant_id_not_found',
        variantId,
      };
    }
    if (variant.available === false) {
      return {
        status: 'unavailable',
        reason: 'shopify_variant_unavailable',
        variant: summarizeShopifyVariant(productJson, variant),
      };
    }
    return selectedVariantResult('shopify_variant_id_match', productJson, variant);
  }

  const optionObject = selectionOptionObject(selection);
  const optionValues = selectionOptionValues(selection);
  const selectionText = selection.text ?? selection.userSelection ?? selection.user_selection;
  const hasExplicitSelection = optionObject || optionValues.length > 0 || normalizedString(selectionText) !== null;

  if (hasExplicitSelection) {
    const matches = variants
      .filter((variant) => variant.available !== false)
      .filter((variant) => {
        if (optionObject) return variantMatchesOptionObject(productJson, variant, optionObject);
        if (optionValues.length > 0) return variantMatchesOptionValues(productJson, variant, optionValues);
        return variantMatchesSelectionText(productJson, variant, selectionText);
      });

    if (matches.length === 1) return selectedVariantResult('shopify_variant_option_match', productJson, matches[0]);
    if (matches.length > 1) return ambiguousVariantResult(productJson, matches, 'shopify_variant_selection_ambiguous');
    return {
      status: 'not_found',
      reason: 'shopify_variant_selection_not_found',
      variants: variants.map((variant) => summarizeShopifyVariant(productJson, variant)),
    };
  }

  if (variants.length === 1) {
    if (variants[0].available === false) {
      return {
        status: 'unavailable',
        reason: 'shopify_variant_unavailable',
        variant: summarizeShopifyVariant(productJson, variants[0]),
      };
    }
    return selectedVariantResult('shopify_single_variant', productJson, variants[0]);
  }

  return ambiguousVariantResult(productJson, variants);
}

function shopifyVariantSelectionOf(input = {}) {
  const explicitSelection = input.variantSelection ?? input.variant_selection ?? input.selection;
  if (explicitSelection && typeof explicitSelection === 'object') return explicitSelection;
  if (normalizedString(input.variantId ?? input.variant_id) !== null) {
    return { variantId: input.variantId ?? input.variant_id };
  }
  if (input.variantOptions || input.variant_options || input.selectedOptions || input.selected_options) {
    return {
      options: input.variantOptions ?? input.variant_options,
      optionValues: input.selectedOptions ?? input.selected_options,
    };
  }
  if (normalizedString(input.userSelection ?? input.user_selection ?? input.selectionText) !== null) {
    return { text: input.userSelection ?? input.user_selection ?? input.selectionText };
  }
  return {};
}

export function classifyUcpItemIdResolution(input = {}) {
  const itemId = normalizedString(input.itemId ?? input.item_id);
  if (itemId !== null) {
    return {
      state: UcpCheckoutWorkflowState.ITEM_ID_EXTRACTED,
      action: UcpCheckoutWorkflowAction.CREATE_CHECKOUT,
      terminal: false,
      reason: 'item_id_provided',
      itemId,
    };
  }

  const productUrl = normalizedString(input.productUrl ?? input.url ?? input.merchantUrl ?? input.merchant_url);
  if (productUrl === null) {
    return {
      state: UcpCheckoutWorkflowState.ITEM_ID_REQUIRED,
      action: UcpCheckoutWorkflowAction.EXTRACT_ITEM_ID,
      terminal: false,
      reason: 'missing_product_url',
    };
  }

  if (isShopifyProductContext(input, productUrl)) {
    const directVariantId = extractShopifyVariantIdFromUrl(productUrl);
    if (directVariantId) {
      return {
        state: UcpCheckoutWorkflowState.ITEM_ID_EXTRACTED,
        action: UcpCheckoutWorkflowAction.CREATE_CHECKOUT,
        terminal: false,
        reason: 'shopify_direct_variant_url',
        itemId: directVariantId,
        variantId: directVariantId,
      };
    }

    const productJsonUrl = shopifyProductJsonUrl(productUrl);
    const productJson = input.productJson ?? input.product_json ?? input.shopifyProductJson ?? input.shopify_product_json;
    if (!productJson) {
      return {
        state: UcpCheckoutWorkflowState.ITEM_ID_REQUIRED,
        action: UcpCheckoutWorkflowAction.EXTRACT_ITEM_ID,
        terminal: false,
        reason: 'shopify_product_json_required',
        ...(productJsonUrl ? { productJsonUrl } : {}),
      };
    }

    const selected = selectShopifyVariant(productJson, shopifyVariantSelectionOf(input));
    if (selected.status === 'selected') {
      return {
        state: UcpCheckoutWorkflowState.ITEM_ID_EXTRACTED,
        action: UcpCheckoutWorkflowAction.CREATE_CHECKOUT,
        terminal: false,
        reason: 'shopify_variant_selected',
        itemId: selected.variantId,
        variantId: selected.variantId,
        variant: selected.variant,
      };
    }

    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
      terminal: false,
      reason: selected.reason,
      ...(productJsonUrl ? { productJsonUrl } : {}),
      ...(selected.variants ? { variants: selected.variants } : {}),
      ...(selected.variant ? { variant: selected.variant } : {}),
    };
  }

  return {
    state: UcpCheckoutWorkflowState.PARSE_ITEM_REQUIRED,
    action: UcpCheckoutWorkflowAction.PARSE_ITEM,
    terminal: false,
    reason: 'parse_item_required',
    command: `clink tool parse-item --url ${shellQuoteIfNeeded(productUrl)} --format json`,
  };
}

function parseItemDataFromObservation(observation = {}) {
  return unwrapCliEnvelope(observation.stdout ?? observation.data ?? observation.result ?? observation);
}

function parseItemMissingFields(data = {}) {
  const missing = [];
  for (const [field, value] of [
    ['itemUrl', data.itemUrl ?? data.item_url],
    ['merchantOrigin', data.merchantOrigin ?? data.merchant_origin],
    ['merchantDomain', data.merchantDomain ?? data.merchant_domain],
    ['merchantName', data.merchantName ?? data.merchant_name],
    ['currency', data.currency],
  ]) {
    if (normalizedString(value) === null) missing.push(field);
  }
  if (!Array.isArray(data.items) || data.items.length === 0) missing.push('items');
  return missing;
}

function parseItemRequiredItemFields(item = {}, index = 0) {
  const missing = [];
  for (const [field, value] of [
    ['itemId', item.itemId ?? item.item_id],
    ['title', item.title],
    ['unitPriceMinor', item.unitPriceMinor ?? item.unit_price_minor],
    ['itemUrl', item.itemUrl ?? item.item_url],
  ]) {
    if (normalizedString(value) === null) missing.push(`items[${index}].${field}`);
  }
  if (booleanValue(item.available) === null) missing.push(`items[${index}].available`);
  return missing;
}

function parseItemInvalidItemFields(item = {}, index = 0) {
  const invalid = [];
  const unitPriceMinor = item.unitPriceMinor ?? item.unit_price_minor;
  if (normalizedString(unitPriceMinor) !== null) {
    try {
      integerMinorUnit(unitPriceMinor);
    } catch {
      invalid.push(`items[${index}].unitPriceMinor`);
    }
  }
  return invalid;
}

function normalizedParseItem(item = {}) {
  return {
    ...item,
    itemId: normalizedString(item.itemId ?? item.item_id),
    title: normalizedString(item.title),
    unitPriceMinor: integerMinorUnit(item.unitPriceMinor ?? item.unit_price_minor),
    available: booleanValue(item.available) === true,
    itemUrl: normalizedString(item.itemUrl ?? item.item_url),
  };
}

function selectedParseItemId(input = {}) {
  return normalizedString(input.selectedItemId ?? input.selected_item_id ?? input.itemId ?? input.item_id);
}

function intentQuantity(input = {}) {
  const quantity = numericValue(input.quantity);
  if (quantity === null) return 1;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return null;
  return quantity;
}

function selectedItemResult(data = {}, item = {}, quantity = 1, reason = 'single_available_item_selected') {
  const totalAmountMinor = item.unitPriceMinor * quantity;
  if (!Number.isSafeInteger(totalAmountMinor)) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'total_amount_minor_exceeds_safe_integer_range',
    };
  }

  return {
    state: UcpCheckoutWorkflowState.ITEM_SELECTED,
    action: UcpCheckoutWorkflowAction.RESOLVE_CHECKOUT_ROUTE,
    terminal: false,
    reason,
    item,
    itemUrl: normalizedString(data.itemUrl ?? data.item_url),
    merchantOrigin: normalizedString(data.merchantOrigin ?? data.merchant_origin),
    merchantDomain: normalizedString(data.merchantDomain ?? data.merchant_domain),
    merchantName: normalizedString(data.merchantName ?? data.merchant_name),
    currency: normalizedString(data.currency),
    quantity,
    totalAmountMinor,
  };
}

export function classifyUcpParseItemObservation(observation = {}) {
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  if (exitCode !== null && exitCode !== 0) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: `exit_${exitCode}_cli_error`,
    };
  }

  const data = parseItemDataFromObservation(observation);
  const missing = parseItemMissingFields(data);
  if (missing.length > 0) {
    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
      terminal: false,
      reason: 'parse_item_missing_required_fields',
      missing,
    };
  }

  const itemFieldMissing = data.items.flatMap((item, index) => parseItemRequiredItemFields(item, index));
  if (itemFieldMissing.length > 0) {
    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
      terminal: false,
      reason: 'parse_item_missing_required_fields',
      missing: itemFieldMissing,
    };
  }

  const itemFieldInvalid = data.items.flatMap((item, index) => parseItemInvalidItemFields(item, index));
  if (itemFieldInvalid.length > 0) {
    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
      terminal: false,
      reason: 'parse_item_invalid_required_fields',
      invalid: itemFieldInvalid,
    };
  }

  const quantity = intentQuantity(observation);
  if (quantity === null) {
    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
      terminal: false,
      reason: 'invalid_quantity',
      missing: ['quantity'],
    };
  }

  const availableItems = data.items.map(normalizedParseItem).filter((item) => item.available);
  if (availableItems.length === 0) {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_FAILED,
      action: UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE,
      terminal: true,
      reason: 'parse_item_no_available_items',
    };
  }

  const selectedId = selectedParseItemId(observation);
  if (selectedId) {
    const selected = availableItems.find((item) => item.itemId === selectedId);
    if (selected) return selectedItemResult(data, selected, quantity, 'selected_item_id_match');
    return {
      state: UcpCheckoutWorkflowState.ITEM_SELECTION_REQUIRED,
      action: UcpCheckoutWorkflowAction.ASK_FOR_ITEM_SELECTION,
      terminal: false,
      reason: 'selected_item_not_available_or_not_found',
      items: availableItems,
    };
  }

  if (availableItems.length === 1) return selectedItemResult(data, availableItems[0], quantity);

  return {
    state: UcpCheckoutWorkflowState.ITEM_SELECTION_REQUIRED,
    action: observation.userPresent === false
      ? UcpCheckoutWorkflowAction.SELECT_ITEM_BY_CONTEXT
      : UcpCheckoutWorkflowAction.ASK_FOR_ITEM_SELECTION,
    terminal: false,
    reason: observation.userPresent === false
      ? 'multiple_items_context_selection_required'
      : 'multiple_items_user_selection_required',
    items: availableItems,
  };
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
  const productUrl = normalizedString(input.productUrl ?? input.url);
  for (const [field, value] of [
    ['productUrl', productUrl],
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
    const needsProductExploration = productUrl !== null
      && input.productExplorationAttempted !== true
      && input.product_exploration_attempted !== true;
    if (needsProductExploration) {
      return {
        state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
        action: UcpCheckoutWorkflowAction.FREEZE_PRODUCT,
        terminal: false,
        reason: 'product_exploration_required',
        missing,
        productUrl,
      };
    }

    return {
      state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
      action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
      terminal: false,
      reason: productUrl === null ? 'missing_product_input' : 'missing_product_input_after_exploration',
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

// A scheduled checkout runs with nobody present, so it can neither collect a Passkey signature nor
// substitute some other mandate that merely fits the amount. It stops and reports the gap instead.
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

export function classifyAuthorizationSelection(input = {}) {
  const selected = selectedAuthorization(input);
  if (!selected) {
    if (isUnattended(input)) {
      return {
        state: UcpCheckoutWorkflowState.UNATTENDED_AUTHORIZATION_GAP,
        action: UcpCheckoutWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP,
        terminal: true,
        reason: 'unattended_authorization_not_pinned',
      };
    }
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
    if (isUnattended(input)) {
      return {
        state: UcpCheckoutWorkflowState.UNATTENDED_AUTHORIZATION_GAP,
        action: UcpCheckoutWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP,
        terminal: true,
        reason: 'unattended_authorization_missing_instruction_or_mandate',
      };
    }
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
  const ucpOrderAliases = checkoutUcpOrderIdAliasesOf(data);
  const ucpOrderId = ucpOrderAliases.consistent ? ucpOrderAliases.value : null;
  for (const [target, value] of [
    ['checkoutId', checkoutIdOf(data)],
    ['orderId', data.orderId ?? data.order_id],
    ['sessionId', data.sessionId ?? data.session_id],
    // The UCP checkout response owns this identifier. It is distinct from the Clink Payment
    // orderId carried by agent_order events and is the only id valid for `ucp-order get`.
    ['ucpOrderId', ucpOrderId],
    // Deprecated output alias for callers that still use the old implementation-oriented name.
    ['omsOrderId', ucpOrderId],
    // Backend fills this from ext_info success_url on synchronous success; absent otherwise.
    ['orderPermalinkUrl', data.order?.permalink_url ?? data.order?.permalinkUrl],
  ]) {
    const normalized = normalizedString(value);
    if (normalized !== null) fields[target] = normalized;
  }
  return fields;
}

function checkoutUcpOrderIdAliasesOf(resource = {}) {
  const order = resource.order && typeof resource.order === 'object' && !Array.isArray(resource.order)
    ? resource.order
    : {};
  const ucp = resource.ucp && typeof resource.ucp === 'object' && !Array.isArray(resource.ucp)
    ? resource.ucp
    : {};
  const status = statusOf(resource);
  const completed = status === 'completed' || status === 'complete'
    || status === 'succeeded' || status === 'success';
  return classifyIdentifierAliases([
    ...(completed ? [order.id, order.order_id] : []),
    ucp.ucpOrderId,
    ucp.ucp_order_id,
    resource.ucpOrderId,
    resource.ucp_order_id,
    resource.omsOrderId,
    resource.oms_order_id,
  ]);
}

function fetchedUcpOrderIdAliasesOf(resource = {}) {
  return classifyIdentifierAliases([
    resource.id,
    resource.orderId,
    resource.order_id,
  ]);
}

function contextUcpOrderIdAliasesOf(resource = {}) {
  return classifyIdentifierAliases([
    resource.ucpOrderId,
    resource.ucp_order_id,
    resource.omsOrderId,
    resource.oms_order_id,
  ]);
}

function ucpOrderIdOf(resource = {}) {
  const aliases = contextUcpOrderIdAliasesOf(resource);
  return aliases.consistent ? aliases.value : null;
}

function expectedCheckoutIdAliasesOf(observation = {}) {
  const expectedResource = observation.expectedResource && typeof observation.expectedResource === 'object'
    ? observation.expectedResource
    : {};
  return classifyIdentifierAliases([
    observation.expectedCheckoutId,
    observation.expected_checkout_id,
    expectedResource.checkoutId,
    expectedResource.checkout_id,
  ]);
}

function expectedUcpOrderIdAliasesOf(observation = {}) {
  const expectedResource = observation.expectedResource && typeof observation.expectedResource === 'object'
    && !Array.isArray(observation.expectedResource)
    ? observation.expectedResource
    : {};
  return classifyIdentifierAliases([
    observation.expectedUcpOrderId,
    observation.expected_ucp_order_id,
    expectedResource.ucpOrderId,
    expectedResource.ucp_order_id,
    expectedResource.omsOrderId,
    expectedResource.oms_order_id,
  ]);
}

function checkoutEndpointOf(resource = {}) {
  return normalizedString(
    resource.checkoutEndpoint ?? resource.checkout_endpoint
      ?? resource.restEndpoint ?? resource.rest_endpoint
      ?? resource.endpoint,
  );
}

function eventCheckoutIdAliasesOf(event = {}) {
  const payload = event.data && typeof event.data === 'object' && !Array.isArray(event.data)
    ? event.data
    : {};
  return classifyIdentifierAliases([
    payload.checkoutId,
    payload.checkout_id,
  ]);
}

function paymentOrderIdAliasesOf(event = {}) {
  const payload = eventPayloadOf(event);
  return classifyIdentifierAliases([
    payload.paymentOrderId,
    payload.payment_order_id,
    payload.orderId,
    payload.order_id,
    payload.resourceId,
    payload.resource_id,
    event.paymentOrderId,
    event.payment_order_id,
    event.orderId,
    event.order_id,
    event.resourceId,
    event.resource_id,
  ]);
}

function paymentOrderIdOf(event = {}) {
  const aliases = paymentOrderIdAliasesOf(event);
  return aliases.consistent ? aliases.value : null;
}

function invalidCorrelatedPaymentSuccessContext(reason) {
  return {
    valid: false,
    result: {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      paymentConfirmed: false,
      reason,
    },
  };
}

function validateCorrelatedPaymentSuccessContext(context = {}) {
  const event = context.event;
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_event_missing',
    );
  }
  if (context.paymentConfirmed !== true) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_not_confirmed',
    );
  }
  if (eventTypeOf(event) !== 'agent_order.succeeded') {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_event_type_invalid',
    );
  }

  const checkoutAliases = checkoutIdAliasesOf(context, { includeId: false });
  if (!checkoutAliases.consistent) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_checkout_id_conflict',
    );
  }
  if (!checkoutAliases.present) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_checkout_id_missing',
    );
  }

  const eventCheckoutAliases = eventCheckoutIdAliasesOf(event);
  if (!eventCheckoutAliases.consistent) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_event_checkout_id_conflict',
    );
  }
  if (!eventCheckoutAliases.present) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_event_checkout_id_missing',
    );
  }
  if (eventCheckoutAliases.value !== checkoutAliases.value) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_event_checkout_id_mismatch',
    );
  }

  const eventPaymentOrderAliases = paymentOrderIdAliasesOf(event);
  if (!eventPaymentOrderAliases.consistent) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_event_payment_order_id_conflict',
    );
  }
  const suppliedPaymentOrderAliases = classifyIdentifierAliases([
    context.paymentOrderId,
    context.payment_order_id,
  ]);
  if (!suppliedPaymentOrderAliases.consistent) {
    return invalidCorrelatedPaymentSuccessContext(
      'correlated_payment_success_context_payment_order_id_conflict',
    );
  }
  if (suppliedPaymentOrderAliases.present
      && suppliedPaymentOrderAliases.value !== eventPaymentOrderAliases.value) {
    return invalidCorrelatedPaymentSuccessContext(
      eventPaymentOrderAliases.present
        ? 'correlated_payment_success_context_payment_order_id_mismatch'
        : 'correlated_payment_success_context_event_payment_order_id_missing',
    );
  }

  return {
    valid: true,
    checkoutId: checkoutAliases.value,
    event,
    paymentOrderId: eventPaymentOrderAliases.value,
  };
}

function checkoutGetCommand(checkoutId, checkoutEndpoint) {
  return [
    'clink ucp-checkout get',
    checkoutEndpoint ? `--endpoint ${shellQuoteIfNeeded(checkoutEndpoint)}` : null,
    `--checkout-id ${shellQuoteIfNeeded(checkoutId)}`,
    '--format json',
  ].filter(Boolean).join(' ');
}

function ucpOrderGetCommand(ucpOrderId) {
  return `clink ucp-order get --order-id ${shellQuoteIfNeeded(ucpOrderId)} --format json`;
}

function classifyCheckoutStatus(status, checkoutId, operation, data = {}) {
  const fields = resourceFields(data);
  if (status === 'completed' || status === 'complete' || status === 'succeeded' || status === 'success') {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_REQUIRED,
      action: UcpCheckoutWorkflowAction.POLL_PAYMENT_SUCCESS_EVENT,
      terminal: false,
      reason: 'completed_poll_payment_success_event',
      ...fields,
      pollCommand: paymentSuccessPollCommand(checkoutId),
    };
  }

  if (status === 'ready_for_complete') {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_READY_TO_COMPLETE,
      action: UcpCheckoutWorkflowAction.COMPLETE_CHECKOUT,
      terminal: false,
      reason: 'ready_for_complete',
      ...fields,
    };
  }

  if (status === 'complete_in_progress' || status === 'processing' || status === 'pending') {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_PENDING,
      action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
      terminal: false,
      reason: status || 'checkout_pending',
      ...fields,
    };
  }

  if (status === 'requires_escalation' || status === 'canceled' || status === 'cancelled' || status === 'failed') {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_FAILED,
      action: UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE,
      terminal: true,
      reason: status,
      ...fields,
    };
  }

  if (operation === 'create' && checkoutId) {
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_CREATED,
      action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
      terminal: false,
      reason: status ? `status_${status}` : 'checkout_created_status_missing',
      ...fields,
    };
  }

  return {
    state: UcpCheckoutWorkflowState.CHECKOUT_UNKNOWN,
    action: UcpCheckoutWorkflowAction.VERIFY_CHECKOUT_BEFORE_RETRY,
    terminal: false,
    reason: status ? `status_${status}_unknown` : 'checkout_status_missing',
    ...fields,
  };
}

export function classifyUcpCheckoutObservation(observation = {}) {
  const operation = normalizedString(observation.operation)?.toLowerCase() || '';
  const expectedCheckoutAliases = expectedCheckoutIdAliasesOf(observation);
  const expectedUcpOrderAliases = expectedUcpOrderIdAliasesOf(observation);
  const checkoutEndpoint = checkoutEndpointOf(observation);
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  if (exitCode !== null && exitCode !== 0) {
    if (exitCode === 6) {
      if (!expectedCheckoutAliases.consistent) {
        return {
          state: UcpCheckoutWorkflowState.CLI_ERROR,
          action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
          terminal: true,
          reason: 'expected_checkout_id_alias_conflict',
        };
      }
      if (!expectedUcpOrderAliases.consistent) {
        return {
          state: UcpCheckoutWorkflowState.CLI_ERROR,
          action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
          terminal: true,
          reason: 'expected_ucp_order_id_alias_conflict',
        };
      }
      const expectedCheckoutId = expectedCheckoutAliases.value;
      const expectedUcpOrderId = expectedUcpOrderAliases.value;
      const canVerifyFrozenCheckout = (operation === 'complete' || operation === 'get')
        && expectedCheckoutId;
      const checkoutCommand = canVerifyFrozenCheckout
        ? checkoutGetCommand(expectedCheckoutId, checkoutEndpoint)
        : null;
      return {
        state: UcpCheckoutWorkflowState.CHECKOUT_UNKNOWN,
        action: UcpCheckoutWorkflowAction.VERIFY_CHECKOUT_BEFORE_RETRY,
        terminal: false,
        reason: 'exit_6_unknown',
        ...(expectedCheckoutId ? { checkoutId: expectedCheckoutId } : {}),
        ...(expectedUcpOrderId ? {
          ucpOrderId: expectedUcpOrderId,
          omsOrderId: expectedUcpOrderId,
        } : {}),
        ...(checkoutEndpoint ? { checkoutEndpoint } : {}),
        ...(checkoutCommand ? {
          checkoutCommand,
          resumeCommand: checkoutCommand,
        } : {}),
      };
    }

    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: `exit_${exitCode}_cli_error`,
    };
  }

  const raw = parseMaybeJson(observation.stdout ?? observation.data ?? observation.result ?? {});
  const validEnvelope = raw && typeof raw === 'object' && !Array.isArray(raw)
    && raw.ok === true && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data);
  if (!validEnvelope) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'checkout_invalid_success_envelope',
    };
  }
  const data = raw.data;
  const checkoutAliases = checkoutIdAliasesOf(data);
  if (!checkoutAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'checkout_id_alias_conflict',
    };
  }

  if (!expectedCheckoutAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'expected_checkout_id_alias_conflict',
    };
  }

  if (!expectedUcpOrderAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'expected_ucp_order_id_alias_conflict',
    };
  }

  const ucpOrderAliases = checkoutUcpOrderIdAliasesOf(data);
  if (!ucpOrderAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'checkout_ucp_order_id_alias_conflict',
    };
  }
  if (expectedUcpOrderAliases.value && ucpOrderAliases.value
      && expectedUcpOrderAliases.value !== ucpOrderAliases.value) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'checkout_ucp_order_id_mismatch',
      expectedUcpOrderId: expectedUcpOrderAliases.value,
      observedUcpOrderId: ucpOrderAliases.value,
    };
  }

  const checkoutId = checkoutAliases.value;
  const expectedCheckoutId = expectedCheckoutAliases.value;
  if ((operation === 'complete' || operation === 'get') && !expectedCheckoutId) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'expected_checkout_id_missing',
    };
  }
  if (expectedCheckoutId && checkoutId && checkoutId !== expectedCheckoutId) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'checkout_id_mismatch',
      expectedCheckoutId,
      observedCheckoutId: checkoutId,
    };
  }
  const status = statusOf(data);

  if (!checkoutId && (operation === 'create' || operation === 'complete' || operation === 'get')) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      reason: 'missing_checkout_id',
    };
  }

  const result = classifyCheckoutStatus(status, checkoutId, operation, data);
  const frozenUcpOrderId = expectedUcpOrderAliases.value ?? ucpOrderAliases.value;
  const withFrozenOrder = frozenUcpOrderId
    ? { ...result, ucpOrderId: frozenUcpOrderId, omsOrderId: frozenUcpOrderId }
    : result;
  return checkoutEndpoint ? { ...withFrozenOrder, checkoutEndpoint } : withFrozenOrder;
}

// Require checkoutId to match when it is present in expectedResource. A payment event's generic
// orderId is a Clink Payment id, not the UCP order id, so it cannot substitute for checkoutId.
// Current UCP producers must therefore include checkoutId before this consumer can correlate a
// concurrent-safe success event; type-only matching is deliberately fail-closed.
function matchesExpectedEvent(event = {}, expectedResource = {}) {
  const expectedCheckoutAliases = checkoutIdAliasesOf(expectedResource, { includeId: false });
  if (!expectedCheckoutAliases.consistent || !expectedCheckoutAliases.present) return false;
  const eventCheckoutAliases = eventCheckoutIdAliasesOf(event);
  if (!eventCheckoutAliases.consistent || !eventCheckoutAliases.present) return false;
  if (!paymentOrderIdAliasesOf(event).consistent) return false;
  return eventCheckoutAliases.value === expectedCheckoutAliases.value;
}

function successMessageFor(event = {}) {
  const checkoutAliases = eventCheckoutIdAliasesOf(event);
  const checkoutId = checkoutAliases.consistent ? checkoutAliases.value : null;
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

  const expectedCheckoutAliases = checkoutIdAliasesOf(expectedResource, { includeId: false });
  if (!expectedCheckoutAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      paymentConfirmed: false,
      reason: 'payment_success_expected_checkout_id_conflict',
    };
  }

  const ucpOrderAliases = contextUcpOrderIdAliasesOf(expectedResource);
  const raw = parseMaybeJson(observation.stdout ?? observation.data ?? observation.result ?? {});
  const validEnvelope = raw && typeof raw === 'object' && !Array.isArray(raw)
    && raw.ok === true && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data);
  if (!validEnvelope) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      paymentConfirmed: false,
      reason: 'payment_success_event_invalid_success_envelope',
    };
  }
  const data = raw.data;
  const validEvents = Array.isArray(data.events)
    && data.events.every((event) => event && typeof event === 'object' && !Array.isArray(event));
  if (!validEvents) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      paymentConfirmed: false,
      reason: 'payment_success_event_invalid_events',
    };
  }
  const events = data.events;
  const successEvent = events.find((event) => (
    eventTypeOf(event) === 'agent_order.succeeded' && matchesExpectedEvent(event, expectedResource)
  ));

  if (successEvent) {
    const ucpOrderId = ucpOrderAliases.value;
    const paymentOrderId = paymentOrderIdOf(successEvent);
    const checkoutId = expectedCheckoutAliases.value;
    const checkoutEndpoint = checkoutEndpointOf(expectedResource);
    const orderPermalinkUrl = normalizedString(
      expectedResource.orderPermalinkUrl ?? expectedResource.order_permalink_url,
    ) ?? undefined;
    const paymentEvidence = {
      paymentConfirmed: true,
      event: successEvent,
      message: successMessageFor(successEvent),
      ...(paymentOrderId ? { paymentOrderId } : {}),
      ...(checkoutId ? { checkoutId } : {}),
      ...(checkoutEndpoint ? { checkoutEndpoint } : {}),
      orderPermalinkUrl,
    };
    if (!ucpOrderAliases.consistent) {
      return {
        state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
        action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
        terminal: true,
        reason: 'ucp_order_id_context_alias_conflict',
        ...paymentEvidence,
        orderLookupStatus: 'IDENTIFIER_CONFLICT',
        warning: 'Payment succeeded, but the UCP order context contains conflicting identifiers.',
      };
    }
    if (ucpOrderId) {
      return {
        state: UcpCheckoutWorkflowState.ORDER_FETCH_REQUIRED,
        action: UcpCheckoutWorkflowAction.FETCH_UCP_ORDER,
        terminal: false,
        reason: 'agent_order.succeeded',
        ...paymentEvidence,
        ucpOrderId,
        // Deprecated compatibility alias; never sourced from the event.
        omsOrderId: ucpOrderId,
        orderCommand: ucpOrderGetCommand(ucpOrderId),
      };
    }
    if (checkoutId) {
      const checkoutCommand = checkoutGetCommand(checkoutId, checkoutEndpoint);
      return {
        state: UcpCheckoutWorkflowState.UCP_ORDER_ID_RESOLUTION_REQUIRED,
        action: UcpCheckoutWorkflowAction.GET_CHECKOUT_FOR_UCP_ORDER,
        terminal: false,
        reason: 'agent_order.succeeded_ucp_order_id_missing',
        ...paymentEvidence,
        checkoutCommand,
        resumeCommand: checkoutCommand,
      };
    }
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: 'agent_order.succeeded_checkout_id_missing',
      ...paymentEvidence,
      orderLookupStatus: 'UNAVAILABLE',
      warning: 'Payment succeeded, but the UCP order id cannot be resolved without checkoutId.',
    };
  }

  if (!ucpOrderAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.CLI_ERROR,
      action: UcpCheckoutWorkflowAction.SURFACE_ERROR,
      terminal: true,
      paymentConfirmed: false,
      reason: 'ucp_order_id_context_alias_conflict',
    };
  }

  if (data.timedOut === true || data.ready === false) {
    const checkoutId = expectedCheckoutAliases.value;
    return {
      state: UcpCheckoutWorkflowState.CHECKOUT_PENDING,
      action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
      terminal: false,
      reason: 'payment_success_event_timeout',
      ...(checkoutId ? { resumeCommand: paymentSuccessPollCommand(checkoutId) } : {}),
    };
  }

  return {
    state: UcpCheckoutWorkflowState.CHECKOUT_PENDING,
    action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
    terminal: false,
    reason: 'payment_success_event_not_observed',
    ...(expectedCheckoutAliases.value
      ? { resumeCommand: paymentSuccessPollCommand(expectedCheckoutAliases.value) }
      : {}),
  };
}

export function classifyUcpOrderResolutionObservation(observation = {}, context = {}) {
  const correlatedContext = validateCorrelatedPaymentSuccessContext(context);
  if (!correlatedContext.valid) return correlatedContext.result;

  const contextUcpOrderAliases = contextUcpOrderIdAliasesOf(context);
  const checkoutId = correlatedContext.checkoutId;
  const checkoutEndpoint = checkoutEndpointOf(context);
  const paymentOrderId = correlatedContext.paymentOrderId;
  const event = correlatedContext.event;
  const message = normalizedString(context.message) || successMessageFor(event);
  const orderPermalinkUrl = normalizedString(
    context.orderPermalinkUrl ?? context.order_permalink_url,
  ) ?? undefined;
  const attempt = Math.max(1, Math.trunc(numericValue(
    context.nextAttempt ?? context.next_attempt ?? context.attempt ?? context.attempt_count,
  ) ?? 1));
  const retryDelaySeconds = UCP_ORDER_PROJECTION_RETRY_DELAYS_SECONDS[attempt - 1] ?? null;
  const base = {
    paymentConfirmed: true,
    ...(checkoutId ? { checkoutId } : {}),
    ...(checkoutEndpoint ? { checkoutEndpoint } : {}),
    ...(paymentOrderId ? { paymentOrderId } : {}),
    ...(event ? { event } : {}),
    message,
    orderPermalinkUrl,
  };

  if (!contextUcpOrderAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: 'ucp_order_resolution_context_id_alias_conflict',
      ...base,
      orderLookupStatus: 'IDENTIFIER_CONFLICT',
      warning: 'Payment succeeded, but the UCP order context contains conflicting identifiers.',
    };
  }

  const checkoutCommand = checkoutGetCommand(checkoutId, checkoutEndpoint);
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  if (exitCode !== null && exitCode !== 0) {
    const retryable = isRetryableUcpOrderResolutionError(observation, exitCode);
    if (retryable && retryDelaySeconds !== null) {
      return {
        state: UcpCheckoutWorkflowState.UCP_ORDER_PROJECTION_PENDING,
        action: UcpCheckoutWorkflowAction.WAIT_UCP_ORDER_PROJECTION,
        terminal: false,
        reason: `ucp_order_resolution_exit_${exitCode}_retryable`,
        ...base,
        orderLookupStatus: 'PENDING',
        checkoutCommand,
        resumeCommand: checkoutCommand,
        retryable: true,
        attempt,
        nextAttempt: attempt + 1,
        retryAfterSeconds: retryDelaySeconds,
        maxAttempts: UCP_ORDER_PROJECTION_RETRY_DELAYS_SECONDS.length + 1,
        warning: 'Payment succeeded; the UCP order lookup will retry after a transient error.',
      };
    }
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: `ucp_order_resolution_exit_${exitCode}`,
      ...base,
      orderLookupStatus: 'ERROR',
      checkoutCommand,
      resumeCommand: checkoutCommand,
      retryable: false,
      warning: 'Payment succeeded; UCP order details are temporarily unavailable.',
    };
  }

  const raw = parseMaybeJson(observation.stdout ?? observation.data ?? observation.result ?? {});
  const validEnvelope = raw && typeof raw === 'object' && !Array.isArray(raw)
    && raw.ok === true && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data);
  if (!validEnvelope) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: 'ucp_order_resolution_invalid_success_envelope',
      ...base,
      orderLookupStatus: 'ERROR',
      checkoutCommand,
      resumeCommand: checkoutCommand,
      retryable: false,
      warning: 'Payment succeeded, but the checkout lookup response could not be verified.',
    };
  }

  const data = raw.data;
  const observedCheckoutAliases = checkoutIdAliasesOf(data);
  if (!observedCheckoutAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: 'ucp_order_resolution_checkout_id_alias_conflict',
      ...base,
      orderLookupStatus: 'IDENTIFIER_CONFLICT',
      warning: 'Payment succeeded, but checkout lookup returned conflicting checkout identifiers.',
    };
  }
  const observedCheckoutId = observedCheckoutAliases.value;
  if (!observedCheckoutId || observedCheckoutId !== checkoutId) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: observedCheckoutId
        ? 'ucp_order_resolution_checkout_id_mismatch'
        : 'ucp_order_resolution_checkout_id_missing',
      ...base,
      orderLookupStatus: 'IDENTIFIER_CONFLICT',
      ...(observedCheckoutId ? { observedCheckoutId } : {}),
      warning: observedCheckoutId
        ? 'Payment succeeded, but checkout lookup returned a different checkout id.'
        : 'Payment succeeded, but checkout lookup did not identify the requested checkout.',
    };
  }

  const status = statusOf(data);
  const ucpOrderAliases = checkoutUcpOrderIdAliasesOf(data);
  if (!ucpOrderAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: 'ucp_order_resolution_ucp_order_id_alias_conflict',
      ...base,
      orderLookupStatus: 'IDENTIFIER_CONFLICT',
      warning: 'Payment succeeded, but checkout lookup returned conflicting UCP order identifiers.',
    };
  }
  const fields = resourceFields(data);
  const ucpOrderId = ucpOrderIdOf(fields);
  if (ucpOrderId) {
    const expectedUcpOrderId = contextUcpOrderAliases.value;
    if (expectedUcpOrderId && ucpOrderId !== expectedUcpOrderId) {
      return {
        state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
        action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
        terminal: true,
        reason: 'ucp_order_resolution_context_id_mismatch',
        ...base,
        expectedUcpOrderId,
        observedUcpOrderId: ucpOrderId,
        orderLookupStatus: 'IDENTIFIER_CONFLICT',
        warning: 'Payment succeeded, but checkout lookup returned a different UCP order id.',
      };
    }
    return {
      state: UcpCheckoutWorkflowState.ORDER_FETCH_REQUIRED,
      action: UcpCheckoutWorkflowAction.FETCH_UCP_ORDER,
      terminal: false,
      reason: 'ucp_order_id_resolved_from_checkout',
      ...base,
      ucpOrderId,
      // Deprecated compatibility alias; never sourced from paymentOrderId.
      omsOrderId: ucpOrderId,
      orderLookupStatus: 'RESOLVED',
      orderPermalinkUrl: fields.orderPermalinkUrl ?? orderPermalinkUrl,
      orderCommand: ucpOrderGetCommand(ucpOrderId),
    };
  }

  const projectionPending = status === 'complete_in_progress'
    || status === 'processing'
    || status === 'completed';
  if (!projectionPending) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: status
        ? `ucp_order_resolution_status_${status}_not_projecting`
        : 'ucp_order_resolution_status_missing',
      ...base,
      orderLookupStatus: 'ERROR',
      checkoutStatus: status,
      checkoutCommand,
      resumeCommand: checkoutCommand,
      retryable: false,
      warning: 'Payment succeeded, but checkout state does not show a pending UCP order projection.',
    };
  }

  if (retryDelaySeconds === null) {
    return {
      state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: status
        ? `ucp_order_projection_${status}_retry_exhausted`
        : 'ucp_order_projection_retry_exhausted',
      ...base,
      orderLookupStatus: 'PENDING',
      checkoutStatus: status,
      checkoutCommand,
      resumeCommand: checkoutCommand,
      retryable: false,
      attempt,
      warning: 'Payment succeeded; the UCP order id is not available yet. Resume with checkout get; do not retry payment.',
    };
  }

  return {
    state: UcpCheckoutWorkflowState.UCP_ORDER_PROJECTION_PENDING,
    action: UcpCheckoutWorkflowAction.WAIT_UCP_ORDER_PROJECTION,
    terminal: false,
    reason: status
      ? `ucp_order_projection_${status}_without_order_id`
      : 'ucp_order_projection_status_missing',
    ...base,
    orderLookupStatus: 'PENDING',
    checkoutStatus: status,
    checkoutCommand,
    resumeCommand: checkoutCommand,
    retryable: true,
    attempt,
    nextAttempt: attempt + 1,
    retryAfterSeconds: retryDelaySeconds,
    maxAttempts: UCP_ORDER_PROJECTION_RETRY_DELAYS_SECONDS.length + 1,
    warning: 'Payment succeeded; the UCP order id is still being projected.',
  };
}

function isRetryableUcpOrderResolutionError(observation = {}, exitCode) {
  if (exitCode === 6) return true;
  const parsed = parseMaybeJson(observation.stderr ?? observation.error ?? observation.result ?? {});
  const candidates = [
    observation.httpStatus,
    observation.http_status,
    observation.statusCode,
    observation.status_code,
    parsed?.status,
    parsed?.statusCode,
    parsed?.status_code,
    parsed?.error?.status,
    parsed?.error?.statusCode,
    parsed?.error?.status_code,
    parsed?.error?.code,
  ];
  return candidates.some((value) => {
    const status = numericValue(value);
    return status === 429 || (status !== null && status >= 500 && status <= 599);
  });
}

export function classifyUcpOrderFetchObservation(observation = {}, context = {}) {
  const correlatedContext = validateCorrelatedPaymentSuccessContext(context);
  if (!correlatedContext.valid) return correlatedContext.result;

  const expectedUcpOrderAliases = contextUcpOrderIdAliasesOf(context);
  const ucpOrderId = expectedUcpOrderAliases.value;
  const paymentOrderId = correlatedContext.paymentOrderId;
  const checkoutId = correlatedContext.checkoutId;
  const event = correlatedContext.event;
  const message = normalizedString(context.message) || successMessageFor(event);
  const orderPermalinkUrl = normalizedString(
    context.orderPermalinkUrl ?? context.order_permalink_url,
  ) ?? undefined;
  const checkoutEndpoint = checkoutEndpointOf(context);
  const base = {
    paymentConfirmed: true,
    ...(checkoutId ? { checkoutId } : {}),
    ...(checkoutEndpoint ? { checkoutEndpoint } : {}),
    ...(paymentOrderId ? { paymentOrderId } : {}),
    ...(ucpOrderId ? { ucpOrderId, omsOrderId: ucpOrderId } : {}),
    ...(event ? { event } : {}),
    message,
    orderPermalinkUrl,
  };
  if (!expectedUcpOrderAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.ORDER_FETCH_FAILED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: 'ucp_order_get_expected_id_alias_conflict',
      ...base,
      orderLookupStatus: 'IDENTIFIER_CONFLICT',
      warning: 'Payment succeeded, but the expected UCP order context contains conflicting identifiers.',
    };
  }
  const exitCode = numericValue(observation.exitCode ?? observation.exit_code ?? observation.code);
  if (exitCode !== null && exitCode !== 0) {
    return {
      state: UcpCheckoutWorkflowState.ORDER_FETCH_FAILED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: `ucp_order_get_exit_${exitCode}`,
      ...base,
      orderLookupStatus: 'ERROR',
      warning: 'Payment succeeded, but UCP order details could not be fetched.',
    };
  }

  const raw = parseMaybeJson(observation.stdout ?? observation.data ?? observation.result ?? {});
  const validEnvelope = raw && typeof raw === 'object' && !Array.isArray(raw)
    && raw.ok === true && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data);
  const order = validEnvelope ? raw.data : null;
  const observedUcpOrderAliases = fetchedUcpOrderIdAliasesOf(order ?? {});
  const observedUcpOrderId = observedUcpOrderAliases.value;
  if (!observedUcpOrderAliases.consistent) {
    return {
      state: UcpCheckoutWorkflowState.ORDER_FETCH_FAILED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: 'ucp_order_get_id_alias_conflict',
      ...base,
      orderLookupStatus: 'IDENTIFIER_CONFLICT',
      warning: 'Payment succeeded, but UCP order details returned conflicting identifiers.',
    };
  }
  if (!ucpOrderId || !order || observedUcpOrderId !== ucpOrderId) {
    return {
      state: UcpCheckoutWorkflowState.ORDER_FETCH_FAILED,
      action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING,
      terminal: true,
      reason: !ucpOrderId
        ? 'ucp_order_get_expected_id_missing'
        : !order
          ? 'ucp_order_get_invalid_success_envelope'
          : 'ucp_order_get_id_mismatch',
      ...base,
      ...(observedUcpOrderId ? { observedUcpOrderId } : {}),
      orderLookupStatus: observedUcpOrderId && observedUcpOrderId !== ucpOrderId
        ? 'IDENTIFIER_CONFLICT'
        : 'ERROR',
      warning: 'Payment succeeded, but UCP order details could not be verified.',
    };
  }
  return {
    state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
    action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_EVENT,
    terminal: true,
    reason: 'ucp_order_fetched',
    ...base,
    orderLookupStatus: 'FETCHED',
    order,
  };
}

export function formatUcpCheckoutFsmMarker(workflow, marker = 'UCP_CHECKOUT_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
