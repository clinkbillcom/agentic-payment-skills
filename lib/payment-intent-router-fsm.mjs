import { formatWorkflowMarker } from './workflow-marker.mjs';

export const PaymentIntentState = Object.freeze({
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
  PAYMENT_TARGET_INPUT_MISSING: 'PAYMENT_TARGET_INPUT_MISSING',
});

export const PaymentIntentRoute = Object.freeze({
  SKILL_TIP_LIST: 'SKILL_TIP_LIST',
  SKILL_TIP_BATCH: 'SKILL_TIP_BATCH',
  SKILL_TIP: 'SKILL_TIP',
  SKILL_INSTALL: 'SKILL_INSTALL',
  DIRECT_PAY: 'DIRECT_PAY',
  UCP_CHECKOUT: 'UCP_CHECKOUT',
  INPUT_REQUIRED: 'INPUT_REQUIRED',
});

export const PaymentIntentAction = Object.freeze({
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
  ASK_FOR_PAYMENT_TARGET: 'ASK_FOR_PAYMENT_TARGET',
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

const SKILL_PACKAGE_SPEC_PATTERN = /^([A-Za-z0-9._-]{1,128})\/([A-Za-z0-9._-]{1,128})(?:@([A-Za-z0-9._+-]{1,128}))?$/u;

function hasSkillInstallCommandPrefix(text = '') {
  const source = String(text).trim();
  return /^(?:(?:请|麻烦|帮我|给我|我要|现在|立即)\s*)*(?:(?:使用|用)\s*clink-cli\s*)?(?:安装(?:一下)?|装一下)/iu.test(source)
    || /^(?:please\s+)?install\b/iu.test(source);
}

function skillInstallCommandRemainder(text = '') {
  const source = String(text).trim();
  const chinese = source.match(
    /^(?:(?:请|麻烦|帮我|给我|我要|现在|立即)\s*)*(?:(?:使用|用)\s*clink-cli\s*)?(?:安装(?:一下)?|装一下)\s*(.*)$/iu,
  );
  if (chinese) return chinese[1].trim();
  const english = source.match(/^(?:please\s+)?install\s+(.*)$/iu);
  return english?.[1]?.trim() ?? null;
}

function isCanonicalSkillInstallCommand(text = '') {
  const remainder = skillInstallCommandRemainder(text);
  if (!remainder) return false;
  const packageMatch = remainder.match(
    /^([^\s,，。！？?!]+)(?:\s*(?:这个|该)?(?:skills?|技能))?\s*(?:吧|了)?[。!！]?$/iu,
  );
  if (packageMatch && SKILL_PACKAGE_SPEC_PATTERN.test(packageMatch[1])) return true;
  return /^(?:第\s*[1-9]\d*\s*(?:个|号)|(?:序号|编号|number)\s*[:：#＃]?\s*[1-9]\d*|[#＃]\s*[1-9]\d*|[1-9]\d*\s*号)(?:\s*的)?(?:\s*(?:skills?|技能))?\s*(?:吧|了)?[。!！]?$/iu.test(remainder);
}

function textSkillInstallIdentityTargets(text = '') {
  const source = String(text);
  const tokenCandidates = source
    .split(/[\s,，。！？?!]+/u)
    .filter((token) => token.includes('/'));
  const commandRemainder = skillInstallCommandRemainder(source);
  if (commandRemainder) {
    const commandToken = commandRemainder.split(/[\s,，。！？?!]+/u)[0];
    if (commandToken?.includes('/')) tokenCandidates.push(commandToken);
  }
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

function validSkillInstallSegment(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && /^[A-Za-z0-9._-]{1,128}$/u.test(value);
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
    if (!validSkillInstallSegment(target.publisher) || !validSkillInstallSegment(target.skillName)) {
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

  const merchantId = merchantIdOf(input);
  const productUrl = productUrlOf(input, text);
  const productName = productNameOf(input);
  const itemId = productItemIdOf(input);
  const explicitPurchaseIntent = hasExplicitPurchaseIntent(input, text);

  const hasProductSignal = hasProductTarget(input, text);

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
