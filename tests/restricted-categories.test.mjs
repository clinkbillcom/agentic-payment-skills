import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  InstructionRestrictionAction,
  InstructionRestrictionState,
  RESTRICTED_CATEGORIES,
  RestrictedCategory,
  classifyInstructionRestriction,
  formatInstructionRestrictionFsmMarker,
} from '../lib/restricted-categories.mjs';
import { classifyPaymentIntent } from '../lib/payment-intent-router-fsm.mjs';

const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');
const restrictedDoc = await readFile(
  new URL('../references/clink-restricted-categories.md', import.meta.url),
  'utf8',
);
const instruction = await readFile(new URL('../references/clink-instruction.md', import.meta.url), 'utf8');
const paymentRefund = await readFile(new URL('../references/clink-payment-refund.md', import.meta.url), 'utf8');
const ucpCheckout = await readFile(new URL('../references/clink-ucp-checkout.md', import.meta.url), 'utf8');

function assertBlocked(result, category) {
  assert.equal(result.state, InstructionRestrictionState.INSTRUCTION_CREATION_BLOCKED);
  assert.equal(result.action, InstructionRestrictionAction.REFUSE_RESTRICTED_INSTRUCTION);
  assert.equal(result.terminal, true);
  assert.equal(result.category, category);
  assert.equal(result.reason, `restricted_category_${category.toLowerCase()}`);
}

function assertAllowed(result) {
  assert.equal(result.state, InstructionRestrictionState.INSTRUCTION_CREATION_ALLOWED);
  assert.equal(result.action, InstructionRestrictionAction.CONTINUE_INSTRUCTION_CREATION);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, 'no_restricted_category_match');
}

function assertInvalid(result, reason) {
  assert.equal(result.state, InstructionRestrictionState.INSTRUCTION_RESTRICTION_INPUT_INVALID);
  assert.equal(result.action, InstructionRestrictionAction.FIX_RESTRICTION_INPUT);
  assert.equal(result.terminal, false);
  if (reason) assert.equal(result.reason, reason);
}

test('the category list is the frozen single source of truth', () => {
  assert.equal(RESTRICTED_CATEGORIES.length, 11);
  assert.equal(Object.keys(RestrictedCategory).length, 11);
  assert.ok(Object.isFrozen(RESTRICTED_CATEGORIES));

  const declared = new Set(Object.values(RestrictedCategory));
  for (const entry of RESTRICTED_CATEGORIES) {
    assert.ok(Object.isFrozen(entry), `${entry.category} entry must be frozen`);
    assert.ok(declared.has(entry.category), `${entry.category} is missing from RestrictedCategory`);
    assert.ok(entry.label, `${entry.category} needs an English label`);
    assert.ok(entry.labelZh, `${entry.category} needs a Chinese label`);
    assert.ok(entry.keywords.length > 0, `${entry.category} needs at least one keyword`);
  }

  // OTHER_REGULATED_GOODS is the catch-all, so it must stay last or it would swallow the
  // overlapping examples (prescription drugs, tobacco, crypto) the dedicated categories own.
  assert.equal(
    RESTRICTED_CATEGORIES.at(-1).category,
    RestrictedCategory.OTHER_REGULATED_GOODS,
  );
});

test('each restricted category refuses a representative purchase', () => {
  const samples = [
    [RestrictedCategory.ADULT_CONTENT, '订阅一个成人网站会员'],
    [RestrictedCategory.DATING_COMPANIONSHIP, 'Monthly dating site subscription'],
    [RestrictedCategory.GAMBLING, 'Buy casino chips'],
    [RestrictedCategory.PRESCRIPTION_DRUGS, '购买处方药'],
    [RestrictedCategory.CRYPTOCURRENCY, 'Buy bitcoin with card'],
    [RestrictedCategory.CYBERLOCKER_FILE_SHARING, 'Cyberlocker premium plan'],
    [RestrictedCategory.SKILL_BASED_PRIZE_GAMES, 'Daily fantasy contest entry'],
    [RestrictedCategory.FINANCIAL_PRODUCTS_TRADING, '股票交易开户服务'],
    [RestrictedCategory.TELEMARKETING, 'Telemarketing lead calling package'],
    [RestrictedCategory.TOBACCO, '一条香烟'],
    [RestrictedCategory.OTHER_REGULATED_GOODS, 'Firearm purchase'],
  ];

  // Every declared category must be exercised, so a new category cannot ship untested.
  assert.deepEqual(
    samples.map(([category]) => category).sort(),
    Object.values(RestrictedCategory).slice().sort(),
  );

  for (const [category, title] of samples) {
    const result = classifyInstructionRestriction({ title });
    assertBlocked(result, category);
    assert.equal(result.matchedBy, 'keyword', title);
    assert.ok(result.matchedValue, title);
  }
});

test('every declared keyword maps back to the category that owns it', () => {
  for (const entry of RESTRICTED_CATEGORIES) {
    for (const keyword of entry.keywords) {
      const result = classifyInstructionRestriction({ title: `Purchase ${keyword}` });
      assertBlocked(result, entry.category);
      assert.equal(result.matchedBy, 'keyword');
      assert.equal(result.matchedValue, keyword);
    }
  }
});

test('Latin keywords still match when adjacent to CJK text', () => {
  const samples = [
    [RestrictedCategory.CRYPTOCURRENCY, '购买USDT'],
    [RestrictedCategory.CRYPTOCURRENCY, '帮我购买bitcoin'],
    [RestrictedCategory.ADULT_CONTENT, '订阅onlyfans会员'],
    [RestrictedCategory.CRYPTOCURRENCY, '充值Binance账户'],
  ];

  for (const [category, title] of samples) {
    assertBlocked(classifyInstructionRestriction({ title }), category);
  }
});

test('multi-word keywords cannot be bypassed with alternate whitespace', () => {
  const samples = [
    [RestrictedCategory.ADULT_CONTENT, 'Adult\tcontent subscription'],
    [RestrictedCategory.SKILL_BASED_PRIZE_GAMES, 'Daily   fantasy contest entry'],
    [RestrictedCategory.CYBERLOCKER_FILE_SHARING, 'Pay per\ndownload membership'],
  ];

  for (const [category, title] of samples) {
    assertBlocked(classifyInstructionRestriction({ title }), category);
  }
});

test('Unicode lookalikes and default-ignorable characters cannot obscure keywords', () => {
  const samples = [
    [RestrictedCategory.CRYPTOCURRENCY, '购买ＵＳＤＴ'],
    [RestrictedCategory.CRYPTOCURRENCY, '购买𝐔𝐒𝐃𝐓'],
    [RestrictedCategory.CRYPTOCURRENCY, 'US\u200bDT top-up'],
    [RestrictedCategory.CRYPTOCURRENCY, 'US\u2060DT top-up'],
    [RestrictedCategory.CRYPTOCURRENCY, 'US\u00adDT top-up'],
    [RestrictedCategory.FINANCIAL_PRODUCTS_TRADING, 'stock\u200dtrading account'],
  ];

  for (const [category, title] of samples) {
    assertBlocked(classifyInstructionRestriction({ title }), category);
  }
});

test('restricted wording is caught anywhere in the purchase context', () => {
  assertBlocked(
    classifyInstructionRestriction({ title: 'Membership', description: '包含裸聊服务' }),
    RestrictedCategory.ADULT_CONTENT,
  );
  assertBlocked(
    classifyInstructionRestriction({ title: 'Top-up', merchantName: 'Binance' }),
    RestrictedCategory.CRYPTOCURRENCY,
  );
  assertBlocked(
    classifyInstructionRestriction({ product_title: '电子烟烟弹' }),
    RestrictedCategory.TOBACCO,
  );
  assertBlocked(
    classifyInstructionRestriction({ userIntent: '帮我买点彩票' }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({ texts: ['weekly plan', 'sportsbook credits'] }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({ item: { title: 'Casino chips' } }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({ selected_product: { description: 'Vape starter kit' } }),
    RestrictedCategory.TOBACCO,
  );
  assertBlocked(
    classifyInstructionRestriction({
      title: 'Weekly plan',
      selectedProduct: { productName: 'Casino chips' },
    }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({
      title: 'Weekly plan',
      products: [{ productName: 'Casino chips' }],
    }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({
      title: 'Weekly plan',
      products: '[{"productName":"Casino chips"}]',
    }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({
      title: 'Weekly plan',
      lineItems: [{ item: { id: 'sku_1', title: 'Casino chips', price: '10.00' } }],
    }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({
      title: 'Weekly plan',
      line_items: '[{"item":{"id":"sku_1","title":"Casino chips","price":"10.00"}}]',
    }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({ merchant_origin: 'https://binance.com' }),
    RestrictedCategory.CRYPTOCURRENCY,
  );
  assertBlocked(
    classifyInstructionRestriction({ merchantUrl: 'https://casino.example/products/chips' }),
    RestrictedCategory.GAMBLING,
  );
  assertBlocked(
    classifyInstructionRestriction({ merchant_url: 'https://binance.com/buy' }),
    RestrictedCategory.CRYPTOCURRENCY,
  );
  assertBlocked(
    classifyInstructionRestriction({ request_text: 'Please buy bitcoin' }),
    RestrictedCategory.CRYPTOCURRENCY,
  );
  assertBlocked(
    classifyInstructionRestriction({
      productTitle: '',
      product_title: 'Buy bitcoin',
    }),
    RestrictedCategory.CRYPTOCURRENCY,
  );

  for (const field of [
    'text',
    'prompt',
    'userText',
    'user_text',
    'catalogQuery',
    'catalog_query',
    'itemName',
    'item_name',
  ]) {
    assertBlocked(
      classifyInstructionRestriction({ title: 'Gift card', [field]: 'Buy casino chips' }),
      RestrictedCategory.GAMBLING,
    );
  }
});

test('the payment router selected-product shape is screened without remapping', () => {
  const routed = classifyPaymentIntent({
    text: '第一个',
    pendingCatalogProductSelection: {
      status: 'AWAITING_SELECTION',
      candidates: [{
        productId: 'product_1',
        productName: 'Casino chips',
        productUrl: 'https://shop.example/products/chips',
        merchantId: 'merchant_1',
      }],
    },
  });

  assert.equal(routed.selectedProduct.productName, 'Casino chips');
  assertBlocked(
    classifyInstructionRestriction({ selectedProduct: routed.selectedProduct }),
    RestrictedCategory.GAMBLING,
  );
});

test('mandate fields are screened whether they arrive as an array or the raw JSON string', () => {
  const fromArray = classifyInstructionRestriction({
    title: 'Weekly plan',
    mandates: [{ title: 'Chips', description: 'Casino chips top-up' }],
  });
  assertBlocked(fromArray, RestrictedCategory.GAMBLING);

  const fromJsonString = classifyInstructionRestriction({
    title: 'Weekly plan',
    mandates: '[{"title":"Chips","description":"Casino chips top-up"}]',
  });
  assertBlocked(fromJsonString, RestrictedCategory.GAMBLING);

  const fromAlias = classifyInstructionRestriction({
    title: 'Weekly plan',
    mandate_list: [{ title: 'Membership', merchant_category_code: '7995' }],
  });
  assertBlocked(fromAlias, RestrictedCategory.GAMBLING);

  const fromBothAliases = classifyInstructionRestriction({
    title: 'Weekly plan',
    mandates: [],
    mandate_list: [{ title: 'Membership', merchant_category_code: '7995' }],
  });
  assertBlocked(fromBothAliases, RestrictedCategory.GAMBLING);

  const fromResponseAlias = classifyInstructionRestriction({
    title: 'Weekly plan',
    mandates: [],
    mandateVoList: [{ title: 'Membership', merchantCategoryCode: '7995' }],
  });
  assertBlocked(fromResponseAlias, RestrictedCategory.GAMBLING);

  const fromResponseJsonAlias = classifyInstructionRestriction({
    title: 'Weekly plan',
    mandate_vo_list: '[{"title":"Casino chips"}]',
  });
  assertBlocked(fromResponseJsonAlias, RestrictedCategory.GAMBLING);
});

test('malformed mandates fail closed instead of disappearing from the screen', () => {
  for (const mandates of [
    'not json',
    '{"merchantCategoryCode":"7995"}',
    '[{"description":"casino credits"',
    [null],
    [42],
    Array(1),
    {},
  ]) {
    assertInvalid(
      classifyInstructionRestriction({ title: 'Weekly plan', mandates }),
    );
  }

  assertInvalid(classifyInstructionRestriction({
    title: 'Casino chips',
    mandates: [{ title: 'Casino chips' }],
    mandateVoList: 'not json',
  }));
});

test('hard-blocked merchant category codes refuse before any keyword scan', () => {
  const gambling = classifyInstructionRestriction({
    title: 'Membership',
    mandates: [{ title: 'Membership', merchantCategoryCode: '7995' }],
  });
  assertBlocked(gambling, RestrictedCategory.GAMBLING);
  assert.equal(gambling.matchedBy, 'merchant_category_code');
  assert.equal(gambling.matchedValue, '7995');

  const crypto = classifyInstructionRestriction({
    title: 'Wallet top-up',
    merchant_category_code: '6051',
  });
  assertBlocked(crypto, RestrictedCategory.CRYPTOCURRENCY);
  assert.equal(crypto.matchedBy, 'merchant_category_code');
  assert.equal(crypto.matchedValue, '6051');

  // Every MCC the reference table advertises must actually block.
  for (const entry of RESTRICTED_CATEGORIES) {
    for (const code of entry.merchantCategoryCodes) {
      const result = classifyInstructionRestriction({ title: 'Membership', merchantCategoryCode: code });
      assertBlocked(result, entry.category);
      assert.equal(result.matchedValue, code);
    }
  }
});

// Keywords and MCCs are the mechanical floor. A euphemism, brand name, or another language reaches
// the gate only through the agent's own judgment, so the asserted category has to win outright.
test('an asserted category blocks text no keyword would catch', () => {
  const result = classifyInstructionRestriction({
    title: 'Gift card',
    assertedCategory: RestrictedCategory.GAMBLING,
  });
  assertBlocked(result, RestrictedCategory.GAMBLING);
  assert.equal(result.matchedBy, 'asserted_category');
  assert.equal(result.matchedValue, RestrictedCategory.GAMBLING);

  const snakeCase = classifyInstructionRestriction({
    title: 'Gift card',
    asserted_category: 'tobacco',
  });
  assertBlocked(snakeCase, RestrictedCategory.TOBACCO);
});

test('an unknown asserted category fails closed until the key is fixed', () => {
  const result = classifyInstructionRestriction({
    title: 'Coffee beans',
    assertedCategory: 'NOT_A_CATEGORY',
  });
  assertInvalid(result, 'unknown_asserted_category');

  // A typo cannot be silently discarded even when a later keyword could classify the purchase.
  const invalidBeforeKeywordScan = classifyInstructionRestriction({
    title: 'Buy casino chips',
    assertedCategory: 'NOT_A_CATEGORY',
  });
  assertInvalid(invalidBeforeKeywordScan, 'unknown_asserted_category');

  assertInvalid(
    classifyInstructionRestriction({
      title: 'Coffee beans',
      assertedCategory: RestrictedCategory.GAMBLING,
      asserted_category: RestrictedCategory.TOBACCO,
    }),
    'conflicting_asserted_categories',
  );
});

test('ordinary purchases are not blocked by over-broad keywords', () => {
  const benign = [
    { title: '2 adult tickets for the museum' },
    { title: 'Ethernet cable', description: 'Cat6 3m' },
    { title: 'icon design pack' },
    { title: 'Security deposit for the apartment' },
    { title: 'Restock notice', description: 'in stock: 5 units' },
    { title: 'Hotel booking', mandates: [{ title: 'Hotel', merchantCategoryCode: '7011' }] },
    { title: 'Daily lunch order', description: 'at most 40 CNY per order' },
    { title: '每周买一次咖啡豆' },
  ];

  for (const input of benign) {
    const result = classifyInstructionRestriction(input);
    assertAllowed(result);
    assert.equal(result.warnings, undefined, `${input.title} should raise no warning`);
  }
});

test('a category-scoped semantic exclusion prevents incidental keyword false positives', () => {
  const benign = [
    {
      title: 'A book about stock trading',
      assertedBenignCategories: [RestrictedCategory.FINANCIAL_PRODUCTS_TRADING],
    },
    {
      title: 'Casino Royale Blu-ray',
      asserted_benign_categories: RestrictedCategory.GAMBLING,
    },
    {
      title: 'Ford Escort replacement mirror',
      assertedBenignCategories: [RestrictedCategory.DATING_COMPANIONSHIP],
    },
  ];

  for (const input of benign) {
    const result = classifyInstructionRestriction(input);
    assertAllowed(result);
    assert.ok(result.assertedBenignCategories?.length > 0);
  }
});

test('semantic exclusions cannot override hard evidence or use unknown category keys', () => {
  const hardMcc = classifyInstructionRestriction({
    title: 'A book about stock trading',
    merchantCategoryCode: '6211',
    assertedBenignCategories: [RestrictedCategory.FINANCIAL_PRODUCTS_TRADING],
  });
  assertBlocked(hardMcc, RestrictedCategory.FINANCIAL_PRODUCTS_TRADING);
  assert.equal(hardMcc.matchedBy, 'merchant_category_code');

  const explicitRestriction = classifyInstructionRestriction({
    title: 'Casino history book',
    assertedCategory: RestrictedCategory.GAMBLING,
    assertedBenignCategories: [RestrictedCategory.GAMBLING],
  });
  assertBlocked(explicitRestriction, RestrictedCategory.GAMBLING);
  assert.equal(explicitRestriction.matchedBy, 'asserted_category');

  assertInvalid(
    classifyInstructionRestriction({
      title: 'Coffee beans',
      assertedBenignCategories: ['NOT_A_CATEGORY'],
    }),
    'unknown_asserted_benign_category',
  );
});

test('missing or malformed purchase context fails closed', () => {
  for (const input of [undefined, null, [], 'coffee', {}, { texts: [] }]) {
    assertInvalid(classifyInstructionRestriction(input));
  }

  assertInvalid(
    classifyInstructionRestriction({ title: { value: 'Coffee beans' } }),
    'invalid_restriction_text',
  );
  assertInvalid(
    classifyInstructionRestriction({ title: 'Coffee beans', texts: Array(1) }),
    'invalid_restriction_text',
  );
  assertInvalid(
    classifyInstructionRestriction({ title: 'Coffee beans', merchantCategoryCode: '799' }),
    'invalid_merchant_category_code',
  );
  for (const merchantCategoryCode of [7011, [7011], { code: '7011' }]) {
    assertInvalid(
      classifyInstructionRestriction({ title: 'Coffee beans', merchantCategoryCode }),
      'invalid_merchant_category_code',
    );
    assertInvalid(
      classifyInstructionRestriction({
        title: 'Coffee beans',
        mandates: [{ title: 'Coffee', merchantCategoryCode }],
      }),
      'invalid_merchant_category_code',
    );
  }
  assertInvalid(
    classifyInstructionRestriction({ merchantCategoryCode: '7011' }),
    'restriction_context_missing',
  );
  assertInvalid(
    classifyInstructionRestriction({
      title: 'Coffee beans',
      assertedBenignCategories: Array(1),
    }),
    'invalid_asserted_benign_categories',
  );
  for (const products of ['not json', '{}', [null], [{ productName: 42 }]]) {
    assertInvalid(
      classifyInstructionRestriction({ title: 'Coffee beans', products }),
      'invalid_restriction_text',
    );
  }
  for (const lineItems of ['not json', '{}', [null], [{ item: null }], [{ item: { title: 42 } }]]) {
    assertInvalid(
      classifyInstructionRestriction({ title: 'Coffee beans', lineItems }),
      'invalid_restriction_text',
    );
  }
});

test('the FSM marker follows the shared workflow format', () => {
  const marker = formatInstructionRestrictionFsmMarker(
    classifyInstructionRestriction({ title: 'Buy casino chips' }),
  );
  assert.equal(
    marker,
    '[INSTRUCTION_RESTRICTION_FSM] state=INSTRUCTION_CREATION_BLOCKED'
      + ' action=REFUSE_RESTRICTED_INSTRUCTION reason=restricted_category_gambling',
  );
});

// The lib module is what actually blocks; the reference is what the agent reads. They drift apart
// silently unless every key, Chinese label, and hard-block MCC has to appear in both.
test('the reference table mirrors the shipped category data', () => {
  for (const entry of RESTRICTED_CATEGORIES) {
    const row = restrictedDoc
      .split('\n')
      .find((line) => line.startsWith(`| \`${entry.category}\` |`));
    assert.ok(row, `clink-restricted-categories.md must list \`${entry.category}\``);

    const columns = row.split('|').slice(1, -1).map((column) => column.trim());
    assert.equal(columns[1], entry.labelZh, `${entry.category} must keep its Chinese label`);
    const documentedCodes = columns[3] === '—'
      ? []
      : columns[3].split(',').map((code) => code.trim()).sort();
    assert.deepEqual(
      documentedCodes,
      [...entry.merchantCategoryCodes].sort(),
      `${entry.category} must keep its own hard-block MCCs`,
    );
  }

  assert.match(restrictedDoc, /lib\/restricted-categories\.mjs/u);
  assert.match(restrictedDoc, /classifyInstructionRestriction/u);
  assert.match(restrictedDoc, /assertedCategory/u);
  assert.match(restrictedDoc, /assertedBenignCategories/u);
  assert.match(restrictedDoc, /REFUSE_RESTRICTED_INSTRUCTION/u);
  assert.match(restrictedDoc, /CONTINUE_INSTRUCTION_CREATION/u);
  assert.match(restrictedDoc, /FIX_RESTRICTION_INPUT/u);
  assert.match(restrictedDoc, /Never rephrase, translate/u);
});

test('the preflight is documented on every instruction-creation path', () => {
  assert.match(skill, /references\/clink-restricted-categories\.md/u);
  assert.match(skill, /lib\/restricted-categories\.mjs/u);
  assert.match(skill, /classifyInstructionRestriction/u);
  assert.match(skill, /`REFUSE_RESTRICTED_INSTRUCTION`/u);
  assert.match(skill, /`CONTINUE_INSTRUCTION_CREATION`/u);
  assert.match(skill, /Never run `clink instruction create` on any path/u);
  assert.match(restrictedDoc, /Never rephrase, translate/u);

  assert.match(instruction, /classifyInstructionRestriction/u);
  assert.match(instruction, /clink-restricted-categories\.md/u);
  assert.match(paymentRefund, /classifyInstructionRestriction/u);
  assert.match(paymentRefund, /clink-restricted-categories\.md/u);
  assert.match(ucpCheckout, /classifyInstructionRestriction/u);
  assert.match(
    ucpCheckout,
    /Minimal End-To-End Skeleton[\s\S]*classifyInstructionRestriction/u,
  );
});
