import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PaymentIntentState,
  PaymentIntentRoute,
  PaymentIntentAction,
  classifyPaymentIntent,
} from '../lib/payment-intent-router-fsm.mjs';

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
