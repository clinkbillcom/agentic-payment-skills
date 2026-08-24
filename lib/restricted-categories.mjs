import { formatWorkflowMarker } from './workflow-marker.mjs';

export const RestrictedCategory = Object.freeze({
  ADULT_CONTENT: 'ADULT_CONTENT',
  DATING_COMPANIONSHIP: 'DATING_COMPANIONSHIP',
  GAMBLING: 'GAMBLING',
  PRESCRIPTION_DRUGS: 'PRESCRIPTION_DRUGS',
  CRYPTOCURRENCY: 'CRYPTOCURRENCY',
  CYBERLOCKER_FILE_SHARING: 'CYBERLOCKER_FILE_SHARING',
  SKILL_BASED_PRIZE_GAMES: 'SKILL_BASED_PRIZE_GAMES',
  FINANCIAL_PRODUCTS_TRADING: 'FINANCIAL_PRODUCTS_TRADING',
  TELEMARKETING: 'TELEMARKETING',
  TOBACCO: 'TOBACCO',
  OTHER_REGULATED_GOODS: 'OTHER_REGULATED_GOODS',
});

export const RESTRICTED_CATEGORIES = Object.freeze([
  Object.freeze({
    category: RestrictedCategory.ADULT_CONTENT,
    label: 'Adult content and services',
    labelZh: '成人内容与服务',
    merchantCategoryCodes: Object.freeze([]),
    keywords: Object.freeze([
      'porn', 'pornography', 'pornhub', 'onlyfans',
      'adult content', 'adult video', 'adult website', 'adult site',
      'adult live', 'adult livestream', 'adult subscription', 'adult entertainment',
      '成人内容', '成人网站', '成人视频', '成人直播', '成人服务',
      '色情', '情色', '裸聊',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.DATING_COMPANIONSHIP,
    label: 'Dating and companionship services',
    labelZh: '交友及陪伴服务',
    merchantCategoryCodes: Object.freeze(['7273']),
    keywords: Object.freeze([
      'dating site', 'dating website', 'dating app', 'dating service',
      'dating subscription', 'escort', 'sugar dating',
      '交友网站', '交友软件', '交友服务', '相亲', '陪侍', '伴游', '援交', '陪伴服务',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.GAMBLING,
    label: 'Gambling and betting',
    labelZh: '赌博/博彩',
    merchantCategoryCodes: Object.freeze(['7995']),
    keywords: Object.freeze([
      'gambling', 'casino', 'betting', 'sportsbook', 'wager', 'lottery',
      'poker chips', 'slot machine', 'roulette', 'baccarat', 'blackjack',
      '赌博', '博彩', '赌场', '投注', '下注', '押注', '彩票', '六合彩', '筹码', '赌资',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.PRESCRIPTION_DRUGS,
    label: 'Prescription drugs',
    labelZh: '处方药',
    merchantCategoryCodes: Object.freeze([]),
    keywords: Object.freeze([
      'prescription drug', 'prescription drugs', 'prescription medication',
      'prescription medicine', 'prescription-only', 'prescription only',
      'rx only', 'rx-only',
      'viagra', 'cialis', 'sildenafil', 'ozempic', 'xanax', 'adderall', 'tramadol',
      '处方药', '凭处方', '需处方', '伟哥',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.CRYPTOCURRENCY,
    label: 'Cryptocurrency',
    labelZh: '加密货币',
    merchantCategoryCodes: Object.freeze(['6051']),
    keywords: Object.freeze([
      'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'stablecoin',
      'usdt', 'usdc', 'btc', 'eth', 'ico', 'initial coin offering',
      'token sale', 'defi', 'binance', 'coinbase',
      '加密货币', '虚拟货币', '数字货币', '比特币', '以太坊', '泰达币',
      '充币', '提币', '炒币', '币圈', '代币发行', '加密钱包',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.CYBERLOCKER_FILE_SHARING,
    label: 'Cyberlockers and public file sharing',
    labelZh: 'Cyberlocker / 公共文件分享',
    merchantCategoryCodes: Object.freeze([]),
    keywords: Object.freeze([
      'cyberlocker', 'cyberlockers', 'file locker', 'filelocker', 'rapidgator',
      'pay per download', 'pay-per-download', 'upload rewards',
      '公共文件分享', '按下载量奖励', '上传奖励', '文件分享奖励',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.SKILL_BASED_PRIZE_GAMES,
    label: 'Skill-based prize games',
    labelZh: '技巧型有奖游戏',
    merchantCategoryCodes: Object.freeze([]),
    keywords: Object.freeze([
      'daily fantasy', 'fantasy sports', 'draftkings', 'fanduel',
      'skill gaming', 'skill-based prize', 'prize contest',
      'cash tournament entry', 'paid tournament entry',
      '技巧型有奖', '有奖竞技', '付费竞赛', '梦幻体育', '奖金赛',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.FINANCIAL_PRODUCTS_TRADING,
    label: 'Financial products and trading',
    labelZh: '金融产品/金融交易',
    merchantCategoryCodes: Object.freeze(['6211']),
    keywords: Object.freeze([
      'stock trading', 'buy stocks', 'sell stocks', 'share trading',
      'securities trading', 'securities brokerage', 'brokerage account',
      'brokerage service', 'forex trading', 'foreign exchange trading',
      'options trading', 'futures trading', 'margin trading', 'cfd trading',
      '股票交易', '购买股票', '买入股票', '证券交易', '证券开户', '股票开户',
      '期货交易', '外汇交易', '融资融券', '经纪服务', '金融衍生品',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.TELEMARKETING,
    label: 'Telemarketing',
    labelZh: '电话营销',
    merchantCategoryCodes: Object.freeze(['5966', '5967']),
    keywords: Object.freeze([
      'telemarketing', 'robocall', 'cold calling', 'outbound calling',
      '电话营销', '电话推销', '电销', '外呼营销',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.TOBACCO,
    label: 'Tobacco products',
    labelZh: '烟草产品',
    merchantCategoryCodes: Object.freeze(['5993']),
    keywords: Object.freeze([
      'tobacco', 'cigarette', 'cigarettes', 'cigar', 'cigars',
      'e-cigarette', 'e-cig', 'vape', 'vaping', 'shisha', 'snus',
      '烟草', '香烟', '卷烟', '电子烟', '雪茄', '烟丝', '水烟',
    ]),
  }),
  Object.freeze({
    category: RestrictedCategory.OTHER_REGULATED_GOODS,
    label: 'Other regulated goods',
    labelZh: '其他受监管商品',
    merchantCategoryCodes: Object.freeze([]),
    keywords: Object.freeze([
      'firearm', 'firearms', 'ammunition', 'handgun', 'handguns', 'explosives',
      '军火', '枪支', '弹药', '爆炸物', '管制刀具',
    ]),
  }),
]);

export const InstructionRestrictionState = Object.freeze({
  INSTRUCTION_CREATION_BLOCKED: 'INSTRUCTION_CREATION_BLOCKED',
  INSTRUCTION_CREATION_ALLOWED: 'INSTRUCTION_CREATION_ALLOWED',
  INSTRUCTION_RESTRICTION_INPUT_INVALID: 'INSTRUCTION_RESTRICTION_INPUT_INVALID',
});

export const InstructionRestrictionAction = Object.freeze({
  REFUSE_RESTRICTED_INSTRUCTION: 'REFUSE_RESTRICTED_INSTRUCTION',
  CONTINUE_INSTRUCTION_CREATION: 'CONTINUE_INSTRUCTION_CREATION',
  FIX_RESTRICTION_INPUT: 'FIX_RESTRICTION_INPUT',
});

const LATIN_KEYWORD_PATTERN = /^[\p{Script=Latin}0-9][\p{Script=Latin}0-9 .&'-]*$/u;

// Latin keywords need boundary guards so short tokens like "eth" or "ico" cannot
// fire inside "ethernet" or "icon". Guard only Latin letters and digits: treating
// an adjacent CJK character as part of the same token would miss normal mixed-language
// requests such as "购买USDT".
function keywordMatcher(keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  if (LATIN_KEYWORD_PATTERN.test(keyword)) {
    return new RegExp(
      `(?<![\\p{Script=Latin}\\p{N}])${escaped}(?![\\p{Script=Latin}\\p{N}])`,
      'iu',
    );
  }
  return new RegExp(escaped, 'iu');
}

const KEYWORD_INDEX = RESTRICTED_CATEGORIES.map((entry) => ({
  entry,
  // Prefer the most specific phrase so diagnostics report `e-cigarette` rather than
  // the shorter nested keyword `cigarette` for the same purchase text.
  matchers: [...entry.keywords]
    .sort((left, right) => right.length - left.length)
    .map((keyword) => ({ keyword, pattern: keywordMatcher(keyword) })),
}));

const MCC_INDEX = new Map();
for (const entry of RESTRICTED_CATEGORIES) {
  for (const code of entry.merchantCategoryCodes) MCC_INDEX.set(code, entry);
}

const CATEGORY_INDEX = new Map(RESTRICTED_CATEGORIES.map((entry) => [entry.category, entry]));

function invalidInput(reason, detail = {}) {
  return {
    state: InstructionRestrictionState.INSTRUCTION_RESTRICTION_INPUT_INVALID,
    action: InstructionRestrictionAction.FIX_RESTRICTION_INPUT,
    terminal: false,
    reason,
    ...detail,
  };
}

function instructionContextsFrom(input = {}) {
  const sources = [
    ['instructionContext', input.instructionContext],
    ['instruction_context', input.instruction_context],
  ].filter(([, value]) => value !== undefined && value !== null);
  const contexts = [];

  for (const [field, raw] of sources) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { error: invalidInput('invalid_instruction_context_json', { invalidField: field }) };
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: invalidInput('invalid_instruction_context', { invalidField: field }) };
    }
    contexts.push({ field, value: parsed });
  }

  return { contexts };
}

function mandatesFrom(input = {}, instructionContexts = []) {
  const sources = [
    ['mandates', input.mandates],
    ['mandateList', input.mandateList],
    ['mandate_list', input.mandate_list],
    ['mandateVoList', input.mandateVoList],
    ['mandate_vo_list', input.mandate_vo_list],
  ].filter(([, value]) => value !== undefined && value !== null);
  for (const { field, value } of instructionContexts) {
    if (value.mandates !== undefined && value.mandates !== null) {
      sources.push([`${field}.mandates`, value.mandates]);
    }
  }
  const mandates = [];

  for (const [field, raw] of sources) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { error: invalidInput('invalid_mandates_json', { invalidField: field }) };
      }
    }
    if (!Array.isArray(parsed)
      || !Array.from(parsed)
        .every((mandate) => mandate && typeof mandate === 'object' && !Array.isArray(mandate))) {
      return { error: invalidInput('invalid_mandates', { invalidField: field }) };
    }
    mandates.push(...parsed);
  }

  return { mandates };
}

function merchantCategoryCodesFrom(input = {}, mandates = []) {
  const codes = [];
  let invalidField = null;
  const push = (value, field) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value !== 'string') {
      invalidField = invalidField ?? field;
      return;
    }
    const code = value.trim();
    if (!code) return;
    if (!/^\d{4}$/u.test(code)) {
      invalidField = invalidField ?? field;
      return;
    }
    codes.push(code);
  };
  push(input.merchantCategoryCode, 'merchantCategoryCode');
  push(input.merchant_category_code, 'merchant_category_code');
  for (const [index, mandate] of mandates.entries()) {
    push(mandate.merchantCategoryCode, `mandates[${index}].merchantCategoryCode`);
    push(mandate.merchant_category_code, `mandates[${index}].merchant_category_code`);
  }
  return invalidField
    ? { error: invalidInput('invalid_merchant_category_code', { invalidField }) }
    : { codes };
}

function screenedTextFrom(input = {}, mandates = [], instructionContexts = []) {
  const texts = [];
  let invalidField = null;
  const push = (value, field) => {
    if (value === undefined || value === null || value === '') return;
    if (typeof value !== 'string') {
      invalidField = invalidField ?? field;
      return;
    }
    const text = value.normalize('NFKC');
    // Compatibility normalization catches full-width/mathematical lookalikes. Test both
    // interpretations of default-ignorable characters so inserting one cannot split a
    // single-token keyword (`US\u200bDT`) or replace a phrase separator (`stock\u200dtrading`).
    const variants = [
      text.replace(/\p{Default_Ignorable_Code_Point}+/gu, ''),
      text.replace(/\p{Default_Ignorable_Code_Point}+/gu, ' '),
    ];
    for (const variant of new Set(variants)) {
      const normalized = variant.trim().replace(/\s+/gu, ' ');
      if (normalized) texts.push(normalized);
    }
  };

  push(input.title, 'title');
  push(input.description, 'description');
  push(input.productTitle, 'productTitle');
  push(input.product_title, 'product_title');
  push(input.productName, 'productName');
  push(input.product_name, 'product_name');
  push(input.itemName, 'itemName');
  push(input.item_name, 'item_name');
  push(input.productDescription, 'productDescription');
  push(input.product_description, 'product_description');
  push(input.productUrl, 'productUrl');
  push(input.product_url, 'product_url');
  push(input.itemUrl, 'itemUrl');
  push(input.item_url, 'item_url');
  push(input.merchantName, 'merchantName');
  push(input.merchant_name, 'merchant_name');
  push(input.merchantDomain, 'merchantDomain');
  push(input.merchant_domain, 'merchant_domain');
  push(input.merchantOrigin, 'merchantOrigin');
  push(input.merchant_origin, 'merchant_origin');
  push(input.merchantUrl, 'merchantUrl');
  push(input.merchant_url, 'merchant_url');
  push(input.merchantDescription, 'merchantDescription');
  push(input.merchant_description, 'merchant_description');
  push(input.intentText, 'intentText');
  push(input.intent_text, 'intent_text');
  push(input.userIntent, 'userIntent');
  push(input.user_intent, 'user_intent');
  push(input.requestText, 'requestText');
  push(input.request_text, 'request_text');
  push(input.text, 'text');
  push(input.prompt, 'prompt');
  push(input.userText, 'userText');
  push(input.user_text, 'user_text');
  push(input.catalogQuery, 'catalogQuery');
  push(input.catalog_query, 'catalog_query');
  for (const { field, value } of instructionContexts) {
    push(value.title, `${field}.title`);
    push(value.description, `${field}.description`);
  }

  if (input.texts !== undefined && input.texts !== null) {
    if (!Array.isArray(input.texts)) {
      invalidField = invalidField ?? 'texts';
    } else {
      for (const [index, text] of input.texts.entries()) {
        if (typeof text !== 'string') {
          invalidField = invalidField ?? `texts[${index}]`;
        } else {
          push(text, `texts[${index}]`);
        }
      }
    }
  }

  const pushProduct = (product, field) => {
    if (typeof product !== 'object' || product === null || Array.isArray(product)) {
      invalidField = invalidField ?? field;
      return;
    }
    push(product.title, `${field}.title`);
    push(product.productTitle, `${field}.productTitle`);
    push(product.product_title, `${field}.product_title`);
    push(product.productName, `${field}.productName`);
    push(product.product_name, `${field}.product_name`);
    push(product.description, `${field}.description`);
    push(product.productDescription, `${field}.productDescription`);
    push(product.product_description, `${field}.product_description`);
    push(product.productUrl, `${field}.productUrl`);
    push(product.product_url, `${field}.product_url`);
    push(product.itemUrl, `${field}.itemUrl`);
    push(product.item_url, `${field}.item_url`);
  };

  const singularProducts = [
    ['item', input.item],
    ['selectedItem', input.selectedItem],
    ['selected_item', input.selected_item],
    ['product', input.product],
    ['selectedProduct', input.selectedProduct],
    ['selected_product', input.selected_product],
  ];
  for (const [field, product] of singularProducts) {
    if (product === undefined || product === null) continue;
    pushProduct(product, field);
  }

  const productCollections = [
    ['products', input.products],
    ['productList', input.productList],
    ['product_list', input.product_list],
  ];
  for (const [field, raw] of productCollections) {
    if (raw === undefined || raw === null) continue;
    let products = raw;
    if (typeof raw === 'string') {
      try {
        products = JSON.parse(raw);
      } catch {
        invalidField = invalidField ?? field;
        continue;
      }
    }
    if (!Array.isArray(products)) {
      invalidField = invalidField ?? field;
      continue;
    }
    for (const [index, product] of products.entries()) {
      pushProduct(product, `${field}[${index}]`);
    }
  }

  const lineItemCollections = [
    ['lineItems', input.lineItems],
    ['line_items', input.line_items],
  ];
  for (const [field, raw] of lineItemCollections) {
    if (raw === undefined || raw === null) continue;
    let lineItems = raw;
    if (typeof raw === 'string') {
      try {
        lineItems = JSON.parse(raw);
      } catch {
        invalidField = invalidField ?? field;
        continue;
      }
    }
    if (!Array.isArray(lineItems)) {
      invalidField = invalidField ?? field;
      continue;
    }
    for (const [index, lineItem] of lineItems.entries()) {
      const itemField = `${field}[${index}]`;
      if (typeof lineItem !== 'object' || lineItem === null || Array.isArray(lineItem)) {
        invalidField = invalidField ?? itemField;
        continue;
      }
      if (lineItem.item === undefined || lineItem.item === null) {
        invalidField = invalidField ?? `${itemField}.item`;
        continue;
      }
      pushProduct(lineItem.item, `${itemField}.item`);
    }
  }

  for (const [index, mandate] of mandates.entries()) {
    push(mandate.title, `mandates[${index}].title`);
    push(mandate.description, `mandates[${index}].description`);
  }

  return invalidField
    ? { error: invalidInput('invalid_restriction_text', { invalidField }) }
    : { text: texts.join('\n'), count: texts.length };
}

function assertedBenignCategoriesFrom(input = {}) {
  const sources = [input.assertedBenignCategories, input.asserted_benign_categories]
    .filter((value) => value !== undefined && value !== null);
  // Spreading turns sparse-array holes into `undefined`, which the validation below
  // rejects instead of silently treating a malformed exclusion list as trustworthy.
  const values = sources.flatMap((value) => (Array.isArray(value) ? [...value] : [value]));
  const categories = new Set();
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) {
      return {
        error: invalidInput('invalid_asserted_benign_categories', {
          invalidField: 'assertedBenignCategories',
        }),
      };
    }
    const category = value.trim().toUpperCase();
    if (!CATEGORY_INDEX.has(category)) {
      return {
        error: invalidInput('unknown_asserted_benign_category', {
          invalidField: 'assertedBenignCategories',
          invalidValue: value,
        }),
      };
    }
    categories.add(category);
  }
  return { categories };
}

function blocked(entry, matchedBy, matchedValue, warnings) {
  return {
    state: InstructionRestrictionState.INSTRUCTION_CREATION_BLOCKED,
    action: InstructionRestrictionAction.REFUSE_RESTRICTED_INSTRUCTION,
    terminal: true,
    reason: `restricted_category_${entry.category.toLowerCase()}`,
    category: entry.category,
    categoryLabel: entry.label,
    categoryLabelZh: entry.labelZh,
    matchedBy,
    matchedValue,
    ...(warnings.length ? { warnings } : {}),
  };
}

export function classifyInstructionRestriction(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return invalidInput('invalid_restriction_context');
  }

  const assertedValues = [
    input.assertedCategory,
    input.asserted_category,
    input.restrictedCategory,
    input.restricted_category,
  ].filter((value) => value !== undefined && value !== null);
  if (assertedValues.length > 0) {
    const categories = new Set();
    for (const assertedRaw of assertedValues) {
      if (typeof assertedRaw !== 'string' || !assertedRaw.trim()) {
        return invalidInput('invalid_asserted_category', { invalidField: 'assertedCategory' });
      }
      const asserted = assertedRaw.trim().toUpperCase();
      if (!CATEGORY_INDEX.has(asserted)) {
        return invalidInput('unknown_asserted_category', {
          invalidField: 'assertedCategory',
          invalidValue: assertedRaw,
        });
      }
      categories.add(asserted);
    }
    if (categories.size > 1) {
      return invalidInput('conflicting_asserted_categories', {
        invalidField: 'assertedCategory',
        invalidValue: [...categories],
      });
    }
    const [asserted] = categories;
    const entry = CATEGORY_INDEX.get(asserted);
    return blocked(entry, 'asserted_category', entry.category, []);
  }

  const instructionContextsResult = instructionContextsFrom(input);
  if (instructionContextsResult.error) return instructionContextsResult.error;

  const mandatesResult = mandatesFrom(input, instructionContextsResult.contexts);
  if (mandatesResult.error) return mandatesResult.error;

  const benignResult = assertedBenignCategoriesFrom(input);
  if (benignResult.error) return benignResult.error;

  const mccResult = merchantCategoryCodesFrom(input, mandatesResult.mandates);
  if (mccResult.error) return mccResult.error;
  for (const code of mccResult.codes) {
    const entry = MCC_INDEX.get(code);
    if (entry) return blocked(entry, 'merchant_category_code', code, []);
  }

  const textResult = screenedTextFrom(
    input,
    mandatesResult.mandates,
    instructionContextsResult.contexts,
  );
  if (textResult.error) return textResult.error;
  if (textResult.count === 0) {
    return invalidInput('restriction_context_missing');
  }

  if (textResult.text) {
    for (const { entry, matchers } of KEYWORD_INDEX) {
      if (benignResult.categories.has(entry.category)) continue;
      for (const { keyword, pattern } of matchers) {
        if (pattern.test(textResult.text)) return blocked(entry, 'keyword', keyword, []);
      }
    }
  }

  return {
    state: InstructionRestrictionState.INSTRUCTION_CREATION_ALLOWED,
    action: InstructionRestrictionAction.CONTINUE_INSTRUCTION_CREATION,
    terminal: false,
    reason: 'no_restricted_category_match',
    ...(benignResult.categories.size
      ? { assertedBenignCategories: [...benignResult.categories] }
      : {}),
  };
}

export function formatInstructionRestrictionFsmMarker(workflow, marker = 'INSTRUCTION_RESTRICTION_FSM') {
  return formatWorkflowMarker(marker, workflow);
}
