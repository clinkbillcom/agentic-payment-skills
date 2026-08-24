import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UcpCheckoutWorkflowAction,
  UcpCheckoutWorkflowState,
  classifyUcpCheckoutPrerequisites,
  classifyUcpParseItemObservation,
} from '../lib/ucp-checkout-workflow-fsm.mjs';

const singleItemPayload = {
  itemUrl: 'https://shop.example/products/ski-wax',
  merchantOrigin: 'https://shop.example',
  merchantDomain: 'shop.example',
  merchantName: 'Shop Example',
  currency: 'USD',
  items: [
    {
      itemId: 'variant_123',
      title: 'Ski Wax',
      unitPriceMinor: 1299,
      available: true,
      itemUrl: 'https://shop.example/products/ski-wax?variant=123',
      options: { Size: '100g' },
      inventoryStatus: 'in_stock',
    },
  ],
};

const checkoutPrerequisites = {
  productUrl: 'https://shop.example/products/ski-wax',
  merchantUrl: 'https://shop.example',
  title: 'Ski Wax',
  currency: 'USD',
  amountMinor: 1299,
  quantity: 1,
  fulfillmentType: 'NO_SHIPPING_REQUIRED',
  paymentInstrumentId: 'pm_123',
};

test('catalog candidate checkout continues only when wallet and Catalog origins match', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalogEnvironment: 'sandbox', catalogLanguage: 'zh-Hant-HK' },
    walletStatus: { ok: true, data: { baseUrl: 'https://uat-api.clinkbill.com' } },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.AUTHORIZATION_LIST_REQUIRED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.LIST_AUTHORIZATIONS);
});

test('catalog candidate checkout fails closed on an environment mismatch', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalog_environment: 'test' },
    walletStatus: { ok: true, data: { baseUrl: 'https://api.clinkbill.com' } },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_environment_mismatch');
  assert.equal(result.expectedWalletOrigin, 'https://api.clinkbill.dev');
  assert.equal(result.walletOrigin, 'https://api.clinkbill.com');
  assert.equal(result.terminal, true);
});

test('catalog candidate checkout does not trust a matching explicit wallet URL without status', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalogEnvironment: 'test' },
    walletBaseUrl: 'https://api.clinkbill.dev',
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_wallet_environment_unverified');
  assert.equal(result.expectedWalletOrigin, 'https://api.clinkbill.dev');
  assert.equal(result.terminal, true);
});

test('catalog candidate checkout fails closed when top-level input conflicts with the selected product', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    catalogEnvironment: 'production',
    selectedProduct: { catalogEnvironment: 'sandbox' },
    walletStatus: { ok: true, data: { baseUrl: 'https://uat-api.clinkbill.com' } },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_environment_context_conflict');
  assert.equal(result.selectedCatalogEnvironment, 'sandbox');
  assert.equal(result.inputCatalogEnvironment, 'production');
  assert.equal(result.terminal, true);
});

test('catalog candidate checkout rejects a selected product without its frozen environment', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    catalogEnvironment: 'production',
    selectedProduct: { productId: 'product_1' },
    walletStatus: { ok: true, data: { baseUrl: 'https://api.clinkbill.com' } },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_environment_context_missing');
  assert.deepEqual(result.missing, ['selectedProduct.catalogEnvironment']);
});

test('catalog candidate checkout rejects a malformed selected product instead of using top-level input', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    catalogEnvironment: 'production',
    selectedProduct: 'product_1',
    walletStatus: { ok: true, data: { baseUrl: 'https://api.clinkbill.com' } },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_selected_product_context_invalid');
});

test('catalog candidate checkout fails closed when an explicit URL conflicts with wallet status', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalogEnvironment: 'sandbox' },
    walletBaseUrl: 'https://api.clinkbill.com',
    walletStatus: { ok: true, data: { baseUrl: 'https://uat-api.clinkbill.com' } },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_wallet_environment_conflict');
  assert.equal(result.walletStatusOrigin, 'https://uat-api.clinkbill.com');
  assert.equal(result.inputWalletOrigin, 'https://api.clinkbill.com');
  assert.equal(result.terminal, true);
});

test('catalog candidate checkout rejects malformed wallet status instead of falling back to an explicit URL', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalogEnvironment: 'production' },
    walletBaseUrl: 'https://api.clinkbill.com',
    walletStatus: { ok: true, data: {} },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_wallet_environment_unverified');
});

test('catalog candidate checkout rejects a string wallet status ok flag without URL fallback', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalogEnvironment: 'production' },
    walletBaseUrl: 'https://api.clinkbill.com',
    walletStatus: {
      ok: 'true',
      data: { baseUrl: 'https://api.clinkbill.com' },
    },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_wallet_environment_unverified');
});

test('catalog candidate checkout rejects a non-empty wallet status error without URL fallback', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalogEnvironment: 'production' },
    walletBaseUrl: 'https://api.clinkbill.com',
    walletStatus: {
      ok: true,
      error: 'wallet status failed',
      data: { baseUrl: 'https://api.clinkbill.com' },
    },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_wallet_environment_unverified');
});

for (const malformedData of [null, [], 'not-an-object']) {
  test(`catalog candidate checkout rejects wallet status data ${JSON.stringify(malformedData)} without URL fallback`, () => {
    const result = classifyUcpCheckoutPrerequisites({
      ...checkoutPrerequisites,
      selectedProduct: { catalogEnvironment: 'production' },
      walletBaseUrl: 'https://api.clinkbill.com',
      walletStatus: {
        ok: true,
        data: malformedData,
        baseUrl: 'https://api.clinkbill.com',
      },
    });

    assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
    assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
    assert.equal(result.reason, 'catalog_checkout_wallet_environment_unverified');
  });
}

test('catalog candidate checkout rejects conflicting camel and snake wallet status envelopes', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    selectedProduct: { catalogEnvironment: 'sandbox' },
    walletStatus: { ok: true, data: { baseUrl: 'https://uat-api.clinkbill.com' } },
    wallet_status: { ok: true, data: { base_url: 'https://api.clinkbill.com' } },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_wallet_environment_conflict');
  assert.deepEqual(result.walletStatusOrigins, [
    'https://uat-api.clinkbill.com',
    'https://api.clinkbill.com',
  ]);
});

test('catalog candidate checkout fails closed until wallet environment is verified', () => {
  const result = classifyUcpCheckoutPrerequisites({
    ...checkoutPrerequisites,
    catalogEnvironment: 'production',
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'catalog_checkout_wallet_environment_unverified');
  assert.equal(result.expectedWalletOrigin, 'https://api.clinkbill.com');
});

test('parse-item observation selects a single available item and computes total from intent quantity', () => {
  const result = classifyUcpParseItemObservation({
    stdout: { ok: true, data: singleItemPayload },
    quantity: 2,
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.ITEM_SELECTED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.RESOLVE_CHECKOUT_ROUTE);
  assert.equal(result.reason, 'single_available_item_selected');
  assert.equal(result.currency, 'USD');
  assert.equal(result.item.itemId, 'variant_123');
  assert.equal(result.quantity, 2);
  assert.equal(result.totalAmountMinor, 2598);
});

test('parse-item observation asks for item selection when multiple products exist and user is present', () => {
  const result = classifyUcpParseItemObservation({
    stdout: {
      ok: true,
      data: {
        ...singleItemPayload,
        items: [
          singleItemPayload.items[0],
          { ...singleItemPayload.items[0], itemId: 'variant_456', options: { Size: '200g' } },
        ],
      },
    },
    userPresent: true,
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.ITEM_SELECTION_REQUIRED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.ASK_FOR_ITEM_SELECTION);
  assert.equal(result.reason, 'multiple_items_user_selection_required');
});

test('parse-item observation delegates selection to context when multiple products exist and user is absent', () => {
  const result = classifyUcpParseItemObservation({
    stdout: {
      ok: true,
      data: {
        ...singleItemPayload,
        items: [
          singleItemPayload.items[0],
          { ...singleItemPayload.items[0], itemId: 'variant_456', options: { Size: '200g' } },
        ],
      },
    },
    userPresent: false,
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.ITEM_SELECTION_REQUIRED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SELECT_ITEM_BY_CONTEXT);
  assert.equal(result.reason, 'multiple_items_context_selection_required');
});

test('parse-item observation stops when the only item is unavailable', () => {
  const result = classifyUcpParseItemObservation({
    stdout: {
      ok: true,
      data: {
        ...singleItemPayload,
        items: [{ ...singleItemPayload.items[0], available: false }],
      },
    },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE);
  assert.equal(result.reason, 'parse_item_no_available_items');
});

test('parse-item observation asks for product input when required page facts are missing', () => {
  const result = classifyUcpParseItemObservation({
    stdout: {
      ok: true,
      data: {
        ...singleItemPayload,
        currency: '',
      },
    },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING);
  assert.equal(result.action, UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT);
  assert.equal(result.reason, 'parse_item_missing_required_fields');
  assert.deepEqual(result.missing, ['currency']);
});

test('parse-item observation requires each item URL before selection', () => {
  const result = classifyUcpParseItemObservation({
    stdout: {
      ok: true,
      data: {
        ...singleItemPayload,
        items: [{ ...singleItemPayload.items[0], itemUrl: '' }],
      },
    },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING);
  assert.equal(result.action, UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT);
  assert.equal(result.reason, 'parse_item_missing_required_fields');
  assert.deepEqual(result.missing, ['items[0].itemUrl']);
});

test('parse-item observation reports invalid item price without throwing', () => {
  const result = classifyUcpParseItemObservation({
    stdout: {
      ok: true,
      data: {
        ...singleItemPayload,
        items: [{ ...singleItemPayload.items[0], unitPriceMinor: '12.99' }],
      },
    },
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING);
  assert.equal(result.action, UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT);
  assert.equal(result.reason, 'parse_item_invalid_required_fields');
  assert.deepEqual(result.invalid, ['items[0].unitPriceMinor']);
});
