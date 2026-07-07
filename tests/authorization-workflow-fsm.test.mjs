import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AuthorizationWorkflowAction,
  AuthorizationWorkflowState,
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
