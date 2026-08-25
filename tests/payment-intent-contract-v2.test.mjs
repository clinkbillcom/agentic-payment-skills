import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PaymentAuthorizationSource,
  PaymentDirectPayMode,
  PaymentExecutionDecision,
  PaymentIntentAction,
  PaymentIntentRoute,
  PaymentIntentState,
  PaymentRoutingOperation,
  PaymentWalletGate,
  classifyPaymentIntent,
  classifyPaymentIntentV2,
} from '../lib/payment-intent-router-fsm.mjs';

const boundRequest = {
  routingContractVersion: 2,
  requestId: 'request_1',
  turnId: 'turn_1',
  executionDecision: PaymentExecutionDecision.AUTHORIZED,
};

test('v2 product search is anonymous and derives a wallet skip', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    target: {
      catalogQuery: 'Slack channel backup app',
      catalogEnvironment: 'test',
      catalogLanguage: 'zh-hant-hk',
    },
    // Legacy/ambient context is deliberately outside the v2 envelope and cannot change routing.
    merchantId: 'merchant_ambient',
    amount: '99',
    currency: 'USD',
    paymentAuthorized: true,
    requiresWallet: true,
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.action, PaymentIntentAction.RUN_PUBLIC_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.catalogQuery, 'Slack channel backup app');
  assert.equal(result.catalogEnvironment, 'test');
  assert.equal(result.catalogLanguage, 'zh-Hant');
  assert.equal(result.purchaseIntent, false);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.authenticationMode, 'ANONYMOUS');
  assert.equal(result.walletGate, PaymentWalletGate.SKIP);
});

test('v2 product search preserves only nested explicit Catalog scope', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    target: {
      catalogQuery: 'coffee',
      catalogLanguage: 'en',
      merchantId: 'merchant_explicit',
    },
    merchantId: 'merchant_ambient',
  });

  assert.equal(result.merchantId, 'merchant_explicit');
  assert.equal(result.walletGate, PaymentWalletGate.SKIP);
});

test('v2 product search carries channel and store scope without a wallet', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    target: {
      catalogQuery: 'coffee',
      catalogLanguage: 'en',
      channelType: 'eat365',
      storeId: 'arabica_cheklapkok',
      addressCountry: 'hk',
    },
  });

  assert.equal(result.channelType, 'eats365');
  assert.equal(result.storeId, 'arabica_cheklapkok');
  assert.equal(result.addressCountry, 'HK');
  assert.equal(result.walletGate, PaymentWalletGate.SKIP);
});

test('v2 routing uses semantic intent rather than reparsing text', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    target: { catalogQuery: 'contact cleanup software', catalogLanguage: 'en' },
    text: 'This text is retained for audit and is not an authorization parser input.',
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.catalogQuery, 'contact cleanup software');
  assert.equal(result.requiresWallet, false);
});

test('v2 keeps the trusted semantic decision authoritative over audit text and legacy aliases', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.DIRECT_PAY,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: { merchantId: 'merchant_current' },
    payment: { mode: PaymentDirectPayMode.DIRECT, amount: '10.00', currency: 'USD' },
    text: 'do not pay this conditional example',
    paymentAuthorized: false,
    purchaseIntent: false,
    catalogSearchIntent: true,
  });

  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.executionDecision, PaymentExecutionDecision.AUTHORIZED);
  assert.equal(result.walletGate, PaymentWalletGate.REQUIRE_STATUS);
});

test('semantic search intent remains discovery-only when purchase is explicitly denied', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    target: { catalogQuery: 'coffee', catalogLanguage: 'en' },
    text: 'do not buy; find coffee',
  });

  assert.equal(result.route, PaymentIntentRoute.CATALOG_SEARCH);
  assert.equal(result.purchaseIntent, false);
  assert.equal(result.requiresWallet, false);
});

test('a denied v2 product search runs neither Catalog nor wallet', () => {
  const result = classifyPaymentIntent({
    routingContractVersion: 2,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    executionDecision: PaymentExecutionDecision.DENIED,
    target: { catalogQuery: 'coffee' },
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_SEARCH_NOT_AUTHORIZED);
  assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
  assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PUBLIC_CATALOG_DISCOVERY);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.walletGate, PaymentWalletGate.SKIP);
});

test('v2 product search asks for its semantic query without entering wallet setup', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    target: {},
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_DISCOVERY_INPUT_MISSING);
  assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
  assert.deepEqual(result.missing, ['target.catalogQuery']);
  assert.equal(result.requiresWallet, false);
});

test('v2 product search fails closed on invalid Catalog context', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_SEARCH,
    target: { catalogQuery: 'coffee', catalogEnvironment: 'uat', catalogLanguage: 'en' },
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.reason, 'catalog_environment_invalid');
  assert.equal(result.requiresWallet, false);
});

for (const operation of [
  PaymentRoutingOperation.CATALOG_SEARCH,
  PaymentRoutingOperation.CATALOG_PURCHASE,
]) {
  test(`v2 ${operation} requires Agent-owned target.catalogLanguage without wallet work`, () => {
    const result = classifyPaymentIntent({
      ...boundRequest,
      operation,
      ...(operation === PaymentRoutingOperation.CATALOG_PURCHASE
        ? { authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN }
        : {}),
      // Alias and ambient copies cannot fill the exact v2 field or ask the query to guess.
      target: { catalogQuery: '中文商品', language: 'zh-Hans' },
      catalogLanguage: 'zh-Hans',
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.action, PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT);
    assert.equal(result.reason, 'catalog_language_missing');
    assert.deepEqual(result.missing, ['target.catalogLanguage']);
    assert.equal(result.requiresWallet, false);
    assert.equal(
      result.walletGate,
      operation === PaymentRoutingOperation.CATALOG_PURCHASE
        ? PaymentWalletGate.DEFER_UNTIL_SELECTION
        : PaymentWalletGate.SKIP,
    );
  });
}

for (const catalogLanguage of ['und', 'zh-US', 'zh_Latn']) {
  test(`v2 Catalog rejects a language the CLI cannot normalize: ${catalogLanguage}`, () => {
    const result = classifyPaymentIntent({
      ...boundRequest,
      operation: PaymentRoutingOperation.CATALOG_SEARCH,
      target: { catalogQuery: 'coffee', catalogLanguage },
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.reason, 'catalog_language_invalid');
    assert.deepEqual(result.missing, ['target.catalogLanguage']);
    assert.equal(result.walletGate, PaymentWalletGate.SKIP);
  });
}

test('v2 described-product purchase keeps discovery anonymous until selection', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_PURCHASE,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {
      catalogQuery: 'Bruce Lee T-shirt',
      catalogLanguage: 'en',
      merchantId: 'merchant_explicit_scope',
    },
  });

  assert.equal(result.state, PaymentIntentState.CATALOG_PURCHASE_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.CATALOG_PURCHASE);
  assert.equal(result.action, PaymentIntentAction.RUN_CATALOG_DISCOVERY_WORKFLOW);
  assert.equal(result.purchaseIntent, true);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.authenticationMode, 'ANONYMOUS');
  assert.equal(result.resultMode, 'PURCHASE_SELECTION');
  assert.equal(result.walletGate, PaymentWalletGate.DEFER_UNTIL_SELECTION);
});

test('v2 described-product purchase with missing scope still defers wallet work', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_PURCHASE,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {},
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.walletGate, PaymentWalletGate.DEFER_UNTIL_SELECTION);
});

test('v2 purchase intent requires an explicit bound authorization source', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.CATALOG_PURCHASE,
    target: { catalogQuery: 'coffee' },
  });

  assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
  assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
  assert.equal(result.reason, 'routing_contract_authorization_missing');
  assert.equal(result.requiresWallet, false);
});

test('v2 resolved-product purchase enters the authenticated checkout wallet gate', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.UCP_CHECKOUT,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {
      productUrl: 'https://merchant.example/products/coffee',
      productName: 'Coffee',
    },
  });

  assert.equal(result.state, PaymentIntentState.UCP_CHECKOUT_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.UCP_CHECKOUT);
  assert.equal(result.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  assert.equal(result.requiresWallet, true);
  assert.equal(result.authenticationMode, 'AUTHENTICATED');
  assert.equal(result.walletGate, PaymentWalletGate.REQUIRE_STATUS);
  assert.equal(result.requiresProductParse, true);
});

test('v2 checkout rejects a bare item id without a product URL', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.UCP_CHECKOUT,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: { itemId: 'sku_unbound' },
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.deepEqual(result.missing, ['target.productUrl']);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.walletGate, PaymentWalletGate.SKIP);
});

test('v2 checkout accepts a frozen internal Catalog product without a product page', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.UCP_CHECKOUT,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {
      source: 'INTERNAL_UCP_CATALOG',
      merchantId: 'mcht_fuhui',
      merchantUrl: 'https://merchant.example/catalog',
      merchantDomain: 'merchant.example',
      itemId: 'voucher_1',
      productName: 'HungryPanda(US)',
      catalogEnvironment: 'sandbox',
      catalogLanguage: 'zh-Hans',
    },
  });

  assert.equal(result.state, PaymentIntentState.UCP_CHECKOUT_SELECTED);
  assert.equal(result.reason, 'structured_internal_catalog_checkout_intent');
  assert.equal(result.merchantId, 'mcht_fuhui');
  assert.equal(result.merchantUrl, 'https://merchant.example/catalog');
  assert.equal(result.itemId, 'voucher_1');
  assert.equal(result.requiresProductParse, false);
  assert.equal(result.validateItemAgainstProductUrl, false);
  assert.equal(result.walletGate, PaymentWalletGate.REQUIRE_STATUS);
});

test('v2 internal Catalog checkout fails closed without an authoritative merchant URL', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.UCP_CHECKOUT,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {
      source: 'INTERNAL_UCP_CATALOG',
      merchantId: 'mcht_fuhui',
      merchantDomain: 'merchant.example',
      itemId: 'voucher_1',
      productName: 'HungryPanda(US)',
      catalogEnvironment: 'sandbox',
      catalogLanguage: 'zh-Hans',
    },
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.reason, 'routing_contract_internal_catalog_target_missing');
  assert.deepEqual(result.missing, ['target.merchantUrl']);
  assert.equal(result.walletGate, PaymentWalletGate.SKIP);
});

test('v2 internal Catalog checkout rejects a merchant URL on another domain', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.UCP_CHECKOUT,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {
      source: 'INTERNAL_UCP_CATALOG',
      merchantId: 'mcht_fuhui',
      merchantUrl: 'https://other.example/catalog',
      merchantDomain: 'merchant.example',
      itemId: 'voucher_1',
      productName: 'HungryPanda(US)',
      catalogEnvironment: 'sandbox',
      catalogLanguage: 'zh-Hans',
    },
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.equal(result.reason, 'routing_contract_target_invalid');
  assert.deepEqual(result.invalidFields, ['target.merchantUrl']);
});

test('v2 direct pay requires exact target and payment scope', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.DIRECT_PAY,
    authorizationSource: PaymentAuthorizationSource.UPSTREAM_MERCHANT_WORKFLOW,
    target: { merchantId: 'merchant_current' },
    payment: { mode: PaymentDirectPayMode.DIRECT, amount: '10.00', currency: 'usd' },
  });

  assert.equal(result.state, PaymentIntentState.DIRECT_PAY_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  assert.equal(result.merchantId, 'merchant_current');
  assert.equal(result.amount, '10.00');
  assert.equal(result.currency, 'USD');
  assert.equal(result.paymentMode, PaymentDirectPayMode.DIRECT);
  assert.equal(result.requiresWallet, true);
  assert.equal(result.walletGate, PaymentWalletGate.REQUIRE_STATUS);
});

test('v2 session pay is a distinct mutually exclusive payment mode', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.DIRECT_PAY,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {},
    payment: { mode: PaymentDirectPayMode.SESSION, sessionId: 'session_1' },
  });

  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.action, PaymentIntentAction.RUN_DIRECT_PAY_WORKFLOW);
  assert.equal(result.paymentMode, PaymentDirectPayMode.SESSION);
  assert.equal(result.sessionId, 'session_1');
  assert.equal(result.merchantId, undefined);
  assert.equal(result.walletGate, PaymentWalletGate.REQUIRE_STATUS);
});

for (const payment of [
  { mode: PaymentDirectPayMode.DIRECT, amount: '0', currency: 'USD' },
  { mode: PaymentDirectPayMode.DIRECT, amount: '-1', currency: 'USD' },
  { mode: PaymentDirectPayMode.DIRECT, amount: '1e3', currency: 'USD' },
  { mode: PaymentDirectPayMode.DIRECT, amount: '9007199254740993', currency: 'USD' },
  { mode: PaymentDirectPayMode.DIRECT, amount: '0.10000000000000001', currency: 'USD' },
  { mode: PaymentDirectPayMode.DIRECT, amount: 10, currency: 'USD' },
  { mode: PaymentDirectPayMode.DIRECT, amount: '10', currency: 'US' },
]) {
  test(`v2 direct pay rejects non-canonical payment scope: ${JSON.stringify(payment)}`, () => {
    const result = classifyPaymentIntent({
      ...boundRequest,
      operation: PaymentRoutingOperation.DIRECT_PAY,
      authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
      target: { merchantId: 'merchant_1' },
      payment,
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.walletGate, PaymentWalletGate.SKIP);
  });
}

test('v2 direct pay accepts formatting-only JSON number normalization', () => {
  for (const amount of ['10.00', '0.0000001']) {
    const result = classifyPaymentIntent({
      ...boundRequest,
      operation: PaymentRoutingOperation.DIRECT_PAY,
      authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
      target: { merchantId: 'merchant_1' },
      payment: { mode: PaymentDirectPayMode.DIRECT, amount, currency: 'USD' },
    });

    assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
    assert.equal(result.amount, amount);
  }
});

for (const input of [
  {
    target: { merchantId: 'merchant_1' },
    payment: {
      mode: PaymentDirectPayMode.DIRECT,
      amount: '10',
      currency: 'USD',
      sessionId: 'session_1',
    },
  },
  {
    target: { merchantId: 'merchant_1' },
    payment: { mode: PaymentDirectPayMode.SESSION, sessionId: 'session_1' },
  },
]) {
  test(`v2 direct and session scopes cannot be mixed: ${JSON.stringify(input)}`, () => {
    const result = classifyPaymentIntent({
      ...boundRequest,
      operation: PaymentRoutingOperation.DIRECT_PAY,
      authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
      ...input,
    });

    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(result.reason, 'routing_contract_payment_mode_conflict');
    assert.equal(result.requiresWallet, false);
    assert.equal(result.walletGate, PaymentWalletGate.SKIP);
  });
}

test('ambient top-level payment fields cannot fill a v2 Direct Pay scope', () => {
  const result = classifyPaymentIntent({
    ...boundRequest,
    operation: PaymentRoutingOperation.DIRECT_PAY,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: {},
    payment: { mode: PaymentDirectPayMode.DIRECT },
    merchantId: 'merchant_ambient',
    amount: '10',
    currency: 'USD',
  });

  assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
  assert.deepEqual(result.missing, [
    'target.merchantId',
    'payment.amount',
    'payment.currency',
  ]);
  assert.equal(result.requiresWallet, false);
  assert.equal(result.walletGate, PaymentWalletGate.SKIP);
});

test('v2 Direct Pay cannot be authorized by text or a legacy boolean', () => {
  const result = classifyPaymentIntent({
    routingContractVersion: 2,
    operation: PaymentRoutingOperation.DIRECT_PAY,
    executionDecision: PaymentExecutionDecision.DENIED,
    text: 'pay now',
    paymentAuthorized: true,
    target: { merchantId: 'merchant_ambient' },
    payment: { amount: '10', currency: 'USD' },
  });

  assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
  assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
  assert.equal(result.requiresWallet, false);
});

for (const operation of Object.values(PaymentRoutingOperation)) {
  test(`v2 clarification for ${operation} never enters Catalog or wallet`, () => {
    const result = classifyPaymentIntent({
      routingContractVersion: 2,
      operation,
      executionDecision: PaymentExecutionDecision.CLARIFY,
    });

    const catalogOperation = operation === PaymentRoutingOperation.CATALOG_SEARCH
      || operation === PaymentRoutingOperation.CATALOG_PURCHASE;
    assert.equal(result.route, PaymentIntentRoute.INPUT_REQUIRED);
    assert.equal(
      result.action,
      catalogOperation
        ? PaymentIntentAction.ASK_FOR_CATALOG_DISCOVERY_INPUT
        : PaymentIntentAction.ASK_FOR_PAYMENT_TARGET,
    );
    assert.equal(result.reason, 'intent_clarification_required');
    assert.equal(result.requiresWallet, false);
    assert.equal(result.walletGate, PaymentWalletGate.SKIP);
  });
}

for (const input of [
  {
    routingContractVersion: 3,
    operation: PaymentRoutingOperation.DIRECT_PAY,
    executionDecision: PaymentExecutionDecision.AUTHORIZED,
    text: 'pay now',
  },
  {
    routingContractVersion: 2,
    operation: 'PAY_WHATEVER_TEXT_SAYS',
    executionDecision: PaymentExecutionDecision.AUTHORIZED,
    requestId: 'request_1',
    turnId: 'turn_1',
    target: { merchantId: 'merchant_1' },
    payment: { amount: '10', currency: 'USD' },
  },
  {
    routingContractVersion: 2,
    operation: PaymentRoutingOperation.DIRECT_PAY,
    executionDecision: PaymentExecutionDecision.AUTHORIZED,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    target: { merchantId: 'merchant_1' },
    payment: { amount: '10', currency: 'USD' },
  },
]) {
  test(`invalid or unbound v2 contract fails closed: ${JSON.stringify(input)}`, () => {
    const result = classifyPaymentIntentV2(input);

    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.action, PaymentIntentAction.DO_NOT_RUN_PAYMENT_WORKFLOW);
    assert.equal(result.requiresWallet, false);
    assert.equal(result.walletGate, PaymentWalletGate.SKIP);
  });
}

for (const routingContractVersion of ['2', null, 3]) {
  test(`a present unsupported routing contract version never falls through to legacy: ${String(routingContractVersion)}`, () => {
    const result = classifyPaymentIntent({
      routingContractVersion,
      text: 'pay now',
      paymentAuthorized: true,
      purchaseIntent: true,
      merchantId: 'merchant_legacy',
      amount: '10',
      currency: 'USD',
    });

    assert.equal(result.route, PaymentIntentRoute.NO_ACTION);
    assert.equal(result.reason, 'routing_contract_version_unsupported');
    assert.equal(result.receivedRoutingContractVersion, routingContractVersion);
    assert.equal(result.supportedRoutingContractVersion, 2);
    assert.equal(result.walletGate, PaymentWalletGate.SKIP);
  });
}

test('only an absent routing contract version may enter the legacy compatibility adapter', () => {
  const result = classifyPaymentIntent({
    paymentAuthorized: true,
    merchantId: 'merchant_legacy',
    amount: '10',
    currency: 'USD',
  });

  assert.equal(result.route, PaymentIntentRoute.DIRECT_PAY);
  assert.equal(result.routingContractVersion, undefined);
});
