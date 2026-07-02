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
