import { formatWorkflowMarker } from './workflow-marker.mjs';
import { classifyWalletIntent } from './wallet-intent-fsm.mjs';
import {
  resolveCatalogEnvironment,
  resolveCatalogExt,
  resolveCatalogLanguage,
  resolveContextCountry,
} from './catalog-discovery-fsm.mjs';

export const PaymentIntentState = Object.freeze({
  WALLET_RELOGIN_SELECTED: 'WALLET_RELOGIN_SELECTED',
  WALLET_RELOGIN_INPUT_MISSING: 'WALLET_RELOGIN_INPUT_MISSING',
  WALLET_RELOGIN_NOT_AUTHORIZED: 'WALLET_RELOGIN_NOT_AUTHORIZED',
  SKILL_TIP_LIST_SELECTED: 'SKILL_TIP_LIST_SELECTED',
  SKILL_TIP_BATCH_SELECTED: 'SKILL_TIP_BATCH_SELECTED',
  SKILL_TIP_BATCH_CONFIRMATION_SELECTED: 'SKILL_TIP_BATCH_CONFIRMATION_SELECTED',
  SKILL_TIP_BATCH_CONFIRMATION_REJECTED: 'SKILL_TIP_BATCH_CONFIRMATION_REJECTED',
  SKILL_TIP_BATCH_INPUT_MISSING: 'SKILL_TIP_BATCH_INPUT_MISSING',
  SKILL_TIP_SELECTED: 'SKILL_TIP_SELECTED',
  SKILL_TIP_CONFIRMATION_SELECTED: 'SKILL_TIP_CONFIRMATION_SELECTED',
  SKILL_TIP_CONFIRMATION_REJECTED: 'SKILL_TIP_CONFIRMATION_REJECTED',
  SKILL_TIP_INPUT_MISSING: 'SKILL_TIP_INPUT_MISSING',
  SKILL_INSTALL_SELECTED: 'SKILL_INSTALL_SELECTED',
  SKILL_INSTALL_CONFIRMATION_SELECTED: 'SKILL_INSTALL_CONFIRMATION_SELECTED',
  SKILL_INSTALL_CONFIRMATION_REJECTED: 'SKILL_INSTALL_CONFIRMATION_REJECTED',
  SKILL_INSTALL_INPUT_MISSING: 'SKILL_INSTALL_INPUT_MISSING',
  DIRECT_PAY_SELECTED: 'DIRECT_PAY_SELECTED',
  UCP_CHECKOUT_SELECTED: 'UCP_CHECKOUT_SELECTED',
  CATALOG_SEARCH_SELECTED: 'CATALOG_SEARCH_SELECTED',
  CATALOG_SEARCH_NOT_AUTHORIZED: 'CATALOG_SEARCH_NOT_AUTHORIZED',
  CATALOG_PURCHASE_SELECTED: 'CATALOG_PURCHASE_SELECTED',
  CATALOG_PRODUCT_SELECTION_SELECTED: 'CATALOG_PRODUCT_SELECTION_SELECTED',
  CATALOG_PRODUCT_SELECTION_REJECTED: 'CATALOG_PRODUCT_SELECTION_REJECTED',
  CATALOG_PRODUCT_SELECTION_INPUT_MISSING: 'CATALOG_PRODUCT_SELECTION_INPUT_MISSING',
  CATALOG_DISCOVERY_INPUT_MISSING: 'CATALOG_DISCOVERY_INPUT_MISSING',
  PAYMENT_NOT_AUTHORIZED: 'PAYMENT_NOT_AUTHORIZED',
  PAYMENT_TARGET_INPUT_MISSING: 'PAYMENT_TARGET_INPUT_MISSING',
});

export const PaymentIntentRoute = Object.freeze({
  WALLET_RELOGIN: 'WALLET_RELOGIN',
  NO_ACTION: 'NO_ACTION',
  SKILL_TIP_LIST: 'SKILL_TIP_LIST',
  SKILL_TIP_BATCH: 'SKILL_TIP_BATCH',
  SKILL_TIP: 'SKILL_TIP',
  SKILL_INSTALL: 'SKILL_INSTALL',
  DIRECT_PAY: 'DIRECT_PAY',
  UCP_CHECKOUT: 'UCP_CHECKOUT',
  CATALOG_SEARCH: 'CATALOG_SEARCH',
  CATALOG_PURCHASE: 'CATALOG_PURCHASE',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
});

export const PaymentIntentAction = Object.freeze({
  START_FRESH_WALLET_INIT: 'START_FRESH_WALLET_INIT',
  ASK_FOR_WALLET_EMAIL: 'ASK_FOR_WALLET_EMAIL',
  DO_NOT_START_WALLET_INIT: 'DO_NOT_START_WALLET_INIT',
  RUN_SKILL_TIP_LIST_WORKFLOW: 'RUN_SKILL_TIP_LIST_WORKFLOW',
  RUN_SKILL_TIP_BATCH_WORKFLOW: 'RUN_SKILL_TIP_BATCH_WORKFLOW',
  RESUME_SKILL_TIP_BATCH_WORKFLOW: 'RESUME_SKILL_TIP_BATCH_WORKFLOW',
  CANCEL_PENDING_SKILL_TIP_BATCH: 'CANCEL_PENDING_SKILL_TIP_BATCH',
  ASK_FOR_SKILL_TIP_BATCH_INPUT: 'ASK_FOR_SKILL_TIP_BATCH_INPUT',
  RUN_SKILL_TIP_WORKFLOW: 'RUN_SKILL_TIP_WORKFLOW',
  RESUME_SKILL_TIP_WORKFLOW: 'RESUME_SKILL_TIP_WORKFLOW',
  CANCEL_PENDING_SKILL_TIP: 'CANCEL_PENDING_SKILL_TIP',
  ASK_FOR_SKILL_TIP_INPUT: 'ASK_FOR_SKILL_TIP_INPUT',
  RUN_SKILL_INSTALL_WORKFLOW: 'RUN_SKILL_INSTALL_WORKFLOW',
  RESUME_SKILL_INSTALL_WORKFLOW: 'RESUME_SKILL_INSTALL_WORKFLOW',
  CANCEL_PENDING_SKILL_INSTALL: 'CANCEL_PENDING_SKILL_INSTALL',
  ASK_FOR_SKILL_INSTALL_INPUT: 'ASK_FOR_SKILL_INSTALL_INPUT',
  RUN_DIRECT_PAY_WORKFLOW: 'RUN_DIRECT_PAY_WORKFLOW',
  RUN_UCP_CHECKOUT_WORKFLOW: 'RUN_UCP_CHECKOUT_WORKFLOW',
  RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW: 'RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW',
  DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY: 'DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY',
  RUN_CATALOG_DISCOVERY_WORKFLOW: 'RUN_CATALOG_DISCOVERY_WORKFLOW',
  RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT: 'RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT',
  ASK_FOR_CATALOG_PRODUCT_SELECTION: 'ASK_FOR_CATALOG_PRODUCT_SELECTION',
  ASK_FOR_CATALOG_DISCOVERY_INPUT: 'ASK_FOR_CATALOG_DISCOVERY_INPUT',
  CANCEL_PENDING_CATALOG_PRODUCT_SELECTION: 'CANCEL_PENDING_CATALOG_PRODUCT_SELECTION',
  DO_NOT_RUN_PAYMENT_WORKFLOW: 'DO_NOT_RUN_PAYMENT_WORKFLOW',
  ASK_FOR_PAYMENT_TARGET: 'ASK_FOR_PAYMENT_TARGET',
});

export const PaymentRoutingOperation = Object.freeze({
  CATALOG_SEARCH: 'CATALOG_SEARCH',
  CATALOG_PURCHASE: 'CATALOG_PURCHASE',
  UCP_CHECKOUT: 'UCP_CHECKOUT',
  DIRECT_PAY: 'DIRECT_PAY',
  NO_ACTION: 'NO_ACTION',
});

export const PaymentExecutionDecision = Object.freeze({
  AUTHORIZED: 'AUTHORIZED',
  DENIED: 'DENIED',
  CLARIFY: 'CLARIFY',
});

export const PaymentAuthorizationSource = Object.freeze({
  CURRENT_USER_TURN: 'CURRENT_USER_TURN',
  UPSTREAM_MERCHANT_WORKFLOW: 'UPSTREAM_MERCHANT_WORKFLOW',
});

export const PaymentDirectPayMode = Object.freeze({
  DIRECT: 'DIRECT',
  SESSION: 'SESSION',
});

export const PaymentWalletGate = Object.freeze({
  SKIP: 'SKIP',
  DEFER_UNTIL_SELECTION: 'DEFER_UNTIL_SELECTION',
  REQUIRE_STATUS: 'REQUIRE_STATUS',
});

function normalizedString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim() || null;
}

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizedString(value);
    if (normalized !== null) return normalized;
  }
  return null;
}

function structuredString(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null, invalid: false };
  }
  if (typeof value !== 'string') return { value: null, invalid: true };
  return { value: value.trim() || null, invalid: false };
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

function productItemIdOf(input = {}) {
  return firstNormalizedString(input.itemId, input.item_id, input.productId, input.product_id);
}

function explicitProductUrlOf(input = {}) {
  return firstNormalizedString(
    input.productUrl,
    input.product_url,
    input.itemUrl,
    input.item_url,
  );
}

function hasProductTarget(input = {}, text = '') {
  const explicitProductUrl = explicitProductUrlOf(input);
  const heuristicProductUrl = firstNormalizedString(input.url, extractUrl(text));
  return productNameOf(input) !== null
    || productItemIdOf(input) !== null
    || explicitProductUrl !== null
    || (heuristicProductUrl !== null && hasProductPath(heuristicProductUrl));
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
    || lowered.includes('列出')
    || lowered.includes('可打赏')
    || /\b(?:list|show)\b[^.?!\n]*\bskills?\b/u.test(lowered)
    || /\bwhich\b[^.?!\n]*\bskills?\b|\bskills?\b[^.?!\n]*\bwhich\b/u.test(lowered);
  return hasSkill && hasTip && hasListQuery;
}

function isSkillTipHowToQuestion(text = '') {
  return /怎么|如何|怎样|how\s+to|can\s+i|能否|可以[^。！？?!]*吗/iu.test(String(text));
}

function isSkillTipNonAuthorizingQuestion(text = '') {
  const source = String(text);
  return isSkillTipHowToQuestion(source)
    || /[?？]/u.test(source)
    || /吗(?:\s*[。！？?!])?\s*$/u.test(source)
    || /\bwhat\s+if\b|\bwhat\s+happens?\s+if\b|\bshould\s+i\b|\bwould\s+i\b|\bdo\s+i\s+need\s+to\b/iu.test(String(text))
    || /是否|要不要|该不该|会不会/iu.test(String(text));
}

function isSkillTipNegated(text = '') {
  const source = String(text);
  return /(?:不要|别|停止|取消|不用|不准|禁止)[^。！？?!\n]*(?:打赏|赞赏)/iu.test(source)
    || /\b(?:do\s+not|don't|never|stop|cancel)\b[^.?!\n]*\btip\b/iu.test(source);
}

function isSkillTipHistoricalOrConditional(text = '') {
  const source = String(text);
  return /(?:昨天|刚才|之前|曾经|已经)[^。！？?!\n]*(?:打赏|赞赏)/iu.test(source)
    || /(?:如果|假如|要是)[^。！？?!\n]*(?:打赏|赞赏)/iu.test(source)
    || /\b(?:yesterday|previously|already)\b[^.?!\n]*\btip(?:ped)?\b/iu.test(source)
    || /\b(?:if|when)\b[^.?!\n]*\btip\b/iu.test(source);
}

function isSkillTipExecutionIntent(input = {}, text = '') {
  if (['skill_tip', 'tip_skill', 'skill_tip_batch', 'batch_skill_tip'].includes(normalizedIntent(input))) {
    return true;
  }
  if ([input.tipIntent, input.tip_intent].some((value) => booleanValue(value) === true)) return true;
  return /打赏|赞赏|\btip\b/iu.test(String(text));
}

function isSkillInstallExecutionIntent(input = {}, text = '') {
  const structuredIntent = ['skill_install', 'install_skill'].includes(normalizedIntent(input))
    || [
    input.installIntent,
    input.install_intent,
    input.skillInstallIntent,
    input.skill_install_intent,
  ].some((value) => booleanValue(value) === true);
  const source = String(text);
  const productTargetPresent = hasProductTarget(input, source);
  const paymentLanguagePresent = hasExplicitPurchaseIntent(input, source)
    || /支付|付款|结账|\bpay\b/iu.test(source);
  const installationFeePresent = /安装(?:费|费用)|\b(?:install|installation|setup)\s+fees?\b/iu.test(source);
  const directPaymentAuthorized = [
    input.paymentAuthorized,
    input.payment_authorized,
    input.payAuthorized,
    input.pay_authorized,
  ].some((value) => booleanValue(value) === true)
    || ['pay', 'payment', 'direct_pay'].includes(normalizedIntent(input));
  const hasPotentialSkillInstallTarget = structuredIntent
    || textSkillInstallIdentityTargets(source).length > 0
    || uniqueTextInstallNumberTargets(source).length > 0
    || /[^\s,，。！？?!]+\/[^\s,，。！？?!]+/u.test(source)
    || /\bskills?\b|技能/iu.test(source);
  const unsafeInstallLanguage = isSkillInstallNonAuthorizingQuestion(source)
    || isSkillInstallNegated(source)
    || isSkillInstallHistoricalOrConditional(source);
  const noncanonicalAmountPayment = source.trim().length > 0
    && !isCanonicalSkillInstallCommand(source)
    && !hasPotentialSkillInstallTarget
    && !unsafeInstallLanguage
    && normalizedString(input.amount ?? input.totalAmount ?? input.total_amount) !== null
    && normalizedString(input.currency ?? input.currencyCode ?? input.currency_code) !== null;
  const merchantPaymentPresent = merchantIdOf(input) !== null
    && (paymentLanguagePresent
      || installationFeePresent
      || directPaymentAuthorized
      || noncanonicalAmountPayment);
  const productRoutePresent = productTargetPresent;
  if (productRoutePresent || merchantPaymentPresent) {
    return false;
  }
  if (structuredIntent) return true;
  const sourceOutsideTargets = source.replace(
    /[A-Za-z0-9._-]{1,128}\/[A-Za-z0-9._-]{1,128}(?:@[A-Za-z0-9._+-]{1,128})?/gu,
    ' ',
  );
  if (!/安装|装一下|\binstall\b/iu.test(sourceOutsideTargets)) return false;
  return /\bskills?\b|技能/iu.test(source)
    || textSkillInstallIdentityTargets(source).length > 0
    || /第\s*[1-9]\d*\s*(?:个|号)|(?:序号|编号|number)\s*[:：#＃]?\s*[1-9]\d*|[#＃]\s*[1-9]\d*|[1-9]\d*\s*号/iu.test(source)
    || hasSkillInstallCommandPrefix(source);
}

function isSkillInstallNonAuthorizingQuestion(text = '') {
  const source = String(text);
  return /怎么|如何|怎样|how\s+to|can\s+i|能否|可以[^。！？?!]*吗/iu.test(source)
    || /[?？]/u.test(source)
    || /吗(?:\s*[。！？?!])?\s*$/u.test(source)
    || /\bwhat\s+if\b|\bshould\s+i\b|\bwould\s+i\b|是否|要不要|该不该/iu.test(source)
    || /安装(?:教程|状态|记录|历史)|安装过|有什么(?:风险|影响|后果)|会怎样|怎么样/iu.test(source)
    || /\binstall(?:ation)?\s+(?:tutorial|status|history)|\brisk\s+of\s+install/iu.test(source);
}

function isSkillInstallNegated(text = '') {
  const source = String(text);
  return /(?:不要|别|停止|取消|不用|不必|不想|不需要|无需|暂时不|先不|不)[^。！？?!\n]*(?:安装|装一下)/iu.test(source)
    || /\b(?:do\s+not|don't|never|stop|cancel)\b[^.?!\n]*\binstall\b/iu.test(source);
}

function isSkillInstallHistoricalOrConditional(text = '') {
  const source = String(text);
  return /(?:昨天|刚才|之前|曾经|已经)[^。！？?!\n]*(?:安装|装过|装了)/iu.test(source)
    || /(?:安装|装)(?:过|了)/u.test(source)
    || /(?:如果|假如|要是)[^。！？?!\n]*(?:安装|装一下)/iu.test(source)
    || /\b(?:yesterday|previously|already)\b[^.?!\n]*\binstall(?:ed)?\b/iu.test(source)
    || /\b(?:if|when)\b[^.?!\n]*\binstall\b/iu.test(source);
}

function explicitSkillInstallAuthorization(input = {}, text = '') {
  if (
    isSkillInstallNonAuthorizingQuestion(text)
    || isSkillInstallNegated(text)
    || isSkillInstallHistoricalOrConditional(text)
  ) return false;
  const explicitValues = [
    input.installAuthorized,
    input.install_authorized,
    input.skillInstallAuthorized,
    input.skill_install_authorized,
  ].map(booleanValue).filter((value) => value !== null);
  if (explicitValues.length > 0) {
    if (!explicitValues.every((value) => value === true)) return false;
    const source = String(text).trim();
    return !source || isCanonicalSkillInstallCommand(source);
  }
  return isCanonicalSkillInstallCommand(text);
}

const SKILL_PACKAGE_SPEC_PATTERN = /^([\p{L}\p{M}\p{N}._-]{1,128})\/([\p{L}\p{M}\p{N}._-](?:[\p{L}\p{M}\p{N}._ -]{0,126}[\p{L}\p{M}\p{N}._-])?)(?:@([A-Za-z0-9._+-]{1,128}))?$/u;

function hasSkillInstallCommandPrefix(text = '') {
  const source = String(text).trim();
  return /^(?:(?:请|麻烦|帮我|给我|我要|现在|立即)\s*)*(?:(?:使用|用)\s*clink(?:-cli)?\s*)?(?:安装(?:一下)?|装一下)/iu.test(source)
    || /^(?:please\s+)?install\b/iu.test(source);
}

function skillInstallCommandRemainder(text = '') {
  const source = String(text).trim();
  const chinese = source.match(
    /^(?:(?:请|麻烦|帮我|给我|我要|现在|立即)\s*)*(?:(?:使用|用)\s*clink(?:-cli)?\s*)?(?:安装(?:一下)?|装一下)\s*(.*)$/iu,
  );
  if (chinese) return chinese[1].trim();
  const english = source.match(/^(?:please\s+)?install\s+(.*)$/iu);
  return english?.[1]?.trim() ?? null;
}

function isCanonicalSkillInstallCommand(text = '') {
  const remainder = skillInstallCommandRemainder(text);
  if (!remainder) return false;
  const normalizedRemainder = remainder.replace(/[。!！]$/u, '').replace(/\s*(?:吧|了)$/u, '').trim();
  if (SKILL_PACKAGE_SPEC_PATTERN.test(normalizedRemainder)) return true;
  return /^(?:第\s*[1-9]\d*\s*(?:个|号)|(?:序号|编号|number)\s*[:：#＃]?\s*[1-9]\d*|[#＃]\s*[1-9]\d*|[1-9]\d*\s*号)(?:\s*的)?(?:\s*(?:skills?|技能))?\s*(?:吧|了)?[。!！]?$/iu.test(remainder);
}

function textSkillInstallIdentityTargets(text = '') {
  const source = String(text);
  const commandRemainder = skillInstallCommandRemainder(source);
  if (commandRemainder) {
    const commandPackage = commandRemainder
      .replace(/[。!！]$/u, '')
      .replace(/\s*(?:吧|了)$/u, '')
      .trim();
    const commandMatch = commandPackage.match(SKILL_PACKAGE_SPEC_PATTERN);
    if (commandMatch) {
      return [{
        kind: 'identity',
        publisher: commandMatch[1],
        skillName: commandMatch[2],
        ...(commandMatch[3] ? { versionNo: commandMatch[3] } : {}),
      }];
    }
  }
  const tokenCandidates = source
    .split(/[\s,，。！？?!]+/u)
    .filter((token) => token.includes('/'));
  const targets = tokenCandidates.map((candidate) => {
    const match = candidate.match(SKILL_PACKAGE_SPEC_PATTERN);
    return match
      ? {
        kind: 'identity',
        publisher: match[1],
        skillName: match[2],
        ...(match[3] ? { versionNo: match[3] } : {}),
      }
      : null;
  }).filter(Boolean);
  return uniqueBy(
    targets,
    (target) => `${target.publisher.toLowerCase()}\u0000${target.skillName.toLowerCase()}\u0000${target.versionNo ?? ''}`,
  );
}

function hasNonCanonicalInstallVersionSyntax(text = '') {
  return /(?:--version\b|\bversion\s*(?::|is)?\s*[A-Za-z0-9._+-]+|版本\s*(?:为|是)?\s*[:：]?\s*[A-Za-z0-9._+-]+)/iu.test(String(text));
}

function positiveInteger(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || !/^[1-9]\d*$/u.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) ? number : null;
}

function validSkillVersion(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && /^[A-Za-z0-9._+-]{1,128}$/u.test(value);
}

function skillTipIdentityTarget(input = {}, text = '') {
  const publisher = normalizedString(
    input.skillPublisher ?? input.skill_publisher ?? input.tipPublisher ?? input.publisher,
  );
  const skillName = normalizedString(
    input.skillName ?? input.skill_name ?? input.tipSkillName ?? input.tip_skill_name,
  );
  const versionNo = normalizedString(
    input.skillVersion ?? input.skill_version ?? input.tipVersion ?? input.tip_version,
  );
  if (publisher !== null || skillName !== null || versionNo !== null) {
    return publisher !== null && skillName !== null
      ? {
        kind: 'identity',
        publisher,
        skillName,
        ...(versionNo ? { versionNo } : {}),
      }
      : { kind: 'incomplete_identity', publisher, skillName, versionNo };
  }

  const match = String(text).match(
    /([A-Za-z0-9._+-]+)\/([A-Za-z0-9._+-]+)(?:@([^\s,，。！？?!]+))?/u,
  );
  return match
    ? {
      kind: 'identity',
      publisher: match[1],
      skillName: match[2],
      ...(match[3] ? { versionNo: match[3] } : {}),
    }
    : null;
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

function skillInstallIdentityTarget(input = {}, text = '') {
  const publisherField = structuredString(
    input.installPublisher ?? input.install_publisher ?? input.skillPublisher
      ?? input.skill_publisher ?? input.publisher,
  );
  const skillNameField = structuredString(
    input.installSkillName ?? input.install_skill_name ?? input.skillName ?? input.skill_name,
  );
  const versionField = structuredString(
    input.installVersion ?? input.install_version ?? input.skillVersion
      ?? input.skill_version ?? input.versionNo ?? input.version_no,
  );
  if (publisherField.invalid || skillNameField.invalid || versionField.invalid) {
    return { kind: 'invalid_identity' };
  }
  const publisher = publisherField.value;
  const skillName = skillNameField.value;
  const versionNo = versionField.value;
  if (publisher !== null || skillName !== null || versionNo !== null) {
    return publisher !== null && skillName !== null
      ? {
        kind: 'identity',
        publisher,
        skillName,
        ...(versionNo ? { versionNo } : {}),
      }
      : { kind: 'incomplete_identity', publisher, skillName, versionNo };
  }

  return textSkillInstallIdentityTargets(text)[0] ?? null;
}

function skillInstallNumberTarget(input = {}, text = '') {
  const structured = input.installNumber ?? input.install_number ?? input.skillNumber ?? input.skill_number
    ?? (['skill_install', 'install_skill'].includes(normalizedIntent(input)) ? input.number : undefined);
  if (structured !== undefined && structured !== null && structured !== '') {
    const number = positiveInteger(structured);
    return number === null ? { kind: 'invalid_number' } : { kind: 'number', number };
  }

  const source = String(text);
  const match = source.match(/第\s*([1-9]\d*)\s*(?:个|号)/u)
    ?? source.match(/(?:序号|编号|number)\s*[:：#＃]?\s*([1-9]\d*)/iu)
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
  if (
    isSkillTipNonAuthorizingQuestion(text)
    || isSkillTipNegated(text)
    || isSkillTipHistoricalOrConditional(text)
  ) return false;
  const explicitValues = [
    input.tipAuthorized,
    input.tip_authorized,
    input.paymentAuthorized,
    input.payment_authorized,
  ].map(booleanValue).filter((value) => value !== null);
  if (explicitValues.length > 0) return explicitValues.every((value) => value === true);
  return /打赏|赞赏|\btip\b/iu.test(String(text));
}

function uniqueTextIdentityTargets(text = '') {
  const targets = [...String(text).matchAll(
    /([A-Za-z0-9._+-]+)\/([A-Za-z0-9._+-]+)(?:@([^\s,，。！？?!]+))?/gu,
  )].map((match) => ({
    kind: 'identity',
    publisher: match[1],
    skillName: match[2],
    ...(match[3] ? { versionNo: match[3] } : {}),
  }));
  return uniqueBy(
    targets,
    (target) => `${target.publisher.toLowerCase()}\u0000${target.skillName.toLowerCase()}\u0000${target.versionNo ?? ''}`,
  );
}

function textIdentityTargetOccurrences(text = '') {
  return [...String(text).matchAll(
    /([A-Za-z0-9._+-]+)\/([A-Za-z0-9._+-]+)(?:@([^\s,，。！？?!]+))?/gu,
  )].map((match) => ({
    target: {
      kind: 'identity',
      publisher: match[1],
      skillName: match[2],
    },
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function textBatchCurrency(text = '') {
  const source = String(text);
  const currencies = new Set();
  if (/\$|美元|美金|\bUSD\b/iu.test(source)) currencies.add('USD');
  if (/人民币|\b(?:CNY|RMB)\b/iu.test(source)) currencies.add('CNY');
  if (/欧元|\bEUR\b/iu.test(source)) currencies.add('EUR');
  if (/英镑|\bGBP\b/iu.test(source)) currencies.add('GBP');
  if (/日元|\bJPY\b/iu.test(source)) currencies.add('JPY');
  return currencies.size === 0 ? 'USD' : (currencies.size === 1 ? [...currencies][0] : null);
}

function uniqueTextNumberTargets(text = '') {
  const source = String(text);
  const matches = [
    ...source.matchAll(/(?:序号|编号|number)\s*[:：#＃]?\s*([1-9]\d*)/giu),
    ...source.matchAll(/[#＃]\s*([1-9]\d*)/gu),
    ...source.matchAll(/([1-9]\d*)\s*号/gu),
  ];
  return uniqueBy(
    matches.map((match) => ({ kind: 'number', number: Number(match[1]) })),
    (target) => String(target.number),
  );
}

function uniqueTextInstallIdentityTargets(text = '') {
  return textSkillInstallIdentityTargets(text);
}

function uniqueTextInstallNumberTargets(text = '') {
  const source = String(text);
  const matches = [
    ...source.matchAll(/第\s*([1-9]\d*)\s*(?:个|号)/gu),
    ...source.matchAll(/(?:序号|编号|number)\s*[:：#＃]?\s*([1-9]\d*)/giu),
    ...source.matchAll(/[#＃]\s*([1-9]\d*)/gu),
    ...source.matchAll(/([1-9]\d*)\s*号/gu),
  ];
  return uniqueBy(
    matches.map((match) => ({ kind: 'number', number: Number(match[1]) })),
    (target) => String(target.number),
  );
}

function uniqueTextAmounts(text = '') {
  const matches = [...String(text).matchAll(
    /\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:USD|EUR|CNY|RMB|GBP|JPY|美元|美金|人民币|欧元|英镑|日元)/giu,
  )];
  return uniqueBy(
    matches.map((match) => match[1] ?? match[2]).filter(Boolean),
    (amount) => String(Number(amount)),
  );
}

function uniqueBy(values, keyOf) {
  const seen = new Set();
  return values.filter((value) => {
    const key = keyOf(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameTipTarget(left, right) {
  if (!left || !right || left.kind !== right.kind) return false;
  if (left.kind === 'number') return left.number === right.number;
  return left.publisher.toLowerCase() === right.publisher.toLowerCase()
    && left.skillName.toLowerCase() === right.skillName.toLowerCase()
    && (
      !left.versionNo
      || !right.versionNo
      || left.versionNo === right.versionNo
    );
}

function structuredAndTextSkillInstallTargetsCompatible(left, right) {
  if (!left || !right || left.kind !== right.kind) return false;
  if (left.kind === 'number') return left.number === right.number;
  if (left.publisher !== right.publisher || left.skillName !== right.skillName) return false;
  return left.versionNo ? left.versionNo === right.versionNo : true;
}

function validSkillInstallPublisher(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && /^[\p{L}\p{M}\p{N}._-]{1,128}$/u.test(value);
}

function validSkillInstallName(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && value.length <= 128
    && /^[\p{L}\p{M}\p{N}._-]+(?: +[\p{L}\p{M}\p{N}._-]+)*$/u.test(value);
}

function activePendingTipConfirmation(input = {}) {
  const pending = input.pendingTipConfirmation ?? input.pending_tip_confirmation;
  return pending && typeof pending === 'object' && !Array.isArray(pending)
    && pending.status === 'AWAITING_CONFIRMATION'
    ? pending
    : null;
}

function activePendingTipBatchConfirmation(input = {}) {
  const pending = input.pendingTipBatchConfirmation ?? input.pending_tip_batch_confirmation;
  return pending && typeof pending === 'object' && !Array.isArray(pending)
    && pending.status === 'AWAITING_CONFIRMATION'
    ? pending
    : null;
}

function activePendingSkillInstallConfirmation(input = {}) {
  const pending = input.pendingSkillInstallConfirmation ?? input.pending_skill_install_confirmation;
  return pending && typeof pending === 'object' && !Array.isArray(pending)
    && pending.status === 'AWAITING_CONFIRMATION'
    ? pending
    : null;
}

function activePendingCatalogProductSelectionResolution(input = {}) {
  const fields = [
    ['pendingCatalogProductSelection', input.pendingCatalogProductSelection],
    ['pending_catalog_product_selection', input.pending_catalog_product_selection],
  ].filter(([, value]) => value !== undefined && value !== null);
  if (fields.length === 0) return { pending: null };
  if (fields.length > 1 && fields[0][1] !== fields[1][1]) {
    return {
      conflict: true,
      conflictingFields: fields.map(([field]) => field),
    };
  }

  const pending = fields[0][1];
  return pending && typeof pending === 'object' && !Array.isArray(pending)
    && pending.status === 'AWAITING_SELECTION'
    ? { pending }
    : { pending: null };
}

function catalogSelectionProvenance(pending = {}) {
  const rawModes = [pending.resultMode, pending.result_mode]
    .map(normalizedString)
    .filter((value) => value !== null);
  const modes = rawModes.map((value) => value.toUpperCase());
  if (modes.some((value) => !['DISCOVERY_ONLY', 'PURCHASE_SELECTION'].includes(value))) {
    return { valid: false, reason: 'catalog_selection_provenance_invalid', values: rawModes };
  }

  const rawPurchaseIntents = [pending.purchaseIntent, pending.purchase_intent]
    .filter((value) => value !== undefined && value !== null && value !== '');
  const purchaseIntents = rawPurchaseIntents.map(booleanValue);
  if (purchaseIntents.some((value) => value === null)) {
    return {
      valid: false,
      reason: 'catalog_selection_provenance_invalid',
      values: rawPurchaseIntents,
    };
  }

  const missing = [];
  if (rawPurchaseIntents.length === 0) missing.push('purchaseIntent');
  if (rawModes.length === 0) missing.push('resultMode');
  if (missing.length > 0) {
    return {
      valid: false,
      reason: 'catalog_selection_provenance_missing',
      missing,
    };
  }

  const uniqueModes = [...new Set(modes)];
  const uniquePurchaseIntents = [...new Set(purchaseIntents)];
  if (uniqueModes.length !== 1 || uniquePurchaseIntents.length !== 1) {
    return {
      valid: false,
      reason: 'catalog_selection_provenance_conflict',
      values: [...rawModes, ...rawPurchaseIntents],
    };
  }

  const mode = uniqueModes[0];
  const purchaseIntent = uniquePurchaseIntents[0];
  if (
    (mode === 'PURCHASE_SELECTION' && purchaseIntent !== true)
    || (mode === 'DISCOVERY_ONLY' && purchaseIntent !== false)
  ) {
    return {
      valid: false,
      reason: 'catalog_selection_provenance_conflict',
      values: [...rawModes, ...rawPurchaseIntents],
    };
  }
  return {
    valid: true,
    mode,
  };
}

function isDiscoveryOnlyCatalogSelection(pending = {}) {
  const provenance = catalogSelectionProvenance(pending);
  return !provenance.valid || provenance.mode === 'DISCOVERY_ONLY';
}

function pendingCatalogCandidatesResolution(pending = {}) {
  const fields = [
    ['candidates', pending.candidates],
    ['products', pending.products],
  ].filter(([, value]) => value !== undefined && value !== null);
  if (fields.length === 0) return { valid: true, candidates: [] };
  if (fields.length > 1 && fields[0][1] !== fields[1][1]) {
    return {
      valid: false,
      reason: 'catalog_selection_candidates_conflict',
      conflictingFields: fields.map(([field]) => field),
    };
  }

  const candidates = fields[0][1];
  if (!Array.isArray(candidates)) {
    return {
      valid: false,
      reason: 'catalog_selection_candidates_invalid',
      invalidFields: [fields[0][0]],
    };
  }
  const invalidIndexes = candidates
    .map((entry, index) => (
      entry && typeof entry === 'object' && !Array.isArray(entry) ? null : index + 1
    ))
    .filter((index) => index !== null);
  if (invalidIndexes.length > 0) {
    return {
      valid: false,
      reason: 'catalog_selection_candidates_invalid',
      invalidIndexes,
    };
  }
  return { valid: true, candidates };
}

function pendingCatalogQueryResolution(pending = {}) {
  const resolution = catalogCandidateStringResolution(
    pending,
    ['catalogQuery', 'catalog_query', 'query'],
    'catalogQuery',
    true,
  );
  if (resolution.valid) {
    return { valid: true, catalogQuery: resolution.value };
  }
  if (resolution.missing) {
    return {
      valid: false,
      reason: 'catalog_selection_query_missing',
      missing: resolution.missing,
    };
  }
  return {
    valid: false,
    reason: resolution.conflictingFields
      ? 'catalog_selection_query_conflict'
      : 'catalog_selection_query_invalid',
    ...(resolution.invalidFields ? { invalidFields: resolution.invalidFields } : {}),
    ...(resolution.conflictingFields
      ? { conflictingFields: resolution.conflictingFields }
      : {}),
    ...(resolution.values ? { values: resolution.values } : {}),
  };
}

function hasCatalogEnvironmentValue(input = {}) {
  return [input.catalogEnvironment, input.catalog_environment]
    .some((value) => normalizedString(value) !== null);
}

function optionalCatalogEnvironmentResolution(input = {}) {
  if (!hasCatalogEnvironmentValue(input)) {
    return { valid: true, catalogEnvironment: null };
  }
  return resolveCatalogEnvironment(input);
}

function pendingCatalogContext(pending = {}) {
  return {
    environmentPresent: hasCatalogEnvironmentValue(pending),
    environment: optionalCatalogEnvironmentResolution(pending),
    language: resolveCatalogLanguage(pending),
  };
}

function trustedPendingCatalogContext(pending = {}) {
  const context = pendingCatalogContext(pending);
  return {
    ...(context.environmentPresent
      && context.environment.valid
      && context.environment.catalogEnvironment
      ? { catalogEnvironment: context.environment.catalogEnvironment }
      : {}),
    ...(context.language.valid && context.language.catalogLanguage
      ? { catalogLanguage: context.language.catalogLanguage }
      : {}),
  };
}

function frozenCatalogSelectionContext(pending = {}) {
  const pendingContext = pendingCatalogContext(pending);
  const pendingEnvironment = pendingContext.environment;
  const pendingLanguage = pendingContext.language;

  if (!pendingContext.environmentPresent) {
    return {
      valid: false,
      reason: 'catalog_selection_context_missing',
      missing: ['catalogEnvironment'],
    };
  }
  if (!pendingEnvironment.valid) {
    if (pendingEnvironment.reason === 'catalog_environment_invalid') {
      return {
        valid: false,
        reason: 'catalog_selection_context_invalid',
        value: pendingEnvironment.value,
      };
    }
    return {
      valid: false,
      reason: 'catalog_selection_context_conflict',
      conflictingFields: ['catalogEnvironment'],
      ...(pendingEnvironment.values ? { values: pendingEnvironment.values } : {}),
    };
  }
  if (!pendingLanguage.valid) {
    if (pendingLanguage.reason === 'catalog_language_invalid') {
      return {
        valid: false,
        reason: 'catalog_selection_context_invalid',
        value: pendingLanguage.value,
      };
    }
    return {
      valid: false,
      reason: 'catalog_selection_context_conflict',
      conflictingFields: ['catalogLanguage'],
      ...(pendingLanguage.values ? { values: pendingLanguage.values } : {}),
    };
  }

  return {
    valid: true,
    catalogEnvironment: pendingEnvironment.catalogEnvironment,
    catalogLanguage: pendingLanguage.catalogLanguage,
  };
}

function catalogSelectionContext(candidate = {}, pending = {}, frozenContext = null) {
  const pendingContext = frozenContext ?? frozenCatalogSelectionContext(pending);
  if (!pendingContext.valid) return pendingContext;

  const candidateEnvironment = optionalCatalogEnvironmentResolution(candidate);
  // A generic candidate `language` is product data. Only explicit Catalog-language aliases may
  // confirm the frozen selection context.
  const candidateLanguage = resolveCatalogLanguage({
    catalogLanguage: candidate.catalogLanguage,
    catalog_language: candidate.catalog_language,
  });

  const conflictingFields = [];
  if (
    !candidateEnvironment.valid
    || (
      candidateEnvironment.catalogEnvironment
      && pendingContext.catalogEnvironment !== candidateEnvironment.catalogEnvironment
    )
  ) {
    conflictingFields.push('catalogEnvironment');
  }
  if (
    !candidateLanguage.valid
    || (
      candidateLanguage.catalogLanguage
      && pendingContext.catalogLanguage !== candidateLanguage.catalogLanguage
    )
  ) {
    conflictingFields.push('catalogLanguage');
  }
  if (conflictingFields.length > 0) {
    return {
      valid: false,
      reason: 'catalog_selection_context_conflict',
      conflictingFields,
    };
  }

  return {
    valid: true,
    // The pending selection is the workflow-frozen authority. Candidate fields exist only for
    // consistency checks and may never provide or replace a frozen value.
    catalogEnvironment: pendingContext.catalogEnvironment,
    catalogLanguage: pendingContext.catalogLanguage,
  };
}

function catalogSelectionRestartDecision(pending = {}, context = {}) {
  // Restart only from a query that passes the same frozen-alias validation as checkout. A damaged
  // snapshot must never fall back to first-value-wins and search an arbitrary conflicting value.
  const queryResolution = pendingCatalogQueryResolution(pending);
  const catalogQuery = queryResolution.valid ? queryResolution.catalogQuery : null;
  return {
    unresolved: context.reason,
    restartDiscovery: true,
    ...(context.conflictingFields ? { conflictingFields: context.conflictingFields } : {}),
    ...(context.invalidFields ? { invalidFields: context.invalidFields } : {}),
    ...(context.invalidIndexes ? { invalidIndexes: context.invalidIndexes } : {}),
    ...(context.missing ? { missing: context.missing } : {}),
    ...(context.value ? { value: context.value } : {}),
    ...(context.values ? { values: context.values } : {}),
    ...(catalogQuery ? { catalogQuery } : {}),
    ...trustedPendingCatalogContext(pending),
    pendingCatalogProductSelection: { ...pending, status: 'INVALID' },
  };
}

function catalogSelectionRestartForReply(input = {}, text = '', pending = {}, context = {}) {
  const restart = catalogSelectionRestartDecision(pending, context);
  if (
    isDiscoveryOnlyCatalogSelection(pending)
    && !hasExplicitPurchaseIntent(input, text)
  ) {
    return {
      ...restart,
      anonymousSearchRestart: true,
      purchaseIntent: false,
      requiresWallet: false,
      authenticationMode: 'ANONYMOUS',
      resultMode: 'DISCOVERY_ONLY',
    };
  }
  return restart;
}

function anonymousCatalogSelectionRestart(pending = {}, context = {}) {
  return {
    ...catalogSelectionRestartDecision(pending, context),
    anonymousSearchRestart: true,
    purchaseIntent: false,
    requiresWallet: false,
    authenticationMode: 'ANONYMOUS',
    resultMode: 'DISCOVERY_ONLY',
  };
}

function catalogCandidateStringResolution(candidate = {}, aliases = [], canonicalField, required = false) {
  const entries = aliases
    .map((field) => [field, candidate[field]])
    // An alias that exists in the frozen snapshot is part of the selection facts. Do not silently
    // discard a blank/null duplicate beside a valid canonical value: that would let a malformed
    // or partially overwritten snapshot cross the purchase boundary.
    .filter(([field]) => Object.hasOwn(candidate, field));
  if (entries.length === 0) {
    return required
      ? { valid: false, missing: [canonicalField] }
      : { valid: true, value: null, values: [] };
  }

  const parsed = entries.map(([field, value]) => ({ field, ...structuredString(value) }));
  if (parsed.some((entry) => entry.invalid || entry.value === null)) {
    return {
      valid: false,
      invalidFields: parsed
        .filter((entry) => entry.invalid || entry.value === null)
        .map((entry) => entry.field),
    };
  }
  const values = [...new Set(parsed.map((entry) => entry.value))];
  if (values.length !== 1) {
    return {
      valid: false,
      conflictingFields: parsed.map((entry) => entry.field),
      values,
    };
  }
  return { valid: true, value: values[0], values };
}

function isAbsoluteHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function isValidStoreOrderingUrl(value, productId) {
  try {
    const parsed = new URL(value);
    const productIds = parsed.searchParams.getAll('product_id');
    return productIds.length > 0
      && productIds.every((candidateProductId) => (
        normalizedString(candidateProductId) === productId
      ));
  } catch {
    return false;
  }
}

function catalogCandidateIdentityResolution(candidate = {}, pending = {}, frozenContext = null) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return {
      valid: false,
      reason: 'catalog_selection_candidate_invalid',
      invalidFields: ['candidate'],
    };
  }

  const fields = {
    productId: catalogCandidateStringResolution(
      candidate,
      ['productId', 'product_id', 'id'],
      'productId',
      true,
    ),
    productUrl: catalogCandidateStringResolution(
      candidate,
      ['productUrl', 'product_url', 'url'],
      'productUrl',
      true,
    ),
    productName: catalogCandidateStringResolution(
      candidate,
      ['productName', 'product_name', 'title'],
      'productName',
      true,
    ),
    merchantId: catalogCandidateStringResolution(
      candidate,
      ['merchantId', 'merchant_id'],
      'merchantId',
    ),
    storeId: catalogCandidateStringResolution(
      candidate,
      ['storeId', 'store_id'],
      'storeId',
    ),
    channelType: catalogCandidateStringResolution(
      candidate,
      ['channelType', 'channel_type'],
      'channelType',
    ),
    region: catalogCandidateStringResolution(candidate, ['region'], 'region'),
  };
  const missing = Object.values(fields).flatMap((entry) => entry.missing ?? []);
  const invalidFields = Object.values(fields).flatMap((entry) => entry.invalidFields ?? []);
  const conflictingFields = Object.values(fields).flatMap(
    (entry) => entry.conflictingFields ?? [],
  );
  if (fields.productUrl.valid && !isAbsoluteHttpUrl(fields.productUrl.value)) {
    invalidFields.push('productUrl');
  }

  const merchantId = fields.merchantId.value;
  const storeId = fields.storeId.value;
  if ((merchantId && storeId) || (!merchantId && !storeId)) {
    conflictingFields.push('merchantId', 'storeId');
  }
  if (storeId && !fields.channelType.value) missing.push('channelType');
  if (
    storeId
    && fields.productUrl.valid
    && fields.productId.valid
    && !isValidStoreOrderingUrl(fields.productUrl.value, fields.productId.value)
  ) {
    invalidFields.push('productUrl');
  }
  if (
    missing.length > 0
    || invalidFields.length > 0
    || conflictingFields.length > 0
  ) {
    return {
      valid: false,
      reason: 'catalog_selection_candidate_invalid',
      ...(missing.length > 0 ? { missing: [...new Set(missing)] } : {}),
      ...(invalidFields.length > 0
        ? { invalidFields: [...new Set(invalidFields)] }
        : {}),
      ...(conflictingFields.length > 0
        ? { conflictingFields: [...new Set(conflictingFields)] }
        : {}),
    };
  }

  const context = catalogSelectionContext(candidate, pending, frozenContext);
  if (!context.valid) return context;
  return {
    valid: true,
    identity: {
      // Preserve the exact frozen Catalog facts (especially store price/currency/quantity), then
      // overlay canonical, consistency-checked identity and authoritative Catalog context.
      ...candidate,
      productId: fields.productId.value,
      productUrl: fields.productUrl.value,
      productName: fields.productName.value,
      ...(merchantId ? { merchantId } : {}),
      ...(storeId ? { storeId } : {}),
      ...(fields.channelType.value ? { channelType: fields.channelType.value } : {}),
      ...(fields.region.value ? { region: fields.region.value } : {}),
      catalogEnvironment: context.catalogEnvironment,
      ...(context.catalogLanguage ? { catalogLanguage: context.catalogLanguage } : {}),
    },
  };
}

function catalogCandidateProductIdValues(candidate = {}) {
  return ['productId', 'product_id', 'id']
    .map((field) => normalizedString(candidate?.[field]))
    .filter((value) => value !== null);
}

const CHINESE_ORDINALS = new Map([
  ['一', 1], ['二', 2], ['两', 2], ['三', 3], ['四', 4], ['五', 5],
  ['六', 6], ['七', 7], ['八', 8], ['九', 9], ['十', 10],
]);
const ENGLISH_ORDINALS = new Map([
  ['first', 1], ['second', 2], ['third', 3], ['fourth', 4], ['fifth', 5],
  ['sixth', 6], ['seventh', 7], ['eighth', 8], ['ninth', 9], ['tenth', 10],
]);

function replyOrdinal(text = '') {
  const source = String(text)
    .trim()
    .replace(
      /^(?:(?:请|麻烦|帮我|给我|我要|现在|直接)\s*)*(?:买|购买|下单|订购)\s*/iu,
      '',
    )
    .replace(/^(?:please\s+)?(?:buy|purchase|order)\s+/iu, '')
    .replace(/^(?:我\s*)?(?:选择|选|就要|要)\s*/iu, '')
    .replace(/^(?:i\s+)?(?:choose|chose|select(?:ed)?|want)\s+(?:the\s+)?/iu, '')
    .replace(/\s*(?:吧|就好|就可以|please)[。.!！]?$/iu, '')
    .trim();
  const digits = source.match(
    /^(?:#\s*|(?:(?:number|no\.)\s*)|(?:第\s*))?(\d{1,2})\s*(?:个|号|项|件|one)?[。.!！]?$/iu,
  )?.[1];
  if (digits) return Number(digits);
  const chinese = source.match(/^第?\s*([一二两三四五六七八九十])\s*(?:个|号|项|件)?[。.!！]?$/u)?.[1];
  if (chinese) return CHINESE_ORDINALS.get(chinese) ?? null;
  const english = source.match(/^(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:\s+one)?[.!]?$/iu)?.[1];
  return english ? ENGLISH_ORDINALS.get(english.toLowerCase()) ?? null : null;
}

function hasStructuredCatalogSelectionSignal(input = {}) {
  return [
    input.selectedProductId,
    input.selected_product_id,
    input.selectedCatalogProductId,
    input.selected_catalog_product_id,
    input.selectedIndex,
    input.selected_index,
  ].some((value) => value !== undefined && value !== null && value !== '');
}

function isDeicticCatalogSelectionReply(text = '') {
  const source = String(text).trim();
  return /^(?:就这个|这个|选这个|选择这个|就它|它|选一个|选择一个)[。.!！]?$/iu.test(source)
    || /^(?:(?:i\s+)?(?:choose|select)\s+)?(?:this|that)\s+one[.!]?$/iu.test(source);
}

function isBoundCatalogSelectionText(input = {}, text = '') {
  const source = String(text).trim();
  if (!source) return hasStructuredCatalogSelectionSignal(input);
  if (replyOrdinal(source) !== null || canonicalCatalogPurchaseSelectionOrdinal(source) !== null) {
    return true;
  }
  if (hasStructuredCatalogSelectionSignal(input) && isDeicticCatalogSelectionReply(source)) {
    return true;
  }
  const productId = catalogSelectionProductIdResolution(input);
  return Boolean(productId.value && source === productId.value);
}

function catalogSelectionProductIdResolution(input = {}) {
  const fields = [
    ['selectedProductId', input.selectedProductId],
    ['selected_product_id', input.selected_product_id],
    ['selectedCatalogProductId', input.selectedCatalogProductId],
    ['selected_catalog_product_id', input.selected_catalog_product_id],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (fields.length === 0) return { value: null };

  const parsed = fields.map(([field, value]) => ({ field, ...structuredString(value) }));
  if (parsed.some((entry) => entry.invalid || entry.value === null)) {
    return {
      invalid: true,
      rejectedProductId: fields[0][1],
      conflictingFields: parsed.filter((entry) => entry.invalid).map((entry) => entry.field),
    };
  }
  const values = [...new Set(parsed.map((entry) => entry.value))];
  if (values.length > 1) {
    return {
      conflict: true,
      values,
      conflictingFields: parsed.map((entry) => entry.field),
    };
  }
  return { value: values[0] };
}

function catalogSelectionIndexResolution(input = {}) {
  const fields = [
    ['selectedIndex', input.selectedIndex],
    ['selected_index', input.selected_index],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (fields.length === 0) return { value: null };

  const parsed = fields.map(([field, raw]) => {
    const scalar = typeof raw === 'number' || typeof raw === 'string';
    const value = scalar ? Number(raw) : Number.NaN;
    return { field, raw, value };
  });
  if (parsed.some((entry) => !Number.isInteger(entry.value))) {
    return { invalid: true, rejectedIndex: fields[0][1] };
  }
  const values = [...new Set(parsed.map((entry) => entry.value))];
  if (values.length > 1) {
    return {
      conflict: true,
      values,
      conflictingFields: parsed.map((entry) => entry.field),
    };
  }
  return { value: values[0], raw: fields[0][1] };
}

function selectedCatalogCandidate(input = {}, text = '', candidates = []) {
  const productIdResolution = catalogSelectionProductIdResolution(input);
  const indexResolution = catalogSelectionIndexResolution(input);
  if (productIdResolution.conflict || indexResolution.conflict) {
    return {
      unresolved: 'catalog_product_selection_conflict',
      conflictingFields: [
        ...(productIdResolution.conflictingFields ?? []),
        ...(indexResolution.conflictingFields ?? []),
      ],
      ...(productIdResolution.values ? { productIdValues: productIdResolution.values } : {}),
      ...(indexResolution.values ? { indexValues: indexResolution.values } : {}),
    };
  }
  if (productIdResolution.invalid) {
    return {
      unresolved: 'selected_product_not_in_candidates',
      rejectedProductId: productIdResolution.rejectedProductId,
    };
  }
  if (indexResolution.invalid) {
    return {
      unresolved: 'selected_index_out_of_range',
      rejectedIndex: indexResolution.rejectedIndex,
    };
  }

  const explicitProductId = productIdResolution.value;
  const explicitIndex = indexResolution.value;

  if (explicitProductId) {
    const matches = candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => (
        catalogCandidateProductIdValues(candidate).includes(explicitProductId)
      ));
    if (matches.length === 0) {
      return {
        unresolved: 'selected_product_not_in_candidates',
        rejectedProductId: explicitProductId,
      };
    }
    if (explicitIndex !== null) {
      if (explicitIndex < 1 || explicitIndex > candidates.length) {
        return { unresolved: 'selected_index_out_of_range', rejectedIndex: indexResolution.raw };
      }
      const indexedCandidate = candidates[explicitIndex - 1];
      if (!matches.some((match) => match.candidate === indexedCandidate)) {
        return {
          unresolved: 'catalog_product_selection_conflict',
          conflictingFields: ['selectedProductId', 'selectedIndex'],
        };
      }
      return { candidate: indexedCandidate, index: explicitIndex };
    }
    if (matches.length > 1) {
      return {
        unresolved: 'catalog_product_selection_conflict',
        conflictingFields: ['selectedProductId'],
      };
    }
    return { candidate: matches[0].candidate, index: matches[0].index + 1 };
  }

  if (explicitIndex !== null) {
    if (explicitIndex < 1 || explicitIndex > candidates.length) {
      return { unresolved: 'selected_index_out_of_range', rejectedIndex: indexResolution.raw };
    }
    return { candidate: candidates[explicitIndex - 1], index: explicitIndex };
  }

  // A bare ordinal in the reply is the common selection form. Anything more elaborate is left
  // unresolved rather than guessed, because picking the wrong product spends the user's money.
  const ordinal = replyOrdinal(text);
  if (ordinal !== null) {
    if (ordinal < 1 || ordinal > candidates.length) {
      return { unresolved: 'selected_index_out_of_range', rejectedIndex: ordinal };
    }
    return { candidate: candidates[ordinal - 1], index: ordinal };
  }

  return { unresolved: null };
}

function pendingCatalogSelectionReplyDecision(input = {}, text = '') {
  const pendingResolution = activePendingCatalogProductSelectionResolution(input);
  if (pendingResolution.conflict) {
    return {
      unresolved: 'catalog_pending_selection_conflict',
      restartDiscovery: true,
      anonymousSearchRestart: true,
      conflictingFields: pendingResolution.conflictingFields,
      purchaseIntent: false,
      requiresWallet: false,
      authenticationMode: 'ANONYMOUS',
      resultMode: 'DISCOVERY_ONLY',
      pendingCatalogProductSelection: { status: 'INVALID' },
    };
  }
  const pending = pendingResolution.pending;
  if (!pending) return null;

  const source = String(text).trim();

  const cancellation = /^(?:取消|不买了?|不用了?|算了|都不要|一个都不要|cancel|stop|none|no)(?:了|吧)?[。.!！]?$/iu.test(source);
  if (cancellation) {
    return {
      confirmation: 'CANCELLED',
      pendingCatalogProductSelection: { ...pending, status: 'CANCELLED' },
      pendingTransition: { from: 'AWAITING_SELECTION', to: 'CANCELLED' },
    };
  }

  const provenance = catalogSelectionProvenance(pending);
  if (!provenance.valid) {
    return anonymousCatalogSelectionRestart(pending, provenance);
  }

  // Cancellation is always safe, but every other reply must first pass the frozen-context gate.
  // Otherwise an out-of-range or ambiguous reply could keep a damaged selection alive and later
  // fall through to an unrelated payment route.
  const frozenContext = frozenCatalogSelectionContext(pending);
  if (!frozenContext.valid) {
    return catalogSelectionRestartForReply(input, source, pending, frozenContext);
  }

  const queryResolution = pendingCatalogQueryResolution(pending);
  if (!queryResolution.valid) {
    return catalogSelectionRestartForReply(input, source, pending, queryResolution);
  }

  const candidatesResolution = pendingCatalogCandidatesResolution(pending);
  if (!candidatesResolution.valid) {
    return catalogSelectionRestartForReply(input, source, pending, candidatesResolution);
  }
  const candidates = candidatesResolution.candidates;
  if (candidates.length === 0) {
    return {
      unresolved: 'catalog_selection_candidates_missing',
      pendingCatalogProductSelection: pending,
    };
  }

  const currentStructuredPurchase = structuredPurchaseIntentDecision(input);
  if (
    provenance.mode === 'PURCHASE_SELECTION'
    && (
      currentStructuredPurchase === 'DENIED'
      || isPurchaseLanguageHardDenied(source)
    )
  ) {
    return {
      unresolved: 'catalog_product_selection_not_authorized',
      pendingCatalogProductSelection: pending,
    };
  }
  if (
    provenance.mode === 'PURCHASE_SELECTION'
    && source.length > 0
    && hasStructuredCatalogSelectionSignal(input)
    && !isBoundCatalogSelectionText(input, source)
  ) {
    return {
      unresolved: 'catalog_product_selection_text_unbound',
      pendingCatalogProductSelection: pending,
    };
  }

  const selection = selectedCatalogCandidate(input, source, candidates);
  let resolvedSelection = selection;
  const authorizedTextOrdinal = provenance.mode === 'DISCOVERY_ONLY'
    ? canonicalCatalogPurchaseSelectionOrdinal(source)
    : null;
  const hasSelectionSignal = resolvedSelection.candidate !== undefined
    || selection.unresolved === 'selected_product_not_in_candidates'
    || selection.unresolved === 'selected_index_out_of_range'
    || selection.unresolved === 'catalog_product_selection_conflict'
    || authorizedTextOrdinal !== null;
  if (
    provenance.mode === 'DISCOVERY_ONLY'
    && hasSelectionSignal
    && !hasAuthorizedDiscoverySelectionPurchase(input, source)
  ) {
    return {
      purchaseIntentMissing: true,
      pendingCatalogProductSelection: pending,
      purchaseIntent: false,
      requiresWallet: false,
      authenticationMode: 'ANONYMOUS',
      resultMode: 'DISCOVERY_ONLY',
    };
  }
  const bindingTextOrdinal = provenance.mode === 'DISCOVERY_ONLY'
    ? authorizedTextOrdinal
      ?? (currentStructuredPurchase === 'AUTHORIZED' ? replyOrdinal(source) : null)
    : canonicalCatalogPurchaseSelectionOrdinal(source) ?? replyOrdinal(source);
  if (bindingTextOrdinal !== null) {
    if (bindingTextOrdinal < 1 || bindingTextOrdinal > candidates.length) {
      resolvedSelection = {
        unresolved: 'selected_index_out_of_range',
        rejectedIndex: bindingTextOrdinal,
      };
    } else if (
      resolvedSelection.candidate
      && resolvedSelection.candidate !== candidates[bindingTextOrdinal - 1]
    ) {
      resolvedSelection = {
        unresolved: 'catalog_product_selection_conflict',
        conflictingFields: ['text', 'selectedProduct'],
      };
    } else if (!resolvedSelection.unresolved) {
      resolvedSelection = {
        candidate: candidates[bindingTextOrdinal - 1],
        index: bindingTextOrdinal,
      };
    }
  }
  if (resolvedSelection.candidate) {
    const candidateResolution = catalogCandidateIdentityResolution(
      resolvedSelection.candidate,
      pending,
      frozenContext,
    );
    if (!candidateResolution.valid) {
      return catalogSelectionRestartForReply(input, source, pending, candidateResolution);
    }
    return {
      confirmation: 'SELECTED',
      pendingCatalogProductSelection: { ...pending, status: 'EXECUTING' },
      pendingTransition: { from: 'AWAITING_SELECTION', to: 'EXECUTING' },
      selectedIndex: resolvedSelection.index
        ?? (candidates.indexOf(resolvedSelection.candidate) + 1),
      selectedProduct: candidateResolution.identity,
      purchaseIntent: true,
      requiresWallet: true,
      authenticationMode: 'AUTHENTICATED',
      resultMode: 'PURCHASE_SELECTION',
      walletGate: PaymentWalletGate.REQUIRE_STATUS,
    };
  }
  if (resolvedSelection.unresolved) {
    return {
      unresolved: resolvedSelection.unresolved,
      pendingCatalogProductSelection: pending,
      ...(resolvedSelection.rejectedProductId
        ? { rejectedProductId: resolvedSelection.rejectedProductId }
        : {}),
      ...(resolvedSelection.rejectedIndex !== undefined
        ? { rejectedIndex: resolvedSelection.rejectedIndex }
        : {}),
      ...(resolvedSelection.conflictingFields
        ? { conflictingFields: resolvedSelection.conflictingFields }
        : {}),
    };
  }
  return {
    unresolved: 'catalog_product_selection_unresolved',
    pendingCatalogProductSelection: pending,
  };
}

function pendingSkillActionReplyDecision(input = {}, text = '') {
  const pendingTipConfirmation = activePendingTipConfirmation(input);
  const pendingTipBatchConfirmation = activePendingTipBatchConfirmation(input);
  const pendingSkillInstallConfirmation = activePendingSkillInstallConfirmation(input);
  if (!pendingTipConfirmation && !pendingTipBatchConfirmation && !pendingSkillInstallConfirmation) {
    return null;
  }

  const source = String(text).trim();
  if (!source || isSkillTipNonAuthorizingQuestion(source)) return null;

  const installConfirmation = /^(?:确认安装|安装吧|继续安装|confirm\s+install|proceed\s+with\s+install)[。.!！]?$/iu.test(source);
  const batchTipConfirmation = /^(?:确认批量打赏|批量打赏吧|继续批量打赏|confirm\s+batch\s+tip|proceed\s+with\s+batch\s+tip)[。.!！]?$/iu.test(source);
  const tipConfirmation = /^(?:确认打赏|打赏吧|继续打赏|confirm\s+tip|proceed\s+with\s+tip)[。.!！]?$/iu.test(source);
  const genericConfirmation = /^(?:确认|是的|可以|继续|yes|confirm|proceed)(?:了|吧)?[。.!！]?$/iu.test(source);
  const installCancellation = /^(?:取消安装|不要安装|停止安装|cancel\s+install|stop\s+install)[。.!！]?$/iu.test(source);
  const batchTipCancellation = /^(?:取消批量打赏|不要批量打赏|停止批量打赏|cancel\s+batch\s+tip|stop\s+batch\s+tip)[。.!！]?$/iu.test(source);
  const tipCancellation = /^(?:取消打赏|不要打赏|停止打赏|cancel\s+tip|stop\s+tip)[。.!！]?$/iu.test(source);
  const genericCancellation = /^(?:取消|不要|不用|算了|否|不确认|cancel|no|stop)(?:了|吧)?[。.!！]?$/iu.test(source);

  if ((installConfirmation || installCancellation) && pendingSkillInstallConfirmation) {
    return {
      domain: 'SKILL_INSTALL',
      confirmation: installCancellation ? 'CANCELLED' : 'CONFIRMED',
      pendingSkillInstallConfirmation,
    };
  }
  if ((batchTipConfirmation || batchTipCancellation) && pendingTipBatchConfirmation) {
    return {
      domain: 'SKILL_TIP_BATCH',
      confirmation: batchTipCancellation ? 'CANCELLED' : 'CONFIRMED',
      pendingTipBatchConfirmation,
    };
  }
  if ((tipConfirmation || tipCancellation) && pendingTipConfirmation) {
    return {
      domain: 'SKILL_TIP',
      confirmation: tipCancellation ? 'CANCELLED' : 'CONFIRMED',
      pendingTipConfirmation,
    };
  }
  if (!genericConfirmation && !genericCancellation) return null;
  const pendingDomains = [
    pendingTipConfirmation,
    pendingTipBatchConfirmation,
    pendingSkillInstallConfirmation,
  ].filter(Boolean).length;
  if (pendingDomains > 1) {
    return { ambiguous: true };
  }
  if (pendingSkillInstallConfirmation) {
    return {
      domain: 'SKILL_INSTALL',
      confirmation: genericCancellation ? 'CANCELLED' : 'CONFIRMED',
      pendingSkillInstallConfirmation,
    };
  }
  if (pendingTipBatchConfirmation) {
    return {
      domain: 'SKILL_TIP_BATCH',
      confirmation: genericCancellation ? 'CANCELLED' : 'CONFIRMED',
      pendingTipBatchConfirmation,
    };
  }
  return {
    domain: 'SKILL_TIP',
    confirmation: genericCancellation ? 'CANCELLED' : 'CONFIRMED',
    pendingTipConfirmation,
  };
}

function inputRequired(reason, missing) {
  return {
    state: PaymentIntentState.SKILL_TIP_INPUT_MISSING,
    route: PaymentIntentRoute.INPUT_REQUIRED,
    action: PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT,
    terminal: false,
    reason,
    missing,
  };
}

function skillInstallInputRequired(reason, missing) {
  return {
    state: PaymentIntentState.SKILL_INSTALL_INPUT_MISSING,
    route: PaymentIntentRoute.INPUT_REQUIRED,
    action: PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT,
    terminal: false,
    reason,
    missing,
  };
}

function skillTipBatchInputRequired(reason, missing) {
  return {
    state: PaymentIntentState.SKILL_TIP_BATCH_INPUT_MISSING,
    route: PaymentIntentRoute.INPUT_REQUIRED,
    action: PaymentIntentAction.ASK_FOR_SKILL_TIP_BATCH_INPUT,
    terminal: false,
    reason,
    missing,
  };
}

function structuredBatchTarget(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value.target && typeof value.target === 'object' && !Array.isArray(value.target)
    ? value.target
    : value;
  if (source.kind === 'number' || source.number !== undefined) {
    const number = positiveInteger(source.number);
    return number === null ? null : { kind: 'number', number };
  }
  const publisher = structuredString(source.publisher);
  const skillName = structuredString(source.skillName ?? source.skill_name ?? source.name);
  if (publisher.invalid || skillName.invalid || !publisher.value || !skillName.value) return null;
  return {
    kind: 'identity',
    publisher: publisher.value,
    skillName: skillName.value,
  };
}

function structuredBatchArray(input = {}) {
  const tips = input.tips ?? input.skillTips ?? input.skill_tips;
  const targets = input.targets ?? input.tipTargets ?? input.tip_targets;
  if (tips !== undefined && targets !== undefined) return { invalid: true };
  if (tips !== undefined) return { kind: 'tips', values: tips };
  if (targets !== undefined) return { kind: 'targets', values: targets };
  return null;
}

function isSkillTipBatchExecutionIntent(input = {}, text = '') {
  if (['skill_tip_batch', 'batch_skill_tip'].includes(normalizedIntent(input))) return true;
  const structured = structuredBatchArray(input);
  if (structured) return true;
  return textIdentityTargetOccurrences(text).length > 1 || uniqueTextNumberTargets(text).length > 1;
}

function canonicalTipAmountForComparison(value) {
  const normalized = normalizedString(value);
  if (!normalized || !/^\d+(?:\.\d+)?$/u.test(normalized)) return null;
  const [rawInteger, rawDecimal = ''] = normalized.split('.');
  const integer = rawInteger.replace(/^0+(?=\d)/u, '');
  const decimal = rawDecimal.replace(/0+$/u, '');
  return decimal ? `${integer}.${decimal}` : integer;
}

function batchAuthorizationSignature(batch = {}) {
  const values = Array.isArray(batch.tips)
    ? batch.tips.map((tip) => ({ target: tip.target, amount: tip.amount }))
    : (Array.isArray(batch.targets)
      ? batch.targets.map((target) => ({ target, amount: batch.amount }))
      : []);
  return values.map(({ target, amount }) => {
    const targetKey = target?.kind === 'number'
      ? `number:${target.number}`
      : `identity:${target?.publisher?.toLowerCase()}\u0000${target?.skillName?.toLowerCase()}`;
    return `${targetKey}\u0000${canonicalTipAmountForComparison(amount)}`;
  });
}

function selectedSkillTipBatch(batch, input, text) {
  const hasTextTargets = textIdentityTargetOccurrences(text).length > 0
    || uniqueTextNumberTargets(text).length > 0;
  if (hasTextTargets) {
    const textResult = classifyTextSkillTipBatch({ tipAuthorized: true }, text);
    const structuredSignature = batchAuthorizationSignature(batch);
    const textSignature = textResult.route === PaymentIntentRoute.SKILL_TIP_BATCH
      ? batchAuthorizationSignature(textResult.batch)
      : null;
    if (!textSignature || JSON.stringify(structuredSignature) !== JSON.stringify(textSignature)) {
      return skillTipBatchInputRequired(
        'skill_tip_batch_structured_text_conflict',
        ['consistent_authorization'],
      );
    }
  }
  return {
    state: PaymentIntentState.SKILL_TIP_BATCH_SELECTED,
    route: PaymentIntentRoute.SKILL_TIP_BATCH,
    action: PaymentIntentAction.RUN_SKILL_TIP_BATCH_WORKFLOW,
    terminal: false,
    reason: 'skill_tip_batch_intent',
    batch,
  };
}

function classifyStructuredSkillTipBatch(input, text, source) {
  if (source.invalid || !Array.isArray(source.values) || source.values.length === 0) {
    return skillTipBatchInputRequired('skill_tip_batch_input_missing', ['targets']);
  }
  const currency = skillTipCurrency(input, text);
  if (currency !== 'USD') {
    return skillTipBatchInputRequired('skill_tip_batch_currency_unsupported', ['currency_USD']);
  }
  const explicitlyAuthorized = explicitSkillTipAuthorization(input, text);
  if (!explicitlyAuthorized) {
    return skillTipBatchInputRequired('skill_tip_batch_input_missing', ['authorization']);
  }
  const fallbackAmount = normalizedString(input.amount ?? input.tipAmount ?? input.tip_amount);
  if (source.kind === 'targets') {
    if (!validTipAmount(fallbackAmount)) {
      return skillTipBatchInputRequired('skill_tip_batch_input_missing', ['amount']);
    }
    const targets = source.values.map(structuredBatchTarget);
    if (targets.some((target) => target === null)) {
      return skillTipBatchInputRequired('skill_tip_batch_item_invalid', ['targets']);
    }
    return selectedSkillTipBatch({
      targets,
      amount: fallbackAmount,
      currency,
      explicitlyAuthorized,
    }, input, text);
  }

  const tips = source.values.map((value) => {
    const target = structuredBatchTarget(value);
    const amount = normalizedString(value?.amount ?? fallbackAmount);
    const itemCurrency = normalizedString(value?.currency ?? currency)?.toUpperCase();
    return target && validTipAmount(amount) && itemCurrency === 'USD'
      ? { target, amount }
      : null;
  });
  if (tips.some((tip) => tip === null)) {
    return skillTipBatchInputRequired('skill_tip_batch_item_invalid', ['tips']);
  }
  return selectedSkillTipBatch({ tips, currency, explicitlyAuthorized }, input, text);
}

function classifyTextSkillTipBatch(input, text) {
  const explicitlyAuthorized = explicitSkillTipAuthorization(input, text);
  if (!explicitlyAuthorized) {
    return skillTipBatchInputRequired('skill_tip_batch_input_missing', ['authorization']);
  }
  const currency = textBatchCurrency(text);
  if (currency !== 'USD') {
    return skillTipBatchInputRequired('skill_tip_batch_currency_unsupported', ['currency_USD']);
  }
  const occurrences = textIdentityTargetOccurrences(text);
  const numberTargets = uniqueTextNumberTargets(text);
  if (occurrences.length > 0 && numberTargets.length > 0) {
    return skillTipBatchInputRequired('skill_tip_batch_target_ambiguous', ['consistent_targets']);
  }
  const allAmounts = uniqueTextAmounts(text);
  const sharedAmountLanguage = /每\s*(?:个|项)|各(?:自|打赏)?|\beach\b/iu.test(text);
  const targets = occurrences.length > 0
    ? occurrences.map((occurrence) => occurrence.target)
    : numberTargets;
  if (targets.length === 0) {
    return skillTipBatchInputRequired('skill_tip_batch_input_missing', ['targets']);
  }

  if (sharedAmountLanguage) {
    if (allAmounts.length !== 1 || !validTipAmount(allAmounts[0])) {
      return skillTipBatchInputRequired('skill_tip_batch_amount_ambiguous', ['single_shared_amount']);
    }
    return {
      state: PaymentIntentState.SKILL_TIP_BATCH_SELECTED,
      route: PaymentIntentRoute.SKILL_TIP_BATCH,
      action: PaymentIntentAction.RUN_SKILL_TIP_BATCH_WORKFLOW,
      terminal: false,
      reason: 'skill_tip_batch_intent',
      batch: {
        targets,
        amount: allAmounts[0],
        currency: 'USD',
        explicitlyAuthorized,
      },
    };
  }

  if (occurrences.length === 0) {
    return skillTipBatchInputRequired('skill_tip_batch_amount_ambiguous', ['per_item_amounts']);
  }
  const tips = occurrences.map((occurrence, index) => {
    const nextStart = occurrences[index + 1]?.start ?? String(text).length;
    const segment = String(text).slice(occurrence.end, nextStart);
    const amounts = uniqueTextAmounts(segment);
    return amounts.length === 1 && validTipAmount(amounts[0])
      ? { target: occurrence.target, amount: amounts[0] }
      : null;
  });
  if (tips.some((tip) => tip === null)) {
    return skillTipBatchInputRequired('skill_tip_batch_amount_ambiguous', ['per_item_amounts']);
  }
  return {
    state: PaymentIntentState.SKILL_TIP_BATCH_SELECTED,
    route: PaymentIntentRoute.SKILL_TIP_BATCH,
    action: PaymentIntentAction.RUN_SKILL_TIP_BATCH_WORKFLOW,
    terminal: false,
    reason: 'skill_tip_batch_intent',
    batch: { tips, currency: 'USD', explicitlyAuthorized },
  };
}

function classifySkillTipBatchInput(input = {}, text = '') {
  const structured = structuredBatchArray(input);
  return structured
    ? classifyStructuredSkillTipBatch(input, text, structured)
    : classifyTextSkillTipBatch(input, text);
}

function classifySkillInstallInput(input = {}, text = '') {
  const textIdentityTargets = uniqueTextInstallIdentityTargets(text);
  const textNumberTargets = uniqueTextInstallNumberTargets(text);
  if (textIdentityTargets.length > 1 || textNumberTargets.length > 1
    || (textIdentityTargets.length > 0 && textNumberTargets.length > 0)) {
    return skillInstallInputRequired('skill_install_target_ambiguous', ['single_target']);
  }

  const structuredIdentity = skillInstallIdentityTarget(input, '');
  const structuredNumber = skillInstallNumberTarget(input, '');
  if (structuredIdentity && structuredNumber) {
    return skillInstallInputRequired('skill_install_target_ambiguous', ['single_target']);
  }
  const structuredTarget = structuredIdentity ?? structuredNumber;
  const textTarget = textIdentityTargets[0] ?? textNumberTargets[0] ?? null;
  if (
    structuredTarget
    && ['identity', 'number'].includes(structuredTarget.kind)
    && textTarget
    && !structuredAndTextSkillInstallTargetsCompatible(structuredTarget, textTarget)
  ) {
    return skillInstallInputRequired('skill_install_structured_text_conflict', ['consistent_authorization']);
  }

  let identityTarget = skillInstallIdentityTarget(input, text);
  if (
    identityTarget?.kind === 'identity'
    && !identityTarget.versionNo
    && textIdentityTargets[0]?.versionNo
    && structuredAndTextSkillInstallTargetsCompatible(identityTarget, textIdentityTargets[0])
  ) {
    identityTarget = { ...identityTarget, versionNo: textIdentityTargets[0].versionNo };
  }
  const numberTarget = skillInstallNumberTarget(input, text);
  if (identityTarget && numberTarget) {
    return skillInstallInputRequired('skill_install_target_ambiguous', ['single_target']);
  }

  const target = identityTarget ?? numberTarget;
  const explicitlyAuthorized = explicitSkillInstallAuthorization(input, text);
  if (target?.kind === 'identity' && hasNonCanonicalInstallVersionSyntax(text)) {
    return skillInstallInputRequired('skill_install_version_syntax_invalid', ['canonical_package_version']);
  }
  if (target?.kind === 'identity') {
    if (!validSkillInstallPublisher(target.publisher) || !validSkillInstallName(target.skillName)) {
      return skillInstallInputRequired('skill_install_identity_invalid', ['publisher_and_skill_name']);
    }
    if (target.versionNo?.toLowerCase() === 'latest') {
      return skillInstallInputRequired('skill_install_latest_must_be_omitted', ['omit_version_for_latest']);
    }
    if (target.versionNo && !validSkillVersion(target.versionNo)) {
      return skillInstallInputRequired('skill_install_version_invalid', ['version']);
    }
  }

  const missing = [];
  if (!target || !['identity', 'number'].includes(target.kind)) missing.push('target');
  if (!explicitlyAuthorized) missing.push('authorization');
  if (missing.length > 0) return skillInstallInputRequired('skill_install_input_missing', missing);

  return {
    state: PaymentIntentState.SKILL_INSTALL_SELECTED,
    route: PaymentIntentRoute.SKILL_INSTALL,
    action: PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW,
    terminal: false,
    reason: 'skill_install_intent',
    install: { target, explicitlyAuthorized },
  };
}

function classifySkillTipInput(input = {}, text = '') {
  const textIdentityTargets = uniqueTextIdentityTargets(text);
  const textNumberTargets = uniqueTextNumberTargets(text);
  if (textIdentityTargets.length > 1 || textNumberTargets.length > 1
    || (textIdentityTargets.length > 0 && textNumberTargets.length > 0)) {
    return inputRequired('skill_tip_target_ambiguous', ['single_target']);
  }

  const textAmounts = uniqueTextAmounts(text);
  if (textAmounts.length > 1) {
    return inputRequired('skill_tip_amount_ambiguous', ['single_amount']);
  }

  const structuredIdentity = skillTipIdentityTarget(input, '');
  const structuredNumber = skillTipNumberTarget(input, '');
  const structuredTarget = structuredIdentity ?? structuredNumber;
  const textTarget = textIdentityTargets[0] ?? textNumberTargets[0] ?? null;
  const structuredAmount = normalizedString(input.amount ?? input.tipAmount ?? input.tip_amount);
  const textAmount = textAmounts[0] ?? null;
  if (
    (structuredTarget && ['identity', 'number'].includes(structuredTarget.kind)
      && textTarget && !sameTipTarget(structuredTarget, textTarget))
    || (structuredAmount !== null && textAmount !== null
      && Number(structuredAmount) !== Number(textAmount))
  ) {
    return inputRequired('skill_tip_structured_text_conflict', ['consistent_authorization']);
  }

  let identityTarget = skillTipIdentityTarget(input, text);
  if (
    identityTarget?.kind === 'identity'
    && !identityTarget.versionNo
    && textIdentityTargets[0]?.versionNo
    && sameTipTarget(identityTarget, textIdentityTargets[0])
  ) {
    identityTarget = { ...identityTarget, versionNo: textIdentityTargets[0].versionNo };
  }
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

  if (target?.kind === 'identity' && target.versionNo && !validSkillVersion(target.versionNo)) {
    return inputRequired('skill_tip_version_invalid', ['version']);
  }

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

const PURCHASE_VERB_PATTERN = /购买|想买|要买|买|下单|订购|结账|\b(?:buy(?:ing)?|purchas(?:e|ing)|order(?:ing)?|checkout|get\s+me)\b/giu;
const RAW_PURCHASE_ACTION_PATTERN =
  /购买|下单|订购|结账|买|\b(?:buy|purchase|order|checkout|get\s+me)\b/iu;
const DIRECT_PAYMENT_ACTION_PATTERN =
  /(?:支付|付款|充值|扣款)|\b(?:pay|payment|charge|top[ -]?up)\b/iu;
const DIRECT_PAYMENT_REFERENCE_PATTERN =
  /(?:支付|付款|充值|扣款)|\b(?:pay|paid|paying|payments?|charge|charged|charging|top[ -]?up)\b/iu;
const CATALOG_SEARCH_ZH_SOURCE =
  '(?:搜索|搜(?:一下|一搜)?|查(?:找(?:一下)?|一下|询)|找(?:一下|一找)?|看(?:看|一下|下)|浏览(?:一下)?|列出|列一下|推荐(?:一下)?|可选项)';
const CATALOG_SEARCH_EN_SOURCE =
  '(?:search(?:ed|ing)?(?:\\s+for)?|find|found|look(?:ed|ing)?\\s+(?:for|up)|show(?:ed)?(?:\\s+me)?|see|saw|brows(?:e|ed|ing)(?:\\s+for)?|explor(?:e|ed|ing)|list(?:ed|ing)?|recommend(?:ed|ing)?|suggest(?:ed|ing)?|locat(?:e|ed|ing))';
const CATALOG_SEARCH_ACTION_SOURCE =
  `(?:${CATALOG_SEARCH_ZH_SOURCE}|\\b${CATALOG_SEARCH_EN_SOURCE}\\b)`;
const CATALOG_SEARCH_TEXT_PATTERN = new RegExp(CATALOG_SEARCH_ACTION_SOURCE, 'iu');
const CATALOG_SEARCH_VERB_PATTERN = new RegExp(CATALOG_SEARCH_ACTION_SOURCE, 'giu');

const STRUCTURED_CATALOG_SEARCH_INTENTS = new Set([
  'catalog_search',
  'product_search',
  'product_discovery',
]);

const STRUCTURED_WALLET_RELOGIN_INTENTS = new Set([
  'wallet_relogin',
  'wallet_reauthorize',
  'wallet_login_again',
  'wallet_fresh_login',
]);

// "buy X" with no link still names X. A bare verb ("购买") names nothing, so it must not become a
// catalog query — otherwise discovery searches for the verb itself.
function describedProductQuery(text = '') {
  const residual = String(text)
    .replace(CATALOG_SEARCH_VERB_PATTERN, ' ')
    .replace(PURCHASE_VERB_PATTERN, ' ')
    .replace(/(?:商品|产品|物品|东西|目录)/gu, ' ')
    .replace(/(?:这个|那个|它|某个)/gu, ' ')
    .replace(/[帮我给一个件只份点些的了吗请:：,，。.!！?？"'“”]/gu, ' ')
    .replace(/\b(?:me|for|a|an|the|this|that|some|please|products?|items?|things?|something|anything|one|it)\b/giu, ' ')
    .replace(/&/gu, ' ')
    .trim();
  const connectorOnly = /^(?:(?:并|并且|然后|接着|随后|再|后|之后)\s*)+$/iu.test(residual)
    || /^(?:(?:and(?:\s+then)?|then)\s*)+$/iu.test(residual);
  // "buy the second one" is meaningful only against a frozen candidate snapshot. Without one,
  // an ordinal is not a product query and must not launch a fresh Catalog search.
  return residual.length > 0 && !connectorOnly && replyOrdinal(residual) === null
    ? String(text).trim()
    : null;
}

function structuredPurchaseIntentDecision(input = {}) {
  const values = [
    input.purchaseIntent,
    input.purchase_intent,
    input.checkoutIntent,
    input.checkout_intent,
    input.orderIntent,
    input.order_intent,
  ].map(booleanValue).filter((value) => value !== null);
  if (values.some((value) => value === false)) return 'DENIED';
  if (values.some((value) => value === true)) return 'AUTHORIZED';

  const intent = normalizedIntent(input);
  return ['purchase', 'buy', 'order', 'checkout', 'ucp_checkout'].includes(intent)
    ? 'AUTHORIZED'
    : 'ABSENT';
}

function hasPurchaseActionBefore(source = '', index = 0) {
  return index > 0 && RAW_PURCHASE_ACTION_PATTERN.test(String(source).slice(0, index));
}

function maskQuotedTitleSpans(text = '') {
  return String(text).replace(/《[^》]*》|“[^”]*”|"[^"]*"/gu, (match) => ' '.repeat(match.length));
}

function hasExplicitSearchPurchaseSequence(text = '') {
  const source = maskQuotedTitleSpans(text);
  const chineseSequence = new RegExp(
    `${CATALOG_SEARCH_ZH_SOURCE}[^。！？?!\\n]{0,80}`
      + '(?:并|然后|接着|随后|再|后|之后|[,，;；])[^。！？?!\\n]{0,24}'
      + '(?:买|购买|下单|订购|结账)',
    'iu',
  );
  const englishSequence = new RegExp(
    `\\b${CATALOG_SEARCH_EN_SOURCE}\\b[^.?!\\n]{0,100}`
      + '(?:and(?:\\s+then)?|then|&|[,;])[^.?!\\n]{0,28}'
      + '\\b(?:buy|purchase|order|checkout|get\\s+me)\\b',
    'iu',
  );
  return chineseSequence.test(source) || englishSequence.test(source);
}

function hasExplicitPurchaseContinuationAfter(text = '', index = 0) {
  const tail = String(text).slice(index);
  return /(?:现在|然后|接着|随后|再)[^。！？?!\n]{0,20}(?:买|购买|下单|订购|结账)/iu.test(tail)
    || /\b(?:now|then|and\s+then)\b[^.?!\n]{0,24}\b(?:buy|purchase|order|checkout|get\s+me)\b/iu.test(tail)
    || /[,，;；。!！][^。！？?!\n]{0,24}(?:买|购买|下单|订购|结账|\b(?:buy|purchase|order|checkout|get\s+me)\b)/iu.test(tail);
}

function isSearchFramedPurchaseAdvisory(text = '') {
  const source = String(text);
  const searchMatch = source.match(CATALOG_SEARCH_TEXT_PATTERN);
  if (!searchMatch) return false;
  if (hasPurchaseActionBefore(source, searchMatch.index ?? 0)) return false;
  return !hasExplicitSearchPurchaseSequence(source);
}

function isHowToPurchaseAdvisory(text = '') {
  const source = String(text);
  const marker = source.match(/(?:怎么|如何)|\bhow\s+to\b/iu);
  if (!marker) return false;
  const markerIndex = marker.index ?? 0;
  if (hasPurchaseActionBefore(source, markerIndex)) return false;
  const tailIndex = markerIndex + marker[0].length;
  if (!RAW_PURCHASE_ACTION_PATTERN.test(source.slice(tailIndex))) return false;
  return !hasExplicitPurchaseContinuationAfter(source, tailIndex);
}

function normalizedPurchaseMorphology(text = '') {
  return String(text)
    .replace(/\bbuying\b/giu, 'buy')
    .replace(/\bpurchasing\b/giu, 'purchase')
    .replace(/\bordering\b/giu, 'order')
    .replace(/\bchecking\s+out\b/giu, 'checkout');
}

function isCurrentPurchaseFrameDenied(text = '') {
  const source = normalizedPurchaseMorphology(text).trim();
  if (!source) return false;

  return /[?？]/u.test(source)
    || /^(?:不要|先别|暂时不要|不行|算了|都不选|一个都不要|我没说|(?:我)?没(?:有)?(?:让|叫|要求)(?:你)?|没有让你|别执行)/iu.test(source)
    || /(?:这只是|只是|仅仅是|用于)(?:一个)?(?:测试|示例|演示|复现|调试|讨论)/iu.test(source)
    || /(?:如果|假如|要是|万一|倘若|假设|假装|需求里写着|有人说|用户说|他说|她说|他们说)/iu.test(source)
    || /\b(?:not\s+(?:now|yet)|do\s+not|don['’]t|never\s+mind|no\s+thanks|maybe\s+later|none\s+of\s+(?:these|them)|anything\s+but|rather\s+not|this\s+is\s+(?:only\s+)?a\s+test|for\s+qa|only\s+an?\s+(?:example|demo|test)|pretend|were\s+i\s+to|according\s+to)\b/iu.test(source)
    || /\bi\s+(?:did\s+not|didn['’]t)\s+(?:say|ask|tell)\b/iu.test(source)
    || /\bshould\s+(?:i|we)\b/iu.test(source)
    || /\b(?:the\s+user|user|someone|my\s+boss|he|she|they)\s+(?:said|says|asked|wrote|mentioned)\b/iu.test(source);
}

function isPurchaseLanguageHardDenied(text = '') {
  const source = normalizedPurchaseMorphology(text);
  if (isCurrentPurchaseFrameDenied(source)) return true;

  const purchaseSignal = /购买|买|下单|订购|结账|\b(?:buy|purchase|order|checkout|get\s+me)\b/iu;
  if (!purchaseSignal.test(source)) return false;

  const historicalPurchase =
    /(?:已经|刚才|之前|昨天|曾经)[^。！？?!\n]{0,32}(?:买|购买|下单|订购|结账)(?:过|了|完成|成功)?/iu.test(source)
    || /\b(?:already|previously|yesterday|just)\b[^.?!\n]{0,50}\b(?:bought|purchased|ordered|checked\s+out)\b/iu.test(source);

  return /(?:不要|别|不想|不打算|不需要|无需|先不|暂时不)[^。！？?!\n]{0,24}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /(?:取消|撤销|停止|终止|拒绝|放弃|不再|不能|无法|没法|不会|不愿意?|别再)[^。！？?!\n]{0,24}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /(?:不可以|不应该|不准|禁止|不允许|不得(?!不)|没(?:有)?打算)[^。！？?!\n]{0,24}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /(?:可能|也许|或许|考虑|犹豫|还没决定|尚未决定|没决定|不确定)[^。！？?!\n]{0,24}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /(?:未决定|尚未想好|还没想好|没想好|大概(?:会)?|应该会|倾向于?)[^。！？?!\n]{0,24}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /(?:假设|假定|设想|假装|倘若)[^。！？?!\n]{0,40}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /(?:测试|复现|重现|调试|演示|示例|举例|转述|引用|讨论|需求里写着|有人说|用户说|他说|她说|他们说)[^。！？?!\n]{0,100}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /\b(?:do\s+not|don['’]t|never|not\s+going\s+to|no\s+need\s+to)\b[^.?!\n]{0,40}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\bno\s+(?:purchase|buying|order|checkout)\b/iu.test(source)
    || /\b(?:cancel|abort|stop|refuse|decline)\b(?:\s+to)?[^.?!\n]{0,32}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\b(?:no\s+longer|cannot(?!\s+wait\b)|can['’]t(?!\s+wait\b)|unable\s+to|not\s+(?:allowed|permitted)\s+to)\b[^.?!\n]{0,24}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\b(?:maybe|perhaps|might|may|consider(?:ing)?|unsure|undecided)\b[^.?!\n]{0,32}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\b(?:have|has|had)?\s*not\s+decided\b[^.?!\n]{0,32}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\b(?:have|has|had)(?:n['’]t|\s+not)\s+decided\b[^.?!\n]{0,32}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\b(?:not\s+sure|inclined|probably|could|should|would(?!\s+like\b))\b[^.?!\n]{0,40}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\b(?:suppose|assuming|imagine)\b[^.?!\n]{0,48}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /\b(?:for\s+qa|test(?:ing)?|reproduc(?:e|ing)|debug(?:ging)?|demo(?:nstrate|nstrating)?|example|quote(?:d|s|ing)?|report(?:ed|ing)?|discussion|phrase|according\s+to|(?:i|you|he|she|they|someone|my\s+boss|the\s+user|user)\s+(?:said|says|asked|wrote|mentioned))\b[^.?!\n]{0,120}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /(?<!不得)不(?:买|购买|下单|订购|结账)/iu.test(source)
    || /\b(?:won['’]t|will\s+not|shouldn['’]t|not)\s+(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /[?？]/u.test(source)
    || /(?:买|购买|下单|订购|结账)[^。！？?!\n]{0,16}(?:吗|么|呢)\s*[。.!！]?$/iu.test(source)
    || /(?:是否|要不要|该不该|能否|可不可以|可以[^。！？?!\n]{0,16}吗)/iu.test(source)
    || /\b(?:should|can|could|would)\s+(?:i|we)\b[^.?!\n]{0,40}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /(?:如果|假如|要是|万一)[^。！？?!\n]{0,40}(?:买|购买|下单|订购|结账)/iu.test(source)
    || /\b(?:if|when)\b[^.?!\n]{0,60}\b(?:buy|purchase|order|checkout)\b/iu.test(source)
    || /(?:买|购买|下单|订购|结账)[^。！？?!\n]{0,40}(?:之前先问|前先问|等我确认|确认后再|以后再|之后再|稍后再)/iu.test(source)
    || /\b(?:buy|purchase|order|checkout)\b[^.?!\n]{0,48}\b(?:only\s+after|after\s+i\s+confirm|if\b|later\b|once\s+i\s+confirm|before\s+you)\b/iu.test(source)
    || (historicalPurchase && !hasExplicitPurchaseContinuationAfter(source))
    || /(?:订单)[^。！？?!\n]{0,12}(?:状态|记录|历史|查询)/iu.test(source)
    || /\borders?\b[^.?!\n]{0,20}\b(?:status|history|records?|lookup)\b/iu.test(source);
}

function isPurchaseLanguageAdvisory(text = '') {
  return isSearchFramedPurchaseAdvisory(text) || isHowToPurchaseAdvisory(text);
}

function isPurchaseLanguageNonAuthorizing(text = '') {
  return isPurchaseLanguageHardDenied(text) || isPurchaseLanguageAdvisory(text);
}

function canonicalCatalogPurchaseSelectionOrdinal(text = '') {
  const source = String(text).trim();
  if (!source || isPurchaseLanguageHardDenied(source)) return null;

  const parseCanonicalClause = (clause) => {
    const chinese = clause.replace(
      /^(?:(?:请|麻烦|帮我|给我|现在|直接)\s*)*(?:(?:我\s*)?(?:想|要|决定|确定)\s*)?(?:买|购买|下单|订购|结账)\s*/iu,
      '',
    );
    if (chinese !== clause) return replyOrdinal(chinese);

    const english = clause.replace(
      /^(?:now\s+)?(?:please\s+)?(?:(?:i\s+(?:want|would\s+like|decided|choose|chose)\s+to|i['’]d\s+like\s+to)\s+)?(?:buy|purchase|order|checkout|get\s+me)\s+/iu,
      '',
    );
    return english !== clause ? replyOrdinal(english) : null;
  };

  return parseCanonicalClause(source);
}

function hasAuthorizedDiscoverySelectionPurchase(input = {}, text = '') {
  const structured = structuredPurchaseIntentDecision(input);
  if (structured === 'DENIED' || isPurchaseLanguageHardDenied(text)) return false;
  const canonicalOrdinal = canonicalCatalogPurchaseSelectionOrdinal(text);
  if (canonicalOrdinal !== null) return true;
  return structured === 'AUTHORIZED' && isBoundCatalogSelectionText(input, text);
}

function hasPurchaseActionLanguage(text = '') {
  const source = String(text);
  if (isPurchaseLanguageNonAuthorizing(source)) return false;
  return /(?<!可)(?<!可以)购买|(?:下单|订购|结账)|买(?!到)|\b(?:buy|purchase|order|checkout|get\s+me)\b/iu.test(source);
}

function purchaseIntentDecision(input = {}, text = '') {
  const structured = structuredPurchaseIntentDecision(input);
  if (structured === 'DENIED' || isPurchaseLanguageHardDenied(text)) return 'DENIED';
  if (structured === 'AUTHORIZED') return 'AUTHORIZED';
  if (isPurchaseLanguageAdvisory(text)) return 'DENIED';
  if (hasPurchaseActionLanguage(text)) return 'AUTHORIZED';
  return 'ABSENT';
}

function structuredDirectPaymentDecision(input = {}) {
  const fields = [
    'paymentAuthorized',
    'payment_authorized',
    'payAuthorized',
    'pay_authorized',
  ]
    .filter((field) => Object.hasOwn(input, field))
    .map((field) => booleanValue(input[field]));
  const values = [...new Set(fields.filter((value) => value !== null))];
  if (
    fields.some((value) => value === null)
    || values.length > 1
    || values.includes(false)
  ) return 'DENIED';
  if (values.includes(true)) return 'AUTHORIZED';
  return ['pay', 'payment', 'direct_pay'].includes(normalizedIntent(input))
    ? 'AUTHORIZED'
    : 'ABSENT';
}

function isDirectPaymentLanguageDenied(text = '') {
  const source = String(text);
  if (!DIRECT_PAYMENT_REFERENCE_PATTERN.test(source)) return false;
  return isCurrentPurchaseFrameDenied(source)
    || /(?:取消|撤销|停止|终止|拒绝|不要|别|先别|暂时不)[^。！？?!\n]{0,28}(?:支付|付款|充值|扣款)/iu.test(source)
    || /\b(?:cancel|abort|stop|refuse|decline|do\s+not|don['’]t|never)\b[^.?!\n]{0,40}\b(?:pay|payment|charge|top[ -]?up)\b/iu.test(source)
    || /(?:如果|假如|要是|假设|测试|示例|演示|复现|调试|用户说|他说|她说)[^。！？?!\n]{0,80}(?:支付|付款|充值|扣款)/iu.test(source)
    || /\b(?:if|suppose|assuming|test(?:ing)?|example|demo|the\s+user\s+(?:said|says))\b[^.?!\n]{0,100}\b(?:pay|payment|charge|top[ -]?up)\b/iu.test(source)
    || /(?:已经|刚才|之前|昨天|曾经|早就)[^。！？?!\n]{0,36}(?:支付|付款|充值|扣款)(?:过|了|完成|成功)?/iu.test(source)
    || /(?:我|我们|你|你们|他|她|他们)[^。！？?!\n]{0,12}(?:支付|付款|充值|扣款)(?:过|了|完成|成功)/iu.test(source)
    || /(?:支付|付款|充值|扣款)[^。！？?!\n]{0,16}(?:状态|进度|记录|历史|结果|失败|成功|异常|错误)/iu.test(source)
    || /(?:状态|进度|记录|历史|结果|失败|成功|异常|错误)[^。！？?!\n]{0,16}(?:支付|付款|充值|扣款)/iu.test(source)
    || /(?:怎么|如何|怎样|为什么|为何)[^。！？?!\n]{0,32}(?:支付|付款|充值|扣款)/iu.test(source)
    || /\b(?:i|we|you|he|she|they)\s+(?:(?:have|has|had)\s+)?(?:already\s+)?(?:paid|charged|topped[ -]?up)\b/iu.test(source)
    || /\b(?:i|we|you|he|she|they)\s+(?:was|were)\s+(?:paying|charging|topping[ -]?up)\b/iu.test(source)
    || /\b(?:already|previously|yesterday|just)\b[^.?!\n]{0,48}\b(?:paid|charged|topped[ -]?up)\b/iu.test(source)
    || /\b(?:payments?|charges?)\b[^.?!\n]{0,24}\b(?:status|progress|history|records?|result|failed|failure|succeeded|success|error)\b/iu.test(source)
    || /\b(?:status|progress|history|records?|result|failed|failure|succeeded|success|error)\b[^.?!\n]{0,24}\b(?:payments?|charges?)\b/iu.test(source)
    || /\bhow\s+(?:to|do\s+(?:i|we|you))\b[^.?!\n]{0,32}\b(?:pay|charge|top[ -]?up)\b/iu.test(source)
    || /\b(?:why|when|where)\b[^.?!\n]{0,32}\b(?:pay|paid|payment|charge|charged|top[ -]?up)\b/iu.test(source)
    || /(?:支付|付款|充值|扣款)[^。！？?!\n]{0,20}(?:了吗|过吗|没有|吗|么|呢)\s*[。.!！?？]?$/iu.test(source)
    || /\b(?:did|have|has|was|were|is|are)\s+(?:i|we|you|he|she|they)\b[^.?!\n]{0,40}\b(?:pay|paid|paying|charge|charged|charging|top[ -]?up)\b/iu.test(source);
}

function hasDirectPaymentActionLanguage(text = '') {
  const source = String(text);
  if (!DIRECT_PAYMENT_ACTION_PATTERN.test(source) || isDirectPaymentLanguageDenied(source)) {
    return false;
  }
  return /(?:重新|再次|再)?授权[^。！？?!\n]{0,20}(?:这笔)?(?:支付|付款|扣款)/iu.test(source)
    || /(?:支付|付款|充值|扣款)(?!状态|进度|记录|历史|结果|失败|成功|异常|错误)/iu.test(source)
    || /\b(?:please\s+)?(?:pay|charge|top[ -]?up)\b/iu.test(source)
    || /\b(?:i|we)\s+(?:want|need|would\s+like)\s+to\s+(?:pay|charge|top[ -]?up)\b/iu.test(source);
}

function directPaymentIntentDecision(input = {}, text = '') {
  const structured = structuredDirectPaymentDecision(input);
  if (structured === 'DENIED' || isDirectPaymentLanguageDenied(text)) return 'DENIED';
  if (structured === 'AUTHORIZED') return 'AUTHORIZED';

  const purchase = structuredPurchaseIntentDecision(input);
  if (purchase === 'DENIED') return 'DENIED';
  if (purchase === 'AUTHORIZED' || hasDirectPaymentActionLanguage(text)) return 'AUTHORIZED';
  return hasPurchaseActionLanguage(text) ? 'AUTHORIZED' : 'ABSENT';
}

function hasStructuredCatalogSearchSignal(input = {}) {
  return STRUCTURED_CATALOG_SEARCH_INTENTS.has(normalizedIntent(input));
}

function hasStructuredWalletReloginSignal(input = {}) {
  return STRUCTURED_WALLET_RELOGIN_INTENTS.has(normalizedIntent(input));
}

const CATALOG_SEARCH_BOOLEAN_FIELDS = [
  'catalogSearchIntent',
  'catalog_search_intent',
  'productSearchIntent',
  'product_search_intent',
  'productDiscoveryIntent',
  'product_discovery_intent',
];

function structuredCatalogSearchResolution(input = {}) {
  const fields = CATALOG_SEARCH_BOOLEAN_FIELDS
    .filter((field) => Object.hasOwn(input, field))
    .map((field) => ({ field, raw: input[field], value: booleanValue(input[field]) }));
  const invalidFields = fields
    .filter((entry) => entry.value === null)
    .map((entry) => entry.field);
  const values = [...new Set(fields.map((entry) => entry.value).filter((value) => value !== null))];
  const intentSelected = hasStructuredCatalogSearchSignal(input);
  const denied = invalidFields.length > 0
    || values.length > 1
    || values.includes(false);
  return {
    intentSelected,
    booleanPresent: fields.length > 0,
    booleanAuthorized: fields.length > 0 && !denied && values[0] === true,
    denied,
    active: intentSelected || (fields.length > 0 && values.includes(true)),
  };
}

function hasBooleanCatalogSearchSignal(input = {}) {
  return structuredCatalogSearchResolution(input).booleanAuthorized;
}

function isStandaloneCurrentActionDenial(text = '') {
  const source = String(text).trim();
  return /^(?:取消(?:它|这个|该操作)?|停止(?:它|这个|该操作)?|算了|暂时不要|先不要|以后再说|稍后再说|不要执行|别执行)[。.!！]?$/iu.test(source)
    || /^(?:cancel(?:\s+(?:it|that|this))?|stop(?:\s+(?:it|that|this))?|never\s+mind|not\s+(?:now|yet)|maybe\s+later|no\s+thanks|(?:do\s+not|don['’]t)(?:\s+(?:do|run|execute|perform))?\s+(?:it|that|this))[.!]?$/iu.test(source);
}

function hasNonCatalogSearchTarget(text = '') {
  const source = String(text);
  if (hasExplicitSearchPurchaseSequence(source)) return false;
  const productPurchaseCapability = /\b(?:products?|items?)\b[^.?!\n]{0,32}\b(?:available\s+to\s+)?(?:buy|purchase|order)\b/iu.test(source)
    || /(?:商品|产品|物品)[^。！？?!\n]{0,20}(?:可(?:以)?|能够|能)?(?:买|购买|下单|订购)/iu.test(source);
  const workspaceContentLookup = /\bmy\s+(?:contacts?|calendar|schedule|messages?|chats?|mail|email|slack|notion|drive|documents?|files?|downloads?)\b/iu.test(source)
    || /\b(?:slack\s+messages?|calendar[^.?!\n]{0,24}\bmeetings?|emails?\s+about|contacts?\s+(?:for|about)|documents?\s+named?|downloads?)\b/iu.test(source)
    || /(?:我的|我(?:的)?)[^。！？?!\n]{0,8}(?:联系人|通讯录|日历|日程|消息|聊天|邮件|邮箱|飞书|文件|下载)/iu.test(source);
  const reverseProductTarget = /\b(?:apps?|applications?|software|tools?|services?|plugins?|integrations?|solutions?|platforms?|products?)\b[^.?!\n]{0,72}\b(?:slack|notion|calendar|schedule|email|mail|messages?|contacts?|drive|documents?|files?|local\s+files?)\b/iu.test(source)
    || /(?:应用|软件|工具|服务|插件|集成|方案|平台|产品)[^。！？?!\n]{0,48}(?:飞书|日历|日程|邮件|邮箱|消息|联系人|网盘|文件|本地文件)/iu.test(source);
  if (reverseProductTarget) return false;
  if (workspaceContentLookup) return true;

  // A workspace/developer noun is a product target only when it is adjacent to a concrete product
  // form. This keeps "Slack integration" in Catalog while "Slack messages about product launch"
  // remains a workspace lookup even though the latter happens to contain the word "product".
  const explicitProductTarget = /(?:接口|代码|日历|日程|消息|聊天|邮件|邮箱|文件|本地文件|飞书|网盘|联系人|发票|支付)(?:(?:营销|测试|审阅|评审|同步|管理|自动化|协作|日程)){0,2}(?:商品|产品|应用|软件|模板|插件|集成|工具|服务|平台|方案)/iu.test(source)
    || /\b(?:api|code|calendar|email|mail|messages?|chat|contacts?|notion|slack|drive|invoice|payment|documents?|files?|local\s+files?)\s+(?:(?:marketing|testing|test|review|sync|management|automation|productivity|scheduling)\s+){0,2}(?:products?|apps?|applications?|software|templates?|integrations?|plugins?|tools?|services?|platforms?|providers?|solutions?)\b/iu.test(source);
  if (explicitProductTarget) return false;

  return /\bapi\b|接口|documentation|\bdocs?\b|文档|代码|\bcode\b|仓库|\brepositor(?:y|ies)\b|\brepos?\b|日志|\blogs?\b|发票|\binvoices?\b|文档|下载/iu.test(source)
    || /(?:钱包|账户|账号)[^。！？?!\n]{0,16}(?:状态|余额|登录|授权|设置|配置)/iu.test(source)
    || /\b(?:wallet|account)\b[^.?!\n]{0,24}\b(?:status|balance|login|authorization|settings?|config(?:uration)?)\b/iu.test(source)
    || (!productPurchaseCapability && (
      /(?:支付|付款|退款|订单|卡片|银行卡|支付方式)/iu.test(source)
      || /\b(?:payments?|refunds?|orders?|cards?|payment\s+methods?)\b/iu.test(source)
    ))
    || /(?:联系人|通讯录|日历|日程|消息|聊天|邮件|邮箱|飞书|文件|本地文件|网盘)/iu.test(source)
    || /\b(?:contacts?|address\s+book|calendar|schedule|messages?|chats?|mail|email|feishu|lark|slack|notion|drive|documents?|files?|downloads?|filesystem)\b/iu.test(source)
    || /\b[^\s]+\.(?:pdf|docx?|xlsx?|pptx?|csv|txt|md|json|ya?ml|log)\b/iu.test(source);
}

function hasCatalogSearchSignal(input = {}, text = '') {
  if (hasStructuredCatalogSearchSignal(input) || hasBooleanCatalogSearchSignal(input)) return true;

  const intent = normalizedIntent(input);
  if (intent && (/^skill_/u.test(intent) || /^wallet_/u.test(intent))) return false;
  if (
    /\bskills?\b|技能|安装/iu.test(String(text))
    || textSkillInstallIdentityTargets(text).length > 0
    || productUrlOf(input, text) !== null
    || productItemIdOf(input) !== null
    || hasNonCatalogSearchTarget(text)
  ) return false;

  if (
    describedCatalogSearchQuery(text) === null
    && (
      activePendingTipConfirmation(input)
      || activePendingTipBatchConfirmation(input)
      || activePendingSkillInstallConfirmation(input)
    )
  ) return false;
  return hasTextualCatalogSearchExpression(text);
}

function hasSpecialCatalogSearchExpression(text = '') {
  const source = String(text);
  return /\b(?:give|gave|given|offer|offered|offering)\b[^.?!\n]{0,20}\b(?:me|us|you)\b[^.?!\n]{0,64}\b(?:options?|choices?|products?|items?)\b/iu.test(source)
    || /\bwhat\b[^.?!\n]{0,64}\b(?:products?|items?|options?|choices?)\b[^.?!\n]{0,40}\b(?:do|can)\s+(?:you|we)\s+(?:have|offer|carry|sell)\b/iu.test(source);
}

function isSpecialCatalogSearchNonAuthorizing(text = '') {
  const source = String(text);
  return /\b(?:do\s+not|don['’]t|never|cancel|stop)\b[^.?!\n]{0,48}\b(?:give|offer)\b[^.?!\n]{0,72}\b(?:options?|choices?|products?|items?)\b/iu.test(source)
    || /\b(?:if|unless|suppose|assuming)\b[^.?!\n]{0,64}\b(?:give|offer)\b[^.?!\n]{0,72}\b(?:options?|choices?|products?|items?)\b/iu.test(source)
    || /\b(?:i|we|you|he|she|they)\s+(?:already\s+)?(?:gave|offered)\b[^.?!\n]{0,72}\b(?:options?|choices?|products?|items?)\b/iu.test(source)
    || /\b(?:yesterday|previously|already)\b[^.?!\n]{0,72}\b(?:gave|offered)\b[^.?!\n]{0,72}\b(?:options?|choices?|products?|items?)\b/iu.test(source)
    || /\b(?:my\s+boss|the\s+user|user|someone|he|she|they)\s+(?:said|says|asked|wrote|mentioned)\b[^.?!\n]{0,96}\b(?:give|offer)\b[^.?!\n]{0,72}\b(?:options?|choices?|products?|items?)\b/iu.test(source);
}

function isOrdinaryCatalogVerbUse(text = '') {
  const source = String(text).trim();
  return /^(?:i\s+)?see\s+you(?:\s|[.!?]|$)/iu.test(source)
    || /^i\s+see\s+(?:your|the|this|that|what|why|how|where|it\b)/iu.test(source)
    || /^the\s+list\s+(?:is|was|seems?|looks?)\b/iu.test(source)
    || /^(?:this|that|the)\s+show\s+(?:is|was|seems?|looks?)\b/iu.test(source)
    || /^i\s+find\s+(?:this|that|it)\b/iu.test(source);
}

function hasTextualCatalogSearchExpression(text = '') {
  const source = String(text);
  if (hasSpecialCatalogSearchExpression(source)) return true;
  return CATALOG_SEARCH_TEXT_PATTERN.test(source) && !isOrdinaryCatalogVerbUse(source);
}

function isCatalogSearchTextNonAuthorizing(input = {}, text = '') {
  const source = String(text);
  const structured = structuredCatalogSearchResolution(input);
  const structuredSearch = structured.intentSelected || structured.booleanAuthorized;
  const textualSearch = hasTextualCatalogSearchExpression(source);
  if (!structuredSearch && !textualSearch) return false;
  if (structuredSearch && isStandaloneCurrentActionDenial(source)) return true;
  if (!textualSearch) return false;
  if (isSpecialCatalogSearchNonAuthorizing(source)) return true;

  const explicitNonExecution = new RegExp(
    `(?:^|[\\s，。！？；;])(?:不(?:会|能|打算|准备|想)?|无法|没(?:有)?打算|未打算)`
      + `[^。！？?!,，;；—\\n]{0,24}${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    `\\b(?:(?:will|would|shall|should|can|could|do|does|did|must)\\s+not|cannot|can[\'’]t|won[\'’]t)`
      + `[^.?!,;—\\n]{0,24}\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source) || new RegExp(
    `\\bwithout\\s+${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source);
  if (explicitNonExecution) return true;

  const purchaseOnlyDenialBeforeSearch = new RegExp(
    '(?:不要|先别|不想|不需要|无需)[^。！？?!,，;；—\\n]{0,24}'
      + '(?:买|购买|下单|订购|结账)[^。！？?!,，;；—\\n]{0,12}'
      + `(?:[,，;；—]|但是|但)\\s*(?:(?:只|帮我|请|麻烦)\\s*)*${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    '\\b(?:do\\s+not|don[\'’]t|no\\s+need\\s+to|not\\s+going\\s+to)\\b'
      + '[^.?!,;—\\n]{0,28}\\b(?:buy|purchase|order|checkout)\\b'
      + `[^.?!,;—\\n]{0,12}(?:[,;—]|\\bbut\\b)\\s*(?:just\\s+|please\\s+)*\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source);

  const negatedBeforeSearch = new RegExp(
    `(?:不要|别|无需|不需要|不用|取消|停止|先不|暂时不)[^。！？?!,，;；—\\n]{0,32}${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    `\\b(?:do\\s+not|don[\'’]t|never|not\\s+going\\s+to|no\\s+need\\s+to|cancel|stop)\\b[^.?!,;—\\n]{0,48}\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source);
  if (negatedBeforeSearch && !purchaseOnlyDenialBeforeSearch) return true;

  const deniedInstruction = new RegExp(
    `(?:我|我们)?没(?:有)?(?:让|叫|要求)(?:你)?[^。！？?!\\n]{0,28}${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    `\\b(?:i|we)\\s+(?:did\\s+not|didn[\'’]t)\\s+(?:ask|tell|require)\\s+you\\s+to\\s+\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source);
  if (deniedInstruction) return true;

  const hypothetical = new RegExp(
    `(?:如果|假如|要是|倘若|假设|假装)[^。！？?!\\n]{0,72}${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    `\\b(?:if|unless|suppose|assuming|pretend|were\\s+i\\s+to)\\b[^.?!\\n]{0,88}\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source) || /(?:等我确认|确认后再|仅在[^。！？?!\n]{0,24}确认|只有在[^。！？?!\n]{0,24}确认|以后再|稍后再)[^。！？?!\n]{0,40}/iu.test(source)
    || /\b(?:maybe\s+later|not\s+now|never\s+mind)\b[^.?!\n]{0,56}/iu.test(source)
    || /\b(?:only\s+if|after|once)\b[^.?!\n]{0,40}\b(?:i\s+)?confirm\b/iu.test(source);
  if (hypothetical) return true;

  const historical = new RegExp(
    `(?:已经|刚才|之前|昨天|曾经)[^。！？?!\\n]{0,48}${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    `(?:我|我们|你|你们|他|她|他们)\\s*${CATALOG_SEARCH_ZH_SOURCE}(?:过|了)[^。！？?!\\n]{0,40}`,
    'iu',
  ).test(source) || new RegExp(
    `(?:我|我们|你|你们|他|她|他们|[\\p{Script=Han}]{2,4})\\s*(?:正在|在)\\s*${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    `(?:我|我们|你|你们|他|她|他们|[\\p{Script=Han}]{2,4})\\s*${CATALOG_SEARCH_ZH_SOURCE}(?:过|了)` ,
    'iu',
  ).test(source)
    || /\b(?:already|previously|yesterday|just)\b[^.?!\n]{0,64}\b(?:searched|found|looked\s+(?:for|up)|showed|saw|browsed|explored|listed|recommended|suggested|located)\b/iu.test(source)
    || /\b(?:i|we|you|he|she|they)\s+(?:(?:have|has|had)\s+)?(?:searched|found|looked\s+(?:for|up)|showed|saw|browsed|explored|listed|recommended|suggested|located)\b/iu.test(source)
    || /\b[\p{L}\p{M}][\p{L}\p{M}'’-]{1,31}\s+(?:(?:have|has|had)\s+)?(?:searched|found|looked\s+(?:for|up)|showed|saw|browsed|explored|listed|recommended|suggested|located)\b/iu.test(source)
    || /\b(?:i|we|you|he|she|they|[\p{L}\p{M}][\p{L}\p{M}'’-]{1,31})\s+(?:(?:have|has|had)\s+been\s+|(?:am|is|are|was|were)\s+)(?:searching(?:\s+for)?|looking\s+(?:for|up)|showing|seeing|browsing(?:\s+for)?|exploring|listing|recommending|suggesting|locating)\b/iu.test(source)
    || /\b(?:searched|found|looked\s+(?:for|up)|showed|saw|browsed|explored|listed|recommended|suggested|located)\b[^.?!\n]{0,64}\b(?:already|previously|yesterday|just)\b/iu.test(source);
  if (historical) return true;

  const questionOrTutorial = new RegExp(
    `(?:要不要|该不该|是否应该|我应该|我们应该|怎么|如何)[^。！？?!\\n]{0,40}${CATALOG_SEARCH_ZH_SOURCE}`,
    'iu',
  ).test(source) || new RegExp(
    `\\b(?:are|is|was|were|do|does|did|have|has|should)\\s+(?:you|we|i|he|she|they|someone|[\\p{L}\\p{M}'’-]+)\\b[^.?!\\n]{0,64}\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source) || new RegExp(
    `\\bhow\\s+to\\b[^.?!\\n]{0,40}\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
    'iu',
  ).test(source)
    || new RegExp(`${CATALOG_SEARCH_ZH_SOURCE}[^。！？?!\\n]{0,48}(?:了吗|过吗|没有|没|吗|么|呢)\\s*[。.!！?？]?$`, 'iu').test(source)
    || new RegExp(`${CATALOG_SEARCH_ZH_SOURCE}[^。！？?!\\n]{0,32}(?:状态|进度|结果)(?:如何|怎样|怎么样|是什么)?`, 'iu').test(source)
    || new RegExp(`\\b(?:status|progress|result)\\b[^.?!\\n]{0,40}\\b${CATALOG_SEARCH_EN_SOURCE}\\b|\\b${CATALOG_SEARCH_EN_SOURCE}\\b[^.?!\\n]{0,40}\\b(?:status|progress|result)\\b`, 'iu').test(source)
    || new RegExp(`\\b(?:is|are|was|were)\\b[^.?!\\n]{0,48}\\b${CATALOG_SEARCH_EN_SOURCE}\\b[^.?!\\n]{0,24}\\b(?:running|working|supported?|completed?|finished|failed?)\\b`, 'iu').test(source)
    || new RegExp(`\\b(?:why|how)\\b[^.?!\\n]{0,64}\\b${CATALOG_SEARCH_EN_SOURCE}\\b[^.?!\\n]{0,32}\\b(?:fail(?:ed|ure)?|work(?:ing)?|supported?|broken)\\b`, 'iu').test(source)
    || /(?:为什么|为何)[^。！？?!\n]{0,48}(?:搜索|搜|查找|查询|浏览|推荐)[^。！？?!\n]{0,24}(?:失败|出错|异常|不能用|不工作|没反应)/iu.test(source)
    || /\b(?:do|does|did|can|could|will|would|is|are)\b[^.?!\n]{0,40}\b(?:catalog|product)\s+search\b[^.?!\n]{0,40}\b(?:support(?:ed|s|ing)?|work(?:ing)?|fail(?:ed|ure)?)\b/iu.test(source);
  if (questionOrTutorial) return true;

  const testOrReported = /(?:这只是|只是|仅仅是|用于)(?:一个)?(?:测试|示例|演示|复现|调试|讨论)/iu.test(source)
    || /\b(?:this\s+is\s+(?:only\s+)?a\s+test|for\s+(?:qa|testing|a\s+test)|only\s+an?\s+(?:example|demo|test))\b/iu.test(source)
    || new RegExp(
      `(?:测试|复现|重现|调试|演示|示例|举例|转述|引用|讨论|需求里写着|有人说|用户说|老板说|同事说|对方说|他说|她说|他们说)[^。！？?!\\n]{0,120}${CATALOG_SEARCH_ZH_SOURCE}`,
      'iu',
    ).test(source)
    || new RegExp(
      `\\b(?:for\\s+qa|test(?:ing)?|reproduc(?:e|ing)|debug(?:ging)?|demo|example|quote|discussion|discuss(?:ed|ing)?|explain(?:ed|ing)?|phrase|wording|meaning|according\\s+to|(?:i|you|he|she|they|someone|my\\s+boss|the\\s+user|user)\\s+(?:said|says|asked|wrote|mentioned))\\b[^.?!\\n]{0,140}\\b${CATALOG_SEARCH_EN_SOURCE}\\b`,
      'iu',
    ).test(source)
    || new RegExp(
      `${CATALOG_SEARCH_ZH_SOURCE}[^。！？?!\\n]{0,80}(?:是什么意思|啥意思|什么含义|含义是什么|怎么理解)`,
      'iu',
    ).test(source);
  if (testOrReported) return true;

  const trailingCancellation = new RegExp(
    `${CATALOG_SEARCH_ZH_SOURCE}[^\\n]{0,120}(?:[。；，,;—]|但是|但|然后|随后|接着)\\s*`
      + '(?:(?:不要|别)(?:执行|做(?:它|这个)?|搜索|搜|查找|查|找|浏览|列出|推荐)|取消|停止|算了|暂时不要|以后再说|不用了|不必了|作罢|放弃)',
    'iu',
  ).test(source) || new RegExp(
    `\\b${CATALOG_SEARCH_EN_SOURCE}\\b[^\\n]{0,140}(?:[.!;,—]|\\bbut\\b|\\b(?:and\\s+then|then)\\b)\\s*`
      + '(?:(?:do\\s+not|don[\'’]t)(?:\\s+(?:do|run|execute|perform))?\\s+(?:it|that|this|the\\s+search)|cancel(?:\\s+(?:it|that|this)(?:\\s+search)?)?|stop(?:\\s+(?:it|that|this)(?:\\s+search)?)?|abort(?:\\s+(?:it|that|this)(?:\\s+search)?)?|forget\\s+(?:it|that|this)|never\\s+mind|not\\s+now|maybe\\s+later|no\\s+thanks)',
    'iu',
  ).test(source);
  return trailingCancellation;
}

function isCatalogSearchIntent(input = {}, text = '') {
  const structuredSearch = hasStructuredCatalogSearchSignal(input);
  if (purchaseIntentDecision(input, text) === 'AUTHORIZED') return false;
  if (structuredSearch) return true;

  const booleanSearch = hasBooleanCatalogSearchSignal(input);
  if (booleanSearch) return !hasPurchaseActionLanguage(text);
  return hasCatalogSearchSignal(input, text) && !hasPurchaseActionLanguage(text);
}

function catalogSearchPreemptsTextualWallet(input = {}, text = '') {
  if (hasStructuredCatalogSearchSignal(input) || hasBooleanCatalogSearchSignal(input)) return true;

  const source = String(text);
  const searchMatch = source.match(CATALOG_SEARCH_TEXT_PATTERN);
  if (!searchMatch) return false;
  const prefix = source.slice(0, searchMatch.index ?? 0);
  const suffix = source.slice((searchMatch.index ?? 0) + searchMatch[0].length);
  const walletDirectiveBeforeSearch =
    /(?:重新|再次|再)\s*(?:登录|登陆|登入|授权|认证)|(?:给我|生成|打开|换|来)[^。！？?!\n]{0,12}(?:新的?|新)[^。！？?!\n]{0,8}(?:登录|登陆|登入|授权|认证)(?:页|页面|链接)/iu.test(prefix)
    || /\b(?:re-?login|re-?log\s+in|log\s+in\s+again|sign\s+in\s+again|re-?authori[sz]e)\b|\b(?:generate|open|replace)\b[^.?!\n]{0,20}\b(?:new|fresh|replacement)\s+(?:login|sign-in|authorization)\s+(?:link|page)\b/iu.test(prefix);
  const separateThenSearch = /(?:并|然后|接着|随后|再|[,，;；])\s*$/iu.test(prefix)
    || /\b(?:and(?:\s+then)?|then)\s*$/iu.test(prefix);
  const explicitWalletDirectiveAfterSearch = /(?:并|然后|接着|随后|再|[,，;；])[^。！？?!\n]{0,24}(?:重新|再次|再)\s*(?:登录|登陆|登入|授权|认证)(?:[^。！？?!\n]{0,12}(?:钱包|账户|账号))?/iu.test(suffix)
    || /\b(?:and(?:\s+then)?|then)\b[^.?!\n]{0,24}\b(?:re-?login|re-?log\s+in|log\s+in\s+again|sign\s+in\s+again|re-?authori[sz]e)\b[^.?!\n]{0,16}\b(?:my\s+)?(?:wallet|account)\b/iu.test(suffix);
  if (explicitWalletDirectiveAfterSearch) return false;
  return !(walletDirectiveBeforeSearch && separateThenSearch);
}

function describedCatalogSearchQuery(text = '') {
  const source = String(text).trim();
  const residual = source
    .replace(CATALOG_SEARCH_VERB_PATTERN, ' ')
    .replace(/(?:帮我|请|麻烦|给我|我想|想要|有没有|先|再|一下)/gu, ' ')
    .replace(/(?:在|从)?(?:商品|产品)?目录(?:里|中|里面|之中)?/gu, ' ')
    .replace(/(?:任意|任何|随便|某个|一些|一个|个|所有|全部|全部的|可选的|可选项|选项|几款|几种)/gu, ' ')
    .replace(/(?:商品|产品|物品|东西|目录)/gu, ' ')
    .replace(/\b(?:catalog(?:ue)?|products?|items?|options?|choices?|for|from|in|me|a|an|the|some|any|anything|something|one|all|please|give|what|do|does|can|you|we|have|offer|carry|sell)\b/giu, ' ')
    .replace(/[的了吗呢吧:：,，。.!！?？"'“”]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return residual.length > 0 ? source : null;
}

function catalogSearchQueryOf(input = {}, text = '') {
  return firstNormalizedString(
    input.catalogQuery,
    input.catalog_query,
    input.searchQuery,
    input.search_query,
    input.productQuery,
    input.product_query,
    productNameOf(input),
    input.query,
  ) ?? describedCatalogSearchQuery(text);
}

function publicCatalogSearchMetadata() {
  return {
    purchaseIntent: false,
    requiresWallet: false,
    authenticationMode: 'ANONYMOUS',
    resultMode: 'DISCOVERY_ONLY',
    walletGate: PaymentWalletGate.SKIP,
  };
}

function catalogPurchaseDiscoveryMetadata() {
  return {
    purchaseIntent: true,
    requiresWallet: false,
    authenticationMode: 'ANONYMOUS',
    resultMode: 'PURCHASE_SELECTION',
    walletGate: PaymentWalletGate.DEFER_UNTIL_SELECTION,
  };
}

function classifyCatalogSearchIntent(input = {}, text = '') {
  const structuredSearch = structuredCatalogSearchResolution(input);
  const structuredDenialApplies = structuredSearch.denied
    && (structuredSearch.booleanPresent || structuredSearch.intentSelected);
  if (structuredDenialApplies) {
    return {
      state: PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED,
      route: PaymentIntentRoute.NO_ACTION,
      action: PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY,
      terminal: true,
      reason: 'catalog_search_not_authorized',
      ...publicCatalogSearchMetadata(),
    };
  }
  if (!isCatalogSearchIntent(input, text)) return null;

  const catalogQuery = catalogSearchQueryOf(input, text);
  const environmentResolution = resolveCatalogEnvironment(input);
  const languageResolution = resolveCatalogLanguage(input);
  const boundary = publicCatalogSearchMetadata();
  if (isCatalogSearchTextNonAuthorizing(input, text)) {
    return {
      state: PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED,
      route: PaymentIntentRoute.NO_ACTION,
      action: PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY,
      terminal: true,
      reason: 'catalog_search_not_authorized',
      ...boundary,
    };
  }
  if (!catalogQuery) {
    return {
      state: PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT,
      terminal: false,
      reason: 'catalog_query_missing',
      missing: ['catalogQuery'],
      ...(environmentResolution.valid
        ? { catalogEnvironment: environmentResolution.catalogEnvironment }
        : {}),
      ...(languageResolution.valid && languageResolution.catalogLanguage
        ? { catalogLanguage: languageResolution.catalogLanguage }
        : {}),
      ...boundary,
    };
  }

  if (!environmentResolution.valid) {
    return {
      state: PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT,
      terminal: false,
      reason: environmentResolution.reason,
      catalogQuery,
      ...(environmentResolution.value ? { value: environmentResolution.value } : {}),
      ...(environmentResolution.values ? { values: environmentResolution.values } : {}),
      ...(languageResolution.valid && languageResolution.catalogLanguage
        ? { catalogLanguage: languageResolution.catalogLanguage }
        : {}),
      ...boundary,
    };
  }

  if (!languageResolution.valid) {
    return {
      state: PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT,
      terminal: false,
      reason: languageResolution.reason,
      catalogQuery,
      catalogEnvironment: environmentResolution.catalogEnvironment,
      ...(languageResolution.value ? { value: languageResolution.value } : {}),
      ...(languageResolution.values ? { values: languageResolution.values } : {}),
      ...boundary,
    };
  }

  return {
    state: PaymentIntentState.CATALOG_SEARCH_SELECTED,
    route: PaymentIntentRoute.CATALOG_SEARCH,
    action: PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW,
    terminal: false,
    reason: 'catalog_search_intent',
    catalogQuery,
    ...(merchantIdOf(input) ? { merchantId: merchantIdOf(input) } : {}),
    catalogEnvironment: environmentResolution.catalogEnvironment,
    ...(languageResolution.catalogLanguage
      ? { catalogLanguage: languageResolution.catalogLanguage }
      : {}),
    ...boundary,
  };
}

function hasExplicitPurchaseIntent(input = {}, text = '') {
  return purchaseIntentDecision(input, text) === 'AUTHORIZED';
}

function productUrlOf(input = {}, text = '') {
  return explicitProductUrlOf(input)
    ?? firstNormalizedString(input.url, extractUrl(text));
}

function productNameOf(input = {}) {
  return firstNormalizedString(
    input.productName,
    input.product_name,
    input.itemName,
    input.item_name,
    input.title,
  );
}

function merchantIdOf(input = {}) {
  return firstNormalizedString(input.merchantId, input.merchant_id);
}

function classifyCatalogPurchaseDiscovery(input = {}, catalogQuery = null, productName = null) {
  if (!catalogQuery) return null;

  const environmentResolution = resolveCatalogEnvironment(input);
  const languageResolution = resolveCatalogLanguage(input);
  const boundary = catalogPurchaseDiscoveryMetadata();
  if (!environmentResolution.valid) {
    return {
      state: PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT,
      terminal: false,
      reason: environmentResolution.reason,
      ...(productName ? { productName } : {}),
      catalogQuery,
      ...(environmentResolution.value ? { value: environmentResolution.value } : {}),
      ...(environmentResolution.values ? { values: environmentResolution.values } : {}),
      ...(languageResolution.valid && languageResolution.catalogLanguage
        ? { catalogLanguage: languageResolution.catalogLanguage }
        : {}),
      ...boundary,
    };
  }

  if (!languageResolution.valid) {
    return {
      state: PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT,
      terminal: false,
      reason: languageResolution.reason,
      ...(productName ? { productName } : {}),
      catalogQuery,
      catalogEnvironment: environmentResolution.catalogEnvironment,
      ...(languageResolution.value ? { value: languageResolution.value } : {}),
      ...(languageResolution.values ? { values: languageResolution.values } : {}),
      ...boundary,
    };
  }

  return {
    state: PaymentIntentState.CATALOG_PURCHASE_SELECTED,
    route: PaymentIntentRoute.CATALOG_PURCHASE,
    action: PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW,
    terminal: false,
    reason: 'product_purchase_intent_without_product_url',
    ...(productName ? { productName } : {}),
    catalogQuery,
    catalogEnvironment: environmentResolution.catalogEnvironment,
    ...(languageResolution.catalogLanguage
      ? { catalogLanguage: languageResolution.catalogLanguage }
      : {}),
    ...boundary,
  };
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

const V2_OPERATIONS = new Set(Object.values(PaymentRoutingOperation));
const V2_EXECUTION_DECISIONS = new Set(Object.values(PaymentExecutionDecision));
const V2_PAYMENT_AUTHORIZATION_SOURCES = new Set(Object.values(PaymentAuthorizationSource));
const V2_DIRECT_PAY_MODES = new Set(Object.values(PaymentDirectPayMode));
const V2_PAYMENT_OPERATIONS = new Set([
  PaymentRoutingOperation.CATALOG_PURCHASE,
  PaymentRoutingOperation.UCP_CHECKOUT,
  PaymentRoutingOperation.DIRECT_PAY,
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function strictContractString(value) {
  if (typeof value !== 'string') return { valid: false, value: null };
  const normalized = value.trim();
  return normalized
    ? { valid: true, value: normalized }
    : { valid: false, value: null };
}

function optionalContractString(record, field) {
  if (!Object.hasOwn(record, field)) return { present: false, valid: true, value: null };
  const resolved = strictContractString(record[field]);
  return { present: true, ...resolved };
}

function optionalContractAmount(record, field) {
  if (!Object.hasOwn(record, field)) return { present: false, valid: true, value: null };
  if (typeof record[field] !== 'string') {
    return { present: true, valid: false, value: null };
  }
  const value = record[field].trim();
  const valid = /^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)
    && Number.isFinite(Number(value))
    && Number(value) > 0
    && decimalSurvivesJsonNumberSerialization(value);
  return { present: true, valid, value: valid ? value : null };
}

// The vendored CLI currently serializes payment amounts as JSON numbers. Reject a decimal when
// that conversion would silently change the user-authorized value (for example 2^53 + 1 or a
// decimal with more precision than Number can round-trip). Formatting-only changes such as
// `10.00` -> `10` and `0.0000001` -> `1e-7` remain valid because their decimal values agree.
function decimalSurvivesJsonNumberSerialization(value) {
  const serialized = JSON.stringify(Number(value));
  if (typeof serialized !== 'string') return false;
  return canonicalDecimalForComparison(value) === canonicalDecimalForComparison(serialized);
}

function canonicalDecimalForComparison(value) {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/iu.exec(String(value));
  if (!match) return null;

  const integer = match[1];
  const fraction = match[2] ?? '';
  const exponent = Number(match[3] ?? 0);
  if (!Number.isSafeInteger(exponent)) return null;

  const digits = `${integer}${fraction}`;
  const decimalPosition = integer.length + exponent;
  let expanded;
  if (decimalPosition <= 0) {
    expanded = `0.${'0'.repeat(-decimalPosition)}${digits}`;
  } else if (decimalPosition >= digits.length) {
    expanded = `${digits}${'0'.repeat(decimalPosition - digits.length)}`;
  } else {
    expanded = `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
  }

  const [wholePart, fractionPart = ''] = expanded.split('.');
  const whole = wholePart.replace(/^0+(?=\d)/u, '') || '0';
  const canonicalFraction = fractionPart.replace(/0+$/u, '');
  return canonicalFraction ? `${whole}.${canonicalFraction}` : whole;
}

function optionalContractCurrency(record, field) {
  const resolved = optionalContractString(record, field);
  if (!resolved.present || !resolved.valid) return resolved;
  const value = resolved.value.toUpperCase();
  return /^[A-Z]{3}$/u.test(value)
    ? { ...resolved, value }
    : { ...resolved, valid: false, value: null };
}

function routingContractTrace(input = {}) {
  const requestId = strictContractString(input.requestId).value;
  const turnId = strictContractString(input.turnId).value;
  return {
    routingContractVersion: 2,
    ...(requestId ? { requestId } : {}),
    ...(turnId ? { turnId } : {}),
  };
}

function routingContractFailure(input = {}, operation = null, reason = 'routing_contract_invalid', details = {}) {
  const catalogSearch = operation === PaymentRoutingOperation.CATALOG_SEARCH;
  return {
    state: catalogSearch
      ? PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED
      : PaymentIntentState.PAYMENT_NOT_AUTHORIZED,
    route: PaymentIntentRoute.NO_ACTION,
    action: catalogSearch
      ? PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY
      : PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW,
    terminal: true,
    reason,
    purchaseIntent: false,
    requiresWallet: false,
    walletGate: PaymentWalletGate.SKIP,
    ...routingContractTrace(input),
    ...details,
  };
}

function routingContractInputRequired(input = {}, operation, missing = [], details = {}) {
  const catalogOperation = operation === PaymentRoutingOperation.CATALOG_SEARCH
    || operation === PaymentRoutingOperation.CATALOG_PURCHASE;
  return {
    state: catalogOperation
      ? PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING
      : PaymentIntentState.PAYMENT_TARGET_INPUT_MISSING,
    route: PaymentIntentRoute.INPUT_REQUIRED,
    action: catalogOperation
      ? PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT
      : PaymentIntentAction.ASK_FOR_PAYMENT_TARGET,
    terminal: false,
    reason: 'routing_contract_input_missing',
    missing,
    requiresWallet: false,
    walletGate: operation === PaymentRoutingOperation.CATALOG_PURCHASE
      ? PaymentWalletGate.DEFER_UNTIL_SELECTION
      : PaymentWalletGate.SKIP,
    ...routingContractTrace(input),
    operation,
    ...details,
  };
}

function v2CatalogContext(input = {}, operation, target = {}, boundary = {}) {
  const environment = optionalContractString(target, 'catalogEnvironment');
  const language = optionalContractString(target, 'catalogLanguage');
  const channelType = optionalContractString(target, 'channelType');
  const storeId = optionalContractString(target, 'storeId');
  const addressCountry = optionalContractString(target, 'addressCountry');
  const invalidFields = [
    ...(!environment.valid ? ['target.catalogEnvironment'] : []),
    ...(!language.valid ? ['target.catalogLanguage'] : []),
    ...(!channelType.valid ? ['target.channelType'] : []),
    ...(!storeId.valid ? ['target.storeId'] : []),
    ...(!addressCountry.valid ? ['target.addressCountry'] : []),
  ];
  if (invalidFields.length > 0) {
    return {
      workflow: routingContractInputRequired(input, operation, invalidFields, {
        reason: 'routing_contract_target_invalid',
        invalidFields,
        ...boundary,
      }),
    };
  }
  if (!language.present) {
    return {
      workflow: routingContractInputRequired(input, operation, ['target.catalogLanguage'], {
        reason: 'catalog_language_missing',
        ...boundary,
      }),
    };
  }

  const context = {
    ...(environment.value ? { catalogEnvironment: environment.value } : {}),
    ...(language.value ? { catalogLanguage: language.value } : {}),
    ...(channelType.value ? { channelType: channelType.value } : {}),
    ...(storeId.value ? { storeId: storeId.value } : {}),
    ...(addressCountry.value ? { addressCountry: addressCountry.value } : {}),
  };
  const environmentResolution = resolveCatalogEnvironment(context);
  const languageResolution = resolveCatalogLanguage(context);
  const extResolution = resolveCatalogExt(context);
  const countryResolution = resolveContextCountry(context);
  if (!environmentResolution.valid) {
    return {
      workflow: routingContractInputRequired(input, operation, ['target.catalogEnvironment'], {
        reason: environmentResolution.reason,
        ...boundary,
      }),
    };
  }
  if (!languageResolution.valid) {
    return {
      workflow: routingContractInputRequired(input, operation, ['target.catalogLanguage'], {
        reason: languageResolution.reason,
        ...boundary,
      }),
    };
  }
  if (!extResolution.valid) {
    return {
      workflow: routingContractInputRequired(input, operation, ['target.channelType'], {
        reason: extResolution.reason,
        ...boundary,
      }),
    };
  }
  return {
    catalogEnvironment: environmentResolution.catalogEnvironment,
    catalogLanguage: languageResolution.catalogLanguage,
    channelType: extResolution.channelType ?? null,
    storeId: extResolution.storeId ?? null,
    addressCountry: countryResolution.country,
  };
}

/**
 * Strict, intent-driven routing contract. Natural-language text is deliberately ignored here:
 * the host/agent planner supplies one semantic operation and an execution decision, while this
 * FSM validates scope and derives the wallet gate. The unversioned path below remains a legacy
 * compatibility adapter and must not be used as the authorization source for new integrations.
 */
export function classifyPaymentIntentV2(input = {}) {
  if (!Object.hasOwn(input, 'routingContractVersion')) return null;
  if (input.routingContractVersion !== 2) {
    return routingContractFailure(input, null, 'routing_contract_version_unsupported', {
      receivedRoutingContractVersion: input.routingContractVersion,
      supportedRoutingContractVersion: 2,
    });
  }

  const operation = input.operation;
  const executionDecision = input.executionDecision;
  if (!V2_OPERATIONS.has(operation) || !V2_EXECUTION_DECISIONS.has(executionDecision)) {
    return routingContractFailure(input, operation, 'routing_contract_invalid');
  }

  if (executionDecision === PaymentExecutionDecision.DENIED) {
    return routingContractFailure(input, operation, 'intent_not_authorized', { operation });
  }
  if (executionDecision === PaymentExecutionDecision.CLARIFY) {
    return routingContractInputRequired(input, operation, ['operationIntent'], {
      reason: 'intent_clarification_required',
      walletGate: PaymentWalletGate.SKIP,
    });
  }
  if (operation === PaymentRoutingOperation.NO_ACTION) {
    return routingContractFailure(input, operation, 'routing_contract_invalid');
  }

  const requestId = strictContractString(input.requestId);
  const turnId = strictContractString(input.turnId);
  const missingBinding = [
    ...(!requestId.valid ? ['requestId'] : []),
    ...(!turnId.valid ? ['turnId'] : []),
  ];
  if (missingBinding.length > 0) {
    return routingContractFailure(input, operation, 'routing_contract_binding_missing', {
      operation,
      missing: missingBinding,
    });
  }

  const target = input.target;
  if (!isRecord(target)) {
    return routingContractInputRequired(input, operation, ['target'], {
      reason: 'routing_contract_target_missing',
    });
  }

  if (V2_PAYMENT_OPERATIONS.has(operation)) {
    if (!V2_PAYMENT_AUTHORIZATION_SOURCES.has(input.authorizationSource)) {
      return routingContractFailure(input, operation, 'routing_contract_authorization_missing', {
        operation,
        missing: ['authorizationSource'],
      });
    }
  } else if (input.authorizationSource !== undefined) {
    return routingContractFailure(input, operation, 'routing_contract_authorization_invalid', {
      operation,
      invalidFields: ['authorizationSource'],
    });
  }

  if (operation === PaymentRoutingOperation.CATALOG_SEARCH) {
    const query = optionalContractString(target, 'catalogQuery');
    if (!query.present || !query.valid) {
      return routingContractInputRequired(input, operation, ['target.catalogQuery'], {
        reason: query.present ? 'routing_contract_target_invalid' : 'catalog_query_missing',
        ...publicCatalogSearchMetadata(),
      });
    }
    const catalogContext = v2CatalogContext(
      input,
      operation,
      target,
      publicCatalogSearchMetadata(),
    );
    if (catalogContext.workflow) return catalogContext.workflow;
    const merchantId = optionalContractString(target, 'merchantId');
    if (!merchantId.valid) {
      return routingContractInputRequired(input, operation, ['target.merchantId'], {
        reason: 'routing_contract_target_invalid',
        invalidFields: ['target.merchantId'],
        ...publicCatalogSearchMetadata(),
      });
    }
    if (merchantId.value && (catalogContext.channelType || catalogContext.storeId)) {
      return routingContractInputRequired(input, operation, ['target.merchantId_or_channelScope'], {
        reason: 'routing_contract_target_conflict',
        invalidFields: ['target.merchantId', 'target.channelType', 'target.storeId'],
        ...publicCatalogSearchMetadata(),
      });
    }
    return {
      state: PaymentIntentState.CATALOG_SEARCH_SELECTED,
      route: PaymentIntentRoute.CATALOG_SEARCH,
      action: PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW,
      terminal: false,
      reason: 'structured_product_search_intent',
      operation,
      executionDecision,
      catalogQuery: query.value,
      ...(merchantId.value ? { merchantId: merchantId.value } : {}),
      catalogEnvironment: catalogContext.catalogEnvironment,
      catalogLanguage: catalogContext.catalogLanguage,
      ...(catalogContext.channelType ? { channelType: catalogContext.channelType } : {}),
      ...(catalogContext.storeId ? { storeId: catalogContext.storeId } : {}),
      ...(catalogContext.addressCountry ? { addressCountry: catalogContext.addressCountry } : {}),
      ...publicCatalogSearchMetadata(),
      ...routingContractTrace(input),
    };
  }

  if (operation === PaymentRoutingOperation.CATALOG_PURCHASE) {
    const query = optionalContractString(target, 'catalogQuery');
    const productName = optionalContractString(target, 'productName');
    const catalogQuery = query.value ?? productName.value;
    if (!catalogQuery || !query.valid || !productName.valid) {
      return routingContractInputRequired(input, operation, ['target.catalogQuery'], {
        reason: (query.present && !query.valid) || (productName.present && !productName.valid)
          ? 'routing_contract_target_invalid'
          : 'catalog_query_missing',
        ...catalogPurchaseDiscoveryMetadata(),
      });
    }
    const catalogContext = v2CatalogContext(
      input,
      operation,
      target,
      catalogPurchaseDiscoveryMetadata(),
    );
    if (catalogContext.workflow) return catalogContext.workflow;
    const merchantId = optionalContractString(target, 'merchantId');
    if (!merchantId.valid) {
      return routingContractInputRequired(input, operation, ['target.merchantId'], {
        reason: 'routing_contract_target_invalid',
        invalidFields: ['target.merchantId'],
        ...catalogPurchaseDiscoveryMetadata(),
      });
    }
    if (merchantId.value && (catalogContext.channelType || catalogContext.storeId)) {
      return routingContractInputRequired(input, operation, ['target.merchantId_or_channelScope'], {
        reason: 'routing_contract_target_conflict',
        invalidFields: ['target.merchantId', 'target.channelType', 'target.storeId'],
        ...catalogPurchaseDiscoveryMetadata(),
      });
    }
    return {
      state: PaymentIntentState.CATALOG_PURCHASE_SELECTED,
      route: PaymentIntentRoute.CATALOG_PURCHASE,
      action: PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW,
      terminal: false,
      reason: 'structured_product_purchase_discovery_intent',
      operation,
      executionDecision,
      authorizationSource: input.authorizationSource,
      catalogQuery,
      ...(productName.value ? { productName: productName.value } : {}),
      ...(merchantId.value ? { merchantId: merchantId.value } : {}),
      catalogEnvironment: catalogContext.catalogEnvironment,
      catalogLanguage: catalogContext.catalogLanguage,
      ...(catalogContext.channelType ? { channelType: catalogContext.channelType } : {}),
      ...(catalogContext.storeId ? { storeId: catalogContext.storeId } : {}),
      ...(catalogContext.addressCountry ? { addressCountry: catalogContext.addressCountry } : {}),
      ...catalogPurchaseDiscoveryMetadata(),
      ...routingContractTrace(input),
    };
  }

  if (operation === PaymentRoutingOperation.UCP_CHECKOUT) {
    const productUrl = optionalContractString(target, 'productUrl');
    const itemId = optionalContractString(target, 'itemId');
    const productName = optionalContractString(target, 'productName');
    const merchantId = optionalContractString(target, 'merchantId');
    const invalidFields = [
      ...(!productUrl.valid ? ['target.productUrl'] : []),
      ...(!itemId.valid ? ['target.itemId'] : []),
      ...(!productName.valid ? ['target.productName'] : []),
      ...(!merchantId.valid ? ['target.merchantId'] : []),
      ...(productUrl.value && !isAbsoluteHttpUrl(productUrl.value) ? ['target.productUrl'] : []),
    ];
    if (invalidFields.length > 0) {
      return routingContractInputRequired(input, operation, invalidFields, {
        reason: 'routing_contract_target_invalid',
        invalidFields,
      });
    }
    if (!productUrl.value) {
      return routingContractInputRequired(input, operation, ['target.productUrl'], {
        reason: 'routing_contract_product_url_missing',
      });
    }
    return {
      state: PaymentIntentState.UCP_CHECKOUT_SELECTED,
      route: PaymentIntentRoute.UCP_CHECKOUT,
      action: PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW,
      terminal: false,
      reason: 'structured_ucp_checkout_intent',
      operation,
      executionDecision,
      authorizationSource: input.authorizationSource,
      ...(merchantId.value ? { merchantId: merchantId.value } : {}),
      ...(productUrl.value ? { productUrl: productUrl.value } : {}),
      ...(itemId.value ? { itemId: itemId.value } : {}),
      ...(productName.value ? { productName: productName.value } : {}),
      requiresProductParse: true,
      ...(itemId.value ? { validateItemAgainstProductUrl: true } : {}),
      purchaseIntent: true,
      requiresWallet: true,
      authenticationMode: 'AUTHENTICATED',
      walletGate: PaymentWalletGate.REQUIRE_STATUS,
      ...routingContractTrace(input),
    };
  }

  const payment = input.payment;
  if (!isRecord(payment)) {
    return routingContractInputRequired(input, operation, ['payment'], {
      reason: 'routing_contract_payment_invalid',
      invalidFields: ['payment'],
    });
  }

  const mode = optionalContractString(payment, 'mode');
  const merchantId = optionalContractString(target, 'merchantId');
  const amount = optionalContractAmount(payment, 'amount');
  const currency = optionalContractCurrency(payment, 'currency');
  const sessionId = optionalContractString(payment, 'sessionId');
  const orderId = optionalContractString(payment, 'orderId');
  const paymentInstrumentId = optionalContractString(payment, 'paymentInstrumentId');
  const invalidFields = [
    ...(!mode.valid ? ['payment.mode'] : []),
    ...(!merchantId.valid ? ['target.merchantId'] : []),
    ...(!amount.valid ? ['payment.amount'] : []),
    ...(!currency.valid ? ['payment.currency'] : []),
    ...(!sessionId.valid ? ['payment.sessionId'] : []),
    ...(!orderId.valid ? ['payment.orderId'] : []),
    ...(!paymentInstrumentId.valid ? ['payment.paymentInstrumentId'] : []),
  ];
  if (invalidFields.length > 0) {
    return routingContractInputRequired(input, operation, invalidFields, {
      reason: 'routing_contract_payment_invalid',
      invalidFields,
    });
  }
  if (!mode.value) {
    return routingContractInputRequired(input, operation, ['payment.mode']);
  }
  if (!V2_DIRECT_PAY_MODES.has(mode.value)) {
    return routingContractInputRequired(input, operation, ['payment.mode'], {
      reason: 'routing_contract_payment_mode_invalid',
      invalidFields: ['payment.mode'],
    });
  }

  const directMode = mode.value === PaymentDirectPayMode.DIRECT;
  const conflictingModeFields = directMode
    ? [...(sessionId.present ? ['payment.sessionId'] : [])]
    : [
      ...(merchantId.present ? ['target.merchantId'] : []),
      ...(amount.present ? ['payment.amount'] : []),
      ...(currency.present ? ['payment.currency'] : []),
    ];
  if (conflictingModeFields.length > 0) {
    return routingContractInputRequired(input, operation, ['payment.modeScope'], {
      reason: 'routing_contract_payment_mode_conflict',
      invalidFields: conflictingModeFields,
    });
  }

  const missing = directMode
    ? [
      ...(!merchantId.value ? ['target.merchantId'] : []),
      ...(!amount.value ? ['payment.amount'] : []),
      ...(!currency.value ? ['payment.currency'] : []),
    ]
    : [...(!sessionId.value ? ['payment.sessionId'] : [])];
  if (missing.length > 0) return routingContractInputRequired(input, operation, missing);
  return {
    state: PaymentIntentState.DIRECT_PAY_SELECTED,
    route: PaymentIntentRoute.DIRECT_PAY,
    action: PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW,
    terminal: false,
    reason: directMode ? 'structured_direct_pay_intent' : 'structured_session_pay_intent',
    operation,
    executionDecision,
    authorizationSource: input.authorizationSource,
    paymentMode: mode.value,
    ...(directMode ? {
      merchantId: merchantId.value,
      amount: amount.value,
      currency: currency.value,
    } : { sessionId: sessionId.value }),
    ...(orderId.value ? { orderId: orderId.value } : {}),
    ...(paymentInstrumentId.value ? { paymentInstrumentId: paymentInstrumentId.value } : {}),
    requiresWallet: true,
    authenticationMode: 'AUTHENTICATED',
    walletGate: PaymentWalletGate.REQUIRE_STATUS,
    ...routingContractTrace(input),
  };
}

export function classifyPaymentIntent(input = {}) {
  const intentContract = classifyPaymentIntentV2(input);
  if (intentContract) return intentContract;

  const text = normalizedString(input.text ?? input.prompt ?? input.userText ?? input.user_text) || '';
  const walletIntent = classifyWalletIntent({ ...input, text });
  if (walletIntent && hasStructuredWalletReloginSignal(input)) return walletIntent;

  // A new anonymous search supersedes any older product-selection context. It must route before
  // pending selection handling so "search for something else" cannot be mistaken for an answer to
  // a previous candidate list.
  const catalogSearchIntent = classifyCatalogSearchIntent(input, text);
  if (catalogSearchIntent && catalogSearchPreemptsTextualWallet(input, text)) {
    return catalogSearchIntent;
  }
  if (walletIntent) return walletIntent;
  if (catalogSearchIntent) return catalogSearchIntent;

  // A combined "search and buy another X" request names a fresh product and supersedes an older
  // candidate list. Purchase-wrapped ordinals contain no search signal and remain pending-bound.
  if (
    hasCatalogSearchSignal(input, text)
    && hasExplicitPurchaseIntent(input, text)
    && productUrlOf(input, text) === null
    && productItemIdOf(input) === null
  ) {
    const productName = productNameOf(input);
    const catalogQuery = firstNormalizedString(
      input.catalogQuery,
      input.catalog_query,
      input.searchQuery,
      input.search_query,
      input.productQuery,
      input.product_query,
      productName,
      input.query,
    ) ?? describedProductQuery(text);
    if (catalogQuery === null) {
      return {
        state: PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING,
        route: PaymentIntentRoute.INPUT_REQUIRED,
        action: PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT,
        terminal: false,
        reason: 'catalog_query_missing',
        missing: ['catalogQuery'],
      };
    }
    const purchaseDiscovery = classifyCatalogPurchaseDiscovery(input, catalogQuery, productName);
    if (purchaseDiscovery) return purchaseDiscovery;
  }

  const catalogSelectionReply = pendingCatalogSelectionReplyDecision(input, text);
  if (catalogSelectionReply?.purchaseIntentMissing) {
    return {
      state: PaymentIntentState.PAYMENT_TARGET_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_PAYMENT_TARGET,
      terminal: false,
      reason: 'purchase_intent_missing',
      missing: ['purchaseIntent'],
      ...catalogSelectionReply,
    };
  }
  if (catalogSelectionReply?.confirmation === 'SELECTED') {
    return {
      state: PaymentIntentState.CATALOG_PRODUCT_SELECTION_SELECTED,
      route: PaymentIntentRoute.CATALOG_PURCHASE,
      action: PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT,
      terminal: false,
      reason: 'catalog_product_selected',
      ...catalogSelectionReply,
    };
  }
  if (catalogSelectionReply?.confirmation === 'CANCELLED') {
    return {
      state: PaymentIntentState.CATALOG_PRODUCT_SELECTION_REJECTED,
      route: PaymentIntentRoute.CATALOG_PURCHASE,
      action: PaymentIntentAction.CANCEL_PENDING_CATALOG_PRODUCT_SELECTION,
      terminal: true,
      reason: 'catalog_product_selection_rejected',
      ...catalogSelectionReply,
    };
  }
  if (catalogSelectionReply?.restartDiscovery) {
    if (catalogSelectionReply.catalogQuery) {
      const anonymousSearchRestart = catalogSelectionReply.anonymousSearchRestart === true;
      return {
        state: anonymousSearchRestart
          ? PaymentIntentState.CATALOG_SEARCH_SELECTED
          : PaymentIntentState.CATALOG_PURCHASE_SELECTED,
        route: anonymousSearchRestart
          ? PaymentIntentRoute.CATALOG_SEARCH
          : PaymentIntentRoute.CATALOG_PURCHASE,
        action: anonymousSearchRestart
          ? PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW
          : PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW,
        terminal: false,
        reason: catalogSelectionReply.unresolved,
        ...catalogSelectionReply,
      };
    }
    return {
      state: PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT,
      terminal: false,
      reason: catalogSelectionReply.unresolved,
      ...catalogSelectionReply,
      // Missing frozen metadata cannot be repaired by selecting from the same candidate set.
      missing: ['catalogQuery'],
    };
  }
  if (catalogSelectionReply?.unresolved) {
    return {
      state: PaymentIntentState.CATALOG_PRODUCT_SELECTION_INPUT_MISSING,
      route: PaymentIntentRoute.INPUT_REQUIRED,
      action: PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION,
      terminal: false,
      reason: catalogSelectionReply.unresolved,
      missing: ['selectedProduct'],
      ...catalogSelectionReply,
    };
  }

  const pendingReply = pendingSkillActionReplyDecision(input, text);
  if (pendingReply?.ambiguous) {
    return skillInstallInputRequired('skill_confirmation_ambiguous', ['confirmation_target']);
  }
  if (pendingReply?.domain === 'SKILL_INSTALL' && pendingReply.confirmation === 'CONFIRMED') {
    return {
      state: PaymentIntentState.SKILL_INSTALL_CONFIRMATION_SELECTED,
      route: PaymentIntentRoute.SKILL_INSTALL,
      action: PaymentIntentAction.RESUME_SKILL_INSTALL_WORKFLOW,
      terminal: false,
      reason: 'skill_install_confirmation_accepted',
      ...pendingReply,
    };
  }
  if (pendingReply?.domain === 'SKILL_INSTALL' && pendingReply.confirmation === 'CANCELLED') {
    return {
      state: PaymentIntentState.SKILL_INSTALL_CONFIRMATION_REJECTED,
      route: PaymentIntentRoute.SKILL_INSTALL,
      action: PaymentIntentAction.CANCEL_PENDING_SKILL_INSTALL,
      terminal: true,
      reason: 'skill_install_confirmation_rejected',
      ...pendingReply,
    };
  }
  if (pendingReply?.domain === 'SKILL_TIP_BATCH' && pendingReply.confirmation === 'CONFIRMED') {
    return {
      state: PaymentIntentState.SKILL_TIP_BATCH_CONFIRMATION_SELECTED,
      route: PaymentIntentRoute.SKILL_TIP_BATCH,
      action: PaymentIntentAction.RESUME_SKILL_TIP_BATCH_WORKFLOW,
      terminal: false,
      reason: 'skill_tip_batch_confirmation_accepted',
      ...pendingReply,
    };
  }
  if (pendingReply?.domain === 'SKILL_TIP_BATCH' && pendingReply.confirmation === 'CANCELLED') {
    return {
      state: PaymentIntentState.SKILL_TIP_BATCH_CONFIRMATION_REJECTED,
      route: PaymentIntentRoute.SKILL_TIP_BATCH,
      action: PaymentIntentAction.CANCEL_PENDING_SKILL_TIP_BATCH,
      terminal: true,
      reason: 'skill_tip_batch_confirmation_rejected',
      ...pendingReply,
    };
  }
  if (pendingReply?.domain === 'SKILL_TIP' && pendingReply.confirmation === 'CONFIRMED') {
    return {
      state: PaymentIntentState.SKILL_TIP_CONFIRMATION_SELECTED,
      route: PaymentIntentRoute.SKILL_TIP,
      action: PaymentIntentAction.RESUME_SKILL_TIP_WORKFLOW,
      terminal: false,
      reason: 'skill_tip_confirmation_accepted',
      ...pendingReply,
    };
  }
  if (pendingReply?.domain === 'SKILL_TIP' && pendingReply.confirmation === 'CANCELLED') {
    return {
      state: PaymentIntentState.SKILL_TIP_CONFIRMATION_REJECTED,
      route: PaymentIntentRoute.SKILL_TIP,
      action: PaymentIntentAction.CANCEL_PENDING_SKILL_TIP,
      terminal: true,
      reason: 'skill_tip_confirmation_rejected',
      ...pendingReply,
    };
  }

  if (isSkillTipListIntent(input, text)) {
    const followUpTipRequested = /(?:然后|随后|接着|and\s+then|then)[^。！？?!\n]*(?:打赏|赞赏|\btip\b)/iu.test(text);
    return {
      state: PaymentIntentState.SKILL_TIP_LIST_SELECTED,
      route: PaymentIntentRoute.SKILL_TIP_LIST,
      action: PaymentIntentAction.RUN_SKILL_TIP_LIST_WORKFLOW,
      terminal: false,
      reason: 'skill_tip_list_intent',
      ...(followUpTipRequested ? { followUpTipRequested: true } : {}),
    };
  }

  if (isSkillInstallExecutionIntent(input, text)) {
    return classifySkillInstallInput(input, text);
  }

  if (isSkillTipBatchExecutionIntent(input, text)) {
    return classifySkillTipBatchInput(input, text);
  }

  if (isSkillTipExecutionIntent(input, text)) {
    return classifySkillTipInput(input, text);
  }

  // Ambient merchant/payment fields must never turn an explicit denial or a lookup in another
  // domain into a direct charge. Those fields may be carried by conversation state, so textual
  // non-payment intent is an authorization boundary rather than a weak routing hint.
  const nonCatalogLookup = CATALOG_SEARCH_TEXT_PATTERN.test(text)
    && hasNonCatalogSearchTarget(text);
  const directPaymentDecision = directPaymentIntentDecision(input, text);
  const deniedPurchase = structuredPurchaseIntentDecision(input) === 'DENIED'
    || directPaymentDecision === 'DENIED'
    || isDirectPaymentLanguageDenied(text)
    || (
      RAW_PURCHASE_ACTION_PATTERN.test(text)
      && purchaseIntentDecision(input, text) === 'DENIED'
    )
    || (merchantIdOf(input) !== null && isStandaloneCurrentActionDenial(text));
  if (nonCatalogLookup || deniedPurchase) {
    return {
      state: PaymentIntentState.PAYMENT_NOT_AUTHORIZED,
      route: PaymentIntentRoute.NO_ACTION,
      action: PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW,
      terminal: true,
      reason: nonCatalogLookup ? 'non_payment_lookup_intent' : 'purchase_not_authorized',
      purchaseIntent: false,
      requiresWallet: false,
    };
  }

  const merchantId = merchantIdOf(input);
  const productUrl = productUrlOf(input, text);
  const productName = productNameOf(input);
  const itemId = productItemIdOf(input);
  const explicitPurchaseIntent = hasExplicitPurchaseIntent(input, text);

  const hasProductSignal = hasProductTarget(input, text);

  // A described product with no link cannot enter UCP checkout: that flow starts at `parse-item`,
  // which needs a product detail URL. Discovery has to resolve one first.
  if (
    explicitPurchaseIntent
    && productUrl === null
    && itemId === null
    && merchantId === null
  ) {
    const catalogQuery = productName ?? describedProductQuery(text);
    const purchaseDiscovery = classifyCatalogPurchaseDiscovery(input, catalogQuery, productName);
    if (purchaseDiscovery) return purchaseDiscovery;
  }

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

  if (merchantId && directPaymentDecision === 'AUTHORIZED') {
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

  if (merchantId) {
    return {
      state: PaymentIntentState.PAYMENT_NOT_AUTHORIZED,
      route: PaymentIntentRoute.NO_ACTION,
      action: PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW,
      terminal: true,
      reason: 'payment_authorization_missing',
      purchaseIntent: false,
      requiresWallet: false,
      merchantId,
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
