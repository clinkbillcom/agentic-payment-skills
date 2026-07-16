import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PaymentIntentState,
  PaymentIntentRoute,
  PaymentIntentAction,
  classifyPaymentIntent,
} from '../lib/payment-intent-router-fsm.mjs';

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

test('rejects multiple distinct identity targets instead of choosing the first', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/a 或 clinkpay/b 2 USD' });

  assert.equal(result.action, PaymentIntentAction.ASK_FOR_SKILL_TIP_INPUT);
  assert.equal(result.reason, 'skill_tip_target_ambiguous');
  assert.deepEqual(result.missing, ['single_target']);
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
