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

test('authorization draft observation starts activation event wait immediately', () => {
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
  assert.equal(result.action, AuthorizationWorkflowAction.START_AUTHORIZATION_ACTIVATION_WATCH);
  assert.equal(result.instructionId, 'ins_123');
  assert.equal(result.paymentInstrumentId, 'pi_visa');
  assert.equal(result.passkeyUrl, 'https://agent.clinkbill.com/passkey/ins_123');
  assert.deepEqual(result.waitSpec, {
    eventType: 'purchase_instruction.activated',
    expectedResource: {
      instructionId: 'ins_123',
      purchaseInstructionId: 'ins_123',
    },
    pollCommand: 'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
    verifyCommand: 'clink-cli instruction get --purchase-instruction-id ins_123 --format json',
  });
});

test('authorization draft observation reads the first JSON envelope when CLI watch also emits a result', () => {
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

  assert.equal(result.state, AuthorizationWorkflowState.AUTHORIZATION_ACTIVATION_WAIT_REQUIRED);
  assert.equal(result.instructionId, 'ins_multiline');
  assert.equal(result.passkeyUrl, 'https://agent.clinkbill.com/passkey/ins_multiline');
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
  assert.equal(result.action, AuthorizationWorkflowAction.START_AUTHORIZATION_ACTIVATION_WATCH);
  assert.equal(result.instructionId, 'inst_123');
  assert.equal(
    result.pollCommand,
    'clink-cli events poll --type purchase_instruction.activated --no-ack --format json',
  );
});

test('authorization active verification resumes only after instruction get proves ACTIVE', () => {
  const result = classifyAuthorizationActiveVerification({
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

test('authorization active verification keeps waiting while instruction is not active', () => {
  const result = classifyAuthorizationActiveVerification(
    {
      stdout: JSON.stringify({
        ok: true,
        data: {
          purchaseInstructionId: 'ins_123',
          status: 'PENDING',
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
});
