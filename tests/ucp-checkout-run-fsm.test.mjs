import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import {
  UcpCheckoutRunAction,
  UcpCheckoutRunState,
  buildUcpCheckoutRunCommand,
  classifyUcpCheckoutResumeCommand,
  classifyUcpCheckoutRunObservation,
  classifyUcpCheckoutRunRequest,
  classifyUcpCheckoutRunResumeObservation,
} from '../lib/ucp-checkout-run-fsm.mjs';
import {
  UcpCheckoutWorkflowAction,
  UcpCheckoutWorkflowState,
  classifyUcpCheckoutRunExecution,
} from '../lib/ucp-checkout-workflow-fsm.mjs';

const checkoutId = 'checkout_aggregate_123';
const ucpOrderId = 'order_ucp_aggregate_123';
const walletBaseUrl = 'https://api.clinkbill.com';
const clinkCommand = `CLINK_BASE_URL=${walletBaseUrl} clink`;
const endpoint = 'https://api.clinkbill.com/agent/ucp/mcht_123';
const externalEndpoint = 'https://api.clinkbill.com/agent/ucp/external';

const lineItems = [{
  quantity: 1,
  item: {
    title: 'Demo product',
    price: '26.00',
    id: 'sku_123',
  },
  id: 'li_sku_123',
}];

function readyRequest(overrides = {}) {
  return {
    productSelectionFrozen: true,
    fulfillmentAndAddressReady: true,
    paymentInstrumentReady: true,
    authorizationGatePassed: true,
    restrictedCategoryGatePassed: true,
    checkoutRouteResolved: true,
    checkoutExecutionClaimed: true,
    explicitPurchaseAuthorized: true,
    checkoutAttemptId: 'attempt_aggregate_123',
    checkoutRoute: 'INTERNAL_UCP_CHECKOUT',
    endpoint,
    walletBaseUrl,
    merchantUrl: 'https://shop.example/products/demo?variant=123',
    merchantCategoryCode: '5812',
    currency: 'USD',
    lineItems,
    paymentInstrumentId: 'pi_aggregate_123',
    fulfillmentType: 'NO_SHIPPING_REQUIRED',
    ...overrides,
  };
}

function successEnvelope(data) {
  return JSON.stringify({ ok: true, data });
}

test('requires explicit purchase confirmation before producing a mutation command', () => {
  const result = classifyUcpCheckoutRunRequest({
    ...readyRequest(),
    explicitPurchaseAuthorized: false,
  });

  assert.equal(result.state, UcpCheckoutRunState.PURCHASE_CONFIRMATION_REQUIRED);
  assert.equal(result.action, UcpCheckoutRunAction.ASK_FOR_PURCHASE_CONFIRMATION);
  assert.equal(result.command, undefined);
});

test('requires every pre-check gate before producing the aggregate command', () => {
  const result = classifyUcpCheckoutRunRequest({
    ...readyRequest(),
    fulfillmentAndAddressReady: false,
    authorizationGatePassed: false,
    restrictedCategoryGatePassed: false,
  });

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_GATES_INCOMPLETE);
  assert.equal(result.action, UcpCheckoutRunAction.FIX_CHECKOUT_RUN_GATES);
  assert.deepEqual(result.missing, [
    'fulfillmentAndAddressReady',
    'authorizationGatePassed',
    'restrictedCategoryGatePassed',
  ]);
  assert.equal(result.command, undefined);
});

test('builds one deterministic aggregate checkout command and freezes its parameters', () => {
  const result = classifyUcpCheckoutRunRequest(readyRequest());

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_READY);
  assert.equal(result.action, UcpCheckoutRunAction.RUN_UCP_CHECKOUT);
  assert.equal(
    result.command,
    `${clinkCommand} ucp-checkout run`
      + ` --endpoint ${endpoint}`
      + ' --merchant-url \'https://shop.example/products/demo?variant=123\''
      + ' --merchant-category-code 5812'
      + ' --currency USD'
      + ' --line-items \'[{"id":"li_sku_123","item":{"id":"sku_123","price":"26.00","title":"Demo product"},"quantity":1}]\''
      + ' --payment-instrument-id pi_aggregate_123'
      + ' --confirm-purchase'
      + ' --format json',
  );
  assert.equal(Object.isFrozen(result.frozenRequest), true);
  assert.equal(Object.isFrozen(result.frozenRequest.lineItems), true);
  assert.equal(Object.isFrozen(result.frozenRequest.lineItems[0].item), true);
  assert.equal(result.frozenRequest.endpoint, endpoint);
  assert.equal(result.frozenRequest.paymentInstrumentId, 'pi_aggregate_123');
});

test('canonical JSON makes equivalent line-item objects produce the same command', () => {
  const first = buildUcpCheckoutRunCommand(readyRequest());
  const second = buildUcpCheckoutRunCommand(readyRequest({
    lineItems: [{
      id: 'li_sku_123',
      item: { id: 'sku_123', price: '26.00', title: 'Demo product' },
      quantity: 1,
    }],
  }));

  assert.equal(first, second);
});

test('freezes and forwards required buyer data without changing the wallet-owned email rule', () => {
  const result = classifyUcpCheckoutRunRequest(readyRequest({
    buyer: {
      last_name: 'Buyer',
      first_name: 'Test',
      preferences: { locale: 'en-US' },
    },
  }));

  assert.deepEqual(result.frozenRequest.buyer, {
    first_name: 'Test',
    last_name: 'Buyer',
    preferences: { locale: 'en-US' },
  });
  assert.equal(Object.isFrozen(result.frozenRequest.buyer), true);
  assert.match(
    result.command,
    /--buyer '\{"first_name":"Test","last_name":"Buyer","preferences":\{"locale":"en-US"\}\}'/u,
  );
});

test('rejects malformed buyer data instead of silently dropping it', () => {
  for (const buyer of ['not-json', [], 42]) {
    const result = classifyUcpCheckoutRunRequest(readyRequest({ buyer }));
    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
    assert.ok(result.invalid.includes('buyer'));
    assert.equal(result.command, undefined);
  }
});

test('quotes shell metacharacters and apostrophes without executing embedded input', () => {
  const command = buildUcpCheckoutRunCommand(readyRequest({
    merchantUrl: 'https://shop.example/products/demo?x=1&note=$(printf injected)',
    lineItems: [{
      id: 'li_sku_123',
      item: {
        id: 'sku_123',
        title: 'Buyer\'s $(printf injected) product',
        price: '26.00',
      },
      quantity: 1,
    }],
  }));
  const shell = spawnSync('/bin/sh', ['-c', `
clink() {
  printf '%s\n' "$@"
}
${command}
`], { encoding: 'utf8' });

  assert.equal(shell.status, 0, shell.stderr);
  const args = shell.stdout.trim().split('\n');
  assert.deepEqual(args.slice(0, 3), ['ucp-checkout', 'run', '--endpoint']);
  assert.ok(args.includes('https://shop.example/products/demo?x=1&note=$(printf injected)'));
  assert.ok(args.includes(
    '[{"id":"li_sku_123","item":{"id":"sku_123","price":"26.00","title":"Buyer\'s $(printf injected) product"},"quantity":1}]',
  ));
  assert.equal(shell.stdout.match(/^injected$/gmu), null);
});

test('digital products add one bounded delivery wait to the same command', () => {
  const result = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));

  assert.equal(result.frozenRequest.digitalDeliveryExpected, true);
  assert.equal(result.frozenRequest.maxWaitSeconds, 900);
  assert.match(
    result.command,
    /--confirm-purchase --wait-delivery --max-wait 900 --format json$/u,
  );
  assert.equal((result.command.match(/ucp-checkout run/gu) ?? []).length, 1);
  assert.doesNotMatch(result.command, /ucp-checkout create|ucp-checkout complete|events poll/u);
});

test('digital delivery cannot be inferred without a verified product contract', () => {
  const result = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
  }));

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
  assert.deepEqual(result.invalid, ['digitalDeliveryContractVerified']);
  assert.equal(result.command, undefined);
});

test('physical goods require the frozen UCP postal address', () => {
  const missing = classifyUcpCheckoutRunRequest(readyRequest({
    fulfillmentType: 'PHYSICAL_GOODS_REQUIRES_SHIPPING',
  }));
  assert.equal(missing.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
  assert.deepEqual(missing.invalid, ['shippingAddress']);

  const ready = classifyUcpCheckoutRunRequest(readyRequest({
    fulfillmentType: 'PHYSICAL_GOODS_REQUIRES_SHIPPING',
    shippingAddress: {
      postal_code: 'SW1A 2AA',
      address_country: 'GB',
      street_address: '10 Downing Street',
      address_locality: 'London',
      address_region: 'England',
    },
  }));
  assert.match(ready.command, /--shipping-address/u);
  assert.match(ready.command, /"address_country":"GB"/u);
});

test('physical goods reject empty and incomplete UCP postal addresses', () => {
  const validAddress = {
    postal_code: 'SW1A 2AA',
    address_country: 'GB',
    street_address: '10 Downing Street',
    address_locality: 'London',
    address_region: 'England',
  };
  for (const shippingAddress of [
    {},
    ...Object.keys(validAddress).map((missingField) => Object.fromEntries(
      Object.entries(validAddress).filter(([field]) => field !== missingField),
    )),
    { ...validAddress, address_country: 'GBR' },
    { ...validAddress, postal_code: '   ' },
  ]) {
    const result = classifyUcpCheckoutRunRequest(readyRequest({
      fulfillmentType: 'PHYSICAL_GOODS_REQUIRES_SHIPPING',
      shippingAddress,
    }));
    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
    assert.deepEqual(result.invalid, ['shippingAddress']);
  }
});

test('internal and external routes both freeze an exact endpoint', () => {
  const internalMissing = classifyUcpCheckoutRunRequest(readyRequest({ endpoint: null }));
  assert.deepEqual(internalMissing.invalid, ['endpoint']);

  const external = classifyUcpCheckoutRunRequest(readyRequest({
    checkoutRoute: 'EXTERNAL_UCP_CHECKOUT',
    endpoint: externalEndpoint,
  }));
  assert.equal(external.state, UcpCheckoutRunState.CHECKOUT_RUN_READY);
  assert.equal(external.frozenRequest.endpoint, externalEndpoint);
  assert.match(external.command, new RegExp(`--endpoint ${externalEndpoint}`, 'u'));

  const externalWithoutEndpoint = classifyUcpCheckoutRunRequest(readyRequest({
    checkoutRoute: 'EXTERNAL_UCP_CHECKOUT',
    endpoint: null,
  }));
  assert.deepEqual(externalWithoutEndpoint.invalid, ['endpoint']);
});

test('freezes one HTTPS wallet environment into the initial command', () => {
  const ready = classifyUcpCheckoutRunRequest(readyRequest({
    walletBaseUrl: `${walletBaseUrl}/`,
  }));
  assert.equal(ready.state, UcpCheckoutRunState.CHECKOUT_RUN_READY);
  assert.equal(ready.frozenRequest.walletBaseUrl, walletBaseUrl);
  assert.match(ready.command, new RegExp(`^CLINK_BASE_URL=${walletBaseUrl} clink `, 'u'));

  for (const override of [
    { walletBaseUrl: undefined },
    { walletBaseUrl: 'http://api.clinkbill.com' },
    { walletBaseUrl: 'https://user:pass@api.clinkbill.com' },
    { walletBaseUrl: 'https://api.clinkbill.com/other' },
    { walletBaseUrl: 'https://api.clinkbill.com/?other=1' },
  ]) {
    const rejected = classifyUcpCheckoutRunRequest(readyRequest(override));
    assert.equal(rejected.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
    assert.ok(rejected.invalid.includes('walletBaseUrl'));
    assert.equal(rejected.command, undefined);
  }

  const drifted = classifyUcpCheckoutRunRequest(readyRequest({
    walletBaseUrl: 'https://other.example',
  }));
  assert.ok(drifted.invalid.includes('endpointWalletOrigin'));
  assert.equal(drifted.command, undefined);
});

test('strictly rejects unsafe URLs, zero price, invalid currency, MCC, and card IDs', () => {
  const cases = [
    ['merchantUrl', { merchantUrl: 'https://user:pass@shop.example/item' }],
    ['merchantUrl', { merchantUrl: 'file:///tmp/item' }],
    ['endpoint', { endpoint: 'https://api.example/ucp?other=1' }],
    ['merchantCategoryCode', { merchantCategoryCode: '531' }],
    ['currency', { currency: 'US' }],
    ['paymentInstrumentId', { paymentInstrumentId: 'pi_1\nclink pay' }],
    ['lineItems', {
      lineItems: [{
        id: 'li_1',
        item: { id: 'sku_1', title: 'Demo', price: '0.00' },
        quantity: 1,
      }],
    }],
  ];

  for (const [field, override] of cases) {
    const result = classifyUcpCheckoutRunRequest(readyRequest(override));
    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
    assert.ok(result.invalid.includes(field), `${field} should be rejected`);
    assert.equal(result.command, undefined);
  }
});

test('rejects prices that exceed currency precision or the safe minor-unit range', () => {
  for (const [currency, price] of [
    ['JPY', '1.50'],
    ['USD', '1.001'],
    ['KWD', '1.0001'],
    ['USD', '90071992547409.92'],
  ]) {
    const result = classifyUcpCheckoutRunRequest(readyRequest({
      currency,
      lineItems: [{
        id: 'li_1',
        item: { id: 'sku_1', title: 'Demo', price },
        quantity: 1,
      }],
    }));
    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
    assert.ok(result.invalid.includes('lineItems'), `${currency} ${price} must fail`);
  }

  for (const [currency, price] of [
    ['JPY', '1'],
    ['USD', '1.00'],
    ['KWD', '1.000'],
  ]) {
    const result = classifyUcpCheckoutRunRequest(readyRequest({
      currency,
      lineItems: [{
        id: 'li_1',
        item: { id: 'sku_1', title: 'Demo', price },
        quantity: 1,
      }],
    }));
    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_READY);
  }
});

test('recursively validates every nested amount and price field the CLI will normalize', () => {
  for (const nestedField of [
    { adjustment: { amount: '1.001' } },
    { metadata: { quoted: { price: '1.001' } } },
    { adjustment: { amount: Number.POSITIVE_INFINITY } },
    { adjustment: { amount: '90071992547409.92' } },
  ]) {
    const result = classifyUcpCheckoutRunRequest(readyRequest({
      lineItems: [{
        id: 'li_1',
        item: { id: 'sku_1', title: 'Demo', price: '1.00' },
        quantity: 1,
        ...nestedField,
      }],
    }));
    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
    assert.ok(result.invalid.includes('lineItems'));
  }

  const ready = classifyUcpCheckoutRunRequest(readyRequest({
    lineItems: [{
      id: 'li_1',
      item: { id: 'sku_1', title: 'Demo', price: '1.00' },
      quantity: 1,
      adjustment: { amount: '0.50' },
      metadata: { quoted: { price: '2.25' } },
    }],
  }));
  assert.equal(ready.state, UcpCheckoutRunState.CHECKOUT_RUN_READY);
});

test('requires decimal strings for nested money before JSON parsing can change precision', () => {
  for (const lineItemsInput of [
    [{
      id: 'li_1',
      item: { id: 'sku_1', title: 'Demo', price: '1.00' },
      quantity: 1,
      adjustment: { amount: 0.5 },
    }],
    '[{"id":"li_1","item":{"id":"sku_1","title":"Demo","price":"1.00"},'
      + '"quantity":1,"metadata":{"quoted":{"price":0.10000000000000001}}}]',
  ]) {
    const result = classifyUcpCheckoutRunRequest(readyRequest({
      lineItems: lineItemsInput,
    }));
    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_RUN_INPUT_INVALID);
    assert.ok(result.invalid.includes('lineItems'));
    assert.equal(result.command, undefined);
  }
});

test('legacy workflow exposes the aggregate run only after all gates pass', () => {
  const missingCard = classifyUcpCheckoutRunExecution(readyRequest({
    paymentInstrumentReady: false,
  }));
  assert.equal(missingCard.action, UcpCheckoutWorkflowAction.REFRESH_PAYMENT_INSTRUMENT);

  const missingAuthorization = classifyUcpCheckoutRunExecution(readyRequest({
    explicitPurchaseAuthorized: false,
  }));
  assert.equal(
    missingAuthorization.state,
    UcpCheckoutWorkflowState.PURCHASE_AUTHORIZATION_REQUIRED,
  );
  assert.equal(
    missingAuthorization.action,
    UcpCheckoutWorkflowAction.ASK_FOR_PURCHASE_AUTHORIZATION,
  );

  const ready = classifyUcpCheckoutRunExecution(readyRequest());
  assert.equal(ready.state, UcpCheckoutWorkflowState.CHECKOUT_RUN_READY);
  assert.equal(ready.action, UcpCheckoutWorkflowAction.RUN_UCP_CHECKOUT);
  assert.match(
    ready.runCommand,
    /^CLINK_BASE_URL=https:\/\/api\.clinkbill\.com clink ucp-checkout run /u,
  );
});

test('maps an ordinary aggregate completed result without another Agent command', () => {
  const result = classifyUcpCheckoutRunObservation({
    exitCode: 0,
    stdout: successEnvelope({
      stage: 'complete',
      status: 'completed',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      order: { id: ucpOrderId, status: 'paid' },
    }),
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(result.action, UcpCheckoutRunAction.RETURN_UCP_CHECKOUT_COMPLETED);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.terminal, true);
  assert.equal(result.checkoutId, checkoutId);
  assert.equal(result.ucpOrderId, ucpOrderId);
  assert.equal(result.checkoutAttemptId, 'attempt_aggregate_123');
  assert.equal(result.checkoutAttemptState, 'CONSUMED');
  assert.equal(result.replayAllowed, false);
  assert.equal(result.resumeCommand, undefined);
});

test('requires the observation to remain bound to one claimed checkout attempt', () => {
  const data = {
    stage: 'complete',
    status: 'completed',
    checkoutId,
    endpoint,
    attempts: { create: 1, complete: 1 },
    create: { id: checkoutId, status: 'ready_for_complete' },
    complete: { id: checkoutId, status: 'completed' },
  };
  for (const expected of [
    { ...readyRequest(), checkoutAttemptId: undefined },
    { ...readyRequest(), checkoutExecutionClaimed: false },
    { ...readyRequest(), checkoutAttemptId: 'attempt\nother' },
  ]) {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope(data),
    }, expected);
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.reason, 'checkout_run_attempt_claim_invalid');
    assert.equal(result.paymentConfirmed, false);
  }
});

test('accepts the parsed CLI envelope shape documented for aggregate classification', () => {
  const result = classifyUcpCheckoutRunObservation({
    ok: true,
    data: {
      stage: 'complete',
      status: 'completed',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
    },
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.ucpOrderId, ucpOrderId);
  assert.deepEqual(result.order, { id: ucpOrderId });
});

test('canonicalizes observed endpoints exactly like the frozen CLI request', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    endpoint: 'https://API.CLINKBILL.COM:443/agent/ucp/mcht_123///',
  }));
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'completed',
      checkoutId,
      endpoint: 'https://API.CLINKBILL.COM:443/agent/ucp/mcht_123/',
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(result.endpoint, endpoint);
  assert.deepEqual(result.order, { id: ucpOrderId });
});

test('accepts consistent UCP order aliases across aggregate stages and rejects drift', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest());
  const consistent = {
    stage: 'complete',
    status: 'completed',
    checkoutId,
    ucp: { ucp_order_id: ucpOrderId },
    ucpOrderId,
    omsOrderId: ucpOrderId,
    endpoint,
    attempts: { create: 1, complete: 1 },
    create: {
      id: checkoutId,
      status: 'ready_for_complete',
      ucp_order_id: ucpOrderId,
    },
    complete: {
      id: checkoutId,
      status: 'completed',
      ucp: { ucp_order_id: ucpOrderId },
      order: { id: ucpOrderId },
    },
  };
  const accepted = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope(consistent),
  }, expected);
  assert.equal(accepted.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(accepted.ucpOrderId, ucpOrderId);

  for (const conflicting of [
    { ...consistent, ucpOrderId: 'order_other' },
    {
      ...consistent,
      complete: { ...consistent.complete, ucp: { ucp_order_id: 'order_other' } },
    },
    { ...consistent, ucp: null },
  ]) {
    const rejected = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope(conflicting),
    }, expected);
    assert.equal(rejected.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(rejected.reason, 'checkout_run_identifier_invalid');
    assert.equal(rejected.paymentConfirmed, false);
  }
});

test('requires nested create and complete evidence before confirming payment', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest());
  for (const [reason, data] of [
    ['checkout_run_complete_evidence_missing', {
      stage: 'complete',
      status: 'completed',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
    }],
    ['checkout_run_complete_status_mismatch', {
      stage: 'complete',
      status: 'completed',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'failed' },
    }],
    ['checkout_run_create_status_mismatch', {
      stage: 'complete',
      status: 'completed',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'pending' },
      complete: { id: checkoutId, status: 'completed' },
    }],
  ]) {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope(data),
    }, expected);
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.reason, reason);
    assert.equal(result.paymentConfirmed, false);
  }
});

test('requires create and complete stages to carry their own checkout IDs', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest());
  for (const [reason, data] of [
    ['checkout_run_create_identifier_missing', {
      stage: 'complete',
      status: 'completed',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed' },
    }],
    ['checkout_run_complete_identifier_missing', {
      stage: 'complete',
      status: 'completed',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { status: 'completed' },
    }],
  ]) {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope(data),
    }, expected);
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.reason, reason);
  }
});

test('maps an ambiguous complete failure only to same-checkout read-only reconciliation', () => {
  const resumeCommand = `${clinkCommand} ucp-checkout get --checkout-id ${checkoutId}`
    + ` --endpoint ${endpoint} --format json`;
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'unknown',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      paymentRetryAllowed: false,
      reconciliationRequired: true,
      resumeReadOnly: true,
      resumeCommand,
      error: { name: 'NetworkError', message: 'state unknown' },
    }),
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETE_IN_PROGRESS);
  assert.equal(result.action, UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY);
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.resumeCommand, resumeCommand);
  assert.equal(result.resumeContext.checkoutId, checkoutId);
});

test('maps complete_in_progress only to a bound read-only checkout GET', () => {
  const resumeCommand = `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'complete_in_progress',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'complete_in_progress' },
      resumeCommand,
    }),
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETE_IN_PROGRESS);
  assert.equal(result.action, UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY);
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.resumeCommand, resumeCommand);
  assert.doesNotMatch(result.resumeCommand, /ucp-checkout run|create|complete|events poll| pay /u);
});

test('maps a post-complete ready_for_complete result only to the bound read-only GET', () => {
  const resumeCommand = `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'ready_for_complete',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'ready_for_complete' },
      resumeCommand,
    }),
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETE_IN_PROGRESS);
  assert.equal(result.action, UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY);
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.resumeCommand, resumeCommand);
});

for (const status of ['processing', 'pending']) {
  test(`stops a create-stage ${status} result because payment was not submitted`, () => {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope({
        stage: 'create',
        status,
        checkoutId,
        endpoint,
        attempts: { create: 1, complete: 0 },
        create: { id: checkoutId, status },
        paymentSubmitted: false,
      }),
    }, classifyUcpCheckoutRunRequest(readyRequest()));

    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_FAILED);
    assert.equal(result.action, UcpCheckoutRunAction.STOP_CHECKOUT_FAILURE);
    assert.equal(result.terminal, true);
    assert.equal(result.paymentConfirmed, false);
    assert.equal(result.paymentSubmitted, false);
    assert.equal(result.resumeCommand, undefined);
  });
}

test('rejects a create-pending result that exposes a misleading resume command', () => {
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'create',
      status: 'pending',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 0 },
      create: { id: checkoutId, status: 'pending' },
      paymentSubmitted: false,
      resumeCommand: `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
        + ` --checkout-id ${checkoutId} --format json`,
    }),
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
  assert.equal(result.reason, 'checkout_create_resume_not_allowed');
  assert.equal(result.paymentConfirmed, false);
});

test('accepts an authoritative checkout completed during create without completing again', () => {
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'create',
      status: 'completed',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 0 },
      create: { id: checkoutId, status: 'completed' },
    }),
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(result.reason, 'checkout_completed_during_create');
  assert.equal(result.completeRetryAllowed, false);
});

for (const status of ['failed', 'cancelled', 'expired', 'requires_escalation']) {
  test(`maps terminal checkout status ${status} without a retry command`, () => {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope({
        stage: 'complete',
        status,
        checkoutId,
        endpoint,
        attempts: { create: 1, complete: 1 },
        create: { id: checkoutId, status: 'ready_for_complete' },
        complete: { id: checkoutId, status },
      }),
    }, classifyUcpCheckoutRunRequest(readyRequest()));

    assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_FAILED);
    assert.equal(result.action, UcpCheckoutRunAction.STOP_CHECKOUT_FAILURE);
    assert.equal(result.resumeCommand, undefined);
    assert.equal(result.paymentRetryAllowed, false);
  });
}

test('rejects mutation, shell injection, endpoint drift, and identifier drift in resume commands', () => {
  const unsafeCommands = [
    `${clinkCommand} ucp-checkout complete --checkout-id ${checkoutId} --format json`,
    `${clinkCommand} ucp-checkout get --checkout-id ${checkoutId} --format json; clink pay --amount 1`,
    `${clinkCommand} ucp-checkout get --endpoint https://other.example`
      + ` --checkout-id ${checkoutId} --format json`,
    `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
      + ' --checkout-id checkout_other --format json',
  ];

  for (const resumeCommand of unsafeCommands) {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope({
        stage: 'complete',
        status: 'complete_in_progress',
        checkoutId,
        endpoint,
        attempts: { create: 1, complete: 1 },
        create: { id: checkoutId, status: 'ready_for_complete' },
        complete: { id: checkoutId, status: 'complete_in_progress' },
        resumeCommand,
      }),
    }, classifyUcpCheckoutRunRequest(readyRequest()));
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR, resumeCommand);
    assert.equal(result.action, UcpCheckoutRunAction.SURFACE_ERROR, resumeCommand);
  }
});

test('rejects external endpoint drift before exposing a credential-bearing resume command', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    checkoutRoute: 'EXTERNAL_UCP_CHECKOUT',
    endpoint: externalEndpoint,
  }));
  const evilEndpoint = 'https://evil.example/ucp';
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'complete_in_progress',
      checkoutId,
      endpoint: evilEndpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'complete_in_progress' },
      resumeCommand: `${clinkCommand} ucp-checkout get --endpoint ${evilEndpoint}`
        + ` --checkout-id ${checkoutId} --format json`,
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
  assert.equal(result.reason, 'checkout_run_endpoint_mismatch');
  assert.equal(result.paymentConfirmed, false);
});

test('maps verified digital delivery ready only when artifacts exist', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'delivery',
      status: 'ready',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1, delivery: 2 },
      ready: true,
      timedOut: false,
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      delivery: {
        status: 'ready',
        artifacts: [{ type: 'voucher_code', value: 'redacted' }],
      },
      order: {
        id: ucpOrderId,
        digital_delivery: {
          status: 'ready',
          artifacts: [{ type: 'voucher_code', value: 'redacted' }],
        },
      },
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.DIGITAL_DELIVERY_READY);
  assert.equal(result.action, UcpCheckoutRunAction.RETURN_UCP_DELIVERY_READY);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.deliveryConfirmed, true);
  assert.equal(result.deliveryStatus, 'READY');
});

test('delivery results require completed checkout evidence and consistent nested status', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const base = {
    stage: 'delivery',
    status: 'ready',
    checkoutId,
    orderId: ucpOrderId,
    endpoint,
    attempts: { create: 1, complete: 1, delivery: 2 },
    ready: true,
    timedOut: false,
    create: { id: checkoutId, status: 'ready_for_complete' },
    delivery: {
      status: 'ready',
      artifacts: [{ type: 'voucher_code', value: 'redacted' }],
    },
    order: {
      id: ucpOrderId,
      digital_delivery: {
        status: 'ready',
        artifacts: [{ type: 'voucher_code', value: 'redacted' }],
      },
    },
  };
  for (const [reason, data] of [
    ['checkout_run_complete_evidence_missing', base],
    ['checkout_run_delivery_complete_not_completed', {
      ...base,
      complete: { id: checkoutId, status: 'failed', order: { id: ucpOrderId } },
    }],
    ['digital_delivery_status_mismatch', {
      ...base,
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      delivery: { status: 'failed' },
    }],
    ['digital_delivery_status_mismatch', {
      ...base,
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      order: {
        id: ucpOrderId,
        digital_delivery: {
          status: 'failed',
          artifacts: [{ type: 'voucher_code', value: 'redacted' }],
        },
      },
    }],
  ]) {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope(data),
    }, expected);
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.reason, reason);
    assert.equal(result.paymentConfirmed, false);
  }
});

test('fails closed when digital delivery says ready without artifacts', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'delivery',
      status: 'ready',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1, delivery: 2 },
      ready: true,
      timedOut: false,
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      delivery: { status: 'ready', artifacts: [] },
      order: { id: ucpOrderId, digital_delivery: { status: 'ready', artifacts: [] } },
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
  assert.equal(result.reason, 'digital_delivery_ready_artifacts_missing');
  assert.equal(result.paymentConfirmed, false);
});

test('maps digital delivery failure separately without downgrading payment', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'delivery',
      status: 'failed',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1, delivery: 2 },
      ready: false,
      timedOut: false,
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      delivery: { status: 'failed' },
      order: { id: ucpOrderId, digital_delivery: { status: 'failed' } },
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.DIGITAL_DELIVERY_FAILED);
  assert.equal(result.action, UcpCheckoutRunAction.RETURN_UCP_DELIVERY_FAILED);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.deliveryStatus, 'FAILED');
  assert.equal(result.terminal, true);
});

test('maps digital delivery timeout to only the frozen read-only wait command', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const resumeCommand = `${clinkCommand} ucp-order wait-delivery --order-id ${ucpOrderId}`
    + ' --max-wait 900 --format json';
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'delivery',
      status: 'timeout',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1, delivery: 5 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      delivery: { status: 'pending' },
      order: { id: ucpOrderId, digital_delivery: { status: 'pending' } },
      ready: false,
      timedOut: true,
      resumeCommand,
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.DIGITAL_DELIVERY_PENDING);
  assert.equal(result.action, UcpCheckoutRunAction.RESUME_UCP_CHECKOUT_READ_ONLY);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.deliveryStatus, 'PENDING');
  assert.equal(result.resumeCommand, resumeCommand);
  assert.doesNotMatch(result.resumeCommand, /ucp-checkout run|create|complete|events poll| pay /u);
});

test('accepts delivery null only for a consistent timeout tuple', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const resumeCommand = `${clinkCommand} ucp-order wait-delivery --order-id ${ucpOrderId}`
    + ' --max-wait 900 --format json';
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'delivery',
      status: 'timeout',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1, delivery: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      order: { id: ucpOrderId, status: 'paid' },
      delivery: null,
      ready: false,
      timedOut: true,
      resumeCommand,
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.DIGITAL_DELIVERY_PENDING);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.delivery, null);
  assert.equal(result.resumeCommand, resumeCommand);
});

test('rejects non-native or contradictory aggregate delivery booleans', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const base = {
    stage: 'delivery',
    status: 'ready',
    checkoutId,
    orderId: ucpOrderId,
    endpoint,
    attempts: { create: 1, complete: 1, delivery: 1 },
    create: { id: checkoutId, status: 'ready_for_complete' },
    complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
    delivery: { status: 'ready', artifacts: [{ type: 'code', value: 'redacted' }] },
    order: {
      id: ucpOrderId,
      digital_delivery: {
        status: 'ready',
        artifacts: [{ type: 'code', value: 'redacted' }],
      },
    },
  };
  for (const [reason, evidence] of [
    ['digital_delivery_boolean_invalid', { ready: 'true', timedOut: false }],
    ['digital_delivery_boolean_invalid', { ready: true, timedOut: 0 }],
    ['digital_delivery_boolean_invalid', { ready: true, timedOut: false, timed_out: true }],
    ['digital_delivery_boolean_status_mismatch', { ready: false, timedOut: false }],
  ]) {
    const result = classifyUcpCheckoutRunObservation({
      stdout: successEnvelope({ ...base, ...evidence }),
    }, expected);
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.reason, reason);
    assert.equal(result.paymentConfirmed, false);
  }
});

test('pending checkout resumes through authoritative GET to terminal completion', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest());
  const resumeCommand = `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  const pending = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'complete_in_progress',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: {
        id: checkoutId,
        status: 'complete_in_progress',
        order: { id: ucpOrderId },
      },
      resumeCommand,
    }),
  }, expected);

  assert.equal(pending.ucpOrderId, ucpOrderId);
  assert.equal(pending.resumeContext.ucpOrderId, ucpOrderId);

  const completed = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({
      id: checkoutId,
      status: 'completed',
      order: { id: ucpOrderId, status: 'paid' },
    }),
  }, pending.resumeContext);

  assert.equal(completed.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(completed.paymentConfirmed, true);
  assert.equal(completed.checkoutId, checkoutId);
  assert.equal(completed.ucpOrderId, ucpOrderId);
  assert.equal(completed.resumeCommand, undefined);
});

test('fails closed when checkout GET drifts from the aggregate-frozen UCP order ID', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const resumeCommand = `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  const pending = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'complete_in_progress',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: {
        id: checkoutId,
        status: 'complete_in_progress',
        order: { id: ucpOrderId },
      },
      resumeCommand,
    }),
  }, expected);

  const drifted = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({
      id: checkoutId,
      status: 'completed',
      order: { id: 'order_drifted', status: 'paid' },
    }),
  }, pending.resumeContext);

  assert.equal(drifted.state, UcpCheckoutRunState.CLI_ERROR);
  assert.equal(drifted.paymentConfirmed, false);
  assert.equal(drifted.reason, 'checkout_resume_order_id_mismatch');
  assert.equal(drifted.resumeCommand, undefined);
});

test('freezes the first UCP order ID observed by a same-checkout pending GET', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest());
  const resumeCommand = `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  const aggregatePending = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'complete_in_progress',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'complete_in_progress' },
      resumeCommand,
    }),
  }, expected);
  assert.equal(aggregatePending.resumeContext.ucpOrderId, null);

  const getPending = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({
      id: checkoutId,
      status: 'processing',
      ucp: { ucp_order_id: ucpOrderId },
    }),
  }, aggregatePending.resumeContext);
  assert.equal(getPending.state, UcpCheckoutRunState.CHECKOUT_COMPLETE_IN_PROGRESS);
  assert.equal(getPending.resumeContext.ucpOrderId, ucpOrderId);

  const completedWithoutOrder = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({ id: checkoutId, status: 'completed' }),
  }, getPending.resumeContext);
  assert.equal(completedWithoutOrder.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(completedWithoutOrder.paymentConfirmed, true);
  assert.equal(completedWithoutOrder.ucpOrderId, ucpOrderId);
});

test('pending digital checkout resumes through GET and delivery wait to ready', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const checkoutResumeCommand = `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  const pending = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'complete_in_progress',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: {
        id: checkoutId,
        status: 'complete_in_progress',
        order: { id: ucpOrderId },
      },
      resumeCommand: checkoutResumeCommand,
    }),
  }, expected);
  const deliveryPending = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({
      id: checkoutId,
      status: 'completed',
    }),
  }, pending.resumeContext);
  assert.equal(deliveryPending.state, UcpCheckoutRunState.DIGITAL_DELIVERY_PENDING);
  assert.equal(deliveryPending.paymentConfirmed, true);
  assert.equal(deliveryPending.ucpOrderId, ucpOrderId);
  assert.equal(
    deliveryPending.resumeCommand,
    `${clinkCommand} ucp-order wait-delivery`
      + ` --order-id ${ucpOrderId} --max-wait 900 --format json`,
  );

  const ready = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({
      ready: true,
      timedOut: false,
      deliveryStatus: 'ready',
      attempts: 1,
      order: {
        id: ucpOrderId,
        digital_delivery: {
          status: 'ready',
          artifacts: [{ type: 'voucher_code', value: 'redacted' }],
        },
      },
    }),
  }, deliveryPending.resumeContext);
  assert.equal(ready.state, UcpCheckoutRunState.DIGITAL_DELIVERY_READY);
  assert.equal(ready.paymentConfirmed, true);
  assert.equal(ready.deliveryConfirmed, true);
});

test('delivery timeout resume output can remain pending without authorizing a retry', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const resumeCommand = `${clinkCommand} ucp-order wait-delivery --order-id ${ucpOrderId}`
    + ' --max-wait 900 --format json';
  const timeout = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'delivery',
      status: 'timeout',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1, delivery: 5 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      delivery: { status: 'pending' },
      order: { id: ucpOrderId, digital_delivery: { status: 'pending' } },
      ready: false,
      timedOut: true,
      resumeCommand,
    }),
  }, expected);
  const stillPending = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({
      ready: false,
      timedOut: true,
      deliveryStatus: 'pending',
      attempts: 2,
      order: { id: ucpOrderId, digital_delivery: { status: 'pending' } },
      resumeCommand,
    }),
  }, timeout.resumeContext);

  assert.equal(stillPending.state, UcpCheckoutRunState.DIGITAL_DELIVERY_PENDING);
  assert.equal(stillPending.paymentConfirmed, true);
  assert.equal(stillPending.paymentRetryAllowed, false);
  assert.equal(stillPending.resumeCommand, resumeCommand);
});

test('accepts only native boolean evidence from a delivery resume', () => {
  const resumeCommand = `${clinkCommand} ucp-order wait-delivery --order-id ${ucpOrderId}`
    + ' --max-wait 900 --format json';
  const continuation = {
    kind: 'DELIVERY_WAIT',
    checkoutAttemptId: 'attempt_aggregate_123',
    checkoutId,
    endpoint,
    walletBaseUrl,
    ucpOrderId,
    maxWaitSeconds: 900,
    paymentConfirmed: true,
    resumeCommand,
  };
  const baseData = {
    deliveryStatus: 'pending',
    order: { id: ucpOrderId, digital_delivery: { status: 'pending' } },
    resumeCommand,
  };

  for (const evidence of [
    { ready: 'false', timedOut: true },
    { ready: 0, timedOut: true },
    { ready: false, timedOut: 'true' },
    { ready: false, timedOut: 1 },
    { ready: false, timedOut: true, timed_out: false },
  ]) {
    const result = classifyUcpCheckoutRunResumeObservation({
      stdout: successEnvelope({ ...baseData, ...evidence }),
    }, continuation);
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.reason, 'delivery_resume_status_invalid');
    assert.equal(result.paymentConfirmed, false);
  }
});

test('rejects conflicting checkout and delivery status aliases on read-only resumes', () => {
  const checkoutResumeCommand = `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  const checkoutContinuation = {
    kind: 'CHECKOUT_GET',
    checkoutAttemptId: 'attempt_aggregate_123',
    checkoutId,
    endpoint,
    walletBaseUrl,
    ucpOrderId: null,
    digitalDeliveryExpected: false,
    maxWaitSeconds: null,
    resumeCommand: checkoutResumeCommand,
  };
  const checkoutConflict = classifyUcpCheckoutRunResumeObservation({
    stdout: successEnvelope({
      id: checkoutId,
      status: 'processing',
      checkout_status: 'completed',
    }),
  }, checkoutContinuation);
  assert.equal(checkoutConflict.state, UcpCheckoutRunState.CLI_ERROR);
  assert.equal(checkoutConflict.reason, 'checkout_resume_status_invalid');

  const deliveryResumeCommand = `${clinkCommand} ucp-order wait-delivery`
    + ` --order-id ${ucpOrderId} --max-wait 900 --format json`;
  const deliveryContinuation = {
    kind: 'DELIVERY_WAIT',
    checkoutAttemptId: 'attempt_aggregate_123',
    checkoutId,
    endpoint,
    walletBaseUrl,
    ucpOrderId,
    maxWaitSeconds: 900,
    paymentConfirmed: true,
    resumeCommand: deliveryResumeCommand,
  };
  for (const data of [
    {
      ready: false,
      timedOut: false,
      deliveryStatus: 'failed',
      delivery_status: 'ready',
      order: { id: ucpOrderId, digital_delivery: { status: 'failed' } },
    },
    {
      ready: false,
      timedOut: false,
      deliveryStatus: 'failed',
      order: { id: ucpOrderId, digital_delivery: { status: 'ready' } },
    },
  ]) {
    const result = classifyUcpCheckoutRunResumeObservation({
      stdout: successEnvelope(data),
    }, deliveryContinuation);
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.reason, 'delivery_resume_status_invalid');
  }
});

test('rejects missing or drifted wallet environments on every resume command', () => {
  const missingEnvironment = `clink ucp-checkout get --endpoint ${endpoint}`
    + ` --checkout-id ${checkoutId} --format json`;
  assert.equal(classifyUcpCheckoutResumeCommand(missingEnvironment).safe, false);

  const driftedEnvironment = 'CLINK_BASE_URL=https://other.example clink ucp-checkout get'
    + ` --endpoint ${endpoint} --checkout-id ${checkoutId} --format json`;
  assert.equal(classifyUcpCheckoutResumeCommand(driftedEnvironment).safe, false);

  const expected = classifyUcpCheckoutRunRequest(readyRequest());
  const sameOriginButDrifted = 'CLINK_BASE_URL=https://api.clinkbill.com/other clink ucp-checkout get'
    + ` --endpoint ${endpoint} --checkout-id ${checkoutId} --format json`;
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'complete_in_progress',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'complete_in_progress' },
      resumeCommand: sameOriginButDrifted,
    }),
  }, expected);
  assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
  assert.equal(result.reason, 'resume_command_environment_invalid');
});

test('keeps completed payment authoritative when digital delivery could not start', () => {
  const expected = classifyUcpCheckoutRunRequest(readyRequest({
    digitalDeliveryExpected: true,
    digitalDeliveryContractVerified: true,
  }));
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'completed',
      checkoutId,
      orderId: ucpOrderId,
      endpoint,
      attempts: { create: 1, complete: 1 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed', order: { id: ucpOrderId } },
      deliveryWait: {
        requested: true,
        started: false,
        reason: 'completed checkout response is missing data.order.id',
      },
    }),
  }, expected);

  assert.equal(result.state, UcpCheckoutRunState.CHECKOUT_COMPLETED);
  assert.equal(result.paymentConfirmed, true);
  assert.equal(result.deliveryConfirmed, false);
  assert.equal(result.reason, 'digital_delivery_wait_not_started');
  assert.match(result.warning, /missing data\.order\.id/u);
  assert.equal(result.resumeCommand, undefined);
});

test('read-only resume classifier accepts only checkout GET and bounded delivery wait', () => {
  assert.deepEqual(
    classifyUcpCheckoutResumeCommand(
      `${clinkCommand} ucp-checkout get`
        + ` --endpoint ${endpoint} --checkout-id ${checkoutId} --format json`,
    ),
    {
      safe: true,
      kind: 'CHECKOUT_GET',
      checkoutId,
      endpoint,
      baseUrlOverride: walletBaseUrl,
      command: `${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
        + ` --checkout-id ${checkoutId} --format json`,
    },
  );
  assert.equal(
    classifyUcpCheckoutResumeCommand(
      `${clinkCommand} ucp-order wait-delivery`
        + ` --order-id ${ucpOrderId} --max-wait 900 --format json`,
    ).safe,
    true,
  );
  for (const command of [
    `${clinkCommand} ucp-order wait-delivery`
      + ` --order-id ${ucpOrderId} --max-wait 60 --format json`,
    `${clinkCommand} ucp-order get --order-id ${ucpOrderId} --format json`,
    `${clinkCommand} ucp-checkout run`
      + ` --checkout-id ${checkoutId} --confirm-purchase --format json`,
    `${clinkCommand} ucp-checkout get --checkout-id ${checkoutId} --format json | clink pay`,
    `${clinkCommand} ucp-order wait-delivery --order-id ~ --max-wait 900 --format json`,
    `${clinkCommand} ucp-order wait-delivery --order-id order_* --max-wait 900 --format json`,
    `${clinkCommand} ucp-order wait-delivery --order-id order_\u0001 --max-wait 900 --format json`,
  ]) {
    assert.equal(classifyUcpCheckoutResumeCommand(command).safe, false, command);
  }
});

test('resume shell parsing preserves POSIX backslashes instead of weakening ID binding', () => {
  const checkoutCommand = String.raw`${clinkCommand} ucp-checkout get --endpoint ${endpoint}`
    + String.raw` --checkout-id "checkout\_123" --format json`;
  const deliveryCommand = String.raw`${clinkCommand} ucp-order wait-delivery --order-id "order\_123"`
    + ' --max-wait 900 --format json';

  const parsedCheckout = classifyUcpCheckoutResumeCommand(checkoutCommand);
  const parsedDelivery = classifyUcpCheckoutResumeCommand(deliveryCommand);
  assert.equal(parsedCheckout.safe, true);
  assert.equal(parsedCheckout.checkoutId, String.raw`checkout\_123`);
  assert.equal(parsedDelivery.safe, true);
  assert.equal(parsedDelivery.ucpOrderId, String.raw`order\_123`);

  for (const [command, parsedId, argumentIndex] of [
    [checkoutCommand, parsedCheckout.checkoutId, 5],
    [deliveryCommand, parsedDelivery.ucpOrderId, 3],
  ]) {
    const shell = spawnSync('/bin/sh', ['-c', `
clink() {
  printf '%s\n' "$@"
}
${command}
`], { encoding: 'utf8' });
    assert.equal(shell.status, 0, shell.stderr);
    assert.equal(shell.stdout.trim().split('\n')[argumentIndex], parsedId);
  }
});

test('invalid or failed CLI envelopes never become payment success', () => {
  for (const observation of [
    { exitCode: 6, stdout: '' },
    { exitCode: 0, stdout: 'not-json' },
    { exitCode: 0, stdout: JSON.stringify({ ok: false, error: { message: 'failed' } }) },
  ]) {
    const result = classifyUcpCheckoutRunObservation(
      observation,
      classifyUcpCheckoutRunRequest(readyRequest()),
    );
    assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
    assert.equal(result.paymentConfirmed, false);
  }
});

test('rejects aggregate output that reports more than one mutation attempt', () => {
  const result = classifyUcpCheckoutRunObservation({
    stdout: successEnvelope({
      stage: 'complete',
      status: 'completed',
      checkoutId,
      endpoint,
      attempts: { create: 1, complete: 2 },
      create: { id: checkoutId, status: 'ready_for_complete' },
      complete: { id: checkoutId, status: 'completed' },
    }),
  }, classifyUcpCheckoutRunRequest(readyRequest()));

  assert.equal(result.state, UcpCheckoutRunState.CLI_ERROR);
  assert.equal(result.reason, 'checkout_run_attempt_count_invalid');
  assert.equal(result.paymentConfirmed, false);
});
