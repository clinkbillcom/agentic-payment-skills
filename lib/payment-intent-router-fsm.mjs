import { formatWorkflowMarker } from './workflow-marker.mjs';

export const PaymentIntentState = Object.freeze({
  DIRECT_PAY_SELECTED: 'DIRECT_PAY_SELECTED',
  UCP_CHECKOUT_SELECTED: 'UCP_CHECKOUT_SELECTED',
  PAYMENT_TARGET_INPUT_MISSING: 'PAYMENT_TARGET_INPUT_MISSING',
});

export const PaymentIntentRoute = Object.freeze({
  DIRECT_PAY: 'DIRECT_PAY',
  UCP_CHECKOUT: 'UCP_CHECKOUT',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
});

export const PaymentIntentAction = Object.freeze({
  RUN_DIRECT_PAY_WORKFLOW: 'RUN_DIRECT_PAY_WORKFLOW',
  RUN_UCP_CHECKOUT_WORKFLOW: 'RUN_UCP_CHECKOUT_WORKFLOW',
  ASK_FOR_PAYMENT_TARGET: 'ASK_FOR_PAYMENT_TARGET',
});

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function extractUrl(text = '') {
  const match = String(text).match(/https?:\/\/[^\s"'<>]+/iu);
  return match?.[0]?.replace(/[),.;，。]+$/u, '') || null;
}

function hasProductPath(url = '') {
  try {
    return /\/(products?|checkout|cart)(\/|$)/iu.test(new URL(String(url)).pathname);
  } catch {
    return false;
  }
}

function hasPurchaseLanguage(text = '') {
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
  );
}

function booleanValue(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function hasExplicitPurchaseIntent(input = {}, text = '') {
  if (hasPurchaseLanguage(text)) return true;
  if ([
    input.purchaseIntent,
    input.purchase_intent,
    input.checkoutIntent,
    input.checkout_intent,
    input.orderIntent,
    input.order_intent,
  ].some((value) => booleanValue(value) === true)) return true;

  const intent = normalizedString(input.intent ?? input.routeIntent ?? input.route_intent)?.toLowerCase();
  return ['purchase', 'buy', 'order', 'checkout', 'ucp_checkout'].includes(intent);
}

function productUrlOf(input = {}, text = '') {
  return normalizedString(
    input.productUrl
      ?? input.product_url
      ?? input.itemUrl
      ?? input.item_url
      ?? input.url
      ?? extractUrl(text),
  );
}

function productNameOf(input = {}) {
  return normalizedString(
    input.productName
      ?? input.product_name
      ?? input.itemName
      ?? input.item_name
      ?? input.title,
  );
}

function merchantIdOf(input = {}) {
  return normalizedString(input.merchantId ?? input.merchant_id);
}

function knownDirectPayContext(input = {}) {
  return Object.fromEntries(
    [
      ['amount', input.amount ?? input.totalAmount ?? input.total_amount],
      ['currency', input.currency ?? input.currencyCode ?? input.currency_code],
      ['sessionId', input.sessionId ?? input.session_id],
      ['orderId', input.orderId ?? input.order_id],
      ['paymentInstrumentId', input.paymentInstrumentId ?? input.payment_instrument_id],
    ]
      .map(([key, value]) => [key, normalizedString(value)])
      .filter(([, value]) => value !== null),
  );
}

export function classifyPaymentIntent(input = {}) {
  const text = normalizedString(input.text ?? input.prompt ?? input.userText ?? input.user_text) || '';
  const merchantId = merchantIdOf(input);
  const productUrl = productUrlOf(input, text);
  const productName = productNameOf(input);
  const itemId = normalizedString(input.itemId ?? input.item_id ?? input.productId ?? input.product_id);
  const explicitPurchaseIntent = hasExplicitPurchaseIntent(input, text);

  const hasProductSignal = productName !== null
    || itemId !== null
    || (productUrl !== null && hasProductPath(productUrl));

  if (hasProductSignal && explicitPurchaseIntent) {
    return {
      state: PaymentIntentState.UCP_CHECKOUT_SELECTED,
      route: PaymentIntentRoute.UCP_CHECKOUT,
      action: PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW,
      terminal: false,
      reason: 'product_purchase_intent',
      ...(merchantId ? { merchantId } : {}),
      ...(productUrl ? { productUrl } : {}),
      ...(productName ? { productName } : {}),
      ...(itemId ? { itemId } : {}),
    };
  }

  if (hasProductSignal) {
    return {
      state: PaymentIntentState.PAYMENT_TARGET_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_PAYMENT_TARGET,
      terminal: false,
      reason: 'purchase_intent_missing',
      missing: ['purchaseIntent'],
      ...(merchantId ? { merchantId } : {}),
      ...(productUrl ? { productUrl } : {}),
      ...(productName ? { productName } : {}),
      ...(itemId ? { itemId } : {}),
    };
  }

  if (merchantId) {
    return {
      state: PaymentIntentState.DIRECT_PAY_SELECTED,
      route: PaymentIntentRoute.DIRECT_PAY,
      action: PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW,
      terminal: false,
      reason: 'known_merchant_without_product_intent',
      merchantId,
      ...knownDirectPayContext(input),
    };
  }

  return {
    state: PaymentIntentState.PAYMENT_TARGET_INPUT_MISSING,
    route: PaymentIntentRoute.INPUT_REQUIRED,
    action: PaymentIntentAction.ASK_FOR_PAYMENT_TARGET,
    terminal: false,
    reason: 'payment_target_missing',
    missing: ['merchantId_or_product'],
  };
}

export function formatPaymentIntentFsmMarker(workflow, marker = 'PAYMENT_INTENT_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
