import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PaymentIntentState,
  PaymentIntentRoute,
  PaymentIntentAction,
  classifyPaymentIntent,
} from '../lib/payment-intent-router-fsm.mjs';
import { classifyCatalogDiscovery } from '../lib/catalog-discovery-fsm.mjs';

test('routes explicit wallet relogin before payment-target classification', () => {
  const result = classifyPaymentIntent({
    text: '重新登录',
    currentEmail: 'user@example.com',
  });

  assert.equal(result.state, PaymentIntentState.WALLET_RELOGIN_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.WALLET_RELOGIN);
  assert.equal(result.action, PaymentIntentAction.START_FRESH_WALLET_INIT);
  assert.equal(result.email, 'user@example.com');
});

test('wallet relogin asks for email instead of a merchant or product', () => {
  const result = classifyPaymentIntent({ text: '登录链接过期了，给我一个新的' });

  assert.equal(result.state, PaymentIntentState.WALLET_RELOGIN_INPUT_MISSING);
  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_WALLET_EMAIL);
  assert.deepEqual(result.missing, ['email']);
});

test('wallet relogin bug discussion starts no command', () => {
  const result = classifyPaymentIntent({
    text: '这个 bug 是用户说重新登录时拿旧链接',
    merchantId: 'merchant_1',
  });

  assert.equal(result.state, PaymentIntentState.WALLET_RELOGIN_NOT_AUTHORIZED);
  assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
  assert.equal(result.action, PaymentIntentAction.DO_NOT_START_WALLET_INIT);
});

test('incidental payment fields cannot turn wallet relogin into a payment', () => {
  const result = classifyPaymentIntent({
    text: 'log in again',
    currentEmail: 'user@example.com',
    merchantId: 'merchant_1',
    amount: '10',
    currency: 'USD',
  });

  assert.equal(result.route, PaymentIntentRoute.WALLET_RELOGIN);
  assert.equal(result.action, PaymentIntentAction.START_FRESH_WALLET_INIT);
  assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

for (const text of ['重新授权这笔支付', 'reauthorize this purchase']) {
  test(`purchase reauthorization stays on the payment route: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_1',
    });

    assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
    assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

test('routes a tippable skill list question before tip execution', () => {
  const result = classifyPaymentIntent({
    text: '目前clink payment skill 支持打赏哪些skill',
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_LIST_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_LIST);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_LIST_WORKFLOW);
  assert.equal(result.reason, 'skill_tip_list_intent');
});

test('routes a structured tippable skill list intent', () => {
  const result = classifyPaymentIntent({ intent: 'skill_tip_list' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_LIST);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_LIST_WORKFLOW);
});

test('routes a Chinese list request expressed with 列出', () => {
  const result = classifyPaymentIntent({ text: '列出可以打赏的技能' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_LIST);
});

test('routes an explicitly authorized latest Skill install by identity', () => {
  const result = classifyPaymentIntent({ text: '安装 clinkpay/pollyreach' });

  assert.equal(result.state, PaymentIntentState.SKILL_INSTALL_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  assert.deepEqual(result.install, {
    target: { kind: 'identity', publisher: 'clinkpay', skillName: 'pollyreach' },
    explicitlyAuthorized: true,
  });
});

test('routes a Chinese Skill install command without whitespace before the identity', () => {
  const result = classifyPaymentIntent({ text: '安装clinkpay/pollyreach' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
});

// The install prefix accepts both CLI names on purpose. `clink` is the current command, but users
// who learned the tool as `clink-cli` keep typing it, and dropping the old spelling would route
// their install to INPUT_REQUIRED instead of installing anything — silently, since the identity
// still parses. Both spellings stay pinned so the rename cannot regress one of them.
for (const command of ['clink', 'clink-cli']) {
  test(`routes a Chinese Skill install command naming the ${command} binary`, () => {
    const result = classifyPaymentIntent({ text: `用 ${command} 安装 clinkpay/pollyreach` });

    assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
    assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
    assert.deepEqual(result.install.target, {
      kind: 'identity', publisher: 'clinkpay', skillName: 'pollyreach',
    });
  });
}

test('routes an explicitly authorized exact-version Skill install by identity', () => {
  const result = classifyPaymentIntent({ text: '安装 clinkpay/pollyreach@v1.2.3' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.deepEqual(result.install.target, {
    kind: 'identity',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    versionNo: 'v1.2.3',
  });
});

test('routes an exact-version Skill install whose name contains spaces', () => {
  const result = classifyPaymentIntent({ text: '安装 Jeff/SEO Deep Audit@v1.0.0' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  assert.deepEqual(result.install.target, {
    kind: 'identity',
    publisher: 'Jeff',
    skillName: 'SEO Deep Audit',
    versionNo: 'v1.0.0',
  });
});

test('routes an exact-version Skill install with Chinese publisher and name', () => {
  const result = classifyPaymentIntent({ text: '安装 艺术家/跨境数据分析套件@v1.0.0' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  assert.deepEqual(result.install.target, {
    kind: 'identity',
    publisher: '艺术家',
    skillName: '跨境数据分析套件',
    versionNo: 'v1.0.0',
  });
});

test('routes an explicitly authorized Skill install by displayed Number', () => {
  const result = classifyPaymentIntent({ text: '安装第 2 个 skill' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  assert.deepEqual(result.install.target, { kind: 'number', number: 2 });
});

test('routes a structured exact-version Skill install', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    skillVersion: 'v2',
    installAuthorized: true,
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.deepEqual(result.install.target, {
    kind: 'identity',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    versionNo: 'v2',
  });
});

test('enriches a structured install identity with the exact version from canonical text', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    installAuthorized: true,
    text: '安装 clinkpay/pollyreach@v2',
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  assert.deepEqual(result.install.target, {
    kind: 'identity',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    versionNo: 'v2',
  });
});

for (const malformedFields of [
  { publisher: true, skillName: 123 },
  { publisher: 'clinkpay', skillName: true },
  { publisher: 'clinkpay', skillName: 'pollyreach', skillVersion: 123 },
]) {
  test(`rejects non-string structured install identity fields: ${JSON.stringify(malformedFields)}`, () => {
    const result = classifyPaymentIntent({
      intent: 'skill_install',
      installAuthorized: true,
      ...malformedFields,
    });

    assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  });
}

for (const malformedNumber of [true, [2], { value: 2 }]) {
  test(`rejects a non-scalar structured install Number: ${JSON.stringify(malformedNumber)}`, () => {
    const result = classifyPaymentIntent({
      intent: 'skill_install',
      installAuthorized: true,
      installNumber: malformedNumber,
    });

    assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  });
}

for (const input of [
  {
    text: 'install clinkpay/PollyReach',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
  {
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    installAuthorized: true,
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
]) {
  test('incidental merchant amount fields cannot turn an authorized install into payment', () => {
    const result = classifyPaymentIntent(input);

    assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
    assert.equal(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  });
}

for (const text of [
  'How to install clinkpay/PollyReach?',
  '不要安装 clinkpay/PollyReach',
  'If safe, install clinkpay/PollyReach',
  '安装 clinkpay/One 或 clinkpay/Two',
  '安装 clinkpay/PollyReach@',
]) {
  test(`merchant amount fields cannot turn unsafe install language into payment: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_1',
      amount: '50',
      currency: 'USD',
    });

    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  });
}

test('rejects a structured exact version when canonical text requests latest by omission', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    skillVersion: 'v2',
    installAuthorized: true,
    text: '安装 clinkpay/pollyreach',
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.equal(result.reason, 'skill_install_structured_text_conflict');
  assert.deepEqual(result.missing, ['consistent_authorization']);
});

test('rejects structured and textual install targets whose spelling or case differs', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    installAuthorized: true,
    text: '安装 CLINKPAY/PollyReach',
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.equal(result.reason, 'skill_install_structured_text_conflict');
});

for (const text of [
  '如何安装 clinkpay/pollyreach？',
  '不要安装 clinkpay/pollyreach',
  '我之前安装了 clinkpay/pollyreach',
  '如果安装 clinkpay/pollyreach 就继续',
  '检查 clinkpay/pollyreach 的安装状态',
  '我安装过 clinkpay/pollyreach',
  '暂时不安装 clinkpay/pollyreach',
  '无需安装 clinkpay/pollyreach',
  '不需要安装 clinkpay/pollyreach',
  '安装教程 clinkpay/pollyreach',
  '安装状态 clinkpay/pollyreach',
  '安装过 clinkpay/pollyreach',
  '安装 clinkpay/pollyreach 有什么风险',
]) {
  test(`does not execute a non-authorizing Skill install request: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.SKILL_INSTALL_INPUT_MISSING);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
    assert.deepEqual(result.missing, ['authorization']);
  });
}

for (const text of [
  '安装 clinkpay/pollyreach@',
  '安装 clinkpay/pollyreach/extra',
  '安装 clinkpay/pollyreach:beta',
  '安装 @clinkpay/pollyreach',
  '安装 https://market.example/clinkpay/pollyreach',
  '安装 clinkpay/pollyreach version v1.2.3',
  '安装 clinkpay/pollyreach --version v1.2.3',
  '安装 clinkpay/pollyreach，版本 v1.2.3',
  '安装 clinkpay/pollyreach，版本为 v1.2.3',
  '安装 clinkpay/pollyreach$beta',
  '安装 clinkpay/pollyreach%beta',
  '安装 clinkpay/pollyreach@v1$bad',
  '安装 clinkpay/pollyreach@latest',
  '安装 ../foo',
  '安装 ./foo',
  '安装 pub/..',
  '安装 pub/.',
  '安装 pub/foo@..',
  '安装 pub/foo@.',
]) {
  test(`does not truncate a malformed Skill package into an executable target: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
  });
}

test('does not confuse paying an installation fee with installing a Skill', () => {
  const result = classifyPaymentIntent({
    text: '支付空调安装费',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  });

  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

for (const text of [
  '暂时不安装 clinkpay/pollyreach',
  '无需安装 clinkpay/pollyreach',
  '不需要安装 clinkpay/pollyreach',
]) {
  test(`structured authorization cannot override negated install text: ${text}`, () => {
    const result = classifyPaymentIntent({ text, installAuthorized: true });

    assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_INSTALL_WORKFLOW);
    assert.deepEqual(result.missing, ['authorization']);
  });
}

for (const text of [
  '先看看 clinkpay/pollyreach 的安装文档',
  '为什么安装 clinkpay/pollyreach',
  '安装 clinkpay/pollyreach，仅在兼容时执行',
]) {
  test(`structured authorization cannot turn non-imperative text into an install: ${text}`, () => {
    const result = classifyPaymentIntent({ text, installAuthorized: true });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
    assert.deepEqual(result.missing, ['authorization']);
  });
}

test('structured install fields cannot hide a malformed package in canonical text', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    installAuthorized: true,
    text: '安装 clinkpay/pollyreach$beta',
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.notEqual(result.reason, 'skill_install_intent');
});

test('does not confuse a product installation service URL with installing a Skill', () => {
  const result = classifyPaymentIntent({
    text: '购买包含安装服务的空调 https://shop.test/products/ac',
  });

  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
});

test('does not let a product named Skill installation service preempt UCP checkout', () => {
  const result = classifyPaymentIntent({
    text: '购买 skill 安装服务 https://shop.test/products/ac',
  });

  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
});

test('does not let an installation-fee payment preempt direct pay', () => {
  const result = classifyPaymentIntent({
    text: '支付安装费给 clinkpay/store',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  });

  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

for (const input of [
  {
    text: '安装费 50 USD',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
  {
    text: 'install fee $50',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
  {
    text: '安装费',
    merchantId: 'merchant_1',
    paymentAuthorized: true,
  },
  {
    text: 'install charge $50',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
  {
    text: 'install cost $50',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
  {
    text: '安装款 50 USD',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
  {
    text: '安装价款 50 USD',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  },
]) {
  test(`known merchant installation-fee context stays on direct pay: ${input.text}`, () => {
    const result = classifyPaymentIntent(input);

    assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
    assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

test('does not let productName purchase context get preempted by Skill installation wording', () => {
  const result = classifyPaymentIntent({
    text: '购买 skill 安装服务',
    productName: 'skill 安装服务',
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
});

test('does not let itemId purchase context get preempted by Skill installation wording', () => {
  const result = classifyPaymentIntent({
    text: '购买 skill 安装服务',
    itemId: 'sku_1',
    purchaseIntent: true,
  });

  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
});

test('raw product purchase context wins over a conflicting structured install intent', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    installAuthorized: true,
    text: '购买空调 https://shop.test/products/ac',
  });

  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
});

for (const text of [
  '安装 https://shop.test/products/ac',
  'install product https://shop.test/products/ac',
]) {
  test(`an install prefix cannot preempt a product URL route: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
  });
}

test('an install prefix cannot preempt an explicit merchant payment route', () => {
  const result = classifyPaymentIntent({
    text: 'install skill setup and pay $50',
    merchantId: 'merchant_1',
    amount: '50',
    currency: 'USD',
  });

  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

for (const { input, route, action } of [
  {
    input: {
      intent: 'skill_install',
      publisher: 'clinkpay',
      skillName: 'pollyreach',
      installAuthorized: true,
      productName: 'Laptop',
      purchaseIntent: true,
    },
    route: PaymentIntentRoute.CATALOG_PURCHASE,
    action: PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW,
  },
  {
    input: {
      intent: 'skill_install',
      publisher: 'clinkpay',
      skillName: 'pollyreach',
      installAuthorized: true,
      itemId: 'sku_1',
      checkoutIntent: true,
    },
    route: PaymentIntentRoute.UCP_CHECKOUT,
    action: PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW,
  },
]) {
  test('structured product purchase context cannot be preempted by structured install fields', () => {
    const result = classifyPaymentIntent(input);

    assert.equal(result.route, route);
    assert.equal(result.action, action);
  });
}

for (const [field, productUrl] of [
  ['productUrl', 'https://shop.test/item/sku_1'],
  ['product_url', 'https://shop.test/p/sku_1'],
  ['itemUrl', 'https://shop.test/sku_1'],
  ['item_url', 'https://shop.test/'],
]) {
  test(`an explicit structured ${field} purchase cannot be preempted by install fields`, () => {
    const result = classifyPaymentIntent({
      intent: 'skill_install',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      installAuthorized: true,
      [field]: productUrl,
      purchaseIntent: true,
    });

    assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
    assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
    assert.equal(result.productUrl, productUrl);
  });

  test(`an explicit structured ${field} without purchase intent stays on the product route`, () => {
    const result = classifyPaymentIntent({
      intent: 'skill_install',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      installAuthorized: true,
      [field]: productUrl,
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
    assert.equal(result.productUrl, productUrl);
  });
}

for (const { input, route, action } of [
  {
    input: {
      productUrl: '',
      itemUrl: 'https://shop.test/item/sku_1',
    },
    route: PaymentIntentRoute.UCP_CHECKOUT,
    action: PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW,
  },
  {
    input: {
      productUrl: '   ',
      product_url: '',
      item_url: 'https://shop.test/p/sku_1',
    },
    route: PaymentIntentRoute.UCP_CHECKOUT,
    action: PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW,
  },
  {
    input: {
      productName: '',
      product_name: '   ',
      itemName: 'Laptop',
    },
    route: PaymentIntentRoute.CATALOG_PURCHASE,
    action: PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW,
  },
  {
    input: {
      itemId: '',
      item_id: '   ',
      productId: 'sku_1',
    },
    route: PaymentIntentRoute.UCP_CHECKOUT,
    action: PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW,
  },
]) {
  test(`an empty product alias cannot hide a valid lower-priority alias: ${JSON.stringify(input)}`, () => {
    const result = classifyPaymentIntent({
      intent: 'skill_install',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      installAuthorized: true,
      purchaseIntent: true,
      ...input,
    });

    assert.equal(result.route, route);
    assert.equal(result.action, action);
  });
}

test('an empty merchant alias cannot hide a valid merchant payment target', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    publisher: 'clinkpay',
    skillName: 'PollyReach',
    installAuthorized: true,
    merchantId: '   ',
    merchant_id: 'merchant_1',
    paymentAuthorized: true,
    amount: '10',
    currency: 'USD',
  });

  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  assert.equal(result.merchantId, 'merchant_1');
});

for (const productFields of [
  { productName: 'Laptop' },
  { itemId: 'sku_1' },
  { productUrl: 'https://shop.test/products/ac' },
]) {
  test(`structured product target without purchase intent cannot be preempted by install: ${JSON.stringify(productFields)}`, () => {
    const result = classifyPaymentIntent({
      intent: 'skill_install',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      installAuthorized: true,
      ...productFields,
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
  });
}

for (const purchaseSignal of ['purchaseIntent', 'checkoutIntent']) {
  test(`structured merchant ${purchaseSignal} cannot be preempted by structured install fields`, () => {
    const result = classifyPaymentIntent({
      intent: 'skill_install',
      publisher: 'clinkpay',
      skillName: 'pollyreach',
      installAuthorized: true,
      merchantId: 'merchant_1',
      [purchaseSignal]: true,
    });

    assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
    assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

for (const input of [
  { text: '看看 skill 安装服务', productName: 'skill 安装服务' },
  { text: '查看 clinkpay/pollyreach 安装服务详情', itemId: 'sku_1' },
]) {
  test(`product context without purchase intent stays on the product route: ${input.text}`, () => {
    const result = classifyPaymentIntent(input);

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
    assert.deepEqual(result.missing, ['purchaseIntent']);
  });
}

test('rejects multiple Skill install targets', () => {
  const result = classifyPaymentIntent({ text: '安装 clinkpay/a 或 clinkpay/b' });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.equal(result.reason, 'skill_install_target_ambiguous');
  assert.deepEqual(result.missing, ['single_target']);
});

test('routes a bare confirmation through the only pending Skill install', () => {
  const pendingSkillInstallConfirmation = {
    pendingId: 'install_pending_1',
    status: 'AWAITING_CONFIRMATION',
    number: 2,
  };
  const result = classifyPaymentIntent({
    text: '确认',
    pendingSkillInstallConfirmation,
  });

  assert.equal(result.state, PaymentIntentState.SKILL_INSTALL_CONFIRMATION_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RESUME_SKILL_INSTALL_WORKFLOW);
  assert.equal(result.confirmation, 'CONFIRMED');
  assert.equal(result.pendingSkillInstallConfirmation, pendingSkillInstallConfirmation);
});

test('routes explicit install confirmation when tip and install are both pending', () => {
  const result = classifyPaymentIntent({
    text: '确认安装',
    pendingTipConfirmation: {
      pendingId: 'tip_pending_1',
      status: 'AWAITING_CONFIRMATION',
    },
    pendingSkillInstallConfirmation: {
      pendingId: 'install_pending_1',
      status: 'AWAITING_CONFIRMATION',
    },
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_INSTALL);
  assert.equal(result.action, PaymentIntentAction.RESUME_SKILL_INSTALL_WORKFLOW);
});

test('requires a confirmation target when tip and install are both pending', () => {
  const result = classifyPaymentIntent({
    text: '确认',
    pendingTipConfirmation: {
      pendingId: 'tip_pending_1',
      status: 'AWAITING_CONFIRMATION',
    },
    pendingSkillInstallConfirmation: {
      pendingId: 'install_pending_1',
      status: 'AWAITING_CONFIRMATION',
    },
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
  assert.equal(result.reason, 'skill_confirmation_ambiguous');
  assert.deepEqual(result.missing, ['confirmation_target']);
});

test('routes an explicitly authorized identity tip', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/pollyreach 2usd' });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW);
  assert.deepEqual(result.tip, {
    target: { kind: 'identity', publisher: 'clinkpay', skillName: 'pollyreach' },
    amount: '2',
    currency: 'USD',
    explicitlyAuthorized: true,
  });
});

test('routes an explicitly versioned identity tip', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/pollyreach@v1.2.3 2usd' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
  assert.deepEqual(result.tip.target, {
    kind: 'identity',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    versionNo: 'v1.2.3',
  });
});

test('does not mistake list inside a skill identity for a list query', () => {
  const result = classifyPaymentIntent({ text: 'tip clinkpay/skill-list 2usd' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
  assert.deepEqual(result.tip.target, {
    kind: 'identity',
    publisher: 'clinkpay',
    skillName: 'skill-list',
  });
});

for (const input of [
  { text: 'tip clinkpay/install $1' },
  { text: '打赏 clinkpay/skill-install 1 USD' },
  {
    intent: 'skill_tip',
    publisher: 'clinkpay',
    skillName: 'install',
    amount: '1',
    tipAuthorized: true,
    text: 'tip clinkpay/install $1',
  },
]) {
  test(`does not treat install inside a tipped Skill identity as an install command: ${JSON.stringify(input)}`, () => {
    const result = classifyPaymentIntent(input);

    assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
    assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW);
  });
}

test('routes a marked Number tip without confusing the amount', () => {
  const result = classifyPaymentIntent({ text: '打赏序号2的skill 2 USD' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
  assert.deepEqual(result.tip.target, { kind: 'number', number: 2 });
  assert.equal(result.tip.amount, '2');
});

test('routes a structured authorized Number tip', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip',
    skillNumber: 3,
    amount: '1.50',
    tipAuthorized: true,
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
  assert.deepEqual(result.tip, {
    target: { kind: 'number', number: 3 },
    amount: '1.50',
    currency: 'USD',
    explicitlyAuthorized: true,
  });
});

test('routes a bare confirmation only through the bound pending tip', () => {
  const pendingTipConfirmation = {
    pendingId: 'pending_1',
    status: 'AWAITING_CONFIRMATION',
    number: 2,
  };
  const result = classifyPaymentIntent({
    text: '确认',
    pendingTipConfirmation,
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_CONFIRMATION_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
  assert.equal(result.action, PaymentIntentAction.RESUME_SKILL_TIP_WORKFLOW);
  assert.equal(result.confirmation, 'CONFIRMED');
  assert.equal(result.pendingTipConfirmation, pendingTipConfirmation);
});

test('routes cancellation through the bound pending tip without payment', () => {
  const pendingTipConfirmation = {
    pendingId: 'pending_1',
    status: 'AWAITING_CONFIRMATION',
    number: 2,
  };
  const result = classifyPaymentIntent({
    text: '取消',
    pendingTipConfirmation,
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_CONFIRMATION_REJECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
  assert.equal(result.action, PaymentIntentAction.CANCEL_PENDING_SKILL_TIP);
  assert.equal(result.confirmation, 'CANCELLED');
});

for (const text of ['确认', '取消']) {
  test(`bare ${text} without an awaiting pending is not a Skill Tip action`, () => {
    const result = classifyPaymentIntent({ text });

    assert.notEqual(result.action, PaymentIntentAction.RESUME_SKILL_TIP_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.CANCEL_PENDING_SKILL_TIP);
    assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW);
  });
}

for (const text of ['确认吗？', '可以吗？']) {
  test(`confirmation question does not resume an awaiting tip: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      pendingTipConfirmation: {
        pendingId: 'pending_1',
        status: 'AWAITING_CONFIRMATION',
      },
    });

    assert.notEqual(result.action, PaymentIntentAction.RESUME_SKILL_TIP_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW);
  });
}

test('a new target does not consume an existing pending confirmation', () => {
  const result = classifyPaymentIntent({
    text: '打赏序号 3 的 skill 2 USD',
    pendingTipConfirmation: {
      pendingId: 'pending_1',
      status: 'AWAITING_CONFIRMATION',
      number: 2,
      amount: '2',
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW);
  assert.deepEqual(result.tip.target, { kind: 'number', number: 3 });
  assert.equal(result.confirmation, undefined);
});

test('a new amount does not consume an existing pending confirmation', () => {
  const result = classifyPaymentIntent({
    text: '打赏序号 2 的 skill 3 USD',
    pendingTipConfirmation: {
      pendingId: 'pending_1',
      status: 'AWAITING_CONFIRMATION',
      number: 2,
      amount: '2',
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW);
  assert.equal(result.tip.amount, '3');
  assert.equal(result.confirmation, undefined);
});

test('asks for a missing tip amount without executing', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/pollyreach' });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_INPUT_MISSING);
  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.deepEqual(result.missing, ['amount']);
});

test('asks for a missing tip target without treating the amount as Number', () => {
  const result = classifyPaymentIntent({ text: '打赏 2 USD' });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.deepEqual(result.missing, ['target']);
});

test('rejects non-USD tips before execution', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/pollyreach 2 EUR' });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_tip_currency_unsupported');
  assert.deepEqual(result.missing, ['currency_USD']);
});

test('does not execute a tip how-to question', () => {
  const result = classifyPaymentIntent({ text: '怎么打赏 clinkpay/pollyreach 2 USD' });

  assert.notEqual(result.action, PaymentIntentAction.RUN_SKILL_TIP_WORKFLOW);
});

test('asks for authorization instead of executing a counterfactual tip question', () => {
  const result = classifyPaymentIntent({ text: 'What if I tip clinkpay/pollyreach 2 USD?' });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.deepEqual(result.missing, ['authorization']);
});

test('asks for authorization instead of executing a Chinese tip advice question', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/pollyreach 2 USD 会怎样？' });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.deepEqual(result.missing, ['authorization']);
});

test('honors an explicit false authorization flag over imperative text', () => {
  const result = classifyPaymentIntent({
    text: '打赏 clinkpay/pollyreach 2 USD',
    tipAuthorized: false,
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.deepEqual(result.missing, ['authorization']);
});

test('fail-closes when structured authorization conflicts with negated text', () => {
  const result = classifyPaymentIntent({
    text: '不要打赏 clinkpay/pollyreach 2 USD',
    tipAuthorized: true,
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.deepEqual(result.missing, ['authorization']);
});

for (const text of [
  '不要打赏 clinkpay/pollyreach 2 USD',
  '别打赏 clinkpay/pollyreach 2 USD',
  '打赏 clinkpay/pollyreach 2 USD 吗？',
  '我昨天打赏 clinkpay/pollyreach 2 USD',
  '如果打赏 clinkpay/pollyreach 2 USD 就继续',
]) {
  test(`does not authorize unsafe tip wording: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.SKILL_TIP_INPUT_MISSING);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
    assert.deepEqual(result.missing, ['authorization']);
  });
}

test('multiple targets without explicit shared or per-item amounts ask for batch clarification', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/a 或 clinkpay/b 2 USD' });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_BATCH_INPUT);
  assert.equal(result.reason, 'skill_tip_batch_amount_ambiguous');
  assert.deepEqual(result.missing, ['per_item_amounts']);
});

test('rejects multiple distinct amounts instead of choosing the first', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/a 2 USD 或 3 USD' });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_tip_amount_ambiguous');
  assert.deepEqual(result.missing, ['single_amount']);
});

test('list plus tip remains read-only and requires follow-up authorization', () => {
  const result = classifyPaymentIntent({ text: '列出可打赏 skill，然后打赏序号 2 的 skill 2 USD' });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_LIST);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_LIST_WORKFLOW);
  assert.equal(result.followUpTipRequested, true);
});

test('rejects conflicting structured and textual tip fields', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip',
    publisher: 'clinkpay',
    skillName: 'a',
    amount: 2,
    currency: 'USD',
    tipAuthorized: true,
    text: '打赏 clinkpay/b 3 USD',
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_tip_structured_text_conflict');
  assert.deepEqual(result.missing, ['consistent_authorization']);
});

test('rejects a structured versus text target conflict with the same amount', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip',
    publisher: 'clinkpay',
    skillName: 'a',
    amount: 2,
    currency: 'USD',
    tipAuthorized: true,
    text: '打赏 clinkpay/b 2 USD',
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_tip_structured_text_conflict');
  assert.deepEqual(result.missing, ['consistent_authorization']);
});

test('rejects a structured versus text amount conflict with the same target', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip',
    publisher: 'clinkpay',
    skillName: 'a',
    amount: 2,
    currency: 'USD',
    tipAuthorized: true,
    text: '打赏 clinkpay/a 3 USD',
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_tip_structured_text_conflict');
  assert.deepEqual(result.missing, ['consistent_authorization']);
});

test('rejects ambiguous identity and Number tip targets', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    skillNumber: 2,
    amount: 2,
    tipAuthorized: true,
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_tip_target_ambiguous');
  assert.deepEqual(result.missing, ['single_target']);
});

test('routes known merchant payment without product intent to direct pay', () => {
  const result = classifyPaymentIntent({
    text: '给这个商户充值 10 美元',
    merchantId: 'merchant_123',
    amount: '10.00',
    currency: 'USD',
  });

  assert.equal(result.state, PaymentIntentState.DIRECT_PAY_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  assert.equal(result.reason, 'known_merchant_without_product_intent');
  assert.equal(result.merchantId, 'merchant_123');
  assert.equal(result.amount, '10.00');
  assert.equal(result.currency, 'USD');
});

test('routes clink pay product link purchase to UCP checkout', () => {
  const result = classifyPaymentIntent({
    text: '帮我用clink pay买https://crazy-store-e9vyrbxn.myshopify.com/products/selling-plans-ski-wax',
  });

  assert.equal(result.state, PaymentIntentState.UCP_CHECKOUT_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  assert.equal(result.reason, 'product_purchase_intent');
  assert.equal(
    result.productUrl,
    'https://crazy-store-e9vyrbxn.myshopify.com/products/selling-plans-ski-wax',
  );
});

test('does not route a product URL to checkout without purchase intent', () => {
  const result = classifyPaymentIntent({
    text: '看看这个商品',
    productUrl: 'https://crazy-store-e9vyrbxn.myshopify.com/products/selling-plans-ski-wax',
  });

  assert.equal(result.state, PaymentIntentState.PAYMENT_TARGET_INPUT_MISSING);
  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
  assert.equal(result.reason, 'purchase_intent_missing');
  assert.deepEqual(result.missing, ['purchaseIntent']);
  assert.equal(
    result.productUrl,
    'https://crazy-store-e9vyrbxn.myshopify.com/products/selling-plans-ski-wax',
  );
});

test('routes an explicit upstream purchase intent with a product URL to UCP checkout', () => {
  const result = classifyPaymentIntent({
    purchaseIntent: true,
    productUrl: 'https://crazy-store-e9vyrbxn.myshopify.com/products/selling-plans-ski-wax',
  });

  assert.equal(result.state, PaymentIntentState.UCP_CHECKOUT_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  assert.equal(result.reason, 'product_purchase_intent');
  assert.equal(
    result.productUrl,
    'https://crazy-store-e9vyrbxn.myshopify.com/products/selling-plans-ski-wax',
  );
});

test('routes known merchant product purchase to UCP checkout', () => {
  const result = classifyPaymentIntent({
    text: 'buy ski wax from this merchant',
    merchantId: 'merchant_123',
    productName: 'ski wax',
  });

  assert.equal(result.state, PaymentIntentState.UCP_CHECKOUT_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  assert.equal(result.reason, 'product_purchase_intent');
  assert.equal(result.merchantId, 'merchant_123');
  assert.equal(result.productName, 'ski wax');
});

test('asks for a payment target when neither merchant nor product is clear', () => {
  const result = classifyPaymentIntent({ text: '帮我付款' });

  assert.equal(result.state, PaymentIntentState.PAYMENT_TARGET_INPUT_MISSING);
  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
  assert.equal(result.reason, 'payment_target_missing');
  assert.deepEqual(result.missing, ['merchantId_or_product']);
});

test('routes a structured multi-Skill request with one shared amount', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip_batch',
    targets: [
      { publisher: 'clinkpay', skillName: 'PollyReach' },
      { publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2',
    currency: 'USD',
    tipAuthorized: true,
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_BATCH_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_BATCH);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_BATCH_WORKFLOW);
  assert.deepEqual(result.batch, {
    targets: [
      { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach' },
      { kind: 'identity', publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2',
    currency: 'USD',
    explicitlyAuthorized: true,
  });
});

test('routes a structured multi-Skill request with per-item amounts', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip_batch',
    tips: [
      { publisher: 'clinkpay', skillName: 'PollyReach', amount: '2' },
      { publisher: 'clinkpay', skillName: 'ModelMax', amount: '5' },
    ],
    currency: 'USD',
    tipAuthorized: true,
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_BATCH);
  assert.deepEqual(result.batch, {
    tips: [
      {
        target: { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach' },
        amount: '2',
      },
      {
        target: { kind: 'identity', publisher: 'clinkpay', skillName: 'ModelMax' },
        amount: '5',
      },
    ],
    currency: 'USD',
    explicitlyAuthorized: true,
  });
});

test('routes a natural-language multi-Skill request with a shared amount', () => {
  const result = classifyPaymentIntent({
    text: '打赏 clinkpay/PollyReach 和 clinkpay/ModelMax，每个 2 USD',
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_BATCH);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_BATCH_WORKFLOW);
  assert.deepEqual(result.batch, {
    targets: [
      { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach' },
      { kind: 'identity', publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2',
    currency: 'USD',
    explicitlyAuthorized: true,
  });
});

test('routes a natural-language multi-Skill request with per-item amounts', () => {
  const result = classifyPaymentIntent({
    text: '打赏 clinkpay/PollyReach 2 USD，clinkpay/ModelMax 5 USD',
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_BATCH);
  assert.deepEqual(result.batch.tips, [
    {
      target: { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach' },
      amount: '2',
    },
    {
      target: { kind: 'identity', publisher: 'clinkpay', skillName: 'ModelMax' },
      amount: '5',
    },
  ]);
});

test('batch routing preserves duplicate occurrences for first-win confirmation metadata', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip_batch',
    tips: [
      { publisher: 'ClinkPay', skillName: 'PollyReach', amount: '2' },
      { publisher: 'clinkpay', skillName: 'pollyreach', amount: '9' },
    ],
    currency: 'USD',
    tipAuthorized: true,
  });

  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_BATCH);
  assert.equal(result.batch.tips.length, 2);
  assert.equal(result.batch.tips[0].amount, '2');
  assert.equal(result.batch.tips[1].amount, '9');
});

test('structured and textual batch authorizations must describe the same targets and amounts', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip_batch',
    targets: [
      { publisher: 'clinkpay', skillName: 'PollyReach' },
      { publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2',
    currency: 'USD',
    tipAuthorized: true,
    text: '打赏 clinkpay/Another 和 clinkpay/ModelMax，每个 2 USD',
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_BATCH_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_BATCH_INPUT);
  assert.equal(result.reason, 'skill_tip_batch_structured_text_conflict');
  assert.deepEqual(result.missing, ['consistent_authorization']);
});

test('invalid batch input stops before the batch workflow', () => {
  const invalidItem = classifyPaymentIntent({
    intent: 'skill_tip_batch',
    tips: [
      { publisher: 'clinkpay', skillName: 'PollyReach', amount: '2' },
      { publisher: 'clinkpay', skillName: '', amount: '5' },
    ],
    currency: 'USD',
    tipAuthorized: true,
  });
  assert.equal(invalidItem.state, PaymentIntentState.SKILL_TIP_BATCH_INPUT_MISSING);
  assert.equal(invalidItem.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_BATCH_INPUT);

  const nonUsd = classifyPaymentIntent({
    intent: 'skill_tip_batch',
    targets: [
      { publisher: 'clinkpay', skillName: 'PollyReach' },
      { publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2',
    currency: 'EUR',
    tipAuthorized: true,
  });
  assert.equal(nonUsd.reason, 'skill_tip_batch_currency_unsupported');

  const unauthorized = classifyPaymentIntent({
    intent: 'skill_tip_batch',
    targets: [
      { publisher: 'clinkpay', skillName: 'PollyReach' },
      { publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2',
    currency: 'USD',
    tipAuthorized: false,
  });
  assert.deepEqual(unauthorized.missing, ['authorization']);
});

test('ambiguous batch prose asks for explicit per-item or shared amounts', () => {
  const result = classifyPaymentIntent({
    text: '打赏 clinkpay/PollyReach 和 clinkpay/ModelMax 2 USD',
  });

  assert.equal(result.state, PaymentIntentState.SKILL_TIP_BATCH_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_BATCH_INPUT);
  assert.equal(result.reason, 'skill_tip_batch_amount_ambiguous');
});

test('explicit batch confirmation and cancellation route through the batch pending', () => {
  const pendingTipBatchConfirmation = {
    batchId: 'batch_1',
    status: 'AWAITING_CONFIRMATION',
  };
  const confirmed = classifyPaymentIntent({
    text: '确认批量打赏',
    pendingTipBatchConfirmation,
  });
  assert.equal(confirmed.state, PaymentIntentState.SKILL_TIP_BATCH_CONFIRMATION_SELECTED);
  assert.equal(confirmed.route, PaymentIntentRoute.SKILL_TIP_BATCH);
  assert.equal(confirmed.action, PaymentIntentAction.RESUME_SKILL_TIP_BATCH_WORKFLOW);
  assert.equal(confirmed.confirmation, 'CONFIRMED');

  const cancelled = classifyPaymentIntent({
    text: '取消批量打赏',
    pendingTipBatchConfirmation,
  });
  assert.equal(cancelled.state, PaymentIntentState.SKILL_TIP_BATCH_CONFIRMATION_REJECTED);
  assert.equal(cancelled.action, PaymentIntentAction.CANCEL_PENDING_SKILL_TIP_BATCH);
  assert.equal(cancelled.confirmation, 'CANCELLED');
});

test('generic confirmation resumes a batch only when it is the sole pending skill action', () => {
  const pendingTipBatchConfirmation = {
    batchId: 'batch_1',
    status: 'AWAITING_CONFIRMATION',
  };
  const sole = classifyPaymentIntent({ text: '确认', pendingTipBatchConfirmation });
  assert.equal(sole.route, PaymentIntentRoute.SKILL_TIP_BATCH);
  assert.equal(sole.confirmation, 'CONFIRMED');

  const ambiguous = classifyPaymentIntent({
    text: '确认',
    pendingTipBatchConfirmation,
    pendingTipConfirmation: {
      pendingId: 'tip_1',
      status: 'AWAITING_CONFIRMATION',
    },
  });
  assert.equal(ambiguous.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(ambiguous.reason, 'skill_confirmation_ambiguous');
});

test('routes a described product purchase with no link to catalog discovery', () => {
  const result = classifyPaymentIntent({ text: '我想买一件李小龙的 T 恤' });

  assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'product_purchase_intent_without_product_url');
  assert.equal(result.catalogQuery, '我想买一件李小龙的 T 恤');
  assert.equal(result.catalogEnvironment, 'production');
});

test('prefers a structured product name as the catalog query', () => {
  const result = classifyPaymentIntent({
    text: 'buy this for me',
    productName: 'Bruce Lee T-shirt',
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.productName, 'Bruce Lee T-shirt');
  assert.equal(result.catalogQuery, 'Bruce Lee T-shirt');
});

test('initial catalog purchase routing canonicalizes and preserves test environment and language aliases', () => {
  const result = classifyPaymentIntent({
    text: 'buy this for me',
    productName: 'Bruce Lee T-shirt',
    catalogEnvironment: 'TEST',
    catalog_environment: 'test',
    catalogLanguage: 'zh-hant-hk',
    catalog_language: 'zh-Hant-HK',
    language: 'zh-hant-hk',
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.catalogEnvironment, 'test');
  assert.equal(result.catalogLanguage, 'zh-Hant-HK');

  const discovery = classifyCatalogDiscovery({
    query: result.catalogQuery,
    catalogEnvironment: result.catalogEnvironment,
    catalogLanguage: result.catalogLanguage,
  });
  assert.equal(
    discovery.command,
    'clink tool internal-ucp get-merchant-list --test --format json',
  );
  assert.equal(discovery.catalogLanguage, 'zh-Hant-HK');
});

for (const [name, catalogContext, expected] of [
  [
    'environment alias conflict',
    {
      catalogEnvironment: 'sandbox',
      catalog_environment: 'test',
      catalogLanguage: 'zh-hant-hk',
    },
    {
      reason: 'catalog_environment_conflict',
      values: ['sandbox', 'test'],
      catalogLanguage: 'zh-Hant-HK',
    },
  ],
  [
    'invalid environment',
    { catalogEnvironment: 'uat', language: 'zh-hant-hk' },
    {
      reason: 'catalog_environment_invalid',
      value: 'uat',
      catalogLanguage: 'zh-Hant-HK',
    },
  ],
  [
    'language alias conflict',
    { catalogLanguage: 'zh-Hans', catalog_language: 'en-US' },
    {
      reason: 'catalog_language_conflict',
      values: ['zh-Hans', 'en-US'],
      catalogEnvironment: 'production',
    },
  ],
  [
    'invalid language',
    { language: 'zh_Hans' },
    {
      reason: 'catalog_language_invalid',
      value: 'zh_Hans',
      catalogEnvironment: 'production',
    },
  ],
]) {
  test(`initial catalog purchase routing fails closed on ${name}`, () => {
    const result = classifyPaymentIntent({
      text: 'buy this for me',
      productName: 'Bruce Lee T-shirt',
      ...catalogContext,
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.equal(result.reason, expected.reason);
    assert.equal(result.catalogQuery, 'Bruce Lee T-shirt');
    assert.equal(result.value, expected.value);
    assert.deepEqual(result.values, expected.values);
    assert.equal(result.catalogEnvironment, expected.catalogEnvironment);
    assert.equal(result.catalogLanguage, expected.catalogLanguage);
  });
}

for (const resolvedTarget of [
  { productUrl: 'https://shop.test/products/sku_1' },
  { itemId: 'sku_1' },
  { merchantId: 'merchant_1' },
]) {
  test(`an already resolved target stays on UCP checkout: ${JSON.stringify(resolvedTarget)}`, () => {
    const result = classifyPaymentIntent({
      text: 'buy the Bruce Lee T-shirt',
      productName: 'Bruce Lee T-shirt',
      ...resolvedTarget,
    });

    assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
    assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  });
}

test('a described product without purchase intent still asks for purchase intent', () => {
  const result = classifyPaymentIntent({ text: '看看李小龙的 T 恤', productName: '李小龙 T 恤' });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
  assert.equal(result.reason, 'purchase_intent_missing');
});

const pendingCatalogSelection = {
  status: 'AWAITING_SELECTION',
  catalogQuery: 'Bruce Lee tee',
  catalog_environment: 'sandbox',
  catalog_language: 'zh-Hant-HK',
  candidates: [
    {
      product_id: 'product_1',
      title: 'Bruce Lee Tee',
      url: 'https://www.bruceleeclub.com/products/tee',
      merchant_id: 'mcht_frnz6yfrz1sd',
    },
    {
      product_id: 'product_2',
      title: 'Iced Matcha Latte',
      channel_type: 'eats365',
      region: 'hk',
      store_id: 'HK081034',
    },
  ],
};

test('resolves a bare ordinal reply into the matching catalog product', () => {
  const result = classifyPaymentIntent({
    text: '2',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PRODUCT_SELECTION_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
  assert.equal(result.reason, 'catalog_product_selected');
  assert.equal(result.selectedProduct.productId, 'product_2');
  assert.equal(result.selectedProduct.storeId, 'HK081034');
  assert.equal(result.selectedProduct.channelType, 'eats365');
  assert.equal(result.selectedProduct.catalogEnvironment, 'sandbox');
  assert.equal(result.selectedProduct.catalogLanguage, 'zh-Hant-HK');
  assert.equal(result.pendingCatalogProductSelection.catalog_environment, 'sandbox');
  assert.equal(result.pendingCatalogProductSelection.catalog_language, 'zh-Hant-HK');
});

test('candidate-level catalog context conflict invalidates the pending selection and restarts discovery', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      candidates: [{
        ...pendingCatalogSelection.candidates[0],
        catalog_environment: 'test',
        catalog_language: 'en-US',
      }],
    },
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_context_conflict');
  assert.deepEqual(result.conflictingFields, ['catalogEnvironment', 'catalogLanguage']);
  assert.equal(result.catalogQuery, 'Bruce Lee tee');
  assert.equal(result.catalogEnvironment, 'sandbox');
  assert.equal(result.catalogLanguage, 'zh-Hant-HK');
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
  assert.equal(result.selectedProduct, undefined);

  const merchantListRestart = classifyCatalogDiscovery({
    query: result.catalogQuery,
    catalogEnvironment: result.catalogEnvironment,
    catalogLanguage: result.catalogLanguage,
  });
  assert.equal(
    merchantListRestart.command,
    'clink tool internal-ucp get-merchant-list --sandbox --format json',
  );

  const scopedSearchRestart = classifyCatalogDiscovery({
    query: result.catalogQuery,
    catalogEnvironment: result.catalogEnvironment,
    catalogLanguage: result.catalogLanguage,
    merchantListOutput: {
      merchants: [{
        merchant_id: 'mcht_frnz6yfrz1sd',
        enabled: true,
        description: 'Bruce Lee apparel',
      }],
    },
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
  });
  assert.equal(
    scopedSearchRestart.command,
    'clink ucp-catalog search --merchant-id mcht_frnz6yfrz1sd'
      + ` --query 'Bruce Lee tee' --context '{"language":"zh-Hant-HK"}'`
      + ' --sandbox --format json',
  );
});

test('a damaged candidate preserves a trusted test discovery environment instead of defaulting to production', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      catalog_environment: 'test',
      candidates: [{
        ...pendingCatalogSelection.candidates[0],
        catalog_environment: 'production',
      }],
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_context_conflict');
  assert.equal(result.catalogEnvironment, 'test');
  assert.equal(result.catalogLanguage, 'zh-Hant-HK');

  const restarted = classifyCatalogDiscovery({
    query: result.catalogQuery,
    catalogEnvironment: result.catalogEnvironment,
    catalogLanguage: result.catalogLanguage,
  });
  assert.equal(
    restarted.command,
    'clink tool internal-ucp get-merchant-list --test --format json',
  );
});

test('conflicting pending environment aliases are not inherited by restarted discovery', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      catalogEnvironment: 'sandbox',
      catalog_environment: 'test',
      candidates: [pendingCatalogSelection.candidates[0]],
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_context_conflict');
  assert.deepEqual(result.conflictingFields, ['catalogEnvironment']);
  assert.equal(Object.hasOwn(result, 'catalogEnvironment'), false);
  assert.equal(result.catalogLanguage, 'zh-Hant-HK');
});

for (const [name, languageFields, expectedReason] of [
  [
    'conflicting',
    { catalogLanguage: 'en-US', catalog_language: 'zh-Hant-HK' },
    'catalog_selection_context_conflict',
  ],
  [
    'invalid',
    { catalog_language: 'not_a_language' },
    'catalog_selection_context_invalid',
  ],
]) {
  test(`${name} pending language aliases are not inherited while the valid environment is preserved`, () => {
    const result = classifyPaymentIntent({
      text: '1',
      pendingCatalogProductSelection: {
        ...pendingCatalogSelection,
        ...languageFields,
        candidates: [pendingCatalogSelection.candidates[0]],
      },
    });

    assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.reason, expectedReason);
    assert.equal(result.catalogEnvironment, 'sandbox');
    assert.equal(Object.hasOwn(result, 'catalogLanguage'), false);

    const restarted = classifyCatalogDiscovery({
      query: result.catalogQuery,
      catalogEnvironment: result.catalogEnvironment,
    });
    assert.equal(
      restarted.command,
      'clink tool internal-ucp get-merchant-list --sandbox --format json',
    );
    assert.equal(Object.hasOwn(restarted, 'catalogLanguage'), false);
  });
}

test('a pending selection without a frozen environment is invalidated instead of trusting the candidate', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      status: 'AWAITING_SELECTION',
      query: 'Bruce Lee tee',
      candidates: [{
        ...pendingCatalogSelection.candidates[0],
        catalogEnvironment: 'production',
      }],
    },
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_context_missing');
  assert.equal(result.catalogQuery, 'Bruce Lee tee');
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
  assert.equal(result.selectedProduct, undefined);
});

test('an out-of-range reply cannot keep a pending selection with an invalid frozen environment alive', () => {
  const result = classifyPaymentIntent({
    text: '99',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      catalog_environment: 'uat',
    },
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_context_invalid');
  assert.equal(result.value, 'uat');
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
});

test('an ambiguous reply cannot keep conflicting frozen language aliases alive', () => {
  const result = classifyPaymentIntent({
    text: '那个便宜点的吧',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      catalogLanguage: 'en-US',
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_context_conflict');
  assert.deepEqual(result.conflictingFields, ['catalogLanguage']);
  assert.equal(result.catalogEnvironment, 'sandbox');
  assert.equal(Object.hasOwn(result, 'catalogLanguage'), false);
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
});

test('a damaged pending selection without its original query asks for discovery input, not reselection', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      status: 'AWAITING_SELECTION',
      candidates: [pendingCatalogSelection.candidates[0]],
    },
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
  assert.equal(result.reason, 'catalog_selection_context_missing');
  assert.deepEqual(result.missing, ['catalogQuery']);
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
});

test('a raw candidate language field is product data and cannot override frozen Catalog language', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      candidates: [{
        ...pendingCatalogSelection.candidates[0],
        language: 'en-US',
      }],
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
  assert.equal(result.selectedProduct.catalogEnvironment, 'sandbox');
  assert.equal(result.selectedProduct.catalogLanguage, 'zh-Hant-HK');
});

test('resolves a Chinese ordinal reply into the matching catalog product', () => {
  const result = classifyPaymentIntent({
    text: '第一个',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.selectedProduct.productId, 'product_1');
  assert.equal(result.selectedProduct.productUrl, 'https://www.bruceleeclub.com/products/tee');
});

test('resolves an explicit structured product id selection', () => {
  const result = classifyPaymentIntent({
    text: '就这个',
    selectedProductId: 'product_1',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
  assert.equal(result.selectedProduct.productId, 'product_1');
});

test('rejects a selected product id outside the presented candidates', () => {
  const result = classifyPaymentIntent({
    text: '就这个',
    selectedProductId: 'product_never_shown',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PRODUCT_SELECTION_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.reason, 'selected_product_not_in_candidates');
  assert.equal(result.rejectedProductId, 'product_never_shown');
});

for (const outOfRange of ['0', '3']) {
  test(`rejects an out-of-range ordinal selection: ${outOfRange}`, () => {
    const result = classifyPaymentIntent({
      text: outOfRange,
      pendingCatalogProductSelection: pendingCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
    assert.equal(result.reason, 'selected_index_out_of_range');
  });
}

test('rejects an out-of-range structured index selection', () => {
  const result = classifyPaymentIntent({
    text: '选一个',
    selectedIndex: 9,
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.reason, 'selected_index_out_of_range');
  assert.equal(result.rejectedIndex, 9);
});

test('cancels a pending catalog selection without starting checkout', () => {
  const result = classifyPaymentIntent({
    text: '都不要',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PRODUCT_SELECTION_REJECTED);
  assert.equal(result.action, PaymentIntentAction.CANCEL_PENDING_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.reason, 'catalog_product_selection_rejected');
  assert.equal(result.terminal, true);
});

test('catalog cancellation takes priority over a damaged frozen context', () => {
  const result = classifyPaymentIntent({
    text: '取消',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      catalogEnvironment: 'test',
    },
  });

  assert.equal(result.action, PaymentIntentAction.CANCEL_PENDING_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.reason, 'catalog_product_selection_rejected');
  assert.equal(result.pendingCatalogProductSelection.status, 'AWAITING_SELECTION');
  assert.equal(result.restartDiscovery, undefined);
});

test('asks again when a pending selection carries no candidates', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: { ...pendingCatalogSelection, candidates: [] },
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.reason, 'catalog_selection_candidates_missing');
});

test('ignores a consumed catalog selection object', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: { ...pendingCatalogSelection, status: 'EXECUTING' },
  });

  assert.notEqual(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
});

test('leaves an ambiguous free-text reply unresolved instead of guessing a product', () => {
  const result = classifyPaymentIntent({
    text: '那个便宜点的吧',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PRODUCT_SELECTION_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.reason, 'catalog_product_selection_unresolved');
});
