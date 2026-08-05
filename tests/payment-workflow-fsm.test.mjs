import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PaymentWorkflowAction,
  PaymentWorkflowState,
  classifyPaymentAccountEventObservation,
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
    'clink-cli events poll --type account-created,account-reloaded --max-wait 60 --format json',
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
  assert.deepEqual(
    result.accountWaitSpecs.map(({ pollCommand }) => pollCommand),
    result.pollCommands.concat(result.pollCommands),
  );
});

test('Agent Pay synchronous success stamps a missing account-watch start time', () => {
  const { startedAtMs: _startedAtMs, ...contextWithoutTime } = paymentContext;
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { status: 1 } }),
    paymentContext: contextWithoutTime,
    observedAtMs: 5_000,
  });

  assert.equal(result.currentPayment.startedAtMs, 5_000);
  assert.equal(result.accountWaitSpecs[0].currentPayment.startedAtMs, 5_000);
  assert.equal(result.accountWaitSpecs[1].currentPayment.startedAtMs, 5_000);
});

test('Agent Pay synchronous success creates a stable local watch id when payment id is absent', () => {
  const {
    paymentId: _paymentId,
    startedAtMs: _startedAtMs,
    ...contextWithoutPaymentId
  } = paymentContext;
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { status: 1 } }),
    paymentContext: contextWithoutPaymentId,
    observedAtMs: 5_000,
  });

  assert.match(result.currentPayment.accountWatchId, /^[0-9a-f-]{36}$/u);
  assert.equal(
    result.accountWaitSpecs[0].currentPayment.accountWatchId,
    result.currentPayment.accountWatchId,
  );
  assert.equal(
    result.accountWaitSpecs[1].currentPayment.accountWatchId,
    result.currentPayment.accountWatchId,
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

test('Agent Pay account aggregation returns created confirmation and core event information', () => {
  const event = {
    object: 'event',
    type: 'account.created',
    data: {
      customerEmail: 'customer@example.com',
      webSite: 'https://example.com',
      userId: 'usr_xxxxx',
      amount: 19.99,
      currency: 'USD',
      secret: 'must-not-leak',
    },
  };
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{
      domain: 'AGENT_PAY_ACCOUNT',
      state: 'AGENT_PAY_ACCOUNT_EVENT_CORRELATED',
      eventType: 'account-created',
      canonicalEventType: 'account.created',
      matched: true,
      event,
    }],
  });

  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.accountEventStatus, 'CONFIRMED_CREATED');
  assert.equal(result.messageKey, 'ACCOUNT_CREATED_AND_MERCHANT_ORDER_CONFIRMED');
  assert.equal(result.eventType, 'account.created');
  assert.deepEqual(result.coreInfo, {
    customerEmail: 'customer@example.com',
    webSite: 'https://example.com',
    userId: 'usr_xxxxx',
    amount: 19.99,
    currency: 'USD',
  });
  assert.equal(result.event, event);
});

test('Agent Pay account aggregation returns reloaded merchant-order confirmation', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{
      domain: 'AGENT_PAY_ACCOUNT',
      state: 'AGENT_PAY_ACCOUNT_EVENT_CORRELATED',
      eventType: 'account-reloaded',
      matched: true,
      event: {
        object: 'event',
        type: 'account.reloaded',
        data: {
          customerEmail: 'customer@example.com',
          webSite: 'https://example.com',
          userId: 'usr_xxxxx',
          amount: 19.99,
          currency: 'USD',
        },
      },
    }],
  });

  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.accountEventStatus, 'CONFIRMED_RELOADED');
  assert.equal(result.messageKey, 'MERCHANT_ORDER_CONFIRMED');
  assert.equal(result.eventType, 'account.reloaded');
});

test('Agent Pay account aggregation omits absent core fields instead of inventing them', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{
      domain: 'AGENT_PAY_ACCOUNT',
      state: 'AGENT_PAY_ACCOUNT_EVENT_CORRELATED',
      eventType: 'account-created',
      matched: true,
      event: {
        type: 'account.created',
        data: { amount: 19.99, currency: 'USD' },
      },
    }],
  });

  assert.deepEqual(result.coreInfo, { amount: 19.99, currency: 'USD' });
  assert.equal(Object.hasOwn(result.coreInfo, 'customerEmail'), false);
  assert.equal(Object.hasOwn(result.coreInfo, 'webSite'), false);
  assert.equal(Object.hasOwn(result.coreInfo, 'userId'), false);
});

test('optional Agent Pay account aggregation waits for both any-of type classifications', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{ eventType: 'account-created', timedOut: true }],
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_ACCOUNT_EVENT_WAITING);
  assert.equal(result.action, PaymentWorkflowAction.WAIT_OPTIONAL_ACCOUNT_EVENT);
  assert.equal(result.accountEventStatus, 'PENDING');
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.terminal, false);
});

test('optional Agent Pay account timeouts preserve payment success without confirmation', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      { eventType: 'account-created', state: 'EVENT_TIMEOUT' },
      { eventType: 'account-reloaded', timedOut: true },
    ],
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_ACCOUNT_EVENT_NOT_OBSERVED);
  assert.equal(result.action, PaymentWorkflowAction.RETURN_SUCCESS_WITHOUT_ACCOUNT_EVENT);
  assert.equal(result.accountEventStatus, 'NOT_OBSERVED');
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.terminal, true);
});

test('optional Agent Pay account poll errors preserve payment success with a warning', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      { eventType: 'account-created', error: { message: 'network' } },
      { eventType: 'account-reloaded', timedOut: true },
    ],
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_ACCOUNT_EVENT_POLL_ERROR);
  assert.equal(result.action, PaymentWorkflowAction.RETURN_SUCCESS_WITH_WARNING);
  assert.equal(result.accountEventStatus, 'POLL_ERROR');
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.terminal, true);
});

test('optional Agent Pay account ambiguity preserves payment success without claiming confirmation', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{
      eventType: 'account-created',
      state: 'AGENT_PAY_ACCOUNT_EVENT_AMBIGUOUS',
      ambiguous: true,
    }],
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_ACCOUNT_EVENT_AMBIGUOUS);
  assert.equal(result.action, PaymentWorkflowAction.RETURN_SUCCESS_WITH_WARNING);
  assert.equal(result.accountEventStatus, 'AMBIGUOUS');
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.terminal, true);
  assert.equal(result.messageKey, undefined);
});

test('optional Agent Pay account double match preserves payment success with an inconsistency warning', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [
      {
        domain: 'AGENT_PAY_ACCOUNT',
        state: 'AGENT_PAY_ACCOUNT_EVENT_CORRELATED',
        eventType: 'account-created',
        matched: true,
        event: { type: 'account.created', data: { amount: 19.99, currency: 'USD' } },
      },
      {
        domain: 'AGENT_PAY_ACCOUNT',
        state: 'AGENT_PAY_ACCOUNT_EVENT_CORRELATED',
        eventType: 'account-reloaded',
        matched: true,
        event: { type: 'account.reloaded', data: { amount: 19.99, currency: 'USD' } },
      },
    ],
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_ACCOUNT_EVENT_POLL_ERROR);
  assert.equal(result.action, PaymentWorkflowAction.RETURN_SUCCESS_WITH_WARNING);
  assert.equal(result.reason, 'mutually_exclusive_account_events_conflict');
  assert.equal(result.accountEventStatus, 'POLL_ERROR');
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.terminal, true);
});

test('optional Agent Pay account aggregation rejects confirmation without a paid payment', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'UNKNOWN',
    pollObservations: [{
      eventType: 'account-created',
      matched: true,
      event: { type: 'account.created', data: { amount: 19.99, currency: 'USD' } },
    }],
  });

  assert.equal(result.state, PaymentWorkflowState.CLI_ERROR);
  assert.equal(result.action, PaymentWorkflowAction.SURFACE_ERROR);
  assert.equal(result.accountEventStatus, 'NOT_STARTED');
  assert.equal(result.paymentStatus, 'UNKNOWN');
});

test('Agent Pay account aggregation rejects an unproven generic matched event', () => {
  const result = classifyPaymentAccountEventObservation({
    paymentStatus: 'PAID',
    pollObservations: [{
      eventType: 'account-created',
      matched: true,
      event: {
        type: 'account.created',
        data: { amount: 19.99, currency: 'USD' },
      },
    }],
  });

  assert.notEqual(result.accountEventStatus, 'CONFIRMED_CREATED');
  assert.equal(result.messageKey, undefined);
});
