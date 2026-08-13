import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WalletWorkflowAction,
  WalletWorkflowState,
  classifyWalletInitObservation,
  classifyWalletStatusObservation,
} from '../lib/wallet-workflow-fsm.mjs';
import {
  WalletIntentAction,
  WalletIntentRoute,
  WalletIntentState,
  classifyWalletIntent,
} from '../lib/wallet-intent-fsm.mjs';

for (const text of [
  '重新登录',
  '再登录一次',
  '重新授权钱包',
  '登录链接过期了，给我一个新的',
  '我忘记登录了，重新来一次',
  'log in again',
  'generate a fresh login link',
  'the login link expired',
]) {
  test(`explicit relogin language starts a fresh wallet init: ${text}`, () => {
    const result = classifyWalletIntent({ text, currentEmail: 'user@example.com' });

    assert.equal(result.state, WalletIntentState.WALLET_RELOGIN_SELECTED);
    assert.equal(result.route, WalletIntentRoute.WALLET_RELOGIN);
    assert.equal(result.action, WalletIntentAction.START_FRESH_WALLET_INIT);
    assert.equal(result.reason, 'wallet_relogin_explicitly_requested');
    assert.equal(result.email, 'user@example.com');
  });
}

test('explicit relogin uses an email supplied in the current request', () => {
  const result = classifyWalletIntent({
    text: '重新登录 new-user@example.com',
    email: 'structured-old-user@example.com',
    currentEmail: 'old-user@example.com',
  });

  assert.equal(result.action, WalletIntentAction.START_FRESH_WALLET_INIT);
  assert.equal(result.email, 'new-user@example.com');
});

test('structured relogin uses the current wallet status email', () => {
  const result = classifyWalletIntent({
    intent: 'wallet_relogin',
    walletStatus: { data: { email: 'status-user@example.com' } },
  });

  assert.equal(result.action, WalletIntentAction.START_FRESH_WALLET_INIT);
  assert.equal(result.email, 'status-user@example.com');
});

test('explicit relogin asks only for email when none is available', () => {
  const result = classifyWalletIntent({ text: '重新登录' });

  assert.equal(result.state, WalletIntentState.WALLET_RELOGIN_INPUT_MISSING);
  assert.equal(result.route, WalletIntentRoute.INPUT_REQUIRED);
  assert.equal(result.action, WalletIntentAction.ASK_FOR_WALLET_EMAIL);
  assert.deepEqual(result.missing, ['email']);
});

for (const [text, reason] of [
  ['不要重新登录', 'wallet_relogin_negated'],
  ['怎么重新登录？', 'wallet_relogin_question_or_advice'],
  ['如果登录链接过期就重新登录', 'wallet_relogin_historical_conditional_or_discussion'],
  ['我刚才已经重新登录过了', 'wallet_relogin_historical_conditional_or_discussion'],
  ['这个 bug 是用户说重新登录时拿旧链接', 'wallet_relogin_historical_conditional_or_discussion'],
  ['how to log in again?', 'wallet_relogin_question_or_advice'],
]) {
  test(`non-authorizing relogin language starts no command: ${text}`, () => {
    const result = classifyWalletIntent({ text, currentEmail: 'user@example.com' });

    assert.equal(result.state, WalletIntentState.WALLET_RELOGIN_NOT_AUTHORIZED);
    assert.equal(result.route, WalletIntentRoute.NO_ACTION);
    assert.equal(result.action, WalletIntentAction.DO_NOT_START_WALLET_INIT);
    assert.equal(result.reason, reason);
  });
}

test('a structured relogin denial starts no command', () => {
  const result = classifyWalletIntent({
    intent: 'wallet_relogin',
    walletReloginAuthorized: false,
    email: 'user@example.com',
  });

  assert.equal(result.action, WalletIntentAction.DO_NOT_START_WALLET_INIT);
  assert.equal(result.reason, 'wallet_relogin_not_authorized');
});

test('unrelated text does not claim the wallet intent route', () => {
  assert.equal(classifyWalletIntent({ text: '查看钱包状态' }), null);
});

for (const text of ['重新授权这笔支付', 'reauthorize this purchase']) {
  test(`ambiguous payment authorization is not wallet relogin: ${text}`, () => {
    assert.equal(classifyWalletIntent({ text, currentEmail: 'user@example.com' }), null);
  });
}

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
  assert.equal(result.browserOpenRequested, false);
  assert.equal(result.browserOpenFailed, false);
  assert.equal(result.oauthDevicePollActive, false);
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

test('wallet init classifier reports a system-browser launch request without claiming success', () => {
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
  assert.equal(result.action, WalletWorkflowAction.TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, 'wallet_init_oauth_browser_open_requested');
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.browserOpenRequested, true);
  assert.equal(result.browserOpened, undefined);
  assert.equal(result.browserOpenFailed, false);
  assert.equal(result.oauthDevicePollActive, true);
});

test('wallet init classifier does not claim OAuth polling before its wait marker arrives', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH&flow=wallet#email=user%2Bwallet%40example.com&name=Alice%20%26%20Bob',
      'Opening your browser...',
    ].join('\n'),
  });

  assert.equal(result.action, WalletWorkflowAction.WAIT_FOR_WALLET_INIT_PROGRESS);
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.browserOpenRequested, true);
  assert.equal(result.browserOpenFailed, false);
  assert.equal(result.oauthDevicePollActive, false);
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
      'Waiting for authorization...',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.OAUTH_AUTHORIZATION_REQUIRED);
  assert.equal(result.action, WalletWorkflowAction.SHOW_OAUTH_VERIFICATION_URL_AND_WAIT);
  assert.equal(result.reason, 'wallet_init_oauth_browser_open_failed');
  assert.equal(result.authorizationUrl, authorizationUrl);
  assert.equal(result.browserOpenRequested, true);
  assert.equal(result.browserOpenFailed, true);
  assert.equal(result.oauthDevicePollActive, true);
});

test('wallet init classifier keeps a browser-open failure private until OAuth polling starts', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH&flow=wallet#email=user%2Bwallet%40example.com&name=Alice%20%26%20Bob',
      'Opening your browser...',
      'Could not open a browser automatically. Open the URL above in any browser.',
    ].join('\n'),
  });

  assert.equal(result.action, WalletWorkflowAction.WAIT_FOR_WALLET_INIT_PROGRESS);
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.browserOpenRequested, true);
  assert.equal(result.browserOpenFailed, true);
  assert.equal(result.oauthDevicePollActive, false);
});

test('wallet init classifier ignores an older URL in cumulative terminal output', () => {
  const oldUrl =
    'https://agent.example.com/oauth?user_code=OLD-CODE#email=user%40example.com&name=User';
  const newUrl =
    'https://agent.example.com/oauth?user_code=NEW-CODE#email=user%40example.com&name=User';
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      oldUrl,
      'Opening your browser...',
      'Waiting for authorization...',
      JSON.stringify({
        ok: false,
        error: {
          type: 'auth_error',
          code: 409,
          message: 'A newer wallet init started; this login attempt has been cancelled.',
        },
      }),
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      newUrl,
      'Opening your browser...',
      'Could not open a browser automatically. Open the URL above in any browser.',
      'Waiting for authorization...',
    ].join('\n'),
  });

  assert.equal(result.action, WalletWorkflowAction.SHOW_OAUTH_VERIFICATION_URL_AND_WAIT);
  assert.equal(result.reason, 'wallet_init_oauth_browser_open_failed');
  assert.equal(result.authorizationUrl, newUrl);
});

test('an older browser-open failure cannot expose the current attempt URL', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=OLD-CODE#email=user%40example.com&name=User',
      'Opening your browser...',
      'Could not open a browser automatically. Open the URL above in any browser.',
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=NEW-CODE#email=user%40example.com&name=User',
      'Opening your browser...',
      'Waiting for authorization...',
    ].join('\n'),
  });

  assert.equal(result.action, WalletWorkflowAction.TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT);
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.browserOpenFailed, false);
});

test('a truncated current URL never falls back to an older complete URL', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: [
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=OLD-CODE#email=user%40example.com&name=User',
      'Opening your browser...',
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=NEW-CODE',
      'Waiting for authorization...',
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.reason, 'wallet_init_verification_url_incomplete');
  assert.equal(result.authorizationUrl, undefined);
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

test('wallet init classifier starts a watched binding command before exposing the next URL', () => {
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
        paymentMethodsCached: true,
        paymentMethodCount: 0,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INITIALIZED);
  assert.equal(result.action, WalletWorkflowAction.START_WATCHED_CARD_BINDING);
  assert.equal(result.terminal, false);
  assert.equal(result.reason, 'wallet_init_succeeded_card_binding_watch_required');
  assert.equal(result.walletReady, true);
  assert.equal(result.bindingUrlRequired, true);
  assert.equal(result.emitUrl, false);
  assert.equal(result.command, 'clink card binding-link --no-open --format json');
  assert.deepEqual(result.handoffRequirements, {
    watchReady: true,
    watchEventType: 'payment_method.added',
    processRunning: true,
    bindingUrl: 'required',
  });
  assert.doesNotMatch(result.command, /--no-watch/u);
  assert.equal(result.data.bindingUrl, 'https://agent.clinkbill.com');
});

test('wallet init classifier returns wallet ready when a payment method already exists', () => {
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
        paymentMethodsCached: true,
        paymentMethodCount: 1,
      },
    },
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INITIALIZED);
  assert.equal(result.action, WalletWorkflowAction.RETURN_WALLET_READY);
  assert.equal(result.terminal, true);
  assert.equal(result.reason, 'wallet_init_succeeded');
  assert.equal(result.walletReady, true);
  assert.equal(result.cardReadiness, 'ready');
  assert.equal(result.emitUrl, undefined);
});

test('wallet init classifier keeps OAuth ready when the card cache refresh failed', () => {
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
        bindingUrl: null,
        paymentMethodsCached: false,
        paymentMethodCount: 0,
        paymentMethodsCacheError: 'temporary refresh failure',
      },
    },
  });

  assert.equal(result.action, WalletWorkflowAction.RETURN_WALLET_READY);
  assert.equal(result.terminal, true);
  assert.equal(result.walletReady, true);
  assert.equal(result.cardReadiness, 'unknown');
  assert.equal(result.data.paymentMethodsCacheError, 'temporary refresh failure');
});

for (const paymentMethodCount of [undefined, -1, 0.5, false, true, 'not-a-count']) {
  test(`wallet init classifier never infers first-card binding from invalid count ${String(paymentMethodCount)}`, () => {
    const data = {
      customerId: 'cus_123',
      hasAuthorization: true,
      authorizationType: 'oauth',
      hasCustomerApiKey: false,
      bindingUrl: 'https://agent.clinkbill.com',
      paymentMethodsCached: true,
    };
    if (paymentMethodCount !== undefined) data.paymentMethodCount = paymentMethodCount;

    const result = classifyWalletInitObservation({
      exitCode: 0,
      stdout: { ok: true, data },
    });

    assert.equal(result.action, WalletWorkflowAction.RETURN_WALLET_READY);
    assert.equal(result.cardReadiness, 'unknown');
    assert.equal(result.emitUrl, undefined);
  });
}

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

test('wallet init classifier keeps the final JSON error after live progress', () => {
  const error = {
    type: 'auth_error',
    code: 409,
    message: 'A newer wallet init started; this login attempt has been cancelled.',
  };
  const result = classifyWalletInitObservation({
    exitCode: 4,
    stderr: [
      'Starting wallet login; this attempt takes precedence over any earlier one.',
      'Complete authorization in your browser:',
      'https://agent.example.com/oauth?user_code=ABCD-EFGH&flow=wallet#email=user%40example.com&name=User',
      'Opening your browser...',
      'Waiting for authorization...',
      JSON.stringify({ ok: false, error }),
    ].join('\n'),
  });

  assert.equal(result.state, WalletWorkflowState.WALLET_INIT_FAILED);
  assert.equal(result.action, WalletWorkflowAction.SURFACE_ERROR);
  assert.equal(result.terminal, true);
  assert.deepEqual(result.error, error);
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
