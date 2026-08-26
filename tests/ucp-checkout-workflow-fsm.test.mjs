import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UcpCheckoutWorkflowAction,
  UcpCheckoutWorkflowState,
  classifyUcpCheckoutRunExecution,
} from '../lib/ucp-checkout-workflow-fsm.mjs';

function checkoutRequest(overrides = {}) {
  return {
    productSelectionFrozen: true,
    fulfillmentAndAddressReady: true,
    paymentInstrumentReady: true,
    authorizationGatePassed: true,
    restrictedCategoryGatePassed: true,
    checkoutRouteResolved: true,
    checkoutExecutionClaimed: false,
    explicitPurchaseAuthorized: true,
    checkoutAttemptId: 'attempt_workflow_123',
    checkoutRoute: 'INTERNAL_UCP_CHECKOUT',
    endpoint: 'https://api.clinkbill.com/agent/ucp/mcht_123',
    walletBaseUrl: 'https://api.clinkbill.com',
    merchantUrl: 'https://shop.example/products/demo',
    merchantCategoryCode: '5812',
    currency: 'USD',
    lineItems: [{
      id: 'line_123',
      quantity: 1,
      item: { id: 'sku_123', title: 'Demo', price: '1.00' },
    }],
    paymentInstrumentId: 'pi_workflow_123',
    fulfillmentType: 'NO_SHIPPING_REQUIRED',
    ...overrides,
  };
}

test('requests one runtime-owned atomic checkout-attempt claim without returning a command', () => {
  const result = classifyUcpCheckoutRunExecution(checkoutRequest());

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_EXECUTION_CLAIM_REQUIRED);
  assert.equal(result.action, UcpCheckoutWorkflowAction.CLAIM_UCP_CHECKOUT_ATTEMPT);
  assert.equal(result.checkoutAttemptId, 'attempt_workflow_123');
  assert.deepEqual(result.claimTransition, {
    from: 'AWAITING_EXECUTION',
    to: 'EXECUTING',
    consumed: 'CONSUMED',
    atomic: true,
    replayAllowed: false,
  });
  assert.equal(result.runCommand, undefined);
  assert.equal(result.command, undefined);
});

test('fails closed before claim when the checkout-attempt identity is missing or conflicts', () => {
  for (const overrides of [
    { checkoutAttemptId: undefined },
    { checkoutAttemptId: '' },
    { checkoutAttemptId: 'attempt_one', checkout_attempt_id: 'attempt_two' },
    { checkoutAttemptId: 123 },
  ]) {
    const result = classifyUcpCheckoutRunExecution(checkoutRequest(overrides));
    assert.equal(result.state, UcpCheckoutWorkflowState.CLI_ERROR);
    assert.equal(result.action, UcpCheckoutWorkflowAction.SURFACE_ERROR);
    assert.equal(result.reason, 'checkout_attempt_id_invalid');
    assert.deepEqual(result.invalid, ['checkoutAttemptId']);
    assert.equal(result.runCommand, undefined);
  }
});

test('returns the aggregate command only to the successfully claimed attempt', () => {
  const result = classifyUcpCheckoutRunExecution(checkoutRequest({
    checkoutExecutionClaimed: true,
    checkout_attempt_id: 'attempt_workflow_123',
  }));

  assert.equal(result.state, UcpCheckoutWorkflowState.CHECKOUT_RUN_READY);
  assert.equal(result.action, UcpCheckoutWorkflowAction.RUN_UCP_CHECKOUT);
  assert.equal(result.checkoutAttemptId, 'attempt_workflow_123');
  assert.match(
    result.runCommand,
    /^CLINK_BASE_URL=https:\/\/api\.clinkbill\.com clink ucp-checkout run /u,
  );
});
