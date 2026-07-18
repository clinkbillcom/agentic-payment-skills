import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WalletWorkflowAction,
  WalletWorkflowState,
  classifyWalletInitObservation,
} from '../lib/wallet-workflow-fsm.mjs';

test('wallet init classifier asks for OTP when bootstrap reports email verification required', () => {
  const result = classifyWalletInitObservation({
    email: 'user@example.com',
    name: 'Alice',
    exitCode: 1,
    stderr: JSON.stringify({
      ok: false,
      error: {
        type: 'BOOTSTRAP_OTP_REQUIRED',
        code: '71160015',
        message: 'Verification code has been sent to this email. Please retry with otp.',
      },
    }),
  });

  assert.equal(result.state, WalletWorkflowState.EMAIL_OTP_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, 'wallet_init_email_otp_required');
  assert.equal(result.email, 'user@example.com');
  assert.equal(result.name, 'Alice');
  assert.equal(result.retryCommand, 'clink-cli wallet init --email <same_email> --name <same_name> --otp <email_otp> --format json');
});

test('wallet init classifier matches OTP requirement by service error key', () => {
  const result = classifyWalletInitObservation({
    error: {
      errorCode: 'cwallet.bootstrap.otp.required',
      message: 'Bootstrap verification is needed',
    },
  });

  assert.equal(result.state, WalletWorkflowState.EMAIL_OTP_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.ASK_FOR_EMAIL_OTP_AND_RETRY_WALLET_INIT);
});

test('wallet init classifier returns success for ok wallet init output', () => {
  const result = classifyWalletInitObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_123',
        email: 'user@example.com',
        name: 'Alice',
        bindingUrl: 'https://agent.clinkbill.com',
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INITIALIZED);
  assert.equal(result.action, WalletWorkflowAction.RETURN_WALLET_READY);
  assert.equal(result.terminal, true);
  assert.equal(result.reason, 'wallet_init_succeeded');
  assert.equal(result.data.bindingUrl, 'https://agent.clinkbill.com');
});

test('wallet init classifier surfaces non-OTP errors', () => {
  const result = classifyWalletInitObservation({
    exitCode: 1,
    stderr: {
      ok: false,
      error: {
        code: 'SOME_OTHER_ERROR',
        message: 'Something else failed',
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.terminal, true);
  assert.equal(result.reason, 'wallet_init_failed');
});
