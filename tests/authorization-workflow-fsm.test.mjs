import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AuthorizationWorkflowAction,
  AuthorizationWorkflowState,
  RecurringFrequency,
  ScheduledAuthorizationMode,
  classifyAuthorizationActiveVerification,
  classifyAuthorizationDraftObservation,
  classifyAuthorizationPrepareObservation,
  classifyPaymentAuthorizationResolver,
  classifyQuickInstructionActivationGate,
  classifyScheduledAuthorizationReuse,
  classifyScheduledAuthorizationScope,
  classifyUnattendedAuthorization,
} from '../lib/authorization-workflow-fsm.mjs';
import { classifyEventPollObservation } from '../lib/event-workflow-fsm.mjs';

test('authorization resolver refreshes payment instruments before deciding', () => {
  const result = classifyPaymentAuthorizationResolver({});

  assert.equal(result.state, AuthorizationWorkflowState.PAYMENT_INSTRUMENT_REFRESH_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.REFRESH_PAYMENT_INSTRUMENT_LIST);
  assert.equal(result.reason, 'payment_instrument_refresh_required');
});

test('authorization resolver starts the CLI pending-instruction continuation after an empty refresh', () => {
  const result = classifyPaymentAuthorizationResolver({
    paymentMethodsVoList: [],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_PREPARE_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.START_AUTHORIZATION_PREPARE_AND_WAIT);
  assert.equal(result.reason, 'no_payment_instrument_pending_instruction_required');
  assert.equal(result.paymentInstrumentId, undefined);
});

test('authorization resolver bypasses instruction matching for a non-Visa default card', () => {
  const result = classifyPaymentAuthorizationResolver({
    paymentMethodsVoList: [
      {
        paymentInstrumentId: 'pi_mc',
        brand: 'Mastercard',
        isDefault: true,
      },
    ],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_BYPASSED);
  assert.equal(result.action, AuthorizationWorkflowAction.RUN_PAY_WITHOUT_AUTHORIZATION);
  assert.equal(result.reason, 'payment_instrument_not_visa_bypass_authorization');
  assert.equal(result.paymentInstrumentId, 'pi_mc');
});

test('authorization resolver starts the pending continuation for Visa when VIC is not ready', () => {
  const result = classifyPaymentAuthorizationResolver({
    paymentMethodsVoList: [
      {
        paymentInstrumentId: 'pi_visa',
        cardBrand: 'VISA',
        isDefault: true,
        visaRegistrationSucceeded: false,
      },
    ],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_PREPARE_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.START_AUTHORIZATION_PREPARE_AND_WAIT);
  assert.equal(result.reason, 'visa_vic_not_ready_pending_instruction_required');
  assert.equal(result.existingPaymentInstrumentId, 'pi_visa');
});

test('unattended Visa without VIC readiness surfaces a gap instead of preparing', () => {
  const result = classifyPaymentAuthorizationResolver({
    unattended: true,
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardBrand: 'VISA',
      isDefault: true,
      visaRegistrationSucceeded: false,
    }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.UNATTENDED_AUTHORIZATION_GAP);
  assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP);
  assert.equal(result.terminal, true);
  assert.equal(result.reason, 'unattended_vic_readiness_missing');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
});

test('authorization resolver lists active instructions for Visa with VIC enabled', () => {
  const result = classifyPaymentAuthorizationResolver({
    paymentMethodsVoList: [
      {
        paymentInstrumentId: 'pi_visa',
        network: 'visa',
        isDefault: true,
        visaRegistrationSucceeded: true,
      },
    ],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_LIST_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.LIST_AUTHORIZATIONS);
  assert.equal(result.reason, 'visa_vic_ready_list_authorizations');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
});

test('authorization resolver returns matched instruction and mandate for Visa with VIC enabled', () => {
  const result = classifyPaymentAuthorizationResolver({
    paymentMethodsVoList: [
      {
        paymentInstrumentId: 'pi_visa',
        brand: 'Visa',
        isDefault: true,
        visaRegistrationSucceeded: true,
      },
    ],
    selected: {
      instructionId: 'ins_123',
      mandateId: 'mandate_123',
    },
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_MATCHED);
  assert.equal(result.action, AuthorizationWorkflowAction.RUN_PAY_WITH_AUTHORIZATION);
  assert.equal(result.reason, 'authorization_matched');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
  assert.equal(result.instructionId, 'ins_123');
  assert.equal(result.mandateId, 'mandate_123');
});

test('authorization resolver starts a draft after Visa VIC list has no match', () => {
  const result = classifyPaymentAuthorizationResolver({
    paymentMethodsVoList: [
      {
        paymentInstrumentId: 'pi_visa',
        brand: 'Visa',
        isDefault: true,
        vicReady: true,
      },
    ],
    authorizationListChecked: true,
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_DRAFT_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.START_AUTHORIZATION_DRAFT_AND_WAIT);
  assert.equal(result.reason, 'no_matching_authorization');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
});

test('authorization draft observation sends the Passkey URL under the built-in watch', () => {
  const result = classifyAuthorizationDraftObservation({
    stdout: JSON.stringify({
      ok: true,
      data: {
        instructionId: 'ins_123',
        paymentInstrumentId: 'pi_visa',
        passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_123',
      },
    }),
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_WAIT_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.SEND_PASSKEY_URL_AND_AWAIT_BUILT_IN_WATCH);
  assert.equal(result.instructionId, 'ins_123');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
  assert.equal(result.passkeyUrl, 'https://agent.clinkbill.com/passkey/ins_123');
  // The command's own process is the listener, so nothing should hand back a second poll to run.
  assert.equal(result.pollCommand, undefined);
  assert.equal(
    result.verifyCommand,
    'clink instruction get --purchase-instruction-id ins_123 --format json',
  );
});

test('pending instruction handoff exposes the bind-card URL only after the CLI watch is ready', () => {
  const result = classifyAuthorizationPrepareObservation({
    running: true,
    stdout: JSON.stringify({
      ok: true,
      data: {
        instructionId: 'ins_pending',
        status: 'PENDING',
        bindingUrl: 'https://agent.clinkbill.com/payment-method-setup?email=user%40example.com',
        watchReady: true,
        watchEventType: 'purchase_instruction.activated',
        processRunning: true,
        terminal: false,
      },
    }),
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_WAIT_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.HANDOFF_BIND_CARD_URL_AND_AWAIT_CLI);
  assert.equal(result.instructionId, 'ins_pending');
  assert.equal(
    result.bindingUrl,
    'https://agent.clinkbill.com/payment-method-setup?email=user%40example.com',
  );
  assert.equal(result.processMustRemainRunning, true);
  assert.equal(result.autoOpenAllowed, false);
  assert.equal(result.pollCommand, undefined);
  assert.equal(result.verifyCommand, undefined);
});

test('pending instruction handoff fails closed before the exact activation watch is ready', () => {
  const valid = {
    instructionId: 'ins_pending',
    status: 'PENDING',
    bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
    watchReady: true,
    watchEventType: 'purchase_instruction.activated',
    processRunning: true,
    terminal: false,
  };
  const { processRunning: _processRunning, ...missingProcessRunning } = valid;
  const { terminal: _terminal, ...missingTerminal } = valid;
  for (const data of [
    {
      ...valid,
      watchReady: false,
    },
    {
      ...valid,
      watchEventType: 'payment_method.added',
    },
    { ...valid, processRunning: false },
    { ...valid, terminal: true },
    missingProcessRunning,
    missingTerminal,
  ]) {
    const result = classifyAuthorizationPrepareObservation({
      running: true,
      stdout: { ok: true, data },
    });
    assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
    assert.equal(result.reason, 'authorization_prepare_pending_envelope_invalid');
    assert.equal(result.bindingUrl, undefined);
  }
});

test('prepare process death before the final envelope returns only exact-id read-only verify', () => {
  const result = classifyAuthorizationPrepareObservation({
    running: false,
    exitCode: 137,
    stdout: {
      ok: true,
      data: {
        instructionId: 'ins_died',
        status: 'PENDING',
        bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
        watchReady: true,
        watchEventType: 'purchase_instruction.activated',
        processRunning: true,
        terminal: false,
      },
    },
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_AFTER_WATCH_GAP);
  assert.equal(result.reason, 'authorization_prepare_process_ended_before_final');
  assert.equal(
    result.resumeCommand,
    'clink instruction get --purchase-instruction-id ins_died --format json',
  );
  assert.equal(result.resumeReadOnly, true);
  assert.equal(result.mutationAllowed, false);
  assert.equal(result.pollCommand, undefined);
});

test('pending instruction prepare uses instructionId without requiring a Quick pendingInstructionId', () => {
  const result = classifyAuthorizationPrepareObservation({
    running: true,
    stdout: {
      ok: true,
      data: {
        instructionId: 'ins_prepare',
        status: 'PENDING',
        bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
        watchReady: true,
        watchEventType: 'purchase_instruction.activated',
        processRunning: true,
        terminal: false,
      },
    },
  });

  assert.equal(result.action, AuthorizationWorkflowAction.HANDOFF_BIND_CARD_URL_AND_AWAIT_CLI);
  assert.equal(result.instructionId, 'ins_prepare');
});

test('pending instruction final envelope requires the same ACTIVE instruction and payment instrument', () => {
  const initial = JSON.stringify({
    ok: true,
    data: {
      instructionId: 'ins_pending',
      status: 'PENDING',
      bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
      watchReady: true,
      watchEventType: 'purchase_instruction.activated',
      processRunning: true,
      terminal: false,
    },
  });
  const active = JSON.stringify({
    ok: true,
    data: {
      command: 'instruction prepare',
      instructionId: 'ins_pending',
      status: 'ready',
      instructionStatus: 'ACTIVE',
      instruction: {
        instructionId: 'ins_pending',
        paymentInstrumentId: 'pi_visa',
        status: 'ACTIVE',
      },
    },
  });

  const result = classifyAuthorizationPrepareObservation({
    stdout: `${initial}\n${active}`,
    exitCode: 0,
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_READY);
  assert.equal(result.action, AuthorizationWorkflowAction.RESUME_AUTHORIZED_PAYMENT);
  assert.equal(result.instructionId, 'ins_pending');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
  assert.equal(result.pendingInstructionContinuationCompleted, true);
  assert.equal(result.authorization.paymentInstrumentId, 'pi_visa');

  const missingInstrument = classifyAuthorizationPrepareObservation({
    stdout: `${initial}\n${JSON.stringify({
      ok: true,
      data: {
        command: 'instruction prepare',
        instructionId: 'ins_pending',
        status: 'ready',
        instructionStatus: 'ACTIVE',
        instruction: { instructionId: 'ins_pending', status: 'ACTIVE' },
      },
    })}`,
    exitCode: 0,
  });
  assert.equal(missingInstrument.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
  assert.equal(missingInstrument.reason, 'authorization_payment_instrument_missing');
});

test('pending instruction timeout returns only exact read-only verification', () => {
  const result = classifyAuthorizationPrepareObservation({
    exitCode: 0,
    stdout: [
      JSON.stringify({
        ok: true,
        data: {
          instructionId: 'ins_pending',
          status: 'PENDING',
          bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
          watchReady: true,
          watchEventType: 'purchase_instruction.activated',
          processRunning: true,
          terminal: false,
        },
      }),
      JSON.stringify({
        ok: true,
        data: {
          command: 'instruction prepare',
          instructionId: 'ins_pending',
          status: 'timeout',
          instructionStatus: 'PENDING',
          instruction: {
            instructionId: 'ins_pending',
            status: 'PENDING',
          },
          resumeCommand:
            'CLINK_BASE_URL=https://api.clinkbill.com '
            + 'clink instruction get --purchase-instruction-id ins_pending --format json',
          resumeReadOnly: true,
          createsAnotherInstruction: false,
          paymentRetryAllowed: false,
        },
      }),
    ].join('\n'),
  });

  assert.equal(result.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_AFTER_WATCH_GAP);
  assert.equal(result.reason, 'authorization_prepare_timed_out');
  assert.equal(
    result.resumeCommand,
    'CLINK_BASE_URL=https://api.clinkbill.com '
      + 'clink instruction get --purchase-instruction-id ins_pending --format json',
  );
  assert.equal(result.pollCommand, undefined);
  assert.equal(result.mutationAllowed, false);
});

test('pending instruction rejects a mutation or different-id resume', () => {
  const initial = JSON.stringify({
    ok: true,
    data: {
      instructionId: 'ins_pending',
      status: 'PENDING',
      bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
      watchReady: true,
      watchEventType: 'purchase_instruction.activated',
      processRunning: true,
      terminal: false,
    },
  });

  for (const resumeCommand of [
    'clink instruction prepare --title Again --format json',
    'clink instruction get --purchase-instruction-id ins_other --format json',
    'clink instruction get --purchase-instruction-id ins_pending --format json; clink pay',
  ]) {
    const result = classifyAuthorizationPrepareObservation({
      exitCode: 0,
      stdout: `${initial}\n${JSON.stringify({
        ok: true,
        data: {
          command: 'instruction prepare',
          instructionId: 'ins_pending',
          status: 'timeout',
          instructionStatus: 'PENDING',
          instruction: { instructionId: 'ins_pending', status: 'PENDING' },
          resumeCommand,
          resumeReadOnly: true,
          createsAnotherInstruction: false,
          paymentRetryAllowed: false,
        },
      })}`,
    });

    assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
    assert.equal(result.reason, 'authorization_prepare_resume_invalid');
  }
});

test('instruction prepare card-ready result refreshes instead of creating another instruction', () => {
  const result = classifyAuthorizationPrepareObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        command: 'instruction prepare',
        status: 'card_ready',
        instructionId: null,
      },
    },
  });

  assert.equal(result.state, AuthorizationWorkflowState.PAYMENT_INSTRUMENT_REFRESH_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.REFRESH_PAYMENT_INSTRUMENT_LIST);
  assert.equal(result.reason, 'authorization_prepare_card_ready');
});

test('authorization draft observation verifies once the built-in watch delivers the activation', () => {
  const result = classifyAuthorizationDraftObservation({
    stdout: JSON.stringify({
      ok: true,
      data: {
        instructionId: 'ins_watched',
        paymentInstrumentId: 'pi_visa',
        passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_watched',
      },
    }),
    watchStdout: JSON.stringify({
      ok: true,
      data: {
        watched: true,
        timedOut: false,
        events: [{ eventType: 'purchase_instruction.activated', resourceId: 'ins_watched' }],
        ackedEventIds: ['evt_1'],
      },
    }),
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_ACTIVATION);
  assert.equal(result.reason, 'authorization_activation_event_observed');
  assert.equal(result.instructionId, 'ins_watched');
  assert.equal(
    result.verifyCommand,
    'clink instruction get --purchase-instruction-id ins_watched --format json',
  );
});

// A 15-minute timeout or a runtime-killed foreground command is not a failed authorization: the
// user may have completed the Passkey anyway. Asking the instruction beats assuming.
test('authorization draft observation verifies instead of failing when the watch ends without the event', () => {
  const draft = JSON.stringify({
    ok: true,
    data: {
      instructionId: 'ins_gap',
      paymentInstrumentId: 'pi_visa',
      passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_gap',
    },
  });

  const timedOut = classifyAuthorizationDraftObservation({
    stdout: draft,
    watchStdout: { ok: true, data: { watched: true, timedOut: true, events: [] } },
  });

  assert.equal(timedOut.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED);
  assert.equal(timedOut.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_AFTER_WATCH_GAP);
  assert.equal(timedOut.reason, 'authorization_watch_timed_out');
  assert.equal(
    timedOut.verifyCommand,
    'clink instruction get --purchase-instruction-id ins_gap --format json',
  );
  // A gap is recoverable, so the caller also gets a poll it can restart.
  assert.equal(
    timedOut.pollCommand,
    'clink events poll --type purchase_instruction.activated --no-ack --format json',
  );

  // An activation for a different instruction must never resume this payment.
  const wrongInstruction = classifyAuthorizationDraftObservation({
    stdout: draft,
    watchStdout: {
      ok: true,
      data: {
        watched: true,
        timedOut: false,
        events: [{ eventType: 'purchase_instruction.activated', resourceId: 'ins_someone_else' }],
      },
    },
  });

  assert.equal(wrongInstruction.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_AFTER_WATCH_GAP);
  assert.equal(wrongInstruction.reason, 'authorization_watch_ended_without_event');
});

test('authorization draft observation reads both NDJSON envelopes from a completed CLI watch', () => {
  const stdout = [
    JSON.stringify({
      ok: true,
      data: {
        instructionId: 'ins_multiline',
        paymentInstrumentId: 'pi_visa',
        passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_multiline',
      },
    }),
    JSON.stringify({
      ok: true,
      data: {
        watched: true,
        events: [
          {
            eventType: 'purchase_instruction.activated',
            resourceId: 'ins_multiline',
          },
        ],
      },
    }),
  ].join('\n');

  const result = classifyAuthorizationDraftObservation({ stdout });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_ACTIVATION);
  assert.equal(result.instructionId, 'ins_multiline');
  assert.equal(result.activationEvent.resourceId, 'ins_multiline');
});

test('authorization draft observation treats an unmatched NDJSON watch result as a verify gap', () => {
  const draft = JSON.stringify({
    ok: true,
    data: {
      instructionId: 'ins_ndjson_gap',
      paymentInstrumentId: 'pi_visa',
      passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_ndjson_gap',
    },
  });

  for (const watch of [
    { watched: true, timedOut: true, events: [] },
    {
      watched: true,
      timedOut: false,
      events: [{ eventType: 'purchase_instruction.activated', resourceId: 'ins_other' }],
    },
  ]) {
    const stdout = [
      draft,
      JSON.stringify({ ok: true, data: watch }),
    ].join('\n');
    const result = classifyAuthorizationDraftObservation({ stdout });

    assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED);
    assert.equal(result.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_AFTER_WATCH_GAP);
  }
});

test('authorization draft observation verifies after the watcher process exits without a result', () => {
  const stdout = JSON.stringify({
    ok: true,
    data: {
      instructionId: 'ins_exited',
      paymentInstrumentId: 'pi_visa',
      passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_exited',
    },
  });

  for (const processState of [
    { exitCode: 5 },
    { exit_code: 5 },
    { exitCode: 0 },
    { running: false },
  ]) {
    const result = classifyAuthorizationDraftObservation({ stdout, ...processState });

    assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED);
    assert.equal(result.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_AFTER_WATCH_GAP);
    assert.equal(result.reason, 'authorization_watch_ended_without_event');
  }
});

test('authorization draft observation keeps awaiting a watcher explicitly reported as running', () => {
  const result = classifyAuthorizationDraftObservation({
    running: true,
    stdout: JSON.stringify({
      ok: true,
      data: {
        instructionId: 'ins_running',
        paymentInstrumentId: 'pi_visa',
        passkeyUrl: 'https://agent.clinkbill.com/passkey/ins_running',
      },
    }),
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_WAIT_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.SEND_PASSKEY_URL_AND_AWAIT_BUILT_IN_WATCH);
});

test('authorization draft observation extracts the instruction id from sign-url output', () => {
  const result = classifyAuthorizationDraftObservation({
    stdout: JSON.stringify({
      ok: true,
      data: {
        url: 'https://uat-agent.clinkbill.com/passkey-auth/cpi_123?type=visa&instructionId=inst_123',
      },
    }),
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_WAIT_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.SEND_PASSKEY_URL_AND_AWAIT_BUILT_IN_WATCH);
  assert.equal(result.instructionId, 'inst_123');
  assert.equal(
    result.verifyCommand,
    'clink instruction get --purchase-instruction-id inst_123 --format json',
  );
});

test('authorization active verification resumes only after instruction get proves ACTIVE', () => {
  const result = classifyAuthorizationActiveVerification({
    exitCode: 0,
    stdout: JSON.stringify({
      ok: true,
      data: {
        instructionId: 'ins_123',
        paymentInstrumentId: 'pi_visa',
        status: 'ACTIVE',
      },
    }),
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_READY);
  assert.equal(result.action, AuthorizationWorkflowAction.RESUME_AUTHORIZED_PAYMENT);
  assert.equal(result.terminal, false);
  assert.equal(result.instructionId, 'ins_123');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
});

test('authorization active verification rejects ACTIVE evidence for a different instruction', () => {
  const result = classifyAuthorizationActiveVerification(
    {
      stdout: JSON.stringify({
        ok: true,
        data: {
          instructionId: 'ins_other',
          paymentInstrumentId: 'pi_visa',
          status: 'ACTIVE',
        },
      }),
    },
    {
      eventType: 'purchase_instruction.activated',
      expectedResource: { instructionId: 'ins_123' },
    },
  );

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ERROR);
  assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
  assert.equal(result.reason, 'authorization_instruction_mismatch');
  assert.equal(result.instructionId, 'ins_other');
  assert.equal(result.expectedInstructionId, 'ins_123');
});

test('authorization active verification surfaces instruction-get CLI and API failures', () => {
  const waitSpec = { expectedResource: { instructionId: 'ins_verify_failed' } };
  const observations = [
    { exitCode: 3, stderr: JSON.stringify({ ok: false, error: { type: 'auth_error' } }) },
    { exit_code: 5 },
    { stdout: JSON.stringify({ ok: false, error: { type: 'not_found' } }) },
  ];

  for (const observation of observations) {
    const result = classifyAuthorizationActiveVerification(observation, waitSpec);

    assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ERROR);
    assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
    assert.equal(result.reason, 'authorization_verification_cli_error');
    assert.equal(result.instructionId, 'ins_verify_failed');
    assert.equal(result.pollCommand, undefined);
  }
});

test('authorization active verification waits only for activatable instruction states', () => {
  for (const status of ['CREATED', 'PENDING', 'INPROGRESS']) {
    const result = classifyAuthorizationActiveVerification(
      {
        stdout: JSON.stringify({
          ok: true,
          data: {
            purchaseInstructionId: 'ins_123',
            status,
          },
        }),
      },
      {
        eventType: 'purchase_instruction.activated',
        expectedResource: { instructionId: 'ins_123' },
      },
    );

    assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_PENDING);
    assert.equal(result.action, AuthorizationWorkflowAction.WAIT_AUTHORIZATION_ACTIVATION);
    assert.equal(result.reason, 'authorization_not_active');
    assert.equal(
      result.pollCommand,
      'clink events poll --type purchase_instruction.activated --no-ack --format json',
    );
  }
});

test('authorization active verification rejects terminal, missing, and unknown statuses', () => {
  for (const [status, reason] of [
    ['COMPLETED', 'authorization_terminal_without_activation'],
    ['CANCELLED', 'authorization_terminal_without_activation'],
    ['EXPIRED', 'authorization_terminal_without_activation'],
    ['DECLINED', 'authorization_terminal_without_activation'],
    ['', 'authorization_verification_invalid_status'],
    ['SOMETHING_NEW', 'authorization_verification_invalid_status'],
  ]) {
    const result = classifyAuthorizationActiveVerification({
      stdout: JSON.stringify({
        ok: true,
        data: {
          purchaseInstructionId: 'ins_not_activatable',
          ...(status ? { status } : {}),
        },
      }),
    });

    assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ERROR);
    assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
    assert.equal(result.reason, reason);
    assert.equal(result.status, status);
    assert.equal(result.pollCommand, undefined);
  }
});

test('quick activation verification requires ACTIVE to belong to the newly bound card', () => {
  const gate = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_bound',
    paymentInstrumentId: 'pi_expected',
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_expected',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: true,
    }],
  });

  const mismatched = classifyAuthorizationActiveVerification({
    data: {
      instructionId: 'ins_quick_bound',
      paymentInstrumentId: 'pi_other',
      status: 'ACTIVE',
    },
  }, gate.waitSpec);
  assert.equal(mismatched.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
  assert.equal(mismatched.reason, 'authorization_payment_instrument_mismatch');

  const missing = classifyAuthorizationActiveVerification({
    data: { instructionId: 'ins_quick_bound', status: 'ACTIVE' },
  }, gate.waitSpec);
  assert.equal(missing.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
  assert.equal(missing.reason, 'authorization_payment_instrument_missing');

  const missingInstruction = classifyAuthorizationActiveVerification({
    data: { paymentInstrumentId: 'pi_expected', status: 'ACTIVE' },
  }, gate.waitSpec);
  assert.equal(missingInstruction.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
  assert.equal(missingInstruction.reason, 'authorization_instruction_missing');

  const pending = classifyAuthorizationActiveVerification({
    data: { instructionId: 'ins_quick_bound', status: 'PENDING' },
  }, gate.waitSpec);
  assert.equal(pending.action, AuthorizationWorkflowAction.WAIT_AUTHORIZATION_ACTIVATION);

  const active = classifyAuthorizationActiveVerification({
    data: {
      instructionId: 'ins_quick_bound',
      paymentInstrumentId: 'pi_expected',
      status: 'ACTIVE',
    },
  }, gate.waitSpec);
  assert.equal(active.action, AuthorizationWorkflowAction.RESUME_AUTHORIZED_PAYMENT);
});

test('quick instruction gate requires the exact newly added payment instrument id', () => {
  const result = classifyQuickInstructionActivationGate({ pendingInstructionId: 'ins_quick_1' });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ERROR);
  assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
  assert.equal(result.reason, 'quick_instruction_payment_instrument_id_missing');
});

test('quick instruction gate refreshes the exact new card before deciding its route', () => {
  const result = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_1',
    paymentInstrumentId: 'pi_new',
    paymentMethodsVoList: [],
  });

  assert.equal(result.state, AuthorizationWorkflowState.PAYMENT_INSTRUMENT_REFRESH_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.REFRESH_PAYMENT_INSTRUMENT_LIST);
  assert.equal(result.reason, 'quick_instruction_payment_instrument_refresh_required');
  assert.equal(result.paymentInstrumentId, 'pi_new');
  assert.equal(
    result.refreshCommand,
    'clink card binding-link --no-watch --no-open --format json',
  );
});

test('quick instruction gate fails closed when the exact card is still absent after refresh', () => {
  const result = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_1',
    paymentInstrumentId: 'pi_new',
    paymentInstrumentRefreshAttempted: true,
    paymentMethodsVoList: [{ paymentInstrumentId: 'pi_other', cardScheme: 'Visa' }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ERROR);
  assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_AUTHORIZATION_ERROR);
  assert.equal(result.reason, 'quick_instruction_payment_instrument_not_found_after_refresh');
});

test('quick instruction gate sends a non-Visa card through the regular resolver', () => {
  const result = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_1',
    paymentInstrumentId: 'pi_mc',
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_mc',
      cardScheme: 'Mastercard',
      visaRegistrationSucceeded: false,
    }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_BYPASSED);
  assert.equal(result.action, AuthorizationWorkflowAction.RUN_PAY_WITHOUT_AUTHORIZATION);
  assert.equal(result.reason, 'payment_instrument_not_visa_bypass_authorization');
  assert.equal(result.quickInstructionFallbackReason, 'new_payment_instrument_not_visa');
});

test('quick instruction gate waits for same-card VIC readiness before checking the pending id', () => {
  const result = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_1',
    paymentInstrumentId: 'pi_visa',
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: false,
    }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.VIC_READINESS_WAIT_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.WAIT_VIC_READINESS);
  assert.equal(result.reason, 'quick_instruction_vic_readiness_pending');
  assert.equal(result.instructionId, 'ins_quick_1');
  assert.deepEqual(result.expectedResource, { paymentInstrumentId: 'pi_visa' });
  assert.equal(
    result.waitSpec.eventType,
    'payment_method.update,vic_device.binding_succeeded',
  );
  assert.equal(result.waitSpec.purpose, 'VIC_READINESS');
  assert.equal(result.waitSpec.singleAttempt, true);
  assert.deepEqual(result.waitSpec.continuation, { vicReadinessWaitAttempted: true });
  assert.equal(result.waitSpec.maxWaitSeconds, 900);
  assert.equal(
    result.pollCommand,
    'clink events poll --type payment_method.update,vic_device.binding_succeeded --max-wait 900 --no-ack --format json',
  );
  assert.equal(result.waitSpec.verifyCommand, result.refreshCommand);
});

test('quick instruction gate moves a non-ready Visa into the pending continuation after one wait', () => {
  const initial = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_1',
    paymentInstrumentId: 'pi_visa',
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: false,
    }],
  });
  const pollResult = classifyEventPollObservation({
    ready: false,
    timedOut: true,
    events: [],
  }, initial.waitSpec);
  const result = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_1',
    paymentInstrumentId: 'pi_visa',
    ...pollResult.continuation,
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: false,
    }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_PREPARE_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.START_AUTHORIZATION_PREPARE_AND_WAIT);
  assert.equal(result.reason, 'visa_vic_not_ready_pending_instruction_required');
  assert.equal(
    result.quickInstructionFallbackReason,
    'vic_readiness_not_observed_after_bounded_wait',
  );
  assert.equal(result.pollCommand, undefined);
});

test('quick instruction gate keeps the original VIC timeout marker while moving to pending continuation', () => {
  const result = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_1',
    paymentInstrumentId: 'pi_visa',
    vic_readiness_wait_timed_out: true,
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: false,
    }],
  });

  assert.equal(result.action, AuthorizationWorkflowAction.START_AUTHORIZATION_PREPARE_AND_WAIT);
  assert.equal(result.quickInstructionFallbackReason, 'vic_readiness_not_observed_after_bounded_wait');
});

test('unattended Quick Visa without VIC readiness never waits or prepares', () => {
  const result = classifyQuickInstructionActivationGate({
    unattended: true,
    pendingInstructionId: 'ins_quick_unattended',
    paymentInstrumentId: 'pi_visa',
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: false,
    }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.UNATTENDED_AUTHORIZATION_GAP);
  assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP);
  assert.equal(result.reason, 'unattended_vic_readiness_missing');
  assert.equal(result.quickInstructionFallbackReason, 'vic_readiness_unavailable_unattended');
  assert.equal(result.pollCommand, undefined);
});

test('quick instruction gate verifies the exact instruction and VIC-ready card', () => {
  const result = classifyQuickInstructionActivationGate({
    pending_instruction_id: 'ins_quick_2',
    payment_instrument_id: 'pi_visa',
    payment_methods_vo_list: [{
      payment_instrument_id: 'pi_visa',
      card_scheme: 'VISA',
      visa_registration_succeeded: true,
    }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_VERIFY_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.VERIFY_AUTHORIZATION_ACTIVATION);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, 'quick_instruction_pending_verification');
  assert.equal(result.instructionId, 'ins_quick_2');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
  assert.equal(
    result.verifyCommand,
    'clink instruction get --purchase-instruction-id ins_quick_2 --format json',
  );
  assert.equal(
    result.pollCommand,
    'clink events poll --type purchase_instruction.activated --max-wait 900 --no-ack --format json',
  );
  assert.deepEqual(result.expectedResource, {
    instructionId: 'ins_quick_2',
    purchaseInstructionId: 'ins_quick_2',
    paymentInstrumentId: 'pi_visa',
  });
  assert.equal(result.waitSpec.eventType, 'purchase_instruction.activated');
  assert.equal(result.waitSpec.purpose, 'QUICK_INSTRUCTION_ACTIVATION');
  assert.equal(result.waitSpec.singleAttempt, true);
  assert.equal(result.waitSpec.activationWaitAttempted, false);
  assert.equal(result.waitSpec.maxWaitSeconds, 900);
});

test('quick activation gets one bounded poll and final pending verification returns to regular list', () => {
  const gate = classifyQuickInstructionActivationGate({
    pendingInstructionId: 'ins_quick_3',
    paymentInstrumentId: 'pi_visa',
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: true,
    }],
  });
  const pending = {
    data: {
      purchaseInstructionId: 'ins_quick_3',
      paymentInstrumentId: 'pi_visa',
      status: 'PENDING',
    },
  };

  const firstVerification = classifyAuthorizationActiveVerification(pending, gate.waitSpec);
  assert.equal(firstVerification.action, AuthorizationWorkflowAction.WAIT_AUTHORIZATION_ACTIVATION);
  assert.equal(firstVerification.waitSpec.activationWaitAttempted, true);
  assert.equal(firstVerification.waitSpec.singleAttempt, true);
  assert.deepEqual(firstVerification.waitSpec.continuation, { activationWaitAttempted: true });
  assert.equal(
    firstVerification.pollCommand,
    'clink events poll --type purchase_instruction.activated --max-wait 900 --no-ack --format json',
  );
  const pollResult = classifyEventPollObservation({
    ready: false,
    timedOut: true,
    events: [],
  }, firstVerification.waitSpec);
  assert.equal(pollResult.verifyCommand, firstVerification.verifyCommand);
  assert.equal(pollResult.pollCommand, undefined);

  const finalVerification = classifyAuthorizationActiveVerification(
    pending,
    pollResult.waitSpec,
  );
  assert.equal(finalVerification.state, AuthorizationWorkflowState.AUTHORIZATION_LIST_REQUIRED);
  assert.equal(finalVerification.action, AuthorizationWorkflowAction.LIST_AUTHORIZATIONS);
  assert.equal(finalVerification.reason, 'quick_instruction_still_pending_after_bounded_wait');
  assert.equal(finalVerification.paymentInstrumentId, 'pi_visa');
  assert.equal(finalVerification.pollCommand, undefined);

  const active = classifyAuthorizationActiveVerification({
    data: {
      purchaseInstructionId: 'ins_quick_3',
      paymentInstrumentId: 'pi_visa',
      status: 'ACTIVE',
    },
  }, pollResult.waitSpec);
  assert.equal(active.action, AuthorizationWorkflowAction.RESUME_AUTHORIZED_PAYMENT);
});

test('quick instruction gate sends a missing pending id through the regular resolver', () => {
  const result = classifyQuickInstructionActivationGate({
    pendingInstructionId: null,
    paymentInstrumentId: 'pi_visa',
    paymentMethodsVoList: [{
      paymentInstrumentId: 'pi_visa',
      cardScheme: 'Visa',
      visaRegistrationSucceeded: true,
    }],
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_LIST_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.LIST_AUTHORIZATIONS);
  assert.equal(result.reason, 'visa_vic_ready_list_authorizations');
  assert.equal(result.quickInstructionFallbackReason, 'pending_instruction_id_unavailable');
  assert.equal(result.verifyCommand, undefined);
  assert.equal(result.pollCommand, undefined);
});

// The backend has no DAILY cycle, so a daily task must fold its per-run cap into a WEEKLY budget.
// Emitting DAILY would be rejected by the CLI; emitting the per-run cap as the weekly limit would
// let the schedule run dry after one order.
test('a daily task with no total budget becomes a weekly recurring cycle budget', () => {
  const result = classifyScheduledAuthorizationScope({
    cadence: 'DAILY',
    perRunCap: 40,
    currency: 'CNY',
  });

  assert.equal(result.state, AuthorizationWorkflowState.SCHEDULED_SCOPE_RESOLVED);
  assert.equal(result.action, AuthorizationWorkflowAction.CREATE_SCHEDULED_AUTHORIZATION_DRAFT);
  assert.equal(result.mode, ScheduledAuthorizationMode.RECURRING);
  assert.equal(result.isRecurring, true);
  assert.equal(result.recurringFrequency, RecurringFrequency.WEEKLY);
  assert.equal(result.amountLimit, 280);
  assert.equal(result.runsPerCycle, 7);
  assert.equal(result.perRunCap, 40);
});

test('an explicit per-cycle cadence keeps its own recurring frequency', () => {
  for (const [cadence, frequency] of [
    ['WEEKLY', RecurringFrequency.WEEKLY],
    ['MONTHLY', RecurringFrequency.MONTHLY],
    ['YEARLY', RecurringFrequency.YEARLY],
  ]) {
    const result = classifyScheduledAuthorizationScope({ cadence, perRunCap: 25, currency: 'USD' });

    assert.equal(result.mode, ScheduledAuthorizationMode.RECURRING);
    assert.equal(result.recurringFrequency, frequency);
    assert.equal(result.amountLimit, 25);
  }
});

// A stated total budget is a lifetime ceiling, which only a one-time instruction enforces.
test('a stated total budget produces a one-time instruction', () => {
  const result = classifyScheduledAuthorizationScope({
    cadence: 'DAILY',
    perRunCap: 40,
    currency: 'CNY',
    totalBudget: 500,
    scheduleStartTime: '2026-08-06 00:00:00',
    scheduleEndTime: '2026-08-16 00:00:00',
  });

  assert.equal(result.mode, ScheduledAuthorizationMode.NON_RECURRING);
  assert.equal(result.isRecurring, false);
  assert.equal(result.recurringFrequency, null);
  assert.equal(result.amountLimit, 500);
  assert.equal(result.projectedRunCount, 10);
  assert.equal(result.projectedTotal, 400);
  assert.deepEqual(result.warnings, []);
});

// Creating a one-time instruction whose budget dies partway through the schedule strands the task
// unattended, so the shortfall has to be computed and surfaced before anything is created.
test('a total budget short of the projected spend reports when it runs out', () => {
  const result = classifyScheduledAuthorizationScope({
    cadence: 'DAILY',
    perRunCap: 40,
    currency: 'CNY',
    totalBudget: 200,
    scheduleStartTime: '2026-08-06 00:00:00',
    scheduleEndTime: '2026-09-05 00:00:00',
  });

  assert.equal(result.mode, ScheduledAuthorizationMode.NON_RECURRING);
  assert.equal(result.projectedRunCount, 30);
  assert.equal(result.projectedTotal, 1200);
  assert.equal(result.exhaustsAfterRuns, 5);
  assert.ok(result.warnings.includes('total_budget_below_projected_spend'));
});

// 1.2 / 0.4 is 2.999... in floating point; a budget that exactly covers N runs must report N.
test('a fractional budget that exactly covers its runs does not lose one to float division', () => {
  const result = classifyScheduledAuthorizationScope({
    cadence: 'DAILY',
    perRunCap: 0.4,
    currency: 'CNY',
    totalBudget: 1.2,
  });

  assert.equal(result.exhaustsAfterRuns, 3);
});

test('an incomplete schedule scope asks instead of inventing a limit', () => {
  for (const [input, missing] of [
    [{ perRunCap: 40, currency: 'CNY' }, ['cadence']],
    [{ cadence: 'DAILY', currency: 'CNY' }, ['perRunCap']],
    [{ cadence: 'DAILY', perRunCap: 40 }, ['currency']],
    [{ cadence: 'HOURLY', perRunCap: 40, currency: 'CNY' }, ['cadence']],
    [{ cadence: 'DAILY', perRunCap: 0, currency: 'CNY' }, ['perRunCap']],
  ]) {
    const result = classifyScheduledAuthorizationScope(input);

    assert.equal(result.state, AuthorizationWorkflowState.SCHEDULED_SCOPE_INPUT_MISSING);
    assert.equal(result.action, AuthorizationWorkflowAction.ASK_FOR_SCHEDULE_SCOPE);
    assert.deepEqual(result.missing, missing);
  }
});

const WEEKLY_SCOPE = {
  mode: ScheduledAuthorizationMode.RECURRING,
  recurringFrequency: RecurringFrequency.WEEKLY,
  amountLimit: 280,
  currency: 'CNY',
  effectiveUntilTime: '2026-12-31 23:59:59',
};

function weeklyCandidate(overrides = {}) {
  return {
    instructionId: 'ins_weekly',
    mandateId: 'm_weekly',
    status: 'ACTIVE',
    paymentInstrumentId: 'pi_visa',
    currencyCode: 'CNY',
    isRecurring: true,
    recurringFrequency: 'WEEKLY',
    amountLimit: 280,
    effectiveUntilTime: '2027-01-31 23:59:59',
    merchantScopeCovered: true,
    ...overrides,
  };
}

test('a candidate covering the whole horizon is pinned rather than recreated', () => {
  const result = classifyScheduledAuthorizationReuse({
    scope: WEEKLY_SCOPE,
    paymentInstrumentId: 'pi_visa',
    candidates: [weeklyCandidate()],
  });

  assert.equal(result.state, AuthorizationWorkflowState.SCHEDULED_AUTHORIZATION_REUSABLE);
  assert.equal(result.action, AuthorizationWorkflowAction.PIN_SCHEDULED_AUTHORIZATION);
  assert.equal(result.instructionId, 'ins_weekly');
  assert.equal(result.mandateId, 'm_weekly');
});

// Every one of these would still cover the *next* run while failing somewhere later in the
// schedule, which is exactly the reuse that forces a re-authorization with nobody present.
test('any dimension short of the full horizon forces a new instruction', () => {
  for (const [overrides, reason] of [
    [{ status: 'CREATED' }, 'candidate_not_active'],
    [{ paymentInstrumentId: 'pi_other' }, 'candidate_payment_instrument_mismatch'],
    [{ currencyCode: 'USD' }, 'candidate_currency_mismatch'],
    [{ merchantScopeCovered: false }, 'candidate_merchant_scope_not_covered'],
    [{ merchantScopeCovered: undefined }, 'candidate_merchant_scope_not_covered'],
    [{ isRecurring: false }, 'candidate_not_recurring'],
    [{ recurringFrequency: 'MONTHLY' }, 'candidate_recurring_frequency_mismatch'],
    [{ amountLimit: 100 }, 'candidate_amount_limit_below_schedule_need'],
    [{ effectiveUntilTime: '2026-09-01 00:00:00' }, 'candidate_expires_before_schedule_horizon'],
  ]) {
    const result = classifyScheduledAuthorizationReuse({
      scope: WEEKLY_SCOPE,
      paymentInstrumentId: 'pi_visa',
      candidates: [weeklyCandidate(overrides)],
    });

    assert.equal(result.state, AuthorizationWorkflowState.SCHEDULED_AUTHORIZATION_DRAFT_REQUIRED);
    assert.equal(result.action, AuthorizationWorkflowAction.CREATE_SCHEDULED_AUTHORIZATION_DRAFT);
    assert.equal(result.reason, 'no_full_horizon_authorization');
    assert.equal(result.rejected[0].reason, reason);
  }
});

// A recurring mandate resets every cycle, so it can never enforce the lifetime ceiling that a
// stated total budget asked for.
test('a recurring candidate cannot satisfy a stated total budget', () => {
  const result = classifyScheduledAuthorizationReuse({
    scope: {
      mode: ScheduledAuthorizationMode.NON_RECURRING,
      amountLimit: 500,
      currency: 'CNY',
      effectiveUntilTime: '2026-12-31 23:59:59',
    },
    paymentInstrumentId: 'pi_visa',
    candidates: [weeklyCandidate({ amountLimit: 1000 })],
  });

  assert.equal(result.action, AuthorizationWorkflowAction.CREATE_SCHEDULED_AUTHORIZATION_DRAFT);
  assert.equal(result.rejected[0].reason, 'candidate_recurring_cannot_enforce_total_budget');
});

test('an open-ended schedule reusing a bounded authorization says when it will expire', () => {
  const result = classifyScheduledAuthorizationReuse({
    scope: { ...WEEKLY_SCOPE, effectiveUntilTime: null },
    paymentInstrumentId: 'pi_visa',
    candidates: [weeklyCandidate()],
  });

  assert.equal(result.action, AuthorizationWorkflowAction.PIN_SCHEDULED_AUTHORIZATION);
  assert.ok(result.warnings.includes('authorization_expiry_bounds_open_ended_schedule'));
  assert.equal(result.effectiveUntilTime, '2027-01-31 23:59:59');
});

function instructionGetEnvelope(data) {
  return { stdout: JSON.stringify({ ok: true, data }), exitCode: 0 };
}

test('a scheduled run resumes on its pinned ACTIVE instruction and mandate', () => {
  const result = classifyUnattendedAuthorization({
    pinnedInstructionId: 'ins_weekly',
    pinnedMandateId: 'm_weekly',
    paymentInstrumentId: 'pi_visa',
    observation: instructionGetEnvelope({
      purchaseInstructionId: 'ins_weekly',
      status: 'ACTIVE',
      paymentInstrumentId: 'pi_visa',
      mandates: [{ mandateId: 'm_weekly' }],
    }),
  });

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_READY);
  assert.equal(result.action, AuthorizationWorkflowAction.RESUME_AUTHORIZED_PAYMENT);
  assert.equal(result.instructionId, 'ins_weekly');
  assert.equal(result.mandateId, 'm_weekly');
});

// Spending against a mandate the schedule never pinned is worse than skipping the run, so every
// one of these stops instead of falling back to a draft or another candidate.
test('a scheduled run stops on any pinned-authorization gap', () => {
  for (const [input, reason] of [
    [{ pinnedMandateId: 'm_weekly' }, 'scheduled_authorization_not_pinned'],
    [{ pinnedInstructionId: 'ins_weekly' }, 'scheduled_authorization_not_pinned'],
    [
      {
        pinnedInstructionId: 'ins_weekly',
        pinnedMandateId: 'm_weekly',
        observation: { exitCode: 1, stderr: JSON.stringify({ ok: false, error: 'boom' }) },
      },
      'scheduled_authorization_verification_failed',
    ],
    [
      {
        pinnedInstructionId: 'ins_weekly',
        pinnedMandateId: 'm_weekly',
        observation: instructionGetEnvelope({ purchaseInstructionId: 'ins_other', status: 'ACTIVE' }),
      },
      'scheduled_authorization_instruction_mismatch',
    ],
    [
      {
        pinnedInstructionId: 'ins_weekly',
        pinnedMandateId: 'm_weekly',
        observation: instructionGetEnvelope({ purchaseInstructionId: 'ins_weekly', status: 'EXPIRED' }),
      },
      'scheduled_authorization_not_active',
    ],
    [
      {
        pinnedInstructionId: 'ins_weekly',
        pinnedMandateId: 'm_weekly',
        paymentInstrumentId: 'pi_visa',
        observation: instructionGetEnvelope({
          purchaseInstructionId: 'ins_weekly',
          status: 'ACTIVE',
          paymentInstrumentId: 'pi_other',
        }),
      },
      'scheduled_authorization_payment_instrument_mismatch',
    ],
    [
      {
        pinnedInstructionId: 'ins_weekly',
        pinnedMandateId: 'm_weekly',
        observation: instructionGetEnvelope({
          purchaseInstructionId: 'ins_weekly',
          status: 'ACTIVE',
          mandates: [{ mandateId: 'm_other' }],
        }),
      },
      'scheduled_authorization_mandate_missing',
    ],
    [
      {
        pinnedInstructionId: 'ins_weekly',
        pinnedMandateId: 'm_weekly',
        observation: instructionGetEnvelope({
          purchaseInstructionId: 'ins_weekly',
          status: 'ACTIVE',
          mandates: [],
        }),
      },
      'scheduled_authorization_mandate_missing',
    ],
  ]) {
    const result = classifyUnattendedAuthorization(input);

    assert.equal(result.state, AuthorizationWorkflowState.UNATTENDED_AUTHORIZATION_GAP);
    assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP);
    assert.equal(result.terminal, true);
    assert.equal(result.reason, reason);
  }
});

// Asking for a Passkey during an unattended run strands the schedule waiting on a signature that
// will never arrive, so the resolver has to stop instead of drafting.
test('the resolver surfaces a gap instead of drafting when nobody is present', () => {
  const visaVicCard = {
    paymentMethodsVoList: [
      {
        paymentInstrumentId: 'pi_visa',
        cardBrand: 'VISA',
        isDefault: true,
        visaRegistrationSucceeded: true,
      },
    ],
  };

  for (const input of [
    { ...visaVicCard, unattended: true },
    { ...visaVicCard, unattended: true, authorizationListChecked: true },
    { ...visaVicCard, unattended: true, selected: { instructionId: 'ins_weekly' } },
  ]) {
    const result = classifyPaymentAuthorizationResolver(input);

    assert.equal(result.state, AuthorizationWorkflowState.UNATTENDED_AUTHORIZATION_GAP);
    assert.equal(result.action, AuthorizationWorkflowAction.SURFACE_UNATTENDED_AUTHORIZATION_GAP);
    assert.equal(result.terminal, true);
  }

  const pinned = classifyPaymentAuthorizationResolver({
    ...visaVicCard,
    unattended: true,
    selected: { instructionId: 'ins_weekly', mandateId: 'm_weekly' },
  });
  assert.equal(pinned.action, AuthorizationWorkflowAction.RUN_PAY_WITH_AUTHORIZATION);
});
