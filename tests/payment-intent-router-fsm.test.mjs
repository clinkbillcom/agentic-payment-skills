import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PaymentIntentState,
  PaymentIntentRoute,
  PaymentIntentAction,
  PaymentWalletGate,
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
  test(`explicitly authorized known merchant installation fee stays on direct pay: ${input.text}`, () => {
    const result = classifyPaymentIntent({ paymentAuthorized: true, ...input });

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
  assert.equal(result.purchaseIntent, true);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.authenticationMode, 'ANONYMOUS');
  assert.equal(result.resultMode, 'PURCHASE_SELECTION');
  assert.equal(result.walletGate, PaymentWalletGate.DEFER_UNTIL_SELECTION);
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
  assert.equal(result.catalogLanguage, 'zh-Hant');

  const discovery = classifyCatalogDiscovery({
    query: result.catalogQuery,
    catalogEnvironment: result.catalogEnvironment,
    catalogLanguage: result.catalogLanguage,
  });
  assert.equal(
    discovery.command,
    'clink tool internal-ucp get-merchant-list --test --format json',
  );
  assert.equal(discovery.catalogLanguage, 'zh-Hant');
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
      catalogLanguage: 'zh-Hant',
    },
  ],
  [
    'invalid environment',
    { catalogEnvironment: 'uat', language: 'zh-hant-hk' },
    {
      reason: 'catalog_environment_invalid',
      value: 'uat',
      catalogLanguage: 'zh-Hant',
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

test('a described product with search language routes to anonymous Catalog discovery', () => {
  const result = classifyPaymentIntent({ text: '看看李小龙的 T 恤', productName: '李小龙 T 恤' });

  assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_search_intent');
  assert.equal(result.catalogQuery, '李小龙 T 恤');
  assert.equal(result.catalogEnvironment, 'production');
  assert.equal(result.purchaseIntent, false);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.authenticationMode, 'ANONYMOUS');
  assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  assert.notEqual(result.action, PaymentIntentAction.START_FRESH_WALLET_INIT);
});

for (const [label, text, productName] of [
  ['search', 'search for wireless headphones', null],
  ['find', 'find coffee beans', null],
  ['look for', 'look for running shoes', null],
  ['show me', 'show me matcha powder', null],
  ['explore', 'explore coffee products', null],
  ['suggest', 'suggest coffee beans', null],
  ['show options', 'show me coffee options', null],
  ['API testing tool', 'find an API testing tool', null],
  ['code review tool', 'search for a code review tool', null],
  ['搜索', '搜索无线耳机', null],
  ['搜一下', '搜一下咖啡豆', null],
  ['查找', '查找跑鞋', null],
  ['找一下', '找一下抹茶粉', null],
  ['浏览', '浏览咖啡商品', null],
  ['列出', '列出几款咖啡商品', null],
  ['推荐', '推荐咖啡豆', null],
  ['找一款', '找一款咖啡豆', null],
  ['可选项', '有哪些咖啡可选项', null],
  ['看看', '看看李小龙 T 恤', '李小龙 T 恤'],
]) {
  test(`routes ${label} product language to public Catalog search`, () => {
    const result = classifyPaymentIntent({ text, ...(productName ? { productName } : {}) });

    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  });
}

for (const intent of ['catalog_search', 'product_search', 'product_discovery']) {
  test(`routes structured ${intent} to anonymous Catalog discovery`, () => {
    const result = classifyPaymentIntent({
      intent,
      catalogQuery: 'wireless headphones',
      walletStatus: { ok: false, error: { message: 'wallet is not initialized' } },
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.catalogQuery, 'wireless headphones');
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
  });
}

test('structured Catalog query aliases take precedence over product name and free text', () => {
  const result = classifyPaymentIntent({
    intent: 'catalog_search',
    text: 'show me coffee',
    catalogQuery: 'exact catalog query',
    productName: 'structured product name',
    query: 'generic query',
  });

  assert.equal(result.catalogQuery, 'exact catalog query');
});

for (const text of [
  '搜索产品',
  '搜一下商品',
  'find products',
  'show me items',
  'find me a product',
  'search in catalog',
]) {
  test(`a bare Catalog search request asks only for its query: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.equal(result.reason, 'catalog_query_missing');
    assert.deepEqual(result.missing, ['catalogQuery']);
    assert.equal(result.catalogEnvironment, 'production');
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  });
}

test('anonymous Catalog search canonicalizes environment and language without wallet state', () => {
  const result = classifyPaymentIntent({
    intent: 'product_search',
    query: 'coffee',
    catalogEnvironment: 'TEST',
    catalog_environment: 'test',
    catalogLanguage: 'zh-hant-hk',
    language: 'zh-Hant-HK',
  });

  assert.equal(result.catalogQuery, 'coffee');
  assert.equal(result.catalogEnvironment, 'test');
  assert.equal(result.catalogLanguage, 'zh-Hant');
  assert.equal(result.authenticationMode, 'ANONYMOUS');
});

for (const [name, context, reason] of [
  [
    'environment conflict',
    { catalogEnvironment: 'sandbox', catalog_environment: 'test' },
    'catalog_environment_conflict',
  ],
  ['invalid environment', { catalogEnvironment: 'uat' }, 'catalog_environment_invalid'],
  [
    'language conflict',
    { catalogLanguage: 'zh-Hans', catalog_language: 'en-US' },
    'catalog_language_conflict',
  ],
  ['invalid language', { catalogLanguage: 'zh_Hans' }, 'catalog_language_invalid'],
]) {
  test(`anonymous Catalog search fails closed on ${name} without wallet recovery`, () => {
    const result = classifyPaymentIntent({
      intent: 'catalog_search',
      query: 'coffee',
      ...context,
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.equal(result.reason, reason);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.notEqual(result.action, PaymentIntentAction.START_FRESH_WALLET_INIT);
  });
}

test('clear search-and-purchase language retains the existing Catalog purchase route', () => {
  const result = classifyPaymentIntent({ text: '搜索并购买一件李小龙 T 恤' });

  assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
});

test('explicit Chinese search-and-purchase ignores an ambient merchant target', () => {
  const result = classifyPaymentIntent({
    text: '搜索并购买咖啡豆',
    merchantId: 'merchant_catalog_hint',
    amount: '10',
    currency: 'USD',
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.notEqual(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

for (const text of [
  '搜索并购买',
  '搜索然后购买',
  '搜索再购买',
  '搜索后购买',
  '搜索之后结账',
  'search and buy',
  'search then buy',
  'search & buy',
  'find something and checkout',
  'search for it then buy',
  'look for and purchase',
  'find, buy',
]) {
  test(`a combined search-and-purchase request without a query asks for catalog input: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.equal(result.reason, 'catalog_query_missing');
    assert.deepEqual(result.missing, ['catalogQuery']);
  });
}

test('structured purchase authorization overrides a structured search label', () => {
  const result = classifyPaymentIntent({
    intent: 'product_search',
    purchaseIntent: true,
    productName: 'Bruce Lee T-shirt',
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
});

for (const text of [
  'show me products I can buy',
  'find something to buy',
  'search for headphones I can purchase',
  'look for coffee to buy',
  'search for products available to order',
  '搜索我能买的咖啡豆',
  '找一下想买的耳机',
  '看看可以买的咖啡豆',
]) {
  test(`search-framed purchase capability stays anonymous: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'search for a new login page template',
  'find a fresh authorization page template',
]) {
  test(`a Catalog search query containing wallet-like nouns never starts wallet init: ${text}`, () => {
    const result = classifyPaymentIntent({ text, currentEmail: 'user@example.com' });

    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.START_FRESH_WALLET_INIT);
  });
}

test('a structured Catalog search preempts incidental textual wallet language', () => {
  const result = classifyPaymentIntent({
    intent: 'catalog_search',
    catalogQuery: 'coffee',
    text: '重新登录',
    currentEmail: 'user@example.com',
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
});

test('a structured wallet relogin remains higher priority than textual Catalog search', () => {
  const result = classifyPaymentIntent({
    intent: 'wallet_relogin',
    text: 'search for a new login page template',
    currentEmail: 'user@example.com',
  });

  assert.equal(result.route, 'WALLET_RELOGIN');
  assert.equal(result.action, PaymentIntentAction.START_FRESH_WALLET_INIT);
});

for (const text of [
  'search for coffee, then log in again',
  '搜索咖啡，然后重新登录钱包',
]) {
  test(`an explicit wallet re-login after search wording retains priority: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      currentEmail: 'user@example.com',
      merchantId: 'merchant_catalog_hint',
    });

    assert.equal(result.state, PaymentIntentState.WALLET_RELOGIN_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.WALLET_RELOGIN);
    assert.equal(result.action, PaymentIntentAction.START_FRESH_WALLET_INIT);
    assert.equal(result.email, 'user@example.com');
    assert.notEqual(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  });
}

test('incidental buyable wording remains an anonymous search rather than purchase authorization', () => {
  const result = classifyPaymentIntent({ text: '搜索可以买到的咖啡豆' });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.purchaseIntent, false);
});

for (const text of [
  '搜索咖啡豆，不要购买',
  '只搜索咖啡豆，先不买',
  'find coffee, do not buy',
  'just search for coffee, do not purchase',
  'find coffee; no purchase',
  '不要购买，只搜索咖啡',
  '先别买，帮我找一下咖啡',
]) {
  test(`negated purchase language keeps search anonymous: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
  });
}

test('a textual product search remains anonymous when merchantId is already known', () => {
  const result = classifyPaymentIntent({
    text: 'find coffee, do not buy',
    merchantId: 'merchant_catalog_hint',
    purchaseIntent: false,
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.merchantId, 'merchant_catalog_hint');
  assert.equal(result.purchaseIntent, false);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.authenticationMode, 'ANONYMOUS');
  assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

for (const text of [
  'find coffee; no purchase',
  '不要购买，只搜索咖啡',
  '先别买，帮我找一下咖啡',
]) {
  test(`an explicit product search denial stays anonymous with incidental payment fields: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_catalog_hint',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

for (const text of [
  'browse coffee products',
  'list coffee products',
  'recommend coffee beans',
  '浏览一下咖啡商品',
  '列出咖啡商品',
  '推荐几款咖啡豆',
  'find a calendar app',
  'search for an email marketing product',
  '找一款本地文件同步软件',
  'find a Notion template',
  'search for a Slack integration',
]) {
  test(`product-discovery wording with merchant context never falls into direct pay: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_catalog_hint',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

for (const text of [
  '帮我找咖啡豆',
  '帮我搜咖啡豆',
  '帮我查一下咖啡豆',
  '帮我看一下咖啡豆',
  'see coffee products',
  'show coffee products',
]) {
  test(`explicit discovery wording remains anonymous with an ambient merchant: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_catalog_hint',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
  });
}

for (const text of [
  'browse coffee products then buy one',
  'recommend coffee beans and buy one',
  '浏览咖啡商品然后购买',
  '列出咖啡商品并购买',
]) {
  test(`explicit discovery-then-purchase ignores an ambient merchant target: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_catalog_hint',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
    assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  });
}

for (const text of [
  '不要买咖啡',
  'I do not want to buy coffee',
  '我没让你买咖啡',
  'I did not ask you to buy coffee',
]) {
  test(`current purchase denial overrides incidental direct-pay fields: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_incidental',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.PAYMENT_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
    assert.equal(result.requiresWallet, false);
  });
}

for (const [name, denial] of [
  ['English textual denial', { text: 'do not pay' }],
  ['Chinese textual denial', { text: '不要付款' }],
  ['Chinese defer-payment denial', { text: '先别支付' }],
  ['English cancellation', { text: 'cancel payment' }],
  ['structured denial', { purchaseIntent: false }],
  ['structured denial overriding positive text', { text: 'pay now', purchaseIntent: false }],
]) {
  test(`payment refusal cannot be overridden by complete direct-pay fields: ${name}`, () => {
    const result = classifyPaymentIntent({
      merchantId: 'merchant_incidental',
      amount: '10',
      currency: 'USD',
      ...denial,
    });

    assert.equal(result.state, PaymentIntentState.PAYMENT_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
    assert.equal(result.requiresWallet, false);
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

test('Chinese current denial cannot create purchase-origin Catalog authorization', () => {
  const result = classifyPaymentIntent({ text: '我没让你买咖啡' });

  assert.notEqual(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.notEqual(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.notEqual(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
});

for (const text of [
  '不要搜索咖啡豆',
  '如果需要就搜索咖啡豆',
  '我昨天搜索了咖啡豆',
  '我搜索过咖啡豆',
  '搜索咖啡了吗？',
  '我应该搜索咖啡豆吗？',
  'do not search for coffee',
  'if needed, search for coffee',
  'did you search for coffee?',
  'I searched for coffee',
  'should I search for coffee?',
  'should you search for coffee?',
  'how to search for coffee',
  'I did not ask you to find coffee',
  '我没让你搜索咖啡',
  'search for coffee, this is only a test',
  '搜索咖啡，这只是测试',
  'search for coffee only if I confirm later',
]) {
  test(`non-authorizing search language starts no Catalog request: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
    assert.equal(result.terminal, true);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  });
}

for (const text of [
  '不要浏览咖啡商品',
  '别列出咖啡商品',
  '不要推荐咖啡豆',
  '如果需要就浏览咖啡商品',
  '假如可以就推荐咖啡豆',
  'I browsed coffee products yesterday',
  'I browsed coffee products',
  'Did you browse coffee products?',
  'I recommended coffee yesterday',
  'how to recommend coffee beans',
  '我昨天浏览了咖啡商品',
  '我之前推荐了咖啡豆',
  'the user said browse coffee products',
  'the user said explore coffee products',
  '用户说推荐咖啡豆',
]) {
  test(`discovery synonyms share the active-command authorization gate: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
    assert.equal(result.terminal, true);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'search for coffee. Do not do it.',
  'search for coffee — do not do it',
  'find coffee but do not do it',
  '搜索咖啡。不要执行',
  '搜索咖啡——不要执行',
  '查找咖啡，但别执行',
]) {
  test(`a trailing search cancellation applies across clause separators: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
    assert.equal(result.terminal, true);
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'do not do it',
  'not now',
  'maybe later',
  'cancel',
  'stop',
  '暂时不要',
  '以后再说',
]) {
  test(`structured Catalog search cannot override current denial: ${text}`, () => {
    const result = classifyPaymentIntent({
      intent: 'catalog_search',
      query: 'coffee',
      text,
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
    assert.equal(result.terminal, true);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  });
}

for (const [name, input] of [
  [
    'cancel with the product-search intent alias',
    { intent: 'product_search', query: 'coffee', text: 'cancel' },
  ],
  [
    'standalone never mind',
    { intent: 'catalog_search', query: 'coffee', text: 'never mind' },
  ],
  [
    'explicit false boolean',
    { intent: 'catalog_search', query: 'coffee', catalogSearchIntent: false },
  ],
  [
    'conflicting true and false boolean aliases',
    {
      intent: 'catalog_search',
      query: 'coffee',
      catalogSearchIntent: true,
      catalog_search_intent: false,
    },
  ],
]) {
  test(`structured Catalog denial is authoritative: ${name}`, () => {
    const result = classifyPaymentIntent(input);

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
    assert.equal(result.terminal, true);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  });
}

for (const text of [
  '看看钱包状态',
  '查找订单记录',
  '看看支付记录',
  'find my invoices',
  'look for wallet settings',
  '查找 Clink API 文档',
  'show me the API documentation',
  'find clinkpay/pollyreach',
  '查找联系人 Alice',
  '看看明天的日历',
  'find my local report.pdf',
  'show me files in the drive',
]) {
  test(`non-product lookup does not enter Catalog search: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.notEqual(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.notEqual(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  });
}

for (const text of [
  'find invoice INV-42',
  '帮我查找联系人 Alice',
  'locate invoice INV-42',
  'look up invoice INV-42',
  '查一下发票 INV-42',
  '查询订单记录',
  'locate contact Alice',
  '查一下联系人 Alice',
]) {
  test(`non-product lookup with incidental merchant fields never enters direct pay: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_incidental',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.PAYMENT_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
    assert.equal(result.reason, 'non_payment_lookup_intent');
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'find document named budget',
  'search my downloads',
]) {
  test(`workspace lookup stays outside Catalog and payment routing: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.requiresWallet, false);
    assert.notEqual(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

for (const text of [
  'find Slack messages about product launch',
  'search my calendar for product meetings',
  'find emails about software renewal',
  'look up contacts for integration project',
]) {
  test(`workspace content nouns override incidental product words: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.PAYMENT_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
    assert.equal(result.reason, 'non_payment_lookup_intent');
    assert.equal(result.requiresWallet, false);
  });
}

test('a structured Skill install intent is not intercepted by textual find language', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_install',
    text: 'find clinkpay/pollyreach',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    installAuthorized: true,
  });

  assert.notEqual(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_INSTALL_INPUT);
});

test('a structured Skill tip intent is not intercepted by textual find language', () => {
  const result = classifyPaymentIntent({
    intent: 'skill_tip',
    text: 'find clinkpay/pollyreach',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    amount: '2',
    currency: 'USD',
    tipAuthorized: true,
  });

  assert.notEqual(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP);
});

const pendingCatalogSelection = {
  status: 'AWAITING_SELECTION',
  purchaseIntent: true,
  resultMode: 'PURCHASE_SELECTION',
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
      url: 'https://order.example.hk/store/HK081034?product_id=product_2',
      channel_type: 'eats365',
      region: 'hk',
      store_id: 'HK081034',
      price: 4200,
      currency: 'HKD',
      quantity: 1,
    },
  ],
};

const pendingDiscoveryOnlyCatalogSelection = {
  ...pendingCatalogSelection,
  purchaseIntent: false,
  resultMode: 'DISCOVERY_ONLY',
};

const pendingInternalCatalogSelection = {
  status: 'AWAITING_SELECTION',
  purchaseIntent: true,
  resultMode: 'PURCHASE_SELECTION',
  catalogQuery: 'HungryPanda',
  catalog_environment: 'sandbox',
  catalog_language: 'zh-Hans',
  candidates: [{
    product_id: '571d217de068498f8ba545a286900a16',
    title: 'HungryPanda(US)',
    source: 'INTERNAL_UCP_CATALOG',
    merchant_id: 'mcht_ftmse61a6az0',
    merchant_url: 'https://testa.link2shops.com/',
    merchant_domain: 'testa.link2shops.com',
    price: 100,
    currency: 'USD',
    quantity: 1,
  }],
};

for (const [name, provenance, expectedReason] of [
  [
    'both fields missing',
    { purchaseIntent: undefined, resultMode: undefined },
    'catalog_selection_provenance_missing',
  ],
  [
    'purchaseIntent missing',
    { purchaseIntent: undefined },
    'catalog_selection_provenance_missing',
  ],
  [
    'resultMode missing',
    { resultMode: undefined },
    'catalog_selection_provenance_missing',
  ],
  [
    'purchaseIntent/resultMode mismatch',
    { purchaseIntent: false, resultMode: 'PURCHASE_SELECTION' },
    'catalog_selection_provenance_conflict',
  ],
  [
    'purchaseIntent aliases conflict',
    { purchase_intent: false },
    'catalog_selection_provenance_conflict',
  ],
  [
    'resultMode aliases conflict',
    { result_mode: 'DISCOVERY_ONLY' },
    'catalog_selection_provenance_conflict',
  ],
]) {
  test(`catalog selection provenance fails closed when ${name}`, () => {
    const result = classifyPaymentIntent({
      text: '1',
      pendingCatalogProductSelection: {
        ...pendingCatalogSelection,
        ...provenance,
      },
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.reason, expectedReason);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.resultMode, 'DISCOVERY_ONLY');
    assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
    assert.equal(result.selectedProduct, undefined);
  });
}

test('conflicting top-level pending aliases never resolve a checkout target', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: pendingCatalogSelection,
    pending_catalog_product_selection: { ...pendingCatalogSelection },
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
  assert.equal(result.reason, 'catalog_pending_selection_conflict');
  assert.equal(result.selectedProduct, undefined);
});

test('conflicting candidate-array aliases invalidate the frozen snapshot', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      products: [{ ...pendingCatalogSelection.candidates[1] }],
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_candidates_conflict');
  assert.deepEqual(result.conflictingFields, ['candidates', 'products']);
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
});

test('a pending Catalog selection without its frozen query cannot enter checkout', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      catalogQuery: undefined,
    },
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
  assert.deepEqual(result.missing, ['catalogQuery']);
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
  assert.equal(result.selectedProduct, undefined);
});

for (const [name, queryFields, expectedReason] of [
  [
    'conflicting camel-case and generic aliases',
    { query: 'different frozen query' },
    'catalog_selection_query_conflict',
  ],
  [
    'conflicting camel-case and snake-case aliases',
    { catalog_query: 'different frozen query' },
    'catalog_selection_query_conflict',
  ],
  [
    'numeric canonical query',
    { catalogQuery: 42 },
    'catalog_selection_query_invalid',
  ],
  [
    'object snake-case query alias',
    { catalog_query: {} },
    'catalog_selection_query_invalid',
  ],
  [
    'array generic query alias',
    { query: [] },
    'catalog_selection_query_invalid',
  ],
]) {
  test(`a malformed pending Catalog query fails closed without discovery: ${name}`, () => {
    const result = classifyPaymentIntent({
      text: '1',
      pendingCatalogProductSelection: {
        ...pendingCatalogSelection,
        ...queryFields,
      },
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.equal(result.reason, expectedReason);
    assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
    assert.equal(result.selectedProduct, undefined);
    assert.notEqual(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  });
}

for (const [name, candidate] of [
  ['empty candidate', {}],
  [
    'missing URL',
    { productId: 'p1', productName: 'Product', merchantId: 'merchant_1' },
  ],
  [
    'merchant/store dual identity',
    {
      productId: 'p1',
      productName: 'Product',
      productUrl: 'https://shop.example/products/p1',
      merchantId: 'merchant_1',
      storeId: 'store_1',
      channelType: 'eats365',
    },
  ],
  [
    'product ID alias conflict',
    {
      productId: 'p1',
      product_id: 'p2',
      productName: 'Product',
      productUrl: 'https://shop.example/products/p1',
      merchantId: 'merchant_1',
    },
  ],
  [
    'product URL alias conflict',
    {
      productId: 'p1',
      productName: 'Product',
      productUrl: 'https://shop.example/products/p1',
      url: 'https://shop.example/products/p2',
      merchantId: 'merchant_1',
    },
  ],
  [
    'store channel missing',
    {
      productId: 'p1',
      productName: 'Product',
      productUrl: 'https://order.example/store?product_id=p1',
      storeId: 'store_1',
    },
  ],
  [
    'invalid URL',
    {
      productId: 'p1',
      productName: 'Product',
      productUrl: 'not-a-url',
      merchantId: 'merchant_1',
    },
  ],
  [
    'blank duplicate aliases',
    {
      productId: 'p1',
      product_id: ' ',
      productName: 'Product',
      title: '',
      productUrl: 'https://shop.example/products/p1',
      url: ' ',
      merchantId: 'merchant_1',
      storeId: '',
    },
  ],
  [
    'store ordering URL missing product_id',
    {
      productId: 'p1',
      productName: 'Product',
      productUrl: 'https://order.example/store',
      storeId: 'store_1',
      channelType: 'eats365',
    },
  ],
]) {
  test(`malformed selected Catalog candidate restarts discovery: ${name}`, () => {
    const result = classifyPaymentIntent({
      text: '1',
      pendingCatalogProductSelection: {
        ...pendingCatalogSelection,
        candidates: [candidate],
      },
    });

    assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.reason, 'catalog_selection_candidate_invalid');
    assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
    assert.equal(result.selectedProduct, undefined);
  });
}

test('a non-object candidate invalidates the frozen snapshot without shifting indexes', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingCatalogSelection,
      candidates: [null, pendingCatalogSelection.candidates[0]],
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_candidates_invalid');
  assert.deepEqual(result.invalidIndexes, [1]);
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
});

test('a fresh Catalog search supersedes an older pending product selection', () => {
  const result = classifyPaymentIntent({
    text: '搜索别的帽子',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.catalogQuery, '搜索别的帽子');
});

for (const text of ['搜索并购买别的帽子', 'search for and buy another hat']) {
  test(`a fresh combined search-and-buy request supersedes old candidates: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      pendingCatalogProductSelection: pendingCatalogSelection,
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
    assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.reason, 'product_purchase_intent_without_product_url');
    assert.equal(result.catalogQuery, text);
  });
}

for (const text of [
  'show me how to buy headphones',
  'search for a buying guide for headphones',
  'search for a purchase guide for headphones',
  '搜索购买指南',
  '查找怎么买咖啡豆',
  '看看如何购买无线耳机',
]) {
  test(`purchase guidance language remains anonymous discovery: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.purchaseIntent, false);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  });
}

for (const text of [
  '购买指南针',
  '购买一个指南针',
  'buy a buying guide for photographers',
  '买一本购买教程书',
  '搜索并购买一本购买指南',
  'search for and buy a buying guide for photographers',
  'buy the book How to Buy a House',
  'purchase the How to Buy Anything course',
  'get me the book How to Buy a House',
  '购买《如何购买房屋》这本书',
  '买一本《怎么买房》',
  '搜索并购买《如何购买房屋》这本书',
  '我想买一本《怎么买房》',
  '我决定购买《如何购买房屋》这本书',
  "I'd like to buy the book How to Buy a House",
  'I want to purchase the How to Buy Anything course',
  'search for and checkout the How to Buy course',
  '找一下然后结账《怎么买房》',
]) {
  test(`an explicit purchase of a guidance-named product stays a purchase: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
    assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  });
}

test('damaged discovery-only context restarts anonymous search rather than purchase discovery', () => {
  const result = classifyPaymentIntent({
    text: '2',
    pendingCatalogProductSelection: {
      ...pendingDiscoveryOnlyCatalogSelection,
      catalogEnvironment: 'test',
    },
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_context_conflict');
  assert.equal(result.purchaseIntent, false);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.authenticationMode, 'ANONYMOUS');
  assert.equal(result.resultMode, 'DISCOVERY_ONLY');
  assert.equal(result.pendingCatalogProductSelection.status, 'INVALID');
});

test('a bare ordinal from discovery-only results cannot start checkout', () => {
  const result = classifyPaymentIntent({
    text: '2',
    pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
  });

  assert.equal(result.state, PaymentIntentState.PAYMENT_TARGET_INPUT_MISSING);
  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
  assert.equal(result.reason, 'purchase_intent_missing');
  assert.deepEqual(result.missing, ['purchaseIntent']);
  assert.equal(result.selectedProduct, undefined);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.resultMode, 'DISCOVERY_ONLY');
});

for (const selection of [
  { selectedIndex: 2 },
  { selectedProductId: 'product_2' },
]) {
  test(`structured discovery-only selection also requires purchase intent: ${JSON.stringify(selection)}`, () => {
    const result = classifyPaymentIntent({
      text: '这个',
      ...selection,
      pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
    assert.equal(result.selectedProduct, undefined);
  });
}

test('an explicit buy-wrapped ordinal crosses from discovery into checkout', () => {
  const result = classifyPaymentIntent({
    text: '买第 2 个',
    pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PRODUCT_SELECTION_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
  assert.equal(result.selectedProduct.productId, 'product_2');
  assert.equal(result.purchaseIntent, true);
  assert.equal(result.requiresWallet, true);
  assert.equal(result.resultMode, 'PURCHASE_SELECTION');
  assert.equal(result.pendingCatalogProductSelection.status, 'EXECUTING');
  assert.deepEqual(result.pendingTransition, {
    from: 'AWAITING_SELECTION',
    to: 'EXECUTING',
  });
});

test('an English buy Number reply crosses from discovery into checkout', () => {
  const result = classifyPaymentIntent({
    text: 'buy Number 2',
    pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
  });

  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
  assert.equal(result.selectedProduct.productId, 'product_2');
});

for (const text of [
  '我已经知道怎么买了，现在买第2个',
  'I know how to buy it; now buy Number 2',
]) {
  test(`compound discussion requires a fresh canonical purchase selection: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      selectedIndex: 2,
      pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
    assert.equal(result.selectedProduct, undefined);
  });
}

for (const text of [
  '用户说：现在买第2个',
  '测试完成；现在买第2个',
  'reproduce the phrase; now buy Number 2',
  'the user says; now buy Number 2',
]) {
  test(`reported or test-framed now-clause is not purchase authorization: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      selectedIndex: 2,
      pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
    assert.equal(result.selectedProduct, undefined);
  });
}

for (const input of [
  { text: '不要买', selectedIndex: 2 },
  { text: 'do not buy', selectedIndex: 2 },
  { text: '别购买第二个', selectedIndex: 2 },
  { text: '不买第二个', selectedIndex: 2 },
  { text: '不购买第二个', selectedIndex: 2 },
  { text: '取消购买第二个', selectedIndex: 2 },
  { text: '取消下单第二个', selectedIndex: 2 },
  { text: '拒绝购买第二个', selectedIndex: 2 },
  { text: '不再购买第二个', selectedIndex: 2 },
  { text: '不能购买第二个', selectedIndex: 2 },
  { text: '不会买第二个', selectedIndex: 2 },
  { text: '放弃购买第二个', selectedIndex: 2 },
  { text: "I won't buy Number 2", selectedIndex: 2 },
  { text: 'not buy Number 2', selectedIndex: 2 },
  { text: 'cancel purchase Number 2', selectedIndex: 2 },
  { text: 'refuse to buy Number 2', selectedIndex: 2 },
  { text: 'no longer buy Number 2', selectedIndex: 2 },
  { text: 'I cannot buy Number 2', selectedIndex: 2 },
  { text: 'buy 2', selectedIndex: 2, purchaseIntent: false },
  { text: '测试用户说买第2个的场景', selectedIndex: 2 },
  { text: 'reproduce the phrase buy Number 2', selectedIndex: 2 },
  { text: '假设我买第二个', selectedIndex: 2 },
  { text: 'suppose I buy Number 2', selectedIndex: 2 },
  { text: '我考虑买第二个', selectedIndex: 2 },
  { text: 'I might buy Number 2', selectedIndex: 2 },
  { text: '买第二个吗', selectedIndex: 2 },
  { text: '要买第二个吗', selectedIndex: 2 },
  { text: "I haven't decided to buy Number 2", selectedIndex: 2, purchaseIntent: true },
  { text: 'I haven’t decided to buy Number 2', selectedIndex: 2, purchaseIntent: true },
  { text: 'I am not sure whether to buy Number 2', selectedIndex: 2, purchaseIntent: true },
  { text: 'I could buy Number 2', selectedIndex: 2, purchaseIntent: true },
  { text: 'I am inclined to buy Number 2', selectedIndex: 2, purchaseIntent: true },
  { text: '未决定买第二个', selectedIndex: 2, purchaseIntent: true },
  { text: '尚未想好要买第二个', selectedIndex: 2, purchaseIntent: true },
  { text: '大概会买第二个', selectedIndex: 2, purchaseIntent: true },
  { text: '应该会买第二个', selectedIndex: 2, purchaseIntent: true },
]) {
  test(`discovery-only selection fails closed on denied purchase intent: ${JSON.stringify(input)}`, () => {
    const result = classifyPaymentIntent({
      ...input,
      pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
    assert.equal(result.reason, 'purchase_intent_missing');
    assert.equal(result.selectedProduct, undefined);
    assert.equal(result.requiresWallet, false);
  });
}

for (const input of [
  { text: 'this is only a test', selectedIndex: 2 },
  { text: 'maybe later', selectedIndex: 2 },
  { text: 'should I?', selectedIndex: 2 },
  { text: '不要第二个', selectedIndex: 2 },
  { text: '用户说选第二个', selectedIndex: 2 },
  { text: '我没说要买第二个', selectedIndex: 2 },
  { text: 'none of these', selectedIndex: 2 },
  { text: 'anything but Number 2', selectedIndex: 2 },
  { text: 'I already bought Number 2', selectedIndex: 2 },
  { text: 'not yet', selectedIndex: 2 },
  { text: '2', selectedIndex: 2, purchaseIntent: false },
]) {
  test(`current denial cannot reuse purchase-origin authorization: ${JSON.stringify(input)}`, () => {
    const result = classifyPaymentIntent({
      ...input,
      pendingCatalogProductSelection: pendingCatalogSelection,
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
    assert.equal(result.selectedProduct, undefined);
    assert.equal(result.pendingCatalogProductSelection.status, 'AWAITING_SELECTION');
  });
}

test('ambiguous English "no 2" cannot reuse purchase-origin authorization', () => {
  const result = classifyPaymentIntent({
    text: 'no 2',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.selectedProduct, undefined);
  assert.equal(result.pendingCatalogProductSelection.status, 'AWAITING_SELECTION');
});

test('structured purchase authorization can select from discovery-only results', () => {
  const result = classifyPaymentIntent({
    purchaseIntent: true,
    selectedIndex: 1,
    pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
  });

  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
  assert.equal(result.selectedProduct.productId, 'product_1');
});

test('selects a frozen internal Catalog product without requiring productUrl', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: pendingInternalCatalogSelection,
  });

  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
  assert.equal(result.selectedProduct.source, 'INTERNAL_UCP_CATALOG');
  assert.equal(result.selectedProduct.merchantId, 'mcht_ftmse61a6az0');
  assert.equal(result.selectedProduct.merchantUrl, 'https://testa.link2shops.com/');
  assert.equal(result.selectedProduct.productId, '571d217de068498f8ba545a286900a16');
  assert.equal(Object.hasOwn(result.selectedProduct, 'productUrl'), false);
  assert.equal(result.walletGate, PaymentWalletGate.REQUIRE_STATUS);
});

test('rejects an internal Catalog candidate whose merchant URL is absent', () => {
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingInternalCatalogSelection,
      candidates: [{
        ...pendingInternalCatalogSelection.candidates[0],
        merchant_url: undefined,
      }],
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_candidate_invalid');
  assert.deepEqual(result.missing, ['merchantUrl']);
});

test('rejects an internal Catalog product URL when the merchant list has no merchant_url', () => {
  const {
    merchant_url: _merchantUrl,
    ...candidateWithoutMerchantUrl
  } = pendingInternalCatalogSelection.candidates[0];
  const result = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      ...pendingInternalCatalogSelection,
      candidates: [{
        ...candidateWithoutMerchantUrl,
        url: 'https://testa.link2shops.com/product/voucher_1',
      }],
    },
  });

  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.reason, 'catalog_selection_candidate_invalid');
  assert.deepEqual(result.missing, ['merchantUrl']);
});

for (const conflictingSelection of [
  { text: '买第2个', selectedIndex: 1 },
  { text: 'buy Number 2', selectedIndex: 1 },
  { text: '买第2个', selectedProductId: 'product_1' },
  { text: 'buy Number 2', selectedProductId: 'product_1' },
  { text: '2', selectedIndex: 1, purchaseIntent: true },
  { purchaseIntent: true, selectedIndex: 1, selectedProductId: 'product_2' },
  { purchaseIntent: true, selectedIndex: 1, selected_index: 2 },
  { purchaseIntent: true, selectedProductId: 'product_1', selected_product_id: 'product_2' },
]) {
  test(`conflicting discovery selection signals fail closed: ${JSON.stringify(conflictingSelection)}`, () => {
    const result = classifyPaymentIntent({
      ...conflictingSelection,
      pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
    assert.equal(result.reason, 'catalog_product_selection_conflict');
    assert.equal(result.selectedProduct, undefined);
  });
}

for (const conflictingSelection of [
  { text: '2', selectedIndex: 1 },
  { text: '第2个', selectedProductId: 'product_1' },
]) {
  test(`purchase-origin selection signals also fail closed on conflicts: ${JSON.stringify(conflictingSelection)}`, () => {
    const result = classifyPaymentIntent({
      ...conflictingSelection,
      pendingCatalogProductSelection: pendingCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
    assert.equal(result.reason, 'catalog_product_selection_conflict');
    assert.equal(result.selectedProduct, undefined);
  });
}

for (const text of [
  'I choose Number 2',
  'No. 2',
  'buy #2',
  'buy the second one',
  '选择第二个',
  '第二个就好',
]) {
  test(`natural ordinal selection binds to the frozen candidate: ${text}`, () => {
    const selected = classifyPaymentIntent({
      text,
      selectedIndex: 2,
      pendingCatalogProductSelection: pendingCatalogSelection,
    });
    assert.equal(
      selected.action,
      PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT,
    );
    assert.equal(selected.selectedProduct.productId, 'product_2');

    const conflict = classifyPaymentIntent({
      text,
      selectedIndex: 1,
      pendingCatalogProductSelection: pendingCatalogSelection,
    });
    assert.equal(conflict.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
    assert.equal(conflict.reason, 'catalog_product_selection_conflict');
    assert.equal(conflict.selectedProduct, undefined);
  });
}

for (const text of [
  'please buy Number 2 thanks',
  '购买第2个，谢谢',
  'option 2',
  'I mean Number 2',
]) {
  test(`unbound text cannot be overridden by a structured selector: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      selectedIndex: 1,
      pendingCatalogProductSelection: pendingCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
    assert.equal(result.reason, 'catalog_product_selection_text_unbound');
    assert.equal(result.selectedProduct, undefined);
  });
}

for (const selectedIndex of [true, {}, [], '1.5']) {
  test(`non-integer structured catalog indexes never select a product: ${JSON.stringify(selectedIndex)}`, () => {
    const result = classifyPaymentIntent({
      purchaseIntent: true,
      selectedIndex,
      pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
    assert.equal(result.reason, 'selected_index_out_of_range');
    assert.equal(result.selectedProduct, undefined);
  });
}

test('a duplicate product id requires an index to disambiguate the frozen candidates', () => {
  const duplicateIdPending = {
    ...pendingDiscoveryOnlyCatalogSelection,
    candidates: pendingDiscoveryOnlyCatalogSelection.candidates.map((candidate, index) => ({
      ...candidate,
      product_id: 'duplicate_product',
      ...(index === 1
        ? { url: 'https://order.example.hk/store/HK081034?product_id=duplicate_product' }
        : {}),
    })),
  };
  const ambiguous = classifyPaymentIntent({
    purchaseIntent: true,
    selectedProductId: 'duplicate_product',
    pendingCatalogProductSelection: duplicateIdPending,
  });
  assert.equal(ambiguous.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
  assert.equal(ambiguous.reason, 'catalog_product_selection_conflict');

  const disambiguated = classifyPaymentIntent({
    purchaseIntent: true,
    selectedProductId: 'duplicate_product',
    selectedIndex: 2,
    pendingCatalogProductSelection: duplicateIdPending,
  });
  assert.equal(
    disambiguated.action,
    PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT,
  );
  assert.equal(disambiguated.selectedProduct.storeId, 'HK081034');
});

for (const text of [
  '买第2个',
  '我想买第二个',
  '我决定买第二个',
  '现在买第2个',
  'buy Number 2',
  'I want to buy Number 2',
  'I decided to buy Number 2',
  'now buy Number 2',
]) {
  test(`a canonical purchase-wrapped discovery selection is authorized: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      selectedIndex: 2,
      pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
    });

    assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT);
    assert.equal(result.selectedProduct.productId, 'product_2');
  });
}

test('an out-of-range explicit purchase from discovery-only results re-asks selection', () => {
  const result = classifyPaymentIntent({
    text: '买第 9 个',
    pendingCatalogProductSelection: pendingDiscoveryOnlyCatalogSelection,
  });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_PRODUCT_SELECTION);
  assert.equal(result.reason, 'selected_index_out_of_range');
});

test('an ordinal purchase without any frozen results does not search Catalog for the ordinal', () => {
  const result = classifyPaymentIntent({ text: '买第 2 个' });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_PAYMENT_TARGET);
  assert.equal(result.reason, 'payment_target_missing');
});

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
  assert.equal(result.selectedProduct.productUrl, 'https://order.example.hk/store/HK081034?product_id=product_2');
  assert.equal(result.selectedProduct.price, 4200);
  assert.equal(result.selectedProduct.currency, 'HKD');
  assert.equal(result.selectedProduct.quantity, 1);
  assert.equal(result.selectedProduct.catalogEnvironment, 'sandbox');
  assert.equal(result.selectedProduct.catalogLanguage, 'zh-Hant');
  assert.equal(result.pendingCatalogProductSelection.catalog_environment, 'sandbox');
  assert.equal(result.pendingCatalogProductSelection.catalog_language, 'zh-Hant-HK');
  assert.equal(result.pendingCatalogProductSelection.status, 'EXECUTING');
  assert.equal(result.purchaseIntent, true);
  assert.equal(result.requiresWallet, true);
  assert.equal(result.resultMode, 'PURCHASE_SELECTION');
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
  assert.equal(result.catalogLanguage, 'zh-Hant');
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
      + ` --query 'Bruce Lee tee' --language zh-Hant`
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
  assert.equal(result.catalogLanguage, 'zh-Hant');

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
  assert.equal(result.catalogLanguage, 'zh-Hant');
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
      purchaseIntent: true,
      resultMode: 'PURCHASE_SELECTION',
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
      purchaseIntent: true,
      resultMode: 'PURCHASE_SELECTION',
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
  assert.equal(result.selectedProduct.catalogLanguage, 'zh-Hant');
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
  assert.equal(result.pendingCatalogProductSelection.status, 'CANCELLED');
  assert.deepEqual(result.pendingTransition, {
    from: 'AWAITING_SELECTION',
    to: 'CANCELLED',
  });
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

test('a selected catalog snapshot is marked executing and cannot be replayed', () => {
  const selected = classifyPaymentIntent({
    text: '2',
    pendingCatalogProductSelection: pendingCatalogSelection,
  });
  assert.equal(selected.pendingCatalogProductSelection.status, 'EXECUTING');

  const replay = classifyPaymentIntent({
    text: '2',
    pendingCatalogProductSelection: selected.pendingCatalogProductSelection,
  });
  assert.notEqual(
    replay.action,
    PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT,
  );
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

for (const text of [
  'I already paid',
  'payment status',
  'payment failed',
  'I was browsing coffee',
  'hello',
  'how to pay',
  '我已经支付了',
  '支付状态',
  '支付失败',
  '我刚才在浏览咖啡',
  '你好',
  '如何支付',
]) {
  test(`ambient merchant data cannot authorize a non-executing payment turn: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_ambient',
      amount: '10',
      currency: 'USD',
    });

    assert.notEqual(result.route, PaymentIntentRoute.DIRECT_PAY);
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
    assert.equal(result.requiresWallet, false);
  });
}

for (const [name, authorization] of [
  ['false', { paymentAuthorized: false }],
  ['invalid', { paymentAuthorized: 'maybe' }],
  ['conflicting aliases', { paymentAuthorized: true, payment_authorized: false }],
  ['valid plus invalid alias', { paymentAuthorized: true, pay_authorized: {} }],
]) {
  test(`structured Direct Pay authorization fails closed when ${name}`, () => {
    const result = classifyPaymentIntent({
      text: 'pay now',
      merchantId: 'merchant_ambient',
      amount: '10',
      currency: 'USD',
      ...authorization,
    });

    assert.equal(result.state, PaymentIntentState.PAYMENT_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
    assert.equal(result.requiresWallet, false);
  });
}

test('an explicit structured Direct Pay authorization still selects the known merchant', () => {
  const result = classifyPaymentIntent({
    merchantId: 'merchant_current',
    amount: '10',
    currency: 'USD',
    paymentAuthorized: true,
  });

  assert.equal(result.state, PaymentIntentState.DIRECT_PAY_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

test('structured Catalog false cannot fall through to ambient Direct Pay', () => {
  const result = classifyPaymentIntent({
    catalogSearchIntent: false,
    merchantId: 'merchant_ambient',
    amount: '10',
    currency: 'USD',
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
  assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
  assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
  assert.equal(result.requiresWallet, false);
  assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
});

for (const text of [
  'list coffee beans, then order one',
  'search coffee, then order it',
]) {
  test(`explicit search-then-order language starts purchase-origin Catalog discovery: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_ambient',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
    assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

for (const text of [
  '看下咖啡豆',
  'give me coffee options',
  'what coffee products do you have?',
]) {
  test(`contextual product-discovery synonym routes anonymously: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_ambient',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'see you tomorrow',
  'I see your point',
  'the list is empty',
  'this show is good',
  'I find this confusing',
]) {
  test(`ordinary English verb usage is neither Catalog nor Direct Pay: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_ambient',
      amount: '10',
      currency: 'USD',
    });

    assert.notEqual(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.notEqual(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.notEqual(result.route, PaymentIntentRoute.DIRECT_PAY);
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'please do not look for coffee',
  'we were looking for coffee',
  'my boss asked me to find coffee',
  'show me how to search for coffee',
  'are you searching for coffee?',
  'is the coffee search running?',
  'search coffee then cancel',
  'find coffee, cancel that search',
  'do not give me coffee options',
  'I gave you coffee options yesterday',
  '请不要看下咖啡豆',
  '老板说让我搜索咖啡豆',
  '如何查找咖啡豆',
  '你正在搜索咖啡豆吗？',
  '搜索咖啡豆然后取消',
]) {
  test(`non-authorizing Catalog form fails closed across synonyms: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'find any product',
  'show me something',
  'list one item',
  'show all products',
  '搜索任意商品',
  '找一个产品',
  '看下所有产品',
  '列出全部目录产品',
]) {
  test(`generic Catalog grammar contains no executable query: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.deepEqual(result.missing, ['catalogQuery']);
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'find an app for Slack',
  'find software to sync local files',
  'find a tool that manages my calendar',
]) {
  test(`reverse workspace productization remains anonymous Catalog discovery: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_ambient',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
    assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
    assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
    assert.equal(result.authenticationMode, 'ANONYMOUS');
    assert.equal(result.requiresWallet, false);
  });
}

for (const text of [
  'I will not search for coffee',
  'I cannot search for coffee',
  'without searching for coffee',
  '不搜咖啡',
  '不会搜索咖啡',
  '不能搜索咖啡',
  '没打算搜索咖啡',
  'I am searching for coffee',
  'I had searched for coffee',
  'Alice searched for coffee',
  '我在搜索咖啡',
  '小王搜索了咖啡',
  'we discussed searching for coffee',
  'the phrase search coffee',
  'please explain search coffee',
  '“搜索咖啡”是什么意思',
  'should she search for coffee?',
  'does catalog search support coffee?',
  'why did product search fail?',
  'is product search working?',
  '为什么搜索失败了？',
  'search coffee, forget it',
  'search coffee, abort',
  '搜索咖啡，不用了',
  '搜索咖啡，作罢',
]) {
  test(`reported, denied, diagnostic, or cancelled Catalog text never executes: ${text}`, () => {
    const result = classifyPaymentIntent({
      text,
      merchantId: 'merchant_ambient',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
    assert.equal(result.requiresWallet, false);
    assert.notEqual(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  });
}

for (const text of [
  '在目录里搜索',
  '从目录中搜索',
  '找个东西',
]) {
  test(`Catalog container wording does not become a query: ${text}`, () => {
    const result = classifyPaymentIntent({ text });

    assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.equal(result.reason, 'catalog_query_missing');
    assert.deepEqual(result.missing, ['catalogQuery']);
    assert.equal(result.requiresWallet, false);
  });
}
