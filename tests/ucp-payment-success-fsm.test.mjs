import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UcpCheckoutWorkflowState,
  UcpCheckoutWorkflowAction,
  classifyUcpCheckoutObservation,
  classifyUcpOrderFetchObservation,
  classifyUcpOrderResolutionObservation,
  classifyUcpPaymentSuccessEventObservation,
} from '../lib/ucp-checkout-workflow-fsm.mjs';

const checkoutId = 'checkout_abc123';
const ucpOrderId = 'order_ucp_xyz';
const paymentOrderId = 'order_payment_xyz';

const successEventOutput = (eventCheckoutId, eventPaymentOrderId = paymentOrderId) => JSON.stringify({
  ok: true,
  data: {
    events: [{
      eventType: 'agent_order.succeeded',
      resourceId: eventPaymentOrderId,
      data: { checkoutId: eventCheckoutId, orderId: eventPaymentOrderId },
    }],
    timedOut: false,
  },
});

const completedCheckoutOutput = (orderId = ucpOrderId, id = checkoutId) => JSON.stringify({
  ok: true,
  data: {
    id,
    status: 'completed',
    ...(orderId ? { order: { id: orderId } } : {}),
  },
});

const correlatedSuccessContext = (expectedResource = {}) => (
  classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId, ...expectedResource },
  )
);

// --- correlation ---

test('matches event by checkoutId when present in expectedResource', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId },
  );
  assert.notEqual(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
});

test('rejects event whose checkoutId does not match', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput('checkout_someone_else') },
    { checkoutId },
  );
  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
  assert.equal(result.reason, 'payment_success_event_not_observed');
});

test('does not correlate an event missing checkoutId to a known checkout', () => {
  const stdout = JSON.stringify({
    ok: true,
    data: {
      events: [{
        eventType: 'agent_order.succeeded',
        resourceId: paymentOrderId,
        data: { orderId: paymentOrderId },
      }],
    },
  });
  const result = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
});

test('does not correlate conflicting checkoutId aliases', () => {
  const stdout = JSON.stringify({
    ok: true,
    data: {
      events: [{
        eventType: 'agent_order.succeeded',
        data: { checkoutId, checkout_id: 'checkout_other', orderId: paymentOrderId },
      }],
    },
  });
  const result = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
});

test('does not correlate a blank checkout alias', () => {
  const stdout = JSON.stringify({
    ok: true,
    data: {
      events: [{
        eventType: 'agent_order.succeeded',
        data: { checkoutId: '   ', orderId: paymentOrderId },
      }],
    },
  });
  const result = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
  assert.notEqual(result.paymentConfirmed, true);
});

test('does not correlate checkout ids from event top-level fields', () => {
  const stdout = JSON.stringify({
    ok: true,
    data: {
      events: [{
        eventType: 'agent_order.succeeded',
        checkoutId,
        resourceId: paymentOrderId,
        data: { orderId: paymentOrderId },
      }],
    },
  });
  const result = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
  assert.equal(result.reason, 'payment_success_event_not_observed');
  assert.notEqual(result.paymentConfirmed, true);
});

test('rejects non-string checkout ids in expected context and nested events', () => {
  for (const malformedId of [[checkoutId], { id: checkoutId }, 123]) {
    const invalidExpected = classifyUcpPaymentSuccessEventObservation(
      { stdout: successEventOutput(checkoutId) },
      { checkoutId: malformedId },
    );
    assert.equal(invalidExpected.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(invalidExpected.reason, 'payment_success_expected_checkout_id_conflict');
    assert.equal(invalidExpected.paymentConfirmed, false);

    const stdout = JSON.stringify({
      ok: true,
      data: {
        events: [{
          eventType: 'agent_order.succeeded',
          resourceId: paymentOrderId,
          data: { checkoutId: malformedId, orderId: paymentOrderId },
        }],
      },
    });
    const invalidEvent = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
    assert.equal(invalidEvent.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
    assert.equal(invalidEvent.reason, 'payment_success_event_not_observed');
    assert.notEqual(invalidEvent.paymentConfirmed, true);
  }
});

test('does not confirm events with non-string payment order ids', () => {
  for (const malformedId of [[paymentOrderId], { id: paymentOrderId }, 123]) {
    const stdout = JSON.stringify({
      ok: true,
      data: {
        events: [{
          eventType: 'agent_order.succeeded',
          data: { checkoutId, orderId: malformedId },
        }],
      },
    });
    const result = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
    assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
    assert.equal(result.reason, 'payment_success_event_not_observed');
    assert.notEqual(result.paymentConfirmed, true);
  }
});

test('rejects a blank explicit payment-order alias', () => {
  const stdout = JSON.stringify({
    ok: true,
    data: {
      events: [{
        eventType: 'agent_order.succeeded',
        data: { checkoutId, orderId: '   ' },
      }],
    },
  });
  const result = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
  assert.equal(result.paymentConfirmed, undefined);
  assert.equal(result.paymentOrderId, undefined);
});

test('does not match any event when no expectedResource fields are provided', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    {},
  );
  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
});

test('rejects conflicting expected checkout aliases before event matching', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId, checkout_id: 'checkout_other' },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'payment_success_expected_checkout_id_conflict');
  assert.equal(result.resumeCommand, undefined);
});

test('rejects every explicit empty or null checkout alias beside a valid alias', () => {
  for (const malformedAlias of [null, '', '   ']) {
    const expectedResult = classifyUcpPaymentSuccessEventObservation(
      { stdout: successEventOutput(checkoutId) },
      { checkoutId, checkout_id: malformedAlias },
    );
    assert.equal(expectedResult.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(expectedResult.reason, 'payment_success_expected_checkout_id_conflict');

    const eventOutput = JSON.stringify({
      ok: true,
      data: {
        events: [{
          eventType: 'agent_order.succeeded',
          data: { checkoutId, checkout_id: malformedAlias, orderId: paymentOrderId },
        }],
      },
    });
    const eventResult = classifyUcpPaymentSuccessEventObservation(
      { stdout: eventOutput },
      { checkoutId },
    );
    assert.equal(eventResult.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
    assert.notEqual(eventResult.paymentConfirmed, true);
  }
});

test('rejects every explicit empty or null payment-order alias beside a valid alias', () => {
  for (const malformedAlias of [null, '', '   ']) {
    const stdout = JSON.stringify({
      ok: true,
      data: {
        events: [{
          eventType: 'agent_order.succeeded',
          data: { checkoutId, orderId: paymentOrderId, payment_order_id: malformedAlias },
        }],
      },
    });
    const result = classifyUcpPaymentSuccessEventObservation({ stdout }, { checkoutId });
    assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
    assert.notEqual(result.paymentConfirmed, true);
  }
});

test('event observation rejects an explicit error envelope even if it contains a success event', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: false,
        error: {
          events: [{
            eventType: 'agent_order.succeeded',
            resourceId: paymentOrderId,
            data: { checkoutId, orderId: paymentOrderId },
          }],
        },
      }),
    },
    { checkoutId },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'payment_success_event_invalid_success_envelope');
  assert.equal(result.orderCommand, undefined);
});

test('event observation rejects malformed event collections without throwing', () => {
  for (const events of [undefined, 'not-an-array', [null], [[]], [false]]) {
    const data = events === undefined ? {} : { events };
    const result = classifyUcpPaymentSuccessEventObservation(
      { exitCode: 0, stdout: JSON.stringify({ ok: true, data }) },
      { checkoutId },
    );

    assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
    assert.equal(result.paymentConfirmed, false);
    assert.equal(result.reason, 'payment_success_event_invalid_events');
    assert.equal(result.resumeCommand, undefined);
  }
});

// --- synchronous UCP order id path ---

test('complete observation extracts canonical ucpOrderId and compatibility alias', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedCheckoutId: checkoutId,
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        id: checkoutId,
        status: 'completed',
        order: {
          id: ucpOrderId,
          checkout_session_id: checkoutId,
          permalink_url: 'https://merchant.example/orders/order_ucp_xyz',
        },
      },
    }),
  });

  assert.equal(result.action, UcpCheckoutWorkflowAction.POLL_PAYMENT_SUCCESS_EVENT);
  assert.equal(result.ucpOrderId, ucpOrderId);
  assert.equal(result.omsOrderId, ucpOrderId);
  assert.equal(result.checkoutId, checkoutId);
  assert.equal(result.orderPermalinkUrl, 'https://merchant.example/orders/order_ucp_xyz');
  assert.match(result.pollCommand, /--checkout-id checkout_abc123/u);
});

test('complete observation fails closed on a blank explicit UCP order id', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedCheckoutId: checkoutId,
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: { id: checkoutId, status: 'completed', order: { id: '   ' } },
    }),
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'checkout_ucp_order_id_alias_conflict');
  assert.equal(result.ucpOrderId, undefined);
  assert.equal(result.pollCommand, undefined);
  assert.equal(result.orderCommand, undefined);
});

test('checkout observation rejects an explicit error envelope even if it looks completed', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedCheckoutId: checkoutId,
    exitCode: 0,
    stdout: JSON.stringify({
      ok: false,
      error: {
        id: checkoutId,
        status: 'completed',
        order: { id: 'order_untrusted' },
      },
    }),
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'checkout_invalid_success_envelope');
  assert.equal(result.ucpOrderId, undefined);
  assert.equal(result.pollCommand, undefined);
});

test('complete observation rejects conflicting UCP order id aliases before event polling', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedCheckoutId: checkoutId,
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        id: checkoutId,
        status: 'completed',
        order: { id: ucpOrderId, order_id: 'order_other' },
      },
    }),
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'checkout_ucp_order_id_alias_conflict');
  assert.equal(result.ucpOrderId, undefined);
  assert.equal(result.pollCommand, undefined);
});

test('complete observation rejects empty or null aliases beside valid checkout and UCP order ids', () => {
  for (const malformedAlias of [null, '', '   ']) {
    const invalidCheckout = classifyUcpCheckoutObservation({
      operation: 'complete',
      expectedCheckoutId: checkoutId,
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          id: checkoutId,
          checkout_id: malformedAlias,
          status: 'completed',
          order: { id: ucpOrderId },
        },
      }),
    });
    assert.equal(invalidCheckout.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(invalidCheckout.reason, 'checkout_id_alias_conflict');

    const invalidOrder = classifyUcpCheckoutObservation({
      operation: 'complete',
      expectedCheckoutId: checkoutId,
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          id: checkoutId,
          status: 'completed',
          order: { id: ucpOrderId, order_id: malformedAlias },
        },
      }),
    });
    assert.equal(invalidOrder.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(invalidOrder.reason, 'checkout_ucp_order_id_alias_conflict');
  }
});

test('complete observation rejects non-string checkout and UCP order ids', () => {
  for (const malformedId of [[checkoutId], { id: checkoutId }, 123]) {
    const invalidCheckout = classifyUcpCheckoutObservation({
      operation: 'complete',
      expectedCheckoutId: checkoutId,
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: { id: malformedId, status: 'completed', order: { id: ucpOrderId } },
      }),
    });
    assert.equal(invalidCheckout.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(invalidCheckout.reason, 'checkout_id_alias_conflict');
    assert.equal(invalidCheckout.pollCommand, undefined);

    const invalidOrder = classifyUcpCheckoutObservation({
      operation: 'complete',
      expectedCheckoutId: checkoutId,
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: { id: checkoutId, status: 'completed', order: { id: malformedId } },
      }),
    });
    assert.equal(invalidOrder.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(invalidOrder.reason, 'checkout_ucp_order_id_alias_conflict');
    assert.equal(invalidOrder.pollCommand, undefined);
  }
});

test('merchantOrderId is not accepted as a UCP order id compatibility alias', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedResource: { checkoutId },
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        id: checkoutId,
        status: 'completed',
        merchantOrderId: 'external_shop_order_9',
      },
    }),
  });

  assert.equal(result.ucpOrderId, undefined);
  assert.equal(result.omsOrderId, undefined);
  assert.doesNotMatch(result.pollCommand, /external_shop_order_9/u);
});

test('complete observation preserves internal checkout endpoint for event and recovery context', () => {
  const checkoutEndpoint = 'https://internal.example/agent/ucp/merchant_1';
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedCheckoutId: checkoutId,
    endpoint: checkoutEndpoint,
    exitCode: 0,
    stdout: completedCheckoutOutput(),
  });

  assert.equal(result.checkoutEndpoint, checkoutEndpoint);
  assert.equal(result.ucpOrderId, ucpOrderId);
});

test('checkout observation accepts matching response aliases bound to the frozen checkout id', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedResource: { checkoutId },
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        id: checkoutId,
        checkoutId,
        checkout_id: checkoutId,
        status: 'completed',
      },
    }),
  });

  assert.equal(result.action, UcpCheckoutWorkflowAction.POLL_PAYMENT_SUCCESS_EVENT);
  assert.equal(result.checkoutId, checkoutId);
});

test('checkout observation rejects conflicting response checkout aliases', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'complete',
    expectedCheckoutId: checkoutId,
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: { id: checkoutId, checkoutId: 'checkout_other', status: 'completed' },
    }),
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'checkout_id_alias_conflict');
});

test('complete and get observations require and honor the frozen checkout id', () => {
  const missingExpected = classifyUcpCheckoutObservation({
    operation: 'complete',
    exitCode: 0,
    stdout: completedCheckoutOutput(),
  });
  assert.equal(missingExpected.reason, 'expected_checkout_id_missing');

  for (const operation of ['complete', 'get']) {
    const mismatch = classifyUcpCheckoutObservation({
      operation,
      expectedCheckoutId: checkoutId,
      exitCode: 0,
      stdout: completedCheckoutOutput(ucpOrderId, 'checkout_other'),
    });
    assert.equal(mismatch.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(mismatch.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
    assert.equal(mismatch.reason, 'checkout_id_mismatch');
    assert.equal(mismatch.expectedCheckoutId, checkoutId);
    assert.equal(mismatch.observedCheckoutId, 'checkout_other');
  }
});

test('complete and get exit 6 return only a frozen read-only checkout verification command', () => {
  const checkoutEndpoint = 'https://internal.example/agent/ucp/merchant_1';
  for (const operation of ['complete', 'get']) {
    const result = classifyUcpCheckoutObservation({
      operation,
      expectedCheckoutId: checkoutId,
      endpoint: checkoutEndpoint,
      exitCode: 6,
    });

    assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_UNKNOWN);
    assert.equal(result.action, UcpCheckoutWorkflowAction.VERIFY_CHECKOUT_BEFORE_RETRY);
    assert.equal(result.checkoutId, checkoutId);
    assert.equal(result.checkoutEndpoint, checkoutEndpoint);
    assert.equal(
      result.resumeCommand,
      `clink ucp-checkout get --endpoint ${checkoutEndpoint} --checkout-id ${checkoutId} --format json`,
    );
    assert.equal(result.checkoutCommand, result.resumeCommand);
    assert.doesNotMatch(result.resumeCommand, /checkout complete|events poll|ucp-order get/u);
  }
});

test('create exit 6 stays unknown without synthesizing an unsafe retry command', () => {
  const result = classifyUcpCheckoutObservation({
    operation: 'create',
    exitCode: 6,
  });

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_UNKNOWN);
  assert.equal(result.action, UcpCheckoutWorkflowAction.VERIFY_CHECKOUT_BEFORE_RETRY);
  assert.equal(result.resumeCommand, undefined);
  assert.equal(result.checkoutCommand, undefined);
});

test('event paymentOrderId never overrides frozen ucpOrderId even with the same prefix', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId, ucpOrderId },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.ORDER_FETCH_REQUIRED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.FETCH_UCP_ORDER);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.ucpOrderId, ucpOrderId);
  assert.equal(result.paymentOrderId, paymentOrderId);
  assert.equal(result.orderCommand, `clink ucp-order get --order-id ${ucpOrderId} --format json`);
  assert.doesNotMatch(result.orderCommand, new RegExp(paymentOrderId));
});

test('accepts legacy omsOrderId input but canonicalizes it before UCP order get', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId, omsOrderId: ucpOrderId },
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.FETCH_UCP_ORDER);
  assert.equal(result.ucpOrderId, ucpOrderId);
  assert.equal(result.omsOrderId, ucpOrderId);
});

test('matched event preserves payment evidence but rejects conflicting UCP order context aliases', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId, ucpOrderId, omsOrderId: 'order_other' },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_id_context_alias_conflict');
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.orderCommand, undefined);
});

test('conflicting UCP order context aliases fail closed before payment is confirmed', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: JSON.stringify({ ok: true, data: { events: [], timedOut: true } }) },
    { checkoutId, ucpOrderId, omsOrderId: 'order_other' },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'ucp_order_id_context_alias_conflict');
  assert.equal(result.resumeCommand, undefined);
});

test('empty or null UCP order context aliases fail closed beside a valid alias', () => {
  for (const malformedAlias of [null, '', '   ']) {
    const result = classifyUcpPaymentSuccessEventObservation(
      { stdout: successEventOutput(checkoutId) },
      { checkoutId, ucpOrderId, ucp_order_id: malformedAlias },
    );

    assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
    assert.equal(result.paymentConfirmed, true);
    assert.equal(result.reason, 'ucp_order_id_context_alias_conflict');
    assert.equal(result.orderCommand, undefined);
  }
});

// --- async id resolution path ---

test('matched event without ucpOrderId resolves it through checkout get', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.UCP_ORDER_ID_RESOLUTION_REQUIRED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.GET_CHECKOUT_FOR_UCP_ORDER);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.paymentOrderId, paymentOrderId);
  assert.equal(
    result.checkoutCommand,
    `clink ucp-checkout get --checkout-id ${checkoutId} --format json`,
  );
  assert.equal(result.orderCommand, undefined);
});

test('checkout resolver preserves the original internal endpoint', () => {
  const endpoint = 'https://internal.example/agent/ucp/merchant_1';
  const eventResult = classifyUcpPaymentSuccessEventObservation(
    { stdout: successEventOutput(checkoutId) },
    { checkoutId, checkoutEndpoint: endpoint },
  );

  assert.equal(
    eventResult.checkoutCommand,
    `clink ucp-checkout get --endpoint ${endpoint} --checkout-id ${checkoutId} --format json`,
  );
});

test('checkout resolver rejects conflicting UCP order context aliases without losing payment evidence', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput() },
    { ...correlatedSuccessContext(), ucpOrderId, omsOrderId: 'order_other' },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_resolution_context_id_alias_conflict');
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.orderCommand, undefined);
});

test('checkout get resolves ucpOrderId and never uses paymentOrderId for order get', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput() },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.FETCH_UCP_ORDER);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.ucpOrderId, ucpOrderId);
  assert.equal(result.paymentOrderId, paymentOrderId);
  assert.equal(result.orderCommand, `clink ucp-order get --order-id ${ucpOrderId} --format json`);
  assert.doesNotMatch(result.orderCommand, new RegExp(paymentOrderId));
});

test('checkout get rejects conflicting UCP order id aliases without losing payment evidence', () => {
  const result = classifyUcpOrderResolutionObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          id: checkoutId,
          status: 'completed',
          order: { id: ucpOrderId, order_id: 'order_other' },
        },
      }),
    },
    correlatedSuccessContext(),
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.PAYMENT_SUCCESS_EVENT_RECEIVED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_resolution_ucp_order_id_alias_conflict');
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.orderCommand, undefined);
});

test('checkout get rejects blank UCP order aliases beside a valid id', () => {
  const result = classifyUcpOrderResolutionObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          id: checkoutId,
          status: 'completed',
          order: { id: ucpOrderId, order_id: '   ' },
        },
      }),
    },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_resolution_ucp_order_id_alias_conflict');
  assert.equal(result.orderCommand, undefined);
});

test('checkout get cannot replace an already frozen UCP order id', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput('order_different_ucp') },
    correlatedSuccessContext({ ucpOrderId }),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_resolution_context_id_mismatch');
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.expectedUcpOrderId, ucpOrderId);
  assert.equal(result.observedUcpOrderId, 'order_different_ucp');
  assert.equal(result.orderCommand, undefined);
});

test('checkout get accepts matching checkout aliases', () => {
  const result = classifyUcpOrderResolutionObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          id: checkoutId,
          checkoutId,
          checkout_id: checkoutId,
          status: 'completed',
          order: { id: ucpOrderId },
        },
      }),
    },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.FETCH_UCP_ORDER);
  assert.equal(result.ucpOrderId, ucpOrderId);
});

test('checkout get rejects conflicting checkout aliases without losing valid event evidence', () => {
  const result = classifyUcpOrderResolutionObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          id: checkoutId,
          checkoutId: 'checkout_other',
          status: 'completed',
          order: { id: ucpOrderId },
        },
      }),
    },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_resolution_checkout_id_alias_conflict');
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
});

test('checkout projection still processing retries checkout get without re-polling or repaying', () => {
  const endpoint = 'https://internal.example/agent/ucp/merchant_1';
  const result = classifyUcpOrderResolutionObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({ ok: true, data: { id: checkoutId, status: 'complete_in_progress' } }),
    },
    correlatedSuccessContext({ checkoutEndpoint: endpoint }),
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.UCP_ORDER_PROJECTION_PENDING);
  assert.equal(result.action, UcpCheckoutWorkflowAction.WAIT_UCP_ORDER_PROJECTION);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.retryable, true);
  assert.equal(result.retryAfterSeconds, 1);
  assert.equal(result.nextAttempt, 2);
  assert.equal(result.resumeCommand, result.checkoutCommand);
  assert.match(result.resumeCommand, /ucp-checkout get/u);
  assert.match(result.resumeCommand, /--endpoint https:\/\/internal\.example/u);
  assert.doesNotMatch(result.resumeCommand, /events poll|checkout complete|ucp-order get/u);
});

test('completed checkout without order.id remains projection pending and never guesses event id', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput(null) },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.WAIT_UCP_ORDER_PROJECTION);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.orderCommand, undefined);
  assert.doesNotMatch(result.resumeCommand, new RegExp(paymentOrderId));
});

test('bounded checkout projection retries end with resumable payment-success warning', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput(null) },
    { ...correlatedSuccessContext(), attempt: 5 },
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.retryable, false);
  assert.equal(result.orderLookupStatus, 'PENDING');
  assert.match(result.resumeCommand, /ucp-checkout get/u);
  assert.equal(result.orderCommand, undefined);
});

test('projection retry context advances naturally through the bounded delay sequence', () => {
  let context = correlatedSuccessContext();
  const delays = [];
  for (let index = 0; index < 5; index += 1) {
    const result = classifyUcpOrderResolutionObservation(
      { exitCode: 0, stdout: completedCheckoutOutput(null) },
      context,
    );
    if (result.retryable) delays.push(result.retryAfterSeconds);
    context = { ...context, ...result };
    if (index < 4) {
      assert.equal(result.action, UcpCheckoutWorkflowAction.WAIT_UCP_ORDER_PROJECTION);
    } else {
      assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
    }
  }
  assert.deepEqual(delays, [1, 2, 4, 8]);
});

test('checkout lookup failure preserves confirmed payment and returns a separate order warning', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 5 },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.orderLookupStatus, 'ERROR');
  assert.equal(result.terminal, true);
  assert.equal(result.orderCommand, undefined);
});

test('checkout lookup retries transient network, rate-limit, and server errors', () => {
  for (const observation of [
    { exitCode: 6 },
    { exitCode: 5, httpStatus: 429 },
    { exitCode: 5, stderr: JSON.stringify({ error: { statusCode: 503 } }) },
  ]) {
    const result = classifyUcpOrderResolutionObservation(
      observation,
      correlatedSuccessContext(),
    );
    assert.equal(result.action, UcpCheckoutWorkflowAction.WAIT_UCP_ORDER_PROJECTION);
    assert.equal(result.paymentConfirmed, true);
    assert.equal(result.retryable, true);
    assert.equal(result.retryAfterSeconds, 1);
  }
});

test('checkout lookup does not retry validation or authentication errors', () => {
  for (const observation of [
    { exitCode: 2, httpStatus: 400 },
    { exitCode: 4, httpStatus: 401 },
    { exitCode: 4, httpStatus: 403 },
  ]) {
    const result = classifyUcpOrderResolutionObservation(
      observation,
      correlatedSuccessContext(),
    );
    assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
    assert.equal(result.paymentConfirmed, true);
    assert.equal(result.retryable, false);
  }
});

test('checkout id mismatch fails closed without losing payment success evidence', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput(ucpOrderId, 'checkout_other') },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.orderCommand, undefined);
});

test('checkout resolution rejects malformed and failed success envelopes without retrying', () => {
  for (const stdout of [
    'not-json',
    JSON.stringify({ ok: false, error: { message: 'checkout lookup failed' } }),
    JSON.stringify({ ok: true, data: [] }),
  ]) {
    const result = classifyUcpOrderResolutionObservation(
      { exitCode: 0, stdout },
      correlatedSuccessContext(),
    );
    assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
    assert.equal(result.paymentConfirmed, true);
    assert.equal(result.orderLookupStatus, 'ERROR');
    assert.equal(result.retryable, false);
    assert.equal(result.reason, 'ucp_order_resolution_invalid_success_envelope');
  }
});

test('checkout resolution requires the frozen checkout id in a successful response', () => {
  const result = classifyUcpOrderResolutionObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: { status: 'completed', order: { id: ucpOrderId } },
      }),
    },
    correlatedSuccessContext(),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.reason, 'ucp_order_resolution_checkout_id_missing');
  assert.equal(result.orderCommand, undefined);
});

test('non-projection checkout states do not consume the bounded projection retry budget', () => {
  for (const status of ['canceled', 'failed', 'ready_for_complete', 'requires_escalation', '']) {
    const result = classifyUcpOrderResolutionObservation(
      {
        exitCode: 0,
        stdout: JSON.stringify({ ok: true, data: { id: checkoutId, status } }),
      },
      correlatedSuccessContext(),
    );
    assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
    assert.equal(result.paymentConfirmed, true);
    assert.equal(result.retryable, false);
    assert.equal(result.orderLookupStatus, 'ERROR');
  }
});

test('post-payment classifiers reject reconstructed context without the correlated event', () => {
  for (const result of [
    classifyUcpOrderResolutionObservation(
      { exitCode: 0, stdout: completedCheckoutOutput() },
      { checkoutId, paymentOrderId, paymentConfirmed: true },
    ),
    classifyUcpOrderFetchObservation(
      { exitCode: 0, stdout: JSON.stringify({ ok: true, data: { id: ucpOrderId } }) },
      { checkoutId, ucpOrderId, paymentOrderId, paymentConfirmed: true },
    ),
  ]) {
    assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
    assert.equal(result.paymentConfirmed, false);
    assert.equal(result.reason, 'correlated_payment_success_context_event_missing');
    assert.equal(result.warning, undefined);
    assert.equal(result.message, undefined);
  }
});

test('post-payment classifiers reject bare identifier context even without paymentConfirmed', () => {
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput() },
    { checkoutId, paymentOrderId },
  );

  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'correlated_payment_success_context_event_missing');
  assert.equal(result.warning, undefined);
});

test('post-payment classifiers reject context that was never payment-confirmed', () => {
  const event = correlatedSuccessContext().event;
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput() },
    { checkoutId, event },
  );

  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'correlated_payment_success_context_not_confirmed');
});

test('post-payment classifiers require the exact success event type', () => {
  const base = correlatedSuccessContext();
  const event = { ...base.event, eventType: 'agent_order.failed' };
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput() },
    { ...base, event },
  );

  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'correlated_payment_success_context_event_type_invalid');
});

test('post-payment classifiers reject a success event for another checkout', () => {
  const base = correlatedSuccessContext();
  const event = {
    ...base.event,
    data: { ...base.event.data, checkoutId: 'checkout_other' },
  };
  const result = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput() },
    { ...base, event },
  );

  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'correlated_payment_success_context_event_checkout_id_mismatch');
});

test('post-payment classifiers reject conflicting event payment-order aliases', () => {
  const base = correlatedSuccessContext();
  const event = {
    ...base.event,
    resourceId: 'order_payment_conflict',
  };
  const result = classifyUcpOrderFetchObservation(
    { exitCode: 0, stdout: JSON.stringify({ ok: true, data: { id: ucpOrderId } }) },
    { ...base, ucpOrderId, event },
  );

  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'correlated_payment_success_context_event_payment_order_id_conflict');
});

test('post-payment classifiers reject supplied paymentOrderId that differs from the event', () => {
  const result = classifyUcpOrderFetchObservation(
    { exitCode: 0, stdout: JSON.stringify({ ok: true, data: { id: ucpOrderId } }) },
    { ...correlatedSuccessContext({ ucpOrderId }), paymentOrderId: 'order_payment_other' },
  );

  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.reason, 'correlated_payment_success_context_payment_order_id_mismatch');
});

test('post-payment classifiers accept matching event aliases', () => {
  const base = correlatedSuccessContext({ ucpOrderId });
  const event = {
    ...base.event,
    checkoutId,
    paymentOrderId,
    orderId: paymentOrderId,
    data: {
      ...base.event.data,
      checkout_id: checkoutId,
      payment_order_id: paymentOrderId,
    },
  };
  const result = classifyUcpOrderFetchObservation(
    { exitCode: 0, stdout: JSON.stringify({ ok: true, data: { id: ucpOrderId } }) },
    { ...base, event },
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_EVENT);
  assert.equal(result.paymentConfirmed, true);
});

test('ucp-order get failure cannot downgrade an already confirmed payment', () => {
  const result = classifyUcpOrderFetchObservation(
    { exitCode: 5 },
    correlatedSuccessContext({ ucpOrderId }),
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.ORDER_FETCH_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.orderLookupStatus, 'ERROR');
  assert.equal(result.terminal, true);
});

test('ucp-order get success returns payment evidence and fetched order', () => {
  const order = { id: ucpOrderId, status: 'paid', ucp: { success_info: { receipt: 'ok' } } };
  const result = classifyUcpOrderFetchObservation(
    { exitCode: 0, stdout: JSON.stringify({ ok: true, data: order }) },
    correlatedSuccessContext({ ucpOrderId }),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_EVENT);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.orderLookupStatus, 'FETCHED');
  assert.deepEqual(result.order, order);
});

test('post-payment metadata survives resolution retries, resolution, and fetch', () => {
  const checkoutEndpoint = 'https://internal.example/agent/ucp/merchant_1';
  const orderPermalinkUrl = 'https://merchant.example/orders/order_ucp_xyz';
  const message = 'Matched payment success evidence.';
  const eventResult = correlatedSuccessContext({
    checkoutEndpoint,
    orderPermalinkUrl,
  });
  const context = { ...eventResult, message };

  const retry = classifyUcpOrderResolutionObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: { id: checkoutId, status: 'complete_in_progress' },
      }),
    },
    context,
  );
  for (const result of [eventResult, retry]) {
    assert.equal(result.message, result === eventResult ? `Payment succeeded for checkout ${checkoutId}.` : message);
    assert.equal(result.orderPermalinkUrl, orderPermalinkUrl);
    assert.equal(result.checkoutEndpoint, checkoutEndpoint);
  }

  const resolved = classifyUcpOrderResolutionObservation(
    { exitCode: 0, stdout: completedCheckoutOutput() },
    { ...context, ...retry },
  );
  assert.equal(resolved.message, message);
  assert.equal(resolved.orderPermalinkUrl, orderPermalinkUrl);
  assert.equal(resolved.checkoutEndpoint, checkoutEndpoint);

  const order = { id: ucpOrderId, status: 'paid' };
  const fetched = classifyUcpOrderFetchObservation(
    { exitCode: 0, stdout: JSON.stringify({ ok: true, data: order }) },
    resolved,
  );
  assert.equal(fetched.message, message);
  assert.equal(fetched.orderPermalinkUrl, orderPermalinkUrl);
  assert.equal(fetched.checkoutEndpoint, checkoutEndpoint);
  assert.deepEqual(fetched.order, order);
});

test('ucp-order get failure preserves post-payment metadata without downgrading payment', () => {
  const checkoutEndpoint = 'https://internal.example/agent/ucp/merchant_1';
  const orderPermalinkUrl = 'https://merchant.example/orders/order_ucp_xyz';
  const message = 'Matched payment success evidence.';
  const result = classifyUcpOrderFetchObservation(
    { exitCode: 5 },
    {
      ...correlatedSuccessContext({ ucpOrderId, checkoutEndpoint, orderPermalinkUrl }),
      message,
    },
  );

  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.message, message);
  assert.equal(result.orderPermalinkUrl, orderPermalinkUrl);
  assert.equal(result.checkoutEndpoint, checkoutEndpoint);
  assert.match(result.warning, /Payment succeeded/u);
});

test('ucp-order get rejects malformed or failed success envelopes', () => {
  for (const stdout of [
    'not-json',
    JSON.stringify({ ok: false, error: { message: 'failed' } }),
    JSON.stringify({ ok: true, data: {} }),
  ]) {
    const result = classifyUcpOrderFetchObservation(
      { exitCode: 0, stdout },
      correlatedSuccessContext({ ucpOrderId }),
    );
    assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
    assert.equal(result.paymentConfirmed, true);
    assert.notEqual(result.orderLookupStatus, 'FETCHED');
  }
});

test('ucp-order get fails closed when the returned order id differs', () => {
  const result = classifyUcpOrderFetchObservation(
    { exitCode: 0, stdout: JSON.stringify({ ok: true, data: { id: 'order_other' } }) },
    correlatedSuccessContext({ ucpOrderId }),
  );

  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.observedUcpOrderId, 'order_other');
});

test('ucp-order get rejects conflicting response id aliases', () => {
  const result = classifyUcpOrderFetchObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({ ok: true, data: { id: ucpOrderId, orderId: 'order_other' } }),
    },
    correlatedSuccessContext({ ucpOrderId }),
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.ORDER_FETCH_FAILED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_get_id_alias_conflict');
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.order, undefined);
});

test('ucp-order get rejects a blank response alias beside the expected id', () => {
  const result = classifyUcpOrderFetchObservation(
    {
      exitCode: 0,
      stdout: JSON.stringify({ ok: true, data: { id: ucpOrderId, order_id: '   ' } }),
    },
    correlatedSuccessContext({ ucpOrderId }),
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.ORDER_FETCH_FAILED);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.reason, 'ucp_order_get_id_alias_conflict');
  assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
  assert.equal(result.order, undefined);
});

test('ucp-order get rejects non-string response ids', () => {
  for (const malformedId of [[ucpOrderId], { id: ucpOrderId }, 123]) {
    const result = classifyUcpOrderFetchObservation(
      { exitCode: 0, stdout: JSON.stringify({ ok: true, data: { id: malformedId } }) },
      correlatedSuccessContext({ ucpOrderId }),
    );

    assert.equal(result.state, UcpCheckoutWorkflowState.ORDER_FETCH_FAILED);
    assert.equal(result.action, UcpCheckoutWorkflowAction.RETURN_PAYMENT_SUCCESS_WITH_ORDER_WARNING);
    assert.equal(result.paymentConfirmed, true);
    assert.equal(result.reason, 'ucp_order_get_id_alias_conflict');
    assert.equal(result.orderLookupStatus, 'IDENTIFIER_CONFLICT');
    assert.equal(result.order, undefined);
  }
});

// --- event timeout / error ---

test('returns WAIT_CHECKOUT with event resumeCommand on poll timeout', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { stdout: JSON.stringify({ ok: true, data: { events: [], timedOut: true } }) },
    { checkoutId },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_PENDING);
  assert.equal(result.action, UcpCheckoutWorkflowAction.WAIT_CHECKOUT);
  assert.equal(result.reason, 'payment_success_event_timeout');
  assert.equal(
    result.resumeCommand,
    `clink events poll --type agent_order.succeeded --checkout-id ${checkoutId} --max-wait 900 --format json`,
  );
});

test('event timeout ignores an unsafe legacy resumeCommand', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    {
      stdout: JSON.stringify({
        ok: true,
        data: {
          events: [],
          timedOut: true,
          resumeCommand: 'clink events poll --type agent_order.succeeded --format json',
        },
      }),
    },
    { checkoutId },
  );
  assert.match(result.resumeCommand, /--checkout-id checkout_abc123/u);
});

test('event timeout without checkoutId never degrades to a type-only resume command', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    {
      stdout: JSON.stringify({
        ok: true,
        data: {
          events: [],
          timedOut: true,
          resumeCommand: 'clink events poll --type agent_order.succeeded --format json',
        },
      }),
    },
    {},
  );
  assert.equal(result.resumeCommand, undefined);
});

test('FETCH_UCP_ORDER preserves the legacy dispatcher wire value', () => {
  assert.equal(UcpCheckoutWorkflowAction.FETCH_UCP_ORDER, 'FETCH_OMS_ORDER');
  assert.equal(UcpCheckoutWorkflowAction.FETCH_OMS_ORDER, 'FETCH_OMS_ORDER');
});

test('surfaces event-poll CLI error before payment is confirmed', () => {
  const result = classifyUcpPaymentSuccessEventObservation(
    { exitCode: 1 },
    { checkoutId },
  );

  assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
});
