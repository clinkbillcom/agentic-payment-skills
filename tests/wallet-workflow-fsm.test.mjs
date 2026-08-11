import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WalletWorkflowAction,
  WalletWorkflowState,
  classifyWalletInitObservation,
  classifyWalletStatusObservation,
} from '../lib/wallet-workflow-fsm.mjs';

test('wallet init classifier waits when the URL arrives before the browser-open result', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH&flow=wallet#email=user%2Bwallet%40example.com&name=Alice%20%26%20Bob',
      '',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.WAIT_FOR_WALLET_INIT_PROGRESS);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, 'wallet_init_progress_pending');
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.browserOpened, false);
  assert.equal(result.browserOpenFailed, false);
});

test('wallet init classifier waits for a split verification URL line to finish', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.WAIT_FOR_WALLET_INIT_PROGRESS);
  assert.equal(result.terminal, false);
  assert.equal(result.authorizationUrl, undefined);
});

test('wallet init classifier tells users the system browser opened without exposing the URL', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH&flow=wallet#email=user%2Bwallet%40example.com&name=Alice%20%26%20Bob',
      'Opening your browser...',
      'Waiting for authorization...',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.TELL_USER_BROWSER_OPENED_AND_WAIT);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, 'wallet_init_oauth_browser_opened');
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.browserOpened, true);
  assert.equal(result.browserOpenFailed, false);
});

test('wallet init classifier falls back to the complete URL when browser launch fails', () => {
  const authorizationUrl =
    'https://agent.example.com:443/oauth?user_code=ABCD-EFGH&flow=wallet#email=user%2Bwallet%40example.com&name=Alice%20%26%20Bob';
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Complete authorization in your browser:',
      authorizationUrl,
      'Opening your browser...',
      'Could not open a browser automatically. Open the URL above in any browser.',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.SHOW_OAUTH_VERIFICATION_URL_AND_WAIT);
  assert.equal(result.reason, 'wallet_init_oauth_browser_open_failed');
  assert.equal(result.authorizationUrl, authorizationUrl);
  assert.equal(result.browserOpened, false);
  assert.equal(result.browserOpenFailed, true);
});

test('wallet init classifier rejects authorization polling that omitted --open', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH&flow=wallet#email=user%2Bwallet%40example.com&name=Alice%20%26%20Bob',
      'Waiting for authorization...',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.terminal, true);
  assert.equal(result.reason, 'wallet_init_open_flag_missing');
  assert.equal(result.authorizationUrl, undefined);
});

test('wallet init classifier rejects a truncated OAuth URL instead of surfacing it', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH',
      'Waiting for authorization...',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.terminal, true);
  assert.equal(result.reason, 'wallet_init_verification_url_incomplete');
  assert.equal(result.authorizationUrl, undefined);
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
        hasAuthorization: true,
        authorizationType: 'oauth',
        hasCustomerApiKey: false,
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

test('wallet init classifier returns dry-run output as a plan', () => {
  const result = classifyWalletInitObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        dryRun: true,
        request: { path: '/agent/cwallet/oauth/device/authorization' },
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_PLANNED);
  assert.equal(result.action, WalletWorkflowAction.RETURN_WALLET_PLAN);
  assert.equal(result.terminal, true);
});

test('wallet init classifier gives a nonzero exit priority over ok true', () => {
  const result = classifyWalletInitObservation({
    exitCode: 4,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: true,
        authorizationType: 'oauth',
        oauthRequired: true,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_init_failed');
});

test('wallet init classifier rejects success without OAuth readiness evidence', () => {
  const result = classifyWalletInitObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_legacy_only',
        hasAuthorization: false,
        authorizationType: 'csk',
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.terminal, true);
});

test('wallet init classifier rejects an explicit non-OAuth policy marker', () => {
  const result = classifyWalletInitObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_invalid',
        hasAuthorization: true,
        authorizationType: 'oauth',
        hasCustomerApiKey: false,
        oauthRequired: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
});

test('wallet init classifier surfaces terminal errors', () => {
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

test('wallet status classifier accepts effective OAuth and rejects legacy override visibility', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: true,
        hasStoredAuthorization: true,
        authorizationEnvironmentMatches: true,
        authorizationType: 'oauth',
        oauthRequired: true,
        hasCustomerApiKey: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_OAUTH_READY);
  assert.equal(result.action, WalletWorkflowAction.RETURN_WALLET_READY);
  assert.equal(result.authenticationMode, 'oauth');
  assert.equal(result.migrationRecommended, false);
});

test('wallet status classifier rejects OAuth readiness without the required marker', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: true,
        hasStoredAuthorization: true,
        authorizationEnvironmentMatches: true,
        authorizationType: 'oauth',
        hasCustomerApiKey: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_STATUS_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_oauth_state_invalid');
});

test('wallet status classifier fails closed for malformed OAuth-required markers', () => {
  for (const oauthRequired of [null, 'true', 1, {}]) {
    const result = classifyWalletStatusObservation({
      exitCode: 0,
      stdout: {
        ok: true,
        data: {
          customerId: 'cus_legacy',
          hasAuthorization: false,
          hasStoredAuthorization: false,
          authorizationEnvironmentMatches: null,
          authorizationType: 'csk',
          oauthRequired,
          hasCustomerApiKey: true,
        },
      },
    });

    assert.equal(result.state, WalletWorkflowState.WALLET_STATUS_FAILED);
    assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
    assert.equal(result.reason, 'wallet_oauth_state_invalid');
  }
});

test('wallet status classifier gives a nonzero exit priority over ok true', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 4,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: true,
        hasStoredAuthorization: true,
        authorizationEnvironmentMatches: true,
        authorizationType: 'oauth',
        oauthRequired: true,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_STATUS_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_status_failed');
});

test('wallet status classifier accepts a complete legacy CSK wallet', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_legacy',
        hasAuthorization: false,
        hasStoredAuthorization: false,
        authorizationEnvironmentMatches: null,
        authorizationType: 'csk',
        oauthRequired: false,
        hasCustomerApiKey: true,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_LEGACY_CSK_READY);
  assert.equal(result.action, WalletWorkflowAction.RETURN_WALLET_READY);
  assert.equal(result.authenticationMode, 'csk');
  assert.equal(result.migrationRecommended, true);
});

test('wallet status classifier never falls back when OAuth state is inconsistent', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_invalid',
        hasAuthorization: true,
        hasStoredAuthorization: true,
        authorizationEnvironmentMatches: true,
        authorizationType: 'csk',
        oauthRequired: true,
        hasCustomerApiKey: true,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_STATUS_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_oauth_state_invalid');
});

test('wallet status classifier requires OAuth again after logout or token invalidation', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: false,
        hasStoredAuthorization: false,
        authorizationEnvironmentMatches: null,
        authorizationType: null,
        oauthRequired: true,
        hasCustomerApiKey: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_OAUTH_REAUTHORIZATION_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.START_WALLET_SETUP);
  assert.equal(result.authenticationMode, 'oauth');
  assert.equal(result.terminal, false);
});

test('wallet status classifier requires OAuth for a stored authorization from another environment', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: false,
        hasStoredAuthorization: true,
        authorizationEnvironmentMatches: false,
        authorizationType: null,
        oauthRequired: true,
        hasCustomerApiKey: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_OAUTH_REAUTHORIZATION_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.START_WALLET_SETUP);
  assert.equal(result.reason, 'wallet_oauth_environment_mismatch');
  assert.equal(result.environmentMismatch, true);
});

test('wallet status classifier rejects CSK whenever OAuth is required', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: false,
        hasStoredAuthorization: false,
        authorizationEnvironmentMatches: null,
        authorizationType: 'csk',
        oauthRequired: true,
        hasCustomerApiKey: true,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_STATUS_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_oauth_state_invalid');
});

test('wallet status classifier starts setup only when neither auth mode is ready', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: null,
        hasAuthorization: false,
        hasStoredAuthorization: false,
        authorizationEnvironmentMatches: null,
        authorizationType: null,
        oauthRequired: false,
        hasCustomerApiKey: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_SETUP_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.START_WALLET_SETUP);
  assert.equal(result.terminal, false);
});

test('wallet status classifier rejects malformed stored-authorization environment markers', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: false,
        hasStoredAuthorization: false,
        authorizationEnvironmentMatches: false,
        authorizationType: null,
        oauthRequired: true,
        hasCustomerApiKey: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_STATUS_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_oauth_state_invalid');
});

test('wallet status classifier rejects an inactive matching stored authorization', () => {
  const result = classifyWalletStatusObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        customerId: 'cus_oauth',
        hasAuthorization: false,
        hasStoredAuthorization: true,
        authorizationEnvironmentMatches: true,
        authorizationType: null,
        oauthRequired: true,
        hasCustomerApiKey: false,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_STATUS_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_oauth_state_invalid');
});
