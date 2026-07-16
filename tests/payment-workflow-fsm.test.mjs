import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PaymentWorkflowAction,
  PaymentWorkflowState,
  classifyPaymentObservation,
} from '../lib/payment-workflow-fsm.mjs';

const paymentContext = {
  paymentId: 'pay_1',
  environment: 'sandbox',
  walletId: 'wallet_1',
  startedAtMs: 1_000,
  amount: 19.99,
  currency: 'USD',
};

test('Agent Pay synchronous success starts optional account event monitoring', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { status: 1 } }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_SYNC_SUCCEEDED);
  assert.equal(result.action, PaymentWorkflowAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH);
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.paymentTerminal, true);
  assert.equal(result.accountEventStatus, 'PENDING');
  assert.equal(result.terminal, false);
  assert.deepEqual(result.pollCommands, [
    'clink-cli events poll --type account-created --max-wait 60 --format json',
    'clink-cli events poll --type account-reloaded --max-wait 60 --format json',
  ]);
  assert.deepEqual(result.currentPayment, paymentContext);
  assert.deepEqual(
    result.accountWaitSpecs.map(({ eventType, maxWaitSeconds, noAck, purpose }) => ({
      eventType,
      maxWaitSeconds,
      noAck,
      purpose,
    })),
    [
      {
        eventType: 'account-created',
        maxWaitSeconds: 60,
        noAck: false,
        purpose: 'AGENT_PAY_ACCOUNT',
      },
      {
        eventType: 'account-reloaded',
        maxWaitSeconds: 60,
        noAck: false,
        purpose: 'AGENT_PAY_ACCOUNT',
      },
    ],
  );
});

test('Agent Pay synchronous failure does not start account event monitoring', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { status: 3 } }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_SYNC_FAILED);
  assert.equal(result.action, PaymentWorkflowAction.STOP_PAYMENT_FAILURE);
  assert.equal(result.pollCommands, undefined);
});

test('Agent Pay unknown network result does not start account event monitoring', () => {
  const result = classifyPaymentObservation({
    exitCode: 6,
    stderr: JSON.stringify({ ok: false, error: { message: 'timeout' } }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_UNKNOWN);
  assert.equal(result.action, PaymentWorkflowAction.VERIFY_BEFORE_RETRY);
  assert.equal(result.pollCommands, undefined);
});

test('Agent Pay 3DS continuation does not start account event monitoring', () => {
  const result = classifyPaymentObservation({
    exitCode: 7,
    stdout: JSON.stringify({ ok: true, data: { flag3DS: 1 } }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.THREE_DS_REQUIRED);
  assert.equal(result.action, PaymentWorkflowAction.SEND_3DS_AND_WAIT_EVENT);
  assert.equal(result.pollCommands, undefined);
});

test('Agent Pay response without status keeps the existing order-event wait', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: {} }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_SUBMITTED);
  assert.equal(result.action, PaymentWorkflowAction.WAIT_EVENT);
  assert.equal(result.pollCommands, undefined);
});
