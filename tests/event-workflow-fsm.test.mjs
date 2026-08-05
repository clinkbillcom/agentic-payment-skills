import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EventWorkflowAction,
  EventWorkflowDomain,
  EventWorkflowState,
  canonicalAccountEventType,
  classifyAgentPayAccountEventCandidate,
  classifyEventWorkflow,
  classifyEventPollObservation,
  classifyEventWaitRequest,
  correlateEventWorkflow,
  pollCommandForWaitSpec,
} from '../lib/event-workflow-fsm.mjs';

const instructionWaitSpec = {
  eventType: 'purchase_instruction.activated',
  expectedResource: {
    instructionId: 'ins_123',
  },
  verifyCommand: 'clink-cli instruction get --purchase-instruction-id ins_123 --format json',
};

test('normalizes CLI and body account event type aliases', () => {
  assert.equal(canonicalAccountEventType('account-created'), 'account.created');
  assert.equal(canonicalAccountEventType('account.created'), 'account.created');
  assert.equal(canonicalAccountEventType('account-reloaded'), 'account.reloaded');
  assert.equal(canonicalAccountEventType('account.reloaded'), 'account.reloaded');
  assert.equal(canonicalAccountEventType('agent_order.succeeded'), null);
});

test('classifies dotted account event body types', () => {
  const created = classifyEventWorkflow({ type: 'account.created' });
  const reloaded = classifyEventWorkflow({ type: 'account.reloaded' });

  assert.equal(created.state, EventWorkflowState.SKILL_TIP_ACCOUNT_CREATED);
  assert.equal(created.action, EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT);
  assert.equal(reloaded.state, EventWorkflowState.SKILL_TIP_ACCOUNT_RELOADED);
  assert.equal(reloaded.action, EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT);
});

test('a hyphenated account wait accepts a dotted event body type', () => {
  const result = classifyEventPollObservation(
    {
      ready: true,
      timedOut: false,
      events: [{ type: 'account.created', data: { orderId: 'order_1' } }],
    },
    {
      eventType: 'account-created',
      expectedResource: { orderId: 'order_1' },
      noAck: false,
      maxWaitSeconds: 60,
    },
  );

  assert.equal(result.state, EventWorkflowState.SKILL_TIP_ACCOUNT_CREATED);
  assert.equal(result.matched, true);
});

const agentPayAccountEvent = {
  type: 'account.created',
  data: {
    customerEmail: 'customer@example.com',
    webSite: 'https://example.com',
    userId: 'usr_1',
    amount: 19.99,
    currency: 'USD',
  },
};

const currentAgentPayment = {
  paymentId: 'pay_1',
  environment: 'sandbox',
  walletId: 'wallet_1',
  startedAtMs: 1_000,
  amount: 19.99,
  currency: 'USD',
};

test('Agent Pay account candidate correlates one amount and currency match without optional identity', () => {
  const result = classifyAgentPayAccountEventCandidate({
    event: agentPayAccountEvent,
    currentPayment: currentAgentPayment,
    activePayments: [currentAgentPayment],
    nowMs: 2_000,
  });

  assert.equal(result.domain, EventWorkflowDomain.AGENT_PAY_ACCOUNT);
  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED);
  assert.equal(result.action, EventWorkflowAction.RETURN_AGENT_PAY_ACCOUNT_EVENT);
  assert.equal(result.matched, true);
  assert.equal(result.ambiguous, false);
  assert.equal(result.canonicalEventType, 'account.created');
  assert.equal(result.candidate.paymentId, 'pay_1');
});

test('Agent Pay account candidate rejects an explicit optional identity conflict', () => {
  const result = classifyAgentPayAccountEventCandidate({
    event: agentPayAccountEvent,
    currentPayment: {
      ...currentAgentPayment,
      customerEmail: 'other@example.com',
    },
    activePayments: [{
      ...currentAgentPayment,
      customerEmail: 'other@example.com',
    }],
    nowMs: 2_000,
  });

  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED);
  assert.equal(result.matched, false);
  assert.equal(result.ambiguous, false);
  assert.equal(result.candidate, undefined);
});

test('Agent Pay account candidate uses optional identity as a unique positive tie-breaker', () => {
  const matchedPayment = {
    ...currentAgentPayment,
    customerEmail: 'customer@example.com',
  };
  const result = classifyAgentPayAccountEventCandidate({
    event: agentPayAccountEvent,
    currentPayment: matchedPayment,
    activePayments: [
      matchedPayment,
      { ...currentAgentPayment, paymentId: 'pay_2' },
    ],
    nowMs: 2_000,
  });

  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED);
  assert.equal(result.matched, true);
  assert.equal(result.candidate.paymentId, 'pay_1');
});

test('Agent Pay account candidate remains ambiguous for indistinguishable payments', () => {
  const result = classifyAgentPayAccountEventCandidate({
    event: agentPayAccountEvent,
    currentPayment: currentAgentPayment,
    activePayments: [
      currentAgentPayment,
      { ...currentAgentPayment, paymentId: 'pay_2' },
    ],
    nowMs: 2_000,
  });

  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_AMBIGUOUS);
  assert.equal(result.action, EventWorkflowAction.RETURN_AGENT_PAY_ACCOUNT_AMBIGUOUS);
  assert.equal(result.matched, false);
  assert.equal(result.ambiguous, true);
  assert.equal(result.candidate, undefined);
});

test('Agent Pay account candidate recognizes a serialized current watch without an upstream payment id', () => {
  const currentPayment = {
    ...currentAgentPayment,
    paymentId: undefined,
    accountWatchId: 'watch_1',
  };
  const result = classifyAgentPayAccountEventCandidate({
    event: agentPayAccountEvent,
    currentPayment,
    activePayments: [{ ...currentPayment }],
    nowMs: 2_000,
  });

  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED);
  assert.equal(result.matched, true);
  assert.equal(result.candidate.accountWatchId, 'watch_1');
});

test('Agent Pay account candidate excludes other scopes and expired watches', () => {
  const result = classifyAgentPayAccountEventCandidate({
    event: agentPayAccountEvent,
    currentPayment: currentAgentPayment,
    activePayments: [
      currentAgentPayment,
      { ...currentAgentPayment, paymentId: 'pay_env', environment: 'production' },
      { ...currentAgentPayment, paymentId: 'pay_wallet', walletId: 'wallet_2' },
      { ...currentAgentPayment, paymentId: 'pay_old', startedAtMs: -100_000 },
    ],
    nowMs: 2_000,
    maxAgeMs: 60_000,
  });

  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED);
  assert.equal(result.candidate.paymentId, 'pay_1');
});

test('Agent Pay account candidate requires event amount and currency', () => {
  const missingAmount = classifyAgentPayAccountEventCandidate({
    event: { type: 'account.created', data: { currency: 'USD' } },
    currentPayment: currentAgentPayment,
    activePayments: [currentAgentPayment],
    nowMs: 2_000,
  });
  const missingCurrency = classifyAgentPayAccountEventCandidate({
    event: { type: 'account.created', data: { amount: 19.99 } },
    currentPayment: currentAgentPayment,
    activePayments: [currentAgentPayment],
    nowMs: 2_000,
  });

  assert.equal(missingAmount.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED);
  assert.equal(missingCurrency.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED);
});

test('Agent Pay account candidate does not collapse distinct unsafe integer amounts', () => {
  const result = classifyAgentPayAccountEventCandidate({
    event: {
      type: 'account.created',
      data: { amount: '9007199254740993', currency: 'USD' },
    },
    currentPayment: {
      ...currentAgentPayment,
      amount: '9007199254740992',
    },
    activePayments: [{
      ...currentAgentPayment,
      amount: '9007199254740992',
    }],
    nowMs: 2_000,
  });

  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_NOT_CORRELATED);
  assert.equal(result.matched, false);
});

test('Agent Pay account poll routes a dotted body through unique-candidate attribution', () => {
  const result = classifyEventPollObservation(
    {
      ready: true,
      timedOut: false,
      events: [agentPayAccountEvent],
    },
    {
      eventType: 'account-created',
      purpose: 'AGENT_PAY_ACCOUNT',
      currentPayment: currentAgentPayment,
      activePayments: [currentAgentPayment],
      nowMs: 2_000,
      maxWaitSeconds: 60,
      noAck: false,
    },
  );

  assert.equal(result.domain, EventWorkflowDomain.AGENT_PAY_ACCOUNT);
  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED);
  assert.equal(result.action, EventWorkflowAction.RETURN_AGENT_PAY_ACCOUNT_EVENT);
  assert.equal(result.eventType, 'account-created');
  assert.equal(result.canonicalEventType, 'account.created');
  assert.equal(result.matched, true);
  assert.equal(result.candidate.paymentId, 'pay_1');
});

test('Agent Pay account poll checks every same-type event before returning no match', () => {
  const result = classifyEventPollObservation(
    {
      ready: true,
      timedOut: false,
      events: [
        {
          type: 'account.created',
          data: { amount: 5, currency: 'USD' },
        },
        agentPayAccountEvent,
      ],
    },
    {
      eventType: 'account-created',
      purpose: 'AGENT_PAY_ACCOUNT',
      currentPayment: currentAgentPayment,
      activePayments: [currentAgentPayment],
      nowMs: 2_000,
      maxWaitSeconds: 60,
      noAck: false,
    },
  );

  assert.equal(result.state, EventWorkflowState.AGENT_PAY_ACCOUNT_EVENT_CORRELATED);
  assert.equal(result.matched, true);
  assert.equal(result.event, agentPayAccountEvent);
});

test('classifies account-created as optional skill tip account confirmation', () => {
  const result = classifyEventWorkflow({ type: 'account-created' });

  assert.equal(result.domain, EventWorkflowDomain.SKILL_TIP_ACCOUNT);
  assert.equal(result.state, EventWorkflowState.SKILL_TIP_ACCOUNT_CREATED);
  assert.equal(result.action, EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT);
  assert.equal(result.terminal, true);
});

test('classifies account-reloaded as optional skill tip account confirmation', () => {
  const result = classifyEventWorkflow({ eventType: 'account-reloaded' });

  assert.equal(result.domain, EventWorkflowDomain.SKILL_TIP_ACCOUNT);
  assert.equal(result.state, EventWorkflowState.SKILL_TIP_ACCOUNT_RELOADED);
  assert.equal(result.terminal, true);
});

test('correlates a skill tip account event by order id', () => {
  const result = correlateEventWorkflow(
    { type: 'account-reloaded', data: { orderId: 'order_1' } },
    { orderId: 'order_1', merchantId: 'mcht_1' },
  );

  assert.equal(result.matched, true);
  assert.deepEqual(result.missingKeys, []);
  assert.deepEqual(result.mismatchedKeys, []);
});

test('rejects a skill tip account event for a different order', () => {
  const result = correlateEventWorkflow(
    { type: 'account-created', data: { orderId: 'order_other' } },
    { orderId: 'order_1' },
  );

  assert.equal(result.matched, false);
  assert.deepEqual(result.mismatchedKeys, ['orderId']);
});

test('does not accept a type-only skill tip account event', () => {
  const result = correlateEventWorkflow(
    { type: 'account-created' },
    { orderId: 'order_1' },
  );

  assert.equal(result.matched, false);
  assert.deepEqual(result.missingKeys, ['orderId']);
});

test('correlates a skill tip account event by customer and merchant when order is unavailable', () => {
  const result = correlateEventWorkflow(
    {
      type: 'account-reloaded',
      data: { customerId: 'cust_1', merchantId: 'mcht_1', skillId: 'skill_1' },
    },
    { customerId: 'cust_1', merchantId: 'mcht_1', skillId: 'skill_1' },
  );

  assert.equal(result.matched, true);
});

test('customer and merchant correlation does not require an optional skill id', () => {
  const result = correlateEventWorkflow(
    {
      type: 'account-created',
      data: { customerId: 'cust_1', merchantId: 'mcht_1' },
    },
    { customerId: 'cust_1', merchantId: 'mcht_1', skillId: 'skill_1' },
  );

  assert.equal(result.matched, true);
});

test('falls back to compound skill-tip identity when an event omits the expected order id', () => {
  const result = correlateEventWorkflow(
    {
      type: 'account-created',
      data: { customerId: 'cust_1', merchantId: 'mcht_1' },
    },
    { orderId: 'order_1', customerId: 'cust_1', merchantId: 'mcht_1' },
  );

  assert.equal(result.matched, true);
});

test('uses compound fallback when account event resourceId is not the expected order id', () => {
  const result = correlateEventWorkflow(
    {
      type: 'account-created',
      resourceId: 'cust_1',
      data: { customerId: 'cust_1', merchantId: 'mcht_1' },
    },
    { orderId: 'order_1', customerId: 'cust_1', merchantId: 'mcht_1' },
  );

  assert.equal(result.matched, true);
});

test('does not use compound fallback when an explicit event order id conflicts', () => {
  const result = correlateEventWorkflow(
    {
      type: 'account-created',
      data: { orderId: 'order_other', customerId: 'cust_1', merchantId: 'mcht_1' },
    },
    { orderId: 'order_1', customerId: 'cust_1', merchantId: 'mcht_1' },
  );

  assert.equal(result.matched, false);
  assert.deepEqual(result.mismatchedKeys, ['orderId']);
});

test('requires a compound identity when a skill tip order id is unavailable', () => {
  const result = correlateEventWorkflow(
    { type: 'account-created', data: { merchantId: 'mcht_1' } },
    { merchantId: 'mcht_1' },
  );

  assert.equal(result.matched, false);
  assert.deepEqual(result.missingKeys, ['expectedResource']);
});

test('a correlated optional account event returns terminal evidence without a status command', () => {
  const result = classifyEventPollObservation(
    {
      ready: true,
      timedOut: false,
      events: [{ type: 'account-created', data: { orderId: 'order_1' } }],
    },
    {
      eventType: 'account-created',
      expectedResource: { orderId: 'order_1' },
      noAck: false,
      maxWaitSeconds: 60,
    },
  );

  assert.equal(result.state, EventWorkflowState.SKILL_TIP_ACCOUNT_CREATED);
  assert.equal(result.action, EventWorkflowAction.RETURN_SKILL_TIP_ACCOUNT_EVENT);
  assert.equal(result.matched, true);
  assert.equal(result.terminal, true);
  assert.equal(result.verifyCommand, undefined);
});

test('event wait request starts a typed no-ack poll with resource correlation metadata', () => {
  const result = classifyEventWaitRequest(instructionWaitSpec);

  assert.equal(result.state, EventWorkflowState.EVENT_POLL_REQUIRED);
  assert.equal(result.action, EventWorkflowAction.START_EVENT_POLL);
  assert.equal(result.eventType, 'purchase_instruction.activated');
  assert.equal(
    result.pollCommand,
    'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
  );
  assert.deepEqual(result.expectedResource, {
    instructionId: 'ins_123',
    purchaseInstructionId: 'ins_123',
  });
  assert.equal(
    result.verifyCommand,
    'clink-cli instruction get --purchase-instruction-id ins_123 --format json',
  );
});

test('poll command builder uses no-ack to preserve the selected type before correlation', () => {
  assert.equal(
    pollCommandForWaitSpec(instructionWaitSpec),
    'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
  );
});

test('event poll observation requires authoritative verification after matched instruction activation', () => {
  const result = classifyEventPollObservation(
    {
      stdout: JSON.stringify({
        ready: true,
        timedOut: false,
        events: [
          {
            eventType: 'purchase_instruction.activated',
            resourceId: 'ins_123',
            data: {
              purchaseInstructionId: 'ins_123',
            },
          },
        ],
      }),
    },
    instructionWaitSpec,
  );

  assert.equal(result.state, EventWorkflowState.EVENT_STATUS_VERIFY_REQUIRED);
  assert.equal(result.action, EventWorkflowAction.VERIFY_RESOURCE_STATUS);
  assert.equal(result.matched, true);
  assert.equal(result.event.eventType, 'purchase_instruction.activated');
  assert.equal(
    result.verifyCommand,
    'clink-cli instruction get --purchase-instruction-id ins_123 --format json',
  );
});

test('event poll observation stays pending when activation belongs to a different instruction', () => {
  const result = classifyEventPollObservation(
    {
      ready: true,
      timedOut: false,
      events: [
        {
          type: 'purchase_instruction.activated',
          resourceId: 'ins_other',
          instructionId: 'ins_other',
        },
      ],
    },
    instructionWaitSpec,
  );

  assert.equal(result.state, EventWorkflowState.EVENT_NOT_CORRELATED);
  assert.equal(result.action, EventWorkflowAction.WAIT_EVENT);
  assert.equal(result.matched, false);
  assert.equal(result.pollCommand, 'clink-cli events poll --type purchase_instruction.activated --no-ack --format json');
});

test('event poll observation returns resumable timeout without claiming success', () => {
  const result = classifyEventPollObservation(
    {
      ready: false,
      timedOut: true,
      resumeCommand: 'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
    },
    instructionWaitSpec,
  );

  assert.equal(result.state, EventWorkflowState.EVENT_TIMEOUT);
  assert.equal(result.action, EventWorkflowAction.RETURN_PENDING_WITH_RESUME);
  assert.equal(result.terminal, false);
  assert.equal(
    result.resumeCommand,
    'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
  );
});

test('event poll observation surfaces a nonzero CLI exit for optional aggregation', () => {
  const result = classifyEventPollObservation(
    {
      exitCode: 5,
      stderr: JSON.stringify({ ok: false, error: { message: 'poll failed' } }),
    },
    {
      eventType: 'account-created',
      expectedResource: { orderId: 'order_1' },
      noAck: false,
    },
  );

  assert.equal(result.state, EventWorkflowState.EVENT_INVALID);
  assert.equal(result.action, EventWorkflowAction.SURFACE_EVENT_ERROR);
  assert.equal(result.eventType, 'account-created');
  assert.equal(result.exitCode, 5);
  assert.equal(result.error.message, 'poll failed');
});

test('event poll observation keeps waiting when no matching event has been observed yet', () => {
  const result = classifyEventPollObservation({ ready: false, events: [] }, instructionWaitSpec);

  assert.equal(result.state, EventWorkflowState.EVENT_PENDING);
  assert.equal(result.action, EventWorkflowAction.WAIT_EVENT);
  assert.equal(result.matched, false);
});

test('event poll observation normalizes snake_case instruction ids in wait specs', () => {
  const result = classifyEventPollObservation(
    {
      events: [
        {
          type: 'purchase_instruction.activated',
          resourceId: 'ins_snake',
          data: {
            instruction_id: 'ins_snake',
          },
        },
      ],
    },
    {
      event_type: 'purchase_instruction.activated',
      expected_resource: {
        purchase_instruction_id: 'ins_snake',
      },
      verify_command: 'clink-cli instruction get --purchase-instruction-id ins_snake --format json',
    },
  );

  assert.equal(result.state, EventWorkflowState.EVENT_STATUS_VERIFY_REQUIRED);
  assert.equal(result.action, EventWorkflowAction.VERIFY_RESOURCE_STATUS);
  assert.deepEqual(result.expectedResource, {
    purchase_instruction_id: 'ins_snake',
    instructionId: 'ins_snake',
    purchaseInstructionId: 'ins_snake',
  });
});

test('event poll observation reads the last JSON envelope from built-in watch stdout', () => {
  const stdout = [
    JSON.stringify({
      ok: true,
      data: {
        instructionId: 'ins_watch',
        passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_watch',
      },
    }),
    JSON.stringify({
      ok: true,
      data: {
        watched: true,
        timedOut: false,
        events: [
          {
            eventType: 'purchase_instruction.activated',
            resourceId: 'ins_watch',
          },
        ],
      },
    }),
  ].join('\n');

  const result = classifyEventPollObservation(
    { stdout },
    {
      eventType: 'purchase_instruction.activated',
      expectedResource: { instructionId: 'ins_watch' },
      verifyCommand: 'clink-cli instruction get --purchase-instruction-id ins_watch --format json',
    },
  );

  assert.equal(result.state, EventWorkflowState.EVENT_STATUS_VERIFY_REQUIRED);
  assert.equal(result.event.resourceId, 'ins_watch');
});
