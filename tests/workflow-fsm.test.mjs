import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PaymentWorkflowAction,
  PaymentWorkflowState,
  classifyPaymentError,
  classifyPaymentObservation,
  classifyPaymentResponse,
  formatPaymentFsmMarker,
} from '../lib/payment-workflow-fsm.mjs';
import {
  EventWorkflowAction,
  EventWorkflowDomain,
  EventWorkflowState,
  classifyEventWorkflow,
  correlateEventWorkflow,
} from '../lib/event-workflow-fsm.mjs';
import {
  UcpCheckoutWorkflowAction,
  UcpCheckoutWorkflowState,
  classifyAuthorizationSelection,
  classifyUcpItemIdResolution,
  classifyUcpCheckoutObservation,
  classifyUcpCheckoutPrerequisites,
  classifyUcpPaymentSuccessEventObservation,
  classifyUcpProductIntent,
  extractShopifyVariantIdFromUrl,
  formatUcpCheckoutFsmMarker,
  normalizeUcpAmountToMinorUnitLong,
  selectShopifyVariant,
  shopifyProductJsonUrl,
} from '../lib/ucp-checkout-workflow-fsm.mjs';
import { formatWorkflowMarker } from '../lib/workflow-marker.mjs';

test('exports stable payment workflow enum contracts', () => {
  assert.deepEqual(Object.values(PaymentWorkflowState), [
    'PAYMENT_INPUT_MISSING',
    'ACCOUNT_PRECHECK',
    'READY_TO_PAY',
    'PAY_SUBMITTED',
    'PAY_SYNC_SUCCEEDED',
    'PAY_SYNC_FAILED',
    'THREE_DS_REQUIRED',
    'PAY_UNKNOWN',
    'WALLET_SETUP_REQUIRED',
    'CLI_ERROR',
  ]);
  assert.deepEqual(Object.values(PaymentWorkflowAction), [
    'ASK_FOR_INPUT',
    'RUN_PRECHECK',
    'RUN_PAY',
    'WAIT_EVENT',
    'SEND_3DS_AND_WAIT_EVENT',
    'RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION',
    'STOP_PAYMENT_FAILURE',
    'VERIFY_BEFORE_RETRY',
    'START_WALLET_SETUP',
    'SURFACE_ERROR',
  ]);
});

test('exports stable event workflow enum contracts', () => {
  assert.deepEqual(Object.values(EventWorkflowDomain), [
    'PAYMENT_METHOD',
    'PAYMENT',
    'REFUND',
    'RISK_RULE',
    'VIC',
    'UNKNOWN',
  ]);
  assert.deepEqual(Object.values(EventWorkflowAction), [
    'UPDATE_CACHE_AND_RETURN',
    'CACHE_ONLY',
    'RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION',
    'RETURN_FAILURE_AND_CLEAR_PENDING',
    'RETURN_REFUND_FINAL',
    'RETURN_RISK_RULE_UPDATED',
    'MARK_VIC_READY_AND_RETURN',
    'IGNORE_INTERMEDIATE',
    'LOG_ONLY',
  ]);
});

test('exports stable UCP checkout workflow enum contracts', () => {
  assert.deepEqual(Object.values(UcpCheckoutWorkflowState), [
    'PRODUCT_INPUT_MISSING',
    'PRODUCT_FROZEN',
    'FULFILLMENT_INPUT_MISSING',
    'FULFILLMENT_CLASSIFIED',
    'PAYMENT_INSTRUMENT_REQUIRED',
    'PAYMENT_INSTRUMENT_READY',
    'AUTHORIZATION_LIST_REQUIRED',
    'AUTHORIZATION_MATCHED',
    'AUTHORIZATION_DRAFT_REQUIRED',
    'ITEM_ID_REQUIRED',
    'ITEM_ID_EXTRACTED',
    'CHECKOUT_CREATE_READY',
    'CHECKOUT_CREATED',
    'CHECKOUT_READY_TO_COMPLETE',
    'CHECKOUT_COMPLETED',
    'CHECKOUT_PENDING',
    'CHECKOUT_FAILED',
    'CHECKOUT_UNKNOWN',
    'PAYMENT_SUCCESS_EVENT_REQUIRED',
    'PAYMENT_SUCCESS_EVENT_RECEIVED',
    'CLI_ERROR',
  ]);
  assert.deepEqual(Object.values(UcpCheckoutWorkflowAction), [
    'ASK_FOR_PRODUCT_INPUT',
    'FREEZE_PRODUCT',
    'ASK_FOR_FULFILLMENT',
    'REFRESH_PAYMENT_INSTRUMENT',
    'LIST_AUTHORIZATIONS',
    'START_AUTHORIZATION_DRAFT_AND_WAIT',
    'EXTRACT_ITEM_ID',
    'CREATE_CHECKOUT',
    'COMPLETE_CHECKOUT',
    'POLL_PAYMENT_SUCCESS_EVENT',
    'RETURN_PAYMENT_SUCCESS_EVENT',
    'WAIT_CHECKOUT',
    'VERIFY_CHECKOUT_BEFORE_RETRY',
    'STOP_CHECKOUT_FAILURE',
    'SURFACE_ERROR',
  ]);
});

test('detects product URL purchase intent and asks the agent to freeze product details', () => {
  assert.deepEqual(classifyUcpProductIntent({
    text: '帮我用clink pay买https://shop.example/products/ski-wax',
  }), {
    state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
    action: UcpCheckoutWorkflowAction.FREEZE_PRODUCT,
    terminal: false,
    reason: 'product_url_purchase_intent',
    productUrl: 'https://shop.example/products/ski-wax',
  });
});

test('classifies UCP checkout prerequisites without inventing product or fulfillment inputs', () => {
  assert.deepEqual(classifyUcpCheckoutPrerequisites({
    productUrl: 'https://shop.example/products/ski-wax',
    currency: 'USD',
  }), {
    state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
    action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
    terminal: false,
    reason: 'missing_product_input',
    missing: ['merchantUrl', 'title', 'amountMinor', 'quantity', 'fulfillmentType'],
  });

  assert.deepEqual(classifyUcpCheckoutPrerequisites({
    productUrl: 'https://shop.example/products/ski-wax',
    merchantUrl: 'https://shop.example/products/ski-wax',
    title: 'Ski Wax',
    currency: 'USD',
    amountMinor: 1200,
    quantity: 1,
    fulfillmentType: 'UNKNOWN',
  }), {
    state: UcpCheckoutWorkflowState.FULFILLMENT_INPUT_MISSING,
    action: UcpCheckoutWorkflowAction.ASK_FOR_FULFILLMENT,
    terminal: false,
    reason: 'unknown_fulfillment_type',
    missing: ['fulfillmentType'],
  });

  assert.deepEqual(classifyUcpCheckoutPrerequisites({
    productUrl: 'https://shop.example/products/ski-wax',
    merchantUrl: 'https://shop.example/products/ski-wax',
    title: 'Ski Wax',
    currency: 'USD',
    amountMinor: 1200,
    quantity: 1,
    fulfillmentType: 'NO_SHIPPING_REQUIRED',
  }), {
    state: UcpCheckoutWorkflowState.PAYMENT_INSTRUMENT_REQUIRED,
    action: UcpCheckoutWorkflowAction.REFRESH_PAYMENT_INSTRUMENT,
    terminal: false,
    reason: 'payment_instrument_required',
  });

  assert.deepEqual(classifyUcpCheckoutPrerequisites({
    productUrl: 'https://shop.example/products/ski-wax',
    merchantUrl: 'https://shop.example/products/ski-wax',
    title: 'Ski Wax',
    currency: 'USD',
    amountMinor: 1200,
    quantity: 1,
    fulfillmentType: 'NO_SHIPPING_REQUIRED',
    paymentInstrumentId: 'pi_123',
  }), {
    state: UcpCheckoutWorkflowState.AUTHORIZATION_LIST_REQUIRED,
    action: UcpCheckoutWorkflowAction.LIST_AUTHORIZATIONS,
    terminal: false,
    reason: 'ready_to_list_authorizations',
  });
});

test('routes authorization selection to draft creation or checkout continuation', () => {
  assert.deepEqual(classifyAuthorizationSelection({
    candidates: [],
  }), {
    state: UcpCheckoutWorkflowState.AUTHORIZATION_DRAFT_REQUIRED,
    action: UcpCheckoutWorkflowAction.START_AUTHORIZATION_DRAFT_AND_WAIT,
    terminal: false,
    reason: 'no_matching_authorization',
  });

  assert.deepEqual(classifyAuthorizationSelection({
    selected: {
      instructionId: 'ins_123',
      mandateId: 'mnd_123',
    },
  }), {
    state: UcpCheckoutWorkflowState.AUTHORIZATION_MATCHED,
    action: UcpCheckoutWorkflowAction.EXTRACT_ITEM_ID,
    terminal: false,
    reason: 'authorization_matched',
    instructionId: 'ins_123',
    mandateId: 'mnd_123',
  });
});

test('resolves Shopify direct variant URLs without fetching product JSON', () => {
  assert.equal(
    extractShopifyVariantIdFromUrl('https://shop.example/products/ski-wax?variant=45085516365894'),
    '45085516365894',
  );
  assert.equal(
    extractShopifyVariantIdFromUrl('https://shop.example/products/ski-wax'),
    null,
  );

  assert.deepEqual(classifyUcpItemIdResolution({
    productUrl: 'https://shop.example/products/ski-wax?variant=45085516365894',
    siteType: 'shopify',
  }), {
    state: UcpCheckoutWorkflowState.ITEM_ID_EXTRACTED,
    action: UcpCheckoutWorkflowAction.CREATE_CHECKOUT,
    terminal: false,
    reason: 'shopify_direct_variant_url',
    itemId: '45085516365894',
    variantId: '45085516365894',
  });
});

test('builds Shopify product JSON URLs from SPU product slugs', () => {
  assert.equal(
    shopifyProductJsonUrl('https://shop.example/products/selling-plans-ski-wax?utm_source=test#details'),
    'https://shop.example/products/selling-plans-ski-wax.js',
  );
  assert.equal(
    shopifyProductJsonUrl('https://shop.example/products/selling-plans-ski-wax.js?variant=123'),
    'https://shop.example/products/selling-plans-ski-wax.js',
  );

  assert.deepEqual(classifyUcpItemIdResolution({
    productUrl: 'https://shop.example/products/selling-plans-ski-wax',
    siteType: 'shopify',
  }), {
    state: UcpCheckoutWorkflowState.ITEM_ID_REQUIRED,
    action: UcpCheckoutWorkflowAction.EXTRACT_ITEM_ID,
    terminal: false,
    reason: 'shopify_product_json_required',
    productJsonUrl: 'https://shop.example/products/selling-plans-ski-wax.js',
  });
});

test('selects Shopify variants by id or user-selected options and asks when ambiguous', () => {
  const productJson = {
    options: [
      { name: 'Color', values: ['Blue', 'Red'] },
      { name: 'Size', values: ['S', 'M'] },
    ],
    variants: [
      { id: 111, title: 'Blue / S', option1: 'Blue', option2: 'S', available: true },
      { id: 222, title: 'Blue / M', option1: 'Blue', option2: 'M', available: true },
      { id: 333, title: 'Red / M', option1: 'Red', option2: 'M', available: true },
    ],
  };

  assert.deepEqual(selectShopifyVariant(productJson, { variantId: '222' }), {
    status: 'selected',
    reason: 'shopify_variant_id_match',
    variant: productJson.variants[1],
    variantId: '222',
  });

  assert.deepEqual(selectShopifyVariant(productJson, { options: { Color: 'Red', Size: 'M' } }), {
    status: 'selected',
    reason: 'shopify_variant_option_match',
    variant: productJson.variants[2],
    variantId: '333',
  });

  assert.deepEqual(selectShopifyVariant(productJson, { optionValues: ['M'] }), {
    status: 'selection_required',
    reason: 'shopify_variant_selection_ambiguous',
    variants: [
      { id: '222', title: 'Blue / M', available: true, options: { Color: 'Blue', Size: 'M' } },
      { id: '333', title: 'Red / M', available: true, options: { Color: 'Red', Size: 'M' } },
    ],
  });

  assert.deepEqual(classifyUcpItemIdResolution({
    productUrl: 'https://shop.example/products/ski-wax',
    siteType: 'shopify',
    productJson,
  }), {
    state: UcpCheckoutWorkflowState.PRODUCT_INPUT_MISSING,
    action: UcpCheckoutWorkflowAction.ASK_FOR_PRODUCT_INPUT,
    terminal: false,
    reason: 'shopify_variant_selection_required',
    productJsonUrl: 'https://shop.example/products/ski-wax.js',
    variants: [
      { id: '111', title: 'Blue / S', available: true, options: { Color: 'Blue', Size: 'S' } },
      { id: '222', title: 'Blue / M', available: true, options: { Color: 'Blue', Size: 'M' } },
      { id: '333', title: 'Red / M', available: true, options: { Color: 'Red', Size: 'M' } },
    ],
  });

  assert.deepEqual(classifyUcpItemIdResolution({
    productUrl: 'https://shop.example/products/ski-wax',
    siteType: 'shopify',
    productJson,
    variantSelection: { options: { Color: 'Blue', Size: 'M' } },
  }), {
    state: UcpCheckoutWorkflowState.ITEM_ID_EXTRACTED,
    action: UcpCheckoutWorkflowAction.CREATE_CHECKOUT,
    terminal: false,
    reason: 'shopify_variant_selected',
    itemId: '222',
    variantId: '222',
    variant: productJson.variants[1],
  });
});

test('classifies UCP checkout observations through create, complete, pending, and failure states', () => {
  assert.deepEqual(classifyUcpCheckoutObservation({
    operation: 'create',
    exitCode: 0,
    stdout: { ok: true, data: { id: 'chk_123', status: 'ready_for_complete' } },
  }), {
    state: UcpCheckoutWorkflowState.CHECKOUT_READY_TO_COMPLETE,
    action: UcpCheckoutWorkflowAction.COMPLETE_CHECKOUT,
    terminal: false,
    reason: 'ready_for_complete',
    checkoutId: 'chk_123',
  });

  assert.deepEqual(classifyUcpCheckoutObservation({
    operation: 'complete',
    exitCode: 0,
    stdout: { ok: true, data: { checkoutId: 'chk_123', orderId: 'ord_123', status: 'completed' } },
  }), {
    state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_REQUIRED,
    action: UcpCheckoutWorkflowAction.POLL_PAYMENT_SUCCESS_EVENT,
    terminal: false,
    reason: 'completed_poll_payment_success_event',
    checkoutId: 'chk_123',
    orderId: 'ord_123',
    pollCommand: 'clink-cli events poll --type agent_order.succeeded --format json',
  });

  assert.equal(
    classifyUcpCheckoutObservation({
      operation: 'complete',
      exitCode: 0,
      stdout: { ok: true, data: { checkout_id: 'chk_123', status: 'complete_in_progress' } },
    }).action,
    UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
  );

  assert.equal(
    classifyUcpCheckoutObservation({
      operation: 'complete',
      exitCode: 0,
      stdout: { ok: true, data: { id: 'chk_123', status: 'requires_escalation' } },
    }).action,
    UcpCheckoutWorkflowAction.STOP_CHECKOUT_FAILURE,
  );

  assert.deepEqual(classifyUcpCheckoutObservation({
    operation: 'complete',
    exitCode: 6,
    stderr: { ok: false, error: { code: 6, message: 'timeout' } },
  }), {
    state: UcpCheckoutWorkflowState.CHECKOUT_UNKNOWN,
    action: UcpCheckoutWorkflowAction.VERIFY_CHECKOUT_BEFORE_RETRY,
    terminal: false,
    reason: 'exit_6_unknown',
  });
});

test('classifies UCP payment success event polling and returns the success message', () => {
  const event = {
    type: 'agent_order.succeeded',
    data: {
      checkoutId: 'chk_123',
      orderId: 'ord_123',
      amount: 1200,
      currency: 'USD',
    },
  };

  assert.deepEqual(classifyUcpPaymentSuccessEventObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        ready: true,
        timedOut: false,
        events: [event],
        ackedEventIds: ['evt_123'],
      },
    },
  }, {
    checkoutId: 'chk_123',
    orderId: 'ord_123',
  }), {
    state: UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED,
    action: UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_EVENT,
    terminal: true,
    reason: 'agent_order.succeeded',
    event,
    message: 'Payment succeeded for order ord_123.',
  });

  assert.deepEqual(classifyUcpPaymentSuccessEventObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        ready: false,
        timedOut: true,
        resumeCommand: 'clink-cli events poll --type agent_order.succeeded --format json',
        events: [],
      },
    },
  }, {
    checkoutId: 'chk_123',
  }), {
    state: UcpCheckoutWorkflowState.CHECKOUT_PENDING,
    action: UcpCheckoutWorkflowAction.WAIT_CHECKOUT,
    terminal: false,
    reason: 'payment_success_event_timeout',
    resumeCommand: 'clink-cli events poll --type agent_order.succeeded --format json',
  });
});

test('normalizes user-facing UCP amounts to external minor-unit long values', () => {
  assert.equal(normalizeUcpAmountToMinorUnitLong({ amount: '12.34', currency: 'USD' }), 1234);
  assert.equal(normalizeUcpAmountToMinorUnitLong({ amount: '12', currency: 'USD' }), 1200);
  assert.equal(normalizeUcpAmountToMinorUnitLong({ amount: '1200', currency: 'USD', scale: 'minor' }), 1200);
  assert.throws(
    () => normalizeUcpAmountToMinorUnitLong({ amount: '12.345', currency: 'USD' }),
    /too many decimal places/,
  );
});

test('formats UCP checkout FSM markers consistently', () => {
  const workflow = classifyUcpCheckoutObservation({
    operation: 'complete',
    exitCode: 0,
    stdout: { ok: true, data: { checkoutId: 'chk_123', status: 'completed' } },
  });

  assert.equal(
    formatUcpCheckoutFsmMarker(workflow),
    '[UCP_CHECKOUT_FSM] state=PAYMENT_SUCCESS_EVENT_REQUIRED action=POLL_PAYMENT_SUCCESS_EVENT reason=completed_poll_payment_success_event',
  );
});

test('classifies payment response states and actions explicitly', () => {
  assert.deepEqual(classifyPaymentResponse({ channelPaymentResponse: { flag3DS: 1, status: 0 } }), {
    state: PaymentWorkflowState.THREE_DS_REQUIRED,
    action: PaymentWorkflowAction.SEND_3DS_AND_WAIT_EVENT,
    terminal: false,
    reason: '3ds_required',
  });

  assert.deepEqual(classifyPaymentResponse({ ok: true, data: { channelPaymentResponse: { status: 1 } } }), {
    state: PaymentWorkflowState.PAY_SYNC_SUCCEEDED,
    action: PaymentWorkflowAction.RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION,
    terminal: true,
    reason: 'status_1_success',
  });

  for (const status of [3, 4, 6]) {
    const result = classifyPaymentResponse({ channelPaymentResponse: { status } });
    assert.equal(result.state, PaymentWorkflowState.PAY_SYNC_FAILED);
    assert.equal(result.action, PaymentWorkflowAction.STOP_PAYMENT_FAILURE);
    assert.equal(result.terminal, true);
    assert.equal(result.reason, `status_${status}_failure`);
  }

  assert.deepEqual(classifyPaymentResponse({ channelPaymentResponse: { status: 0 } }), {
    state: PaymentWorkflowState.PAY_SUBMITTED,
    action: PaymentWorkflowAction.WAIT_EVENT,
    terminal: false,
    reason: 'status_0_wait_event',
  });
});

test('classifies CLI exits without retrying unknown payment state', () => {
  assert.deepEqual(classifyPaymentError({ exitCode: 6 }), {
    state: PaymentWorkflowState.PAY_UNKNOWN,
    action: PaymentWorkflowAction.VERIFY_BEFORE_RETRY,
    terminal: false,
    reason: 'exit_6_unknown',
  });

  assert.deepEqual(classifyPaymentError({ exitCode: 7 }), {
    state: PaymentWorkflowState.THREE_DS_REQUIRED,
    action: PaymentWorkflowAction.SEND_3DS_AND_WAIT_EVENT,
    terminal: false,
    reason: 'exit_7_3ds_required',
  });

  for (const exitCode of [3, 4]) {
    const result = classifyPaymentError({ exitCode });
    assert.equal(result.state, PaymentWorkflowState.WALLET_SETUP_REQUIRED);
    assert.equal(result.action, PaymentWorkflowAction.START_WALLET_SETUP);
    assert.equal(result.terminal, false);
  }
});

test('classifies complete payment observations and formats markers', () => {
  const workflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: { ok: true, data: { channelPaymentResponse: { status: 1 } } },
  });

  assert.deepEqual(workflow, {
    state: PaymentWorkflowState.PAY_SYNC_SUCCEEDED,
    action: PaymentWorkflowAction.RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION,
    terminal: true,
    reason: 'status_1_success',
  });
  assert.equal(
    formatPaymentFsmMarker(workflow),
    '[PAYMENT_FSM] state=PAY_SYNC_SUCCEEDED action=RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION reason=status_1_success',
  );
  assert.equal(
    formatWorkflowMarker('PAYMENT_FSM', workflow),
    '[PAYMENT_FSM] state=PAY_SYNC_SUCCEEDED action=RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION reason=status_1_success',
  );
});

test('classifies async events into domains, states, and actions', () => {
  assert.deepEqual(classifyEventWorkflow({ type: 'payment_method.added' }), {
    domain: EventWorkflowDomain.PAYMENT_METHOD,
    state: EventWorkflowState.METHOD_BOUND,
    action: EventWorkflowAction.UPDATE_CACHE_AND_RETURN,
    terminal: true,
    reason: 'payment_method.added',
  });

  assert.deepEqual(classifyEventWorkflow({ eventType: 'agent_order.succeeded' }), {
    domain: EventWorkflowDomain.PAYMENT,
    state: EventWorkflowState.PAY_ASYNC_SUCCEEDED,
    action: EventWorkflowAction.RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION,
    terminal: true,
    reason: 'agent_order.succeeded',
  });

  assert.equal(classifyEventWorkflow({ data: { type: 'agent_refund.failed' } }).state, EventWorkflowState.REFUND_FAILED);
  assert.equal(classifyEventWorkflow({ type: 'purchase_instruction.activated' }).state, EventWorkflowState.VIC_READY);
  assert.equal(classifyEventWorkflow({ type: 'new.future.event' }).action, EventWorkflowAction.LOG_ONLY);
});

test('classifies Visa-ready payment method updates as VIC ready', () => {
  assert.deepEqual(classifyEventWorkflow({
    type: 'payment_method.updated',
    data: {
      paymentInstrumentId: 'pi_visa',
      visaRegistrationSucceeded: true,
    },
  }), {
    domain: EventWorkflowDomain.VIC,
    state: EventWorkflowState.VIC_READY,
    action: EventWorkflowAction.MARK_VIC_READY_AND_RETURN,
    terminal: true,
    reason: 'payment_method.updated_vic_ready',
  });
});

test('formats event workflow markers consistently', () => {
  const workflow = classifyEventWorkflow({ eventType: 'agent_order.succeeded' });

  assert.equal(
    formatWorkflowMarker('EVENT_FSM', workflow),
    '[EVENT_FSM] domain=PAYMENT state=PAY_ASYNC_SUCCEEDED action=RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION reason=agent_order.succeeded',
  );
});

test('correlates payment and refund events to expected resources', () => {
  assert.deepEqual(correlateEventWorkflow({
    type: 'agent_order.succeeded',
    data: { sessionId: 'sess_123' },
  }, { sessionId: 'sess_123' }), {
    matched: true,
    missingKeys: [],
    mismatchedKeys: [],
    workflow: {
      domain: EventWorkflowDomain.PAYMENT,
      state: EventWorkflowState.PAY_ASYNC_SUCCEEDED,
      action: EventWorkflowAction.RETURN_SUCCESS_FOR_MERCHANT_CONFIRMATION,
      terminal: true,
      reason: 'agent_order.succeeded',
    },
  });

  assert.deepEqual(correlateEventWorkflow({
    type: 'agent_refund.failed',
    data: { refundOrderId: 'rfd_123' },
  }, { refundOrderId: 'rfd_456' }), {
    matched: false,
    missingKeys: [],
    mismatchedKeys: ['refundOrderId|refundId'],
    workflow: {
      domain: EventWorkflowDomain.REFUND,
      state: EventWorkflowState.REFUND_FAILED,
      action: EventWorkflowAction.RETURN_REFUND_FINAL,
      terminal: true,
      reason: 'agent_refund.failed',
    },
  });
});

test('correlates VIC events to instruction or payment instrument resources', () => {
  assert.deepEqual(correlateEventWorkflow({
    type: 'purchase_instruction.activated',
    data: { instructionId: 'ins_123' },
  }, { instructionId: 'ins_123' }).matched, true);

  assert.deepEqual(correlateEventWorkflow({
    type: 'payment_method.updated',
    data: {
      paymentInstrumentId: 'pi_visa',
      visaRegistrationSucceeded: true,
    },
  }, { paymentInstrumentId: 'pi_other' }), {
    matched: false,
    missingKeys: [],
    mismatchedKeys: ['paymentInstrumentId'],
    workflow: {
      domain: EventWorkflowDomain.VIC,
      state: EventWorkflowState.VIC_READY,
      action: EventWorkflowAction.MARK_VIC_READY_AND_RETURN,
      terminal: true,
      reason: 'payment_method.updated_vic_ready',
    },
  });
});

test('does not treat type-only events as correlated workflow completion', () => {
  const result = correlateEventWorkflow({ type: 'agent_order.succeeded' }, {});

  assert.equal(result.matched, false);
  assert.deepEqual(result.missingKeys, ['expectedResource']);
});
