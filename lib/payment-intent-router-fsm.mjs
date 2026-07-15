import { formatWorkflowMarker } from './workflow-marker.mjs';

export const PaymentIntentState = Object.freeze({
  SKILL_TIP_LIST_SELECTED: 'SKILL_TIP_LIST_SELECTED',
  SKILL_TIP_SELECTED: 'SKILL_TIP_SELECTED',
  SKILL_TIP_INPUT_MISSING: 'SKILL_TIP_INPUT_MISSING',
  DIRECT_PAY_SELECTED: 'DIRECT_PAY_SELECTED',
  UCP_CHECKOUT_SELECTED: 'UCP_CHECKOUT_SELECTED',
  PAYMENT_TARGET_INPUT_MISSING: 'PAYMENT_TARGET_INPUT_MISSING',
});

export const PaymentIntentRoute = Object.freeze({
  SKILL_TIP_LIST: 'SKILL_TIP_LIST',
  SKILL_TIP: 'SKILL_TIP',
  DIRECT_PAY: 'DIRECT_PAY',
  UCP_CHECKOUT: 'UCP_CHECKOUT',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
});

export const PaymentIntentAction = Object.freeze({
  RUN_SKILL_TIP_LIST_WORKFLOW: 'RUN_SKILL_TIP_LIST_WORKFLOW',
  RUN_SKILL_TIP_WORKFLOW: 'RUN_SKILL_TIP_WORKFLOW',
  ASK_FOR_SKILL_TIP_INPUT: 'ASK_FOR_SKILL_TIP_INPUT',
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

function normalizedIntent(input = {}) {
  return normalizedString(input.intent ?? input.routeIntent ?? input.route_intent)?.toLowerCase();
}

function isSkillTipListIntent(input = {}, text = '') {
  if (['skill_tip_list', 'tip_skill_list', 'list_tippable_skills'].includes(normalizedIntent(input))) {
    return true;
  }
  if ([input.tipListIntent, input.tip_list_intent].some((value) => booleanValue(value) === true)) {
    return true;
  }

  const lowered = String(text).toLowerCase();
  const hasSkill = lowered.includes('skill') || lowered.includes('技能');
  const hasTip = lowered.includes('打赏') || lowered.includes('赞赏') || /\btip(?:pable)?\b/u.test(lowered);
  const hasListQuery = lowered.includes('哪些')
    || lowered.includes('列表')
    || lowered.includes('可打赏')
    || lowered.includes('list')
    || lowered.includes('which');
  return hasSkill && hasTip && hasListQuery;
}

function isSkillTipHowToQuestion(text = '') {
  return /怎么|如何|怎样|how\s+to|can\s+i|能否|可以[^。！？?!]*吗/iu.test(String(text));
}

function isSkillTipExecutionIntent(input = {}, text = '') {
  if (isSkillTipHowToQuestion(text)) return false;
  if (['skill_tip', 'tip_skill'].includes(normalizedIntent(input))) return true;
  if ([input.tipIntent, input.tip_intent].some((value) => booleanValue(value) === true)) return true;
  return /打赏|赞赏|\btip\b/iu.test(String(text));
}

function positiveInteger(value) {
  const normalized = normalizedString(value);
  if (!normalized || !/^[1-9]\d*$/u.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) ? number : null;
}

function skillTipIdentityTarget(input = {}, text = '') {
  const publisher = normalizedString(
    input.skillPublisher ?? input.skill_publisher ?? input.tipPublisher ?? input.publisher,
  );
  const skillName = normalizedString(
    input.skillName ?? input.skill_name ?? input.tipSkillName ?? input.tip_skill_name,
  );
  if (publisher !== null || skillName !== null) {
    return publisher !== null && skillName !== null
      ? { kind: 'identity', publisher, skillName }
      : { kind: 'incomplete_identity', publisher, skillName };
  }

  const match = String(text).match(/([A-Za-z0-9._+-]+)\/([A-Za-z0-9._+-]+)/u);
  return match ? { kind: 'identity', publisher: match[1], skillName: match[2] } : null;
}

function skillTipNumberTarget(input = {}, text = '') {
  const structured = input.skillNumber ?? input.skill_number ?? input.tipNumber ?? input.tip_number
    ?? (['skill_tip', 'tip_skill'].includes(normalizedIntent(input)) ? input.number : undefined);
  if (structured !== undefined && structured !== null && structured !== '') {
    const number = positiveInteger(structured);
    return number === null ? { kind: 'invalid_number' } : { kind: 'number', number };
  }

  const source = String(text);
  const match = source.match(/(?:序号|编号|number)\s*[:：#＃]?\s*([1-9]\d*)/iu)
    ?? source.match(/[#＃]\s*([1-9]\d*)/u)
    ?? source.match(/([1-9]\d*)\s*号/u);
  if (!match) return null;
  const number = positiveInteger(match[1]);
  return number === null ? { kind: 'invalid_number' } : { kind: 'number', number };
}

function skillTipAmount(input = {}, text = '') {
  const structured = normalizedString(input.amount ?? input.tipAmount ?? input.tip_amount);
  if (structured !== null) return structured;

  const source = String(text);
  return source.match(/\$\s*(\d+(?:\.\d+)?)/u)?.[1]
    ?? source.match(/(\d+(?:\.\d+)?)\s*(?:USD|EUR|CNY|RMB|GBP|JPY|美元|美金|人民币|欧元|英镑|日元)/iu)?.[1]
    ?? null;
}

function validTipAmount(value) {
  if (value === null || !/^\d+(?:\.\d+)?$/u.test(value)) return false;
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function skillTipCurrency(input = {}, text = '') {
  const structured = normalizedString(input.currency ?? input.currencyCode ?? input.currency_code);
  if (structured) return structured.toUpperCase();
  const source = String(text);
  if (/\$/u.test(source) || /美元|美金/u.test(source)) return 'USD';
  if (/人民币/u.test(source)) return 'CNY';
  if (/欧元/u.test(source)) return 'EUR';
  if (/英镑/u.test(source)) return 'GBP';
  if (/日元/u.test(source)) return 'JPY';
  return source.match(/\b(USD|EUR|CNY|RMB|GBP|JPY)\b/iu)?.[1]?.toUpperCase() ?? 'USD';
}

function explicitSkillTipAuthorization(input = {}, text = '') {
  if ([input.tipAuthorized, input.tip_authorized, input.paymentAuthorized, input.payment_authorized]
    .some((value) => booleanValue(value) === true)) return true;
  return !isSkillTipHowToQuestion(text) && /打赏|赞赏|\btip\b/iu.test(String(text));
}

function classifySkillTipInput(input = {}, text = '') {
  const identityTarget = skillTipIdentityTarget(input, text);
  const numberTarget = skillTipNumberTarget(input, text);
  if (identityTarget && numberTarget) {
    return {
      state: PaymentIntentState.SKILL_TIP_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT,
      terminal: false,
      reason: 'skill_tip_target_ambiguous',
      missing: ['single_target'],
    };
  }

  const target = identityTarget ?? numberTarget;
  const amount = skillTipAmount(input, text);
  const currency = skillTipCurrency(input, text);
  const explicitlyAuthorized = explicitSkillTipAuthorization(input, text);

  if (currency !== 'USD') {
    return {
      state: PaymentIntentState.SKILL_TIP_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT,
      terminal: false,
      reason: 'skill_tip_currency_unsupported',
      missing: ['currency_USD'],
    };
  }

  const missing = [];
  if (!target || !['identity', 'number'].includes(target.kind)) missing.push('target');
  if (!validTipAmount(amount)) missing.push('amount');
  if (!explicitlyAuthorized) missing.push('authorization');
  if (missing.length > 0) {
    return {
      state: PaymentIntentState.SKILL_TIP_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT,
      terminal: false,
      reason: 'skill_tip_input_missing',
      missing,
    };
  }

  return {
    state: PaymentIntentState.SKILL_TIP_SELECTED,
    route: PaymentIntentRoute.SKILL_TIP,
    action: PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW,
    terminal: false,
    reason: 'skill_tip_intent',
    tip: { target, amount, currency, explicitlyAuthorized },
  };
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

  if (isSkillTipListIntent(input, text)) {
    return {
      state: PaymentIntentState.SKILL_TIP_LIST_SELECTED,
      route: PaymentIntentRoute.SKILL_TIP_LIST,
      action: PaymentIntentAction.RUN_SKILL_TIP_LIST_WORKFLOW,
      terminal: false,
      reason: 'skill_tip_list_intent',
    };
  }

  if (isSkillTipExecutionIntent(input, text)) {
    return classifySkillTipInput(input, text);
  }

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
