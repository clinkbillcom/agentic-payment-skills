import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EventWorkflowAction,
  EventWorkflowState,
  classifyEventPollObservation,
  classifyEventWaitRequest,
  pollCommandForWaitSpec,
} from '../lib/event-workflow-fsm.mjs';

const instructionWaitSpec = {
  eventType: 'purchase_instruction.activated',
  expectedResource: {
    instructionId: 'ins_123',
  },
  verifyCommand: 'clink-cli instruction get --purchase-instruction-id ins_123 --format json',
};

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

test('poll command builder uses no-ack by default to avoid consuming before correlation', () => {
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
