import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PaymentWorkflowAction,
  PaymentWorkflowState,
  classifyPaymentAccountEventObservation,
  classifyPaymentObservation,
  classifyPaymentQrEventObservation,
} from '../lib/payment-workflow-fsm.mjs';

const paymentContext = {
  paymentId: 'pay_1',
  environment: 'sandbox',
  walletId: 'wallet_1',
  startedAtMs: 1_000,
  amount: 19.99,
  currency: 'USD',
};

const qrCleanupPath = join(tmpdir(), 'clink-cli-payment-qr-order_qr');
const qrImagePath = join(qrCleanupPath, 'payment-qr.png');
const qrObservedAtMs = 1_799_999_900_000;
const qrOutput = (customerAction = {}) => JSON.stringify({
  ok: true,
  data: {
    orderId: 'order_qr',
    channelPaymentResponse: { status: 5 },
    customerAction: {
      type: 'QR_CODE_REQUIRED',
      imagePath: qrImagePath,
      mediaType: 'image/png',
      temporary: true,
      cleanupRequired: true,
      orderId: 'order_qr',
      paymentExecutionDetailId: 'ped_qr',
      expiresAt: 1_800_000_000,
      expiresSecond: 120,
      cleanupPath: qrCleanupPath,
      ...customerAction,
    },
  },
});

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
    'clink events poll --type account-created,account-reloaded --max-wait 60 --format json',
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
  assert.equal(result.retryAllowed, false);
  assert.equal(result.pollCommands, undefined);
});

test('Agent Pay preserves payment_state_unknown verification context without retry', () => {
  const result = classifyPaymentObservation({
    exitCode: 5,
    stderr: JSON.stringify({
      ok: false,
      error: {
        type: 'payment_state_unknown',
        code: 500,
        message: 'payment was submitted but its QR code could not be stored',
        details: {
          paymentState: 'UNKNOWN',
          paymentSubmitted: true,
          retryAllowed: false,
          orderId: 'order_qr_unknown',
          paymentExecutionDetailId: 'ped_qr_unknown',
          paymentStatus: 5,
          failure: 'failed to store payment QR code',
        },
      },
    }),
    paymentContext,
  });

  assert.deepEqual(result, {
    state: PaymentWorkflowState.PAY_UNKNOWN,
    action: PaymentWorkflowAction.VERIFY_BEFORE_RETRY,
    terminal: false,
    reason: 'payment_state_unknown',
    paymentStatus: 'UNKNOWN',
    paymentTerminal: false,
    paymentSubmitted: true,
    retryAllowed: false,
    orderId: 'order_qr_unknown',
    paymentExecutionDetailId: 'ped_qr_unknown',
    reportedPaymentStatus: 5,
    failure: 'failed to store payment QR code',
  });
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

test('Agent Alipay QR customer action uses a native PNG and starts one correlated any-of wait', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput(),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });

  assert.equal(result.state, PaymentWorkflowState.QR_CODE_REQUIRED);
  assert.equal(result.action, PaymentWorkflowAction.SHOW_QR_AND_WAIT_EVENT);
  assert.equal(result.terminal, false);
  assert.equal(result.paymentStatus, 'PENDING_CUSTOMER_ACTION');
  assert.equal(result.retryAllowed, false);
  assert.deepEqual(result.customerAction, {
    type: 'QR_CODE_REQUIRED',
    imagePath: qrImagePath,
    mediaType: 'image/png',
    temporary: true,
    cleanupRequired: true,
    orderId: 'order_qr',
    paymentExecutionDetailId: 'ped_qr',
    expiresAt: 1_800_000_000,
    expiresSecond: 120,
    cleanupPath: qrCleanupPath,
  });
  assert.deepEqual(result.orderWaitSpec, {
    eventType: 'agent_order.succeeded,agent_order.failed',
    maxWaitSeconds: 120,
    observedAtEpochSeconds: Math.floor(qrObservedAtMs / 1000),
    noAck: false,
    pollCommand: 'clink events poll --type agent_order.succeeded,agent_order.failed --max-wait 120 --format json',
    purpose: 'AGENT_PAY_QR',
    expectedResource: {
      orderId: 'order_qr',
      paymentExecutionDetailId: 'ped_qr',
    },
  });
  assert.deepEqual(result.pollCommands, [result.orderWaitSpec.pollCommand]);
  assert.doesNotMatch(JSON.stringify(result), /base64|imageUrlPng/iu);
});

test('Agent Alipay QR customer action can correlate by the frozen pay session', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        channelPaymentResponse: { status: 5 },
        customerAction: {
          type: 'QR_CODE_REQUIRED',
          imagePath: qrImagePath,
          mediaType: 'image/png',
          temporary: true,
          cleanupRequired: true,
          orderId: null,
          paymentExecutionDetailId: null,
          expiresAt: null,
          expiresSecond: 45,
          cleanupPath: qrCleanupPath,
        },
      },
    }),
    paymentContext: { ...paymentContext, sessionId: 'sess_qr' },
  });

  assert.deepEqual(result.orderWaitSpec.expectedResource, { sessionId: 'sess_qr' });
  assert.equal(result.customerAction.sessionId, undefined);
});

test('Agent Alipay QR wait prefers expiresSecond and caps it at 900 seconds', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({ expiresSecond: 1_200 }),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });

  assert.equal(result.orderWaitSpec.maxWaitSeconds, 900);
  assert.match(result.orderWaitSpec.pollCommand, /--max-wait 900/u);
});

test('Agent Alipay QR wait derives seconds from epoch expiry when expiresSecond is null', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      expiresAt: Math.floor(qrObservedAtMs / 1000) + 45,
      expiresSecond: null,
    }),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });

  assert.equal(result.orderWaitSpec.maxWaitSeconds, 45);
  assert.match(result.orderWaitSpec.pollCommand, /--max-wait 45/u);
});

test('an expiresAt-only Agent Alipay QR accepts a success event after time advances', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      expiresAt: Math.floor(qrObservedAtMs / 1000) + 45,
      expiresSecond: null,
    }),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    observedAtMs: qrObservedAtMs + 1_000,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: true,
          timedOut: false,
          events: [{
            type: 'agent_order.succeeded',
            data: { orderId: 'order_qr' },
          }],
        },
      }),
    },
  });

  assert.equal(qrWorkflow.orderWaitSpec.maxWaitSeconds, 45);
  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_SUCCEEDED);
  assert.equal(result.reason, 'qr_payment_event_succeeded');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.retryAllowed, false);
});

test('an expiresAt-only Agent Alipay QR accepts a timeout after time advances', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      expiresAt: Math.floor(qrObservedAtMs / 1000) + 45,
      expiresSecond: null,
    }),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    observedAtMs: qrObservedAtMs + 1_000,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: false,
          timedOut: true,
          events: [],
        },
      }),
    },
  });

  assert.equal(qrWorkflow.orderWaitSpec.maxWaitSeconds, 45);
  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_TIMED_OUT);
  assert.equal(result.reason, 'qr_payment_event_timeout');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.retryAllowed, false);
});

test('an expiresAt-only Agent Alipay QR rejects a tampered frozen wait', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      expiresAt: Math.floor(qrObservedAtMs / 1000) + 45,
      expiresSecond: null,
    }),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  qrWorkflow.orderWaitSpec = {
    ...qrWorkflow.orderWaitSpec,
    maxWaitSeconds: 46,
    pollCommand: 'clink events poll --type agent_order.succeeded,agent_order.failed --max-wait 46 --format json',
  };
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    observedAtMs: qrObservedAtMs + 1_000,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: true,
          timedOut: false,
          events: [{
            type: 'agent_order.succeeded',
            data: { orderId: 'order_qr' },
          }],
        },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_qr_workflow_context');
  assert.equal(result.retryAllowed, false);
});

test('status 5 without an explicit CLI QR action keeps the legacy pending event flow', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        orderId: 'order_legacy',
        channelPaymentResponse: { status: 5 },
      },
    }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.PAY_SUBMITTED);
  assert.equal(result.action, PaymentWorkflowAction.WAIT_EVENT);
});

test('Agent Alipay QR rejects inline image data even when a temporary path is also present', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      imageUrlPng: 'data:image/png;base64,secret-qr-payload',
    }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.CLI_ERROR);
  assert.equal(result.action, PaymentWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'qr_inline_image_not_redacted');
  assert.equal(result.retryAllowed, false);
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.doesNotMatch(JSON.stringify(result), /secret-qr-payload|base64/iu);
});

test('Agent Alipay QR accepts the CLI redacted PNG marker without treating it as a leak', () => {
  const parsed = JSON.parse(qrOutput());
  parsed.data.channelPaymentResponse.action = {
    walletHandleRedirectOrDisplayQrCode: {
      imageUrlPng: '[redacted:png-data-url]',
    },
  };
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: JSON.stringify(parsed),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });

  assert.equal(result.state, PaymentWorkflowState.QR_CODE_REQUIRED);
  assert.equal(result.action, PaymentWorkflowAction.SHOW_QR_AND_WAIT_EVENT);
});

test('Agent Alipay QR rejects a path outside the OS temporary directory', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({ imagePath: '/opt/clink-agent-pay-qr.png' }),
    paymentContext,
  });

  assert.equal(result.state, PaymentWorkflowState.CLI_ERROR);
  assert.equal(result.reason, 'qr_temporary_png_path_invalid');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
});

test('Agent Alipay QR rejects missing fixed file metadata and cleans its owned directory', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({ cleanupRequired: false }),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });

  assert.equal(result.state, PaymentWorkflowState.CLI_ERROR);
  assert.equal(result.reason, 'qr_file_metadata_invalid');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
});

test('Agent Alipay QR rejects an image outside its caller-owned cleanup directory', () => {
  const otherCleanupPath = join(tmpdir(), 'clink-cli-payment-qr-other');
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      cleanupPath: otherCleanupPath,
    }),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });

  assert.equal(result.state, PaymentWorkflowState.CLI_ERROR);
  assert.equal(result.reason, 'qr_image_outside_cleanup_path');
  assert.equal(result.cleanupPath, otherCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
});

test('an already expired numeric epoch QR customer action is terminal and requires recursive cleanup', () => {
  const result = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      expiresAt: 1_800_000_000,
      expiresSecond: null,
    }),
    paymentContext,
    observedAtMs: 1_800_000_001_000,
  });

  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_TIMED_OUT);
  assert.equal(result.action, PaymentWorkflowAction.RETURN_QR_TERMINAL_AND_CLEANUP);
  assert.equal(result.terminal, true);
  assert.equal(result.qrEventStatus, 'TIMED_OUT');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
});

test('an epoch-expired QR becomes terminal when a non-correlated poll returns', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({
      expiresAt: 1_800_000_001,
      expiresSecond: 120,
    }),
    paymentContext,
    observedAtMs: 1_800_000_000_000,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    observedAtMs: 1_800_000_002_000,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: true,
          timedOut: false,
          events: [{
            type: 'agent_order.succeeded',
            data: { orderId: 'order_other' },
          }],
        },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_TIMED_OUT);
  assert.equal(result.reason, 'qr_customer_action_expired');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.retryAllowed, false);
});

test('a correlated Agent Alipay success event completes payment and cleans up the QR PNG', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput(),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  const event = {
    type: 'agent_order.succeeded',
    data: { orderId: 'order_qr' },
  };
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: { ready: true, timedOut: false, events: [event] },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_SUCCEEDED);
  assert.equal(result.action, PaymentWorkflowAction.RETURN_QR_TERMINAL_AND_CLEANUP);
  assert.equal(result.paymentStatus, 'PAID');
  assert.equal(result.qrEventStatus, 'SUCCEEDED');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
  assert.deepEqual(result.event, event);
});

test('Agent Alipay QR can correlate a terminal event by paymentExecutionDetailId', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput({ orderId: null }),
    paymentContext: {},
    observedAtMs: qrObservedAtMs,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: true,
          timedOut: false,
          events: [{
            type: 'agent_order.succeeded',
            data: { paymentExecutionDetailId: 'ped_qr' },
          }],
        },
      }),
    },
  });

  assert.deepEqual(qrWorkflow.orderWaitSpec.expectedResource, {
    paymentExecutionDetailId: 'ped_qr',
  });
  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_SUCCEEDED);
  assert.equal(result.cleanupPath, qrCleanupPath);
});

test('a correlated Agent Alipay failure event stops without retry and cleans up the QR PNG', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput(),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: true,
          timedOut: false,
          events: [{
            type: 'agent_order.failed',
            data: { orderId: 'order_qr', message: 'declined' },
          }],
        },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_FAILED);
  assert.equal(result.paymentStatus, 'FAILED');
  assert.equal(result.qrEventStatus, 'FAILED');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
});

test('Agent Alipay QR event timeout is terminal, removes the PNG, and exposes no resume retry', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput(),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: false,
          timedOut: true,
          events: [],
          resumeCommand: 'must-not-be-returned',
        },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_TIMED_OUT);
  assert.equal(result.paymentStatus, 'UNKNOWN');
  assert.equal(result.qrEventStatus, 'TIMED_OUT');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
  assert.equal(result.resumeCommand, undefined);
  assert.equal(result.pollCommands, undefined);
});

test('an Agent Alipay event for another order keeps the QR pending without cleanup', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput(),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: true,
          timedOut: false,
          events: [{
            type: 'agent_order.succeeded',
            data: { orderId: 'order_other' },
          }],
        },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.QR_CODE_REQUIRED);
  assert.equal(result.action, PaymentWorkflowAction.WAIT_EVENT);
  assert.equal(result.terminal, false);
  assert.equal(result.cleanupPending, true);
  assert.equal(result.cleanupPath, undefined);
  assert.equal(result.retryAllowed, false);
});

test('an Agent Alipay event poll error becomes terminal unknown without payment retry', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput(),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    pollObservation: {
      exitCode: 4,
      stderr: JSON.stringify({
        ok: false,
        error: { message: 'event scope denied' },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.QR_PAYMENT_UNKNOWN);
  assert.equal(result.paymentStatus, 'UNKNOWN');
  assert.equal(result.qrEventStatus, 'POLL_ERROR');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.cleanupRecursive, true);
  assert.equal(result.retryAllowed, false);
});

test('Agent Alipay QR rejects a tampered event wait before classifying its result', () => {
  const qrWorkflow = classifyPaymentObservation({
    exitCode: 0,
    stdout: qrOutput(),
    paymentContext,
    observedAtMs: qrObservedAtMs,
  });
  qrWorkflow.orderWaitSpec = {
    ...qrWorkflow.orderWaitSpec,
    maxWaitSeconds: 900,
    pollCommand: 'clink events poll --type agent_order.succeeded --max-wait 900 --format json',
    expectedResource: { orderId: 'order_other' },
  };
  const result = classifyPaymentQrEventObservation({
    qrWorkflow,
    observedAtMs: qrObservedAtMs,
    pollObservation: {
      exitCode: 0,
      stdout: JSON.stringify({
        ok: true,
        data: {
          ready: true,
          timedOut: false,
          events: [{
            type: 'agent_order.succeeded',
            data: { orderId: 'order_other' },
          }],
        },
      }),
    },
  });

  assert.equal(result.state, PaymentWorkflowState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_qr_workflow_context');
  assert.equal(result.cleanupPath, qrCleanupPath);
  assert.equal(result.retryAllowed, false);
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
