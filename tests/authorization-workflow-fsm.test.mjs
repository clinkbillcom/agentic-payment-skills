import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AuthorizationWorkflowAction,
  AuthorizationWorkflowState,
  classifyAuthorizationActiveVerification,
  classifyAuthorizationDraftObservation,
  classifyPaymentAuthorizationResolver,
} from '../lib/authorization-workflow-fsm.mjs';

test('authorization resolver refreshes payment instruments before deciding', () => {
  const result = classifyPaymentAuthorizationResolver({});

  assert.equal(result.state, AuthorizationWorkflowState.PAYMENT_INSTRUMENT_REFRESH_REQUIRED);
  assert.equal(result.action, AuthorizationWorkflowAction.REFRESH_PAYMENT_INSTRUMENT_LIST);
  assert.equal(result.reason, 'payment_instrument_refresh_required');
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

test('authorization resolver bypasses instruction matching for Visa when VIC is not enabled', () => {
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

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_BYPASSED);
  assert.equal(result.action, AuthorizationWorkflowAction.RUN_PAY_WITHOUT_AUTHORIZATION);
  assert.equal(result.reason, 'visa_vic_not_enabled_bypass_authorization');
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
    'clink-cli instruction get --purchase-instruction-id ins_123 --format json',
  );
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
    'clink-cli instruction get --purchase-instruction-id ins_watched --format json',
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
    'clink-cli instruction get --purchase-instruction-id ins_gap --format json',
  );
  // A gap is recoverable, so the caller also gets a poll it can restart.
  assert.equal(
    timedOut.pollCommand,
    'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
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
    'clink-cli instruction get --purchase-instruction-id inst_123 --format json',
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
      'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
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
