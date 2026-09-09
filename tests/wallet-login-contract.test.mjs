import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { classifyWalletIntent } from '../lib/wallet-intent-fsm.mjs';
import { classifyWalletInitObservation } from '../lib/wallet-workflow-fsm.mjs';
import { classifyPageHandoff } from '../lib/page-handoff.mjs';
import { classifyPaymentIntent } from '../lib/payment-intent-router-fsm.mjs';

const paths = [
  'SKILL.md',
  'README.md',
  'README.zh.md',
  'references/clink-wallet-config.md',
  'references/clink-cli-invocation.md',
  'references/clink-browser-handoff.md',
];
const documents = Object.fromEntries(await Promise.all(paths.map(async (path) => [
  path,
  await readFile(new URL(`../${path}`, import.meta.url), 'utf8'),
])));
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const emailCommand = 'clink wallet init --email <email> --open --format json';
const portalCommand = 'clink wallet init --open --format json';
const walletReference = documents['references/clink-wallet-config.md'];

test('wallet login contract version is synchronized with both READMEs', () => {
  for (const path of ['README.md', 'README.zh.md']) {
    assert.ok(documents[path].includes(`\`${packageJson.version}\``), path);
  }
});

test('wallet and invocation recipes differ only by the optional email argument', () => {
  for (const path of [
    'references/clink-wallet-config.md',
    'references/clink-cli-invocation.md',
  ]) {
    const commands = [...documents[path].matchAll(/^```bash\n([\s\S]*?)^```[ \t]*$/gmu)]
      .flatMap(([, block]) => block.split('\n'))
      .filter((line) => /^(?:bin\/)?clink wallet init /u.test(line))
      .map((line) => line.replace(/^bin\//u, ''));
    assert.deepEqual(commands, [emailCommand, portalCommand], path);
  }
  for (const path of ['SKILL.md', 'README.md', 'README.zh.md']) {
    assert.ok(documents[path].includes(`\`${emailCommand}\``), path);
    assert.ok(documents[path].includes(`\`${portalCommand}\``), path);
  }
});

test('no-email instructions stay delivery-gated without invalidating email OTP', () => {
  for (const [path, document] of Object.entries(documents)) {
    assert.match(document, /delivery gate|交付门禁/iu, path);
    assert.match(document, /email\/OTP|邮箱\/OTP/u, path);
    assert.doesNotMatch(
      document,
      /Wallet init requires the email|For every wallet initialization, pass `--email`|the only required input|邮箱地址（唯一必填项/u,
      path,
    );
  }
  for (const dependency of [
    'Main Edition',
    'upstreamCommit',
    'bundle hash',
    'lib/wallet-intent-fsm.mjs',
    'lib/wallet-workflow-fsm.mjs',
    'Portal/backend readiness',
  ]) {
    assert.ok(walletReference.includes(dependency), dependency);
  }
  assert.match(walletReference, /local Main Skill classifiers support both login paths/u);
  assert.match(walletReference, /matching Main CLI bundle and Portal\/backend integration verification/u);
  assert.match(walletReference, /local classifier tests do not prove a deployed Google login/u);
  assert.match(walletReference, /do not silently switch them to OTP/u);
  for (const document of Object.values(documents)) {
    assert.doesNotMatch(document, /currently requires an email for re-login|compatible Skill wallet classifiers|current email-only classifier/u);
  }
});

test('identity contract uses verified email and adds no provider-specific identity inputs', () => {
  for (const path of [
    'SKILL.md',
    'README.md',
    'references/clink-wallet-config.md',
    'references/clink-cli-invocation.md',
  ]) {
    assert.match(documents[path], /server-verified email/u, path);
    assert.match(documents[path], /reuses[\s\S]*?`customerId`/u, path);
    for (const excluded of ['`sub` binding table', '`login_ui`', '`expectedEmail`', 'Google OTP']) {
      assert.ok(documents[path].includes(excluded), `${path}: ${excluded}`);
    }
  }
  assert.match(walletReference, /only, not `visa-skill`/u);
  assert.match(walletReference, /Portal implementation is owned by the Portal team/u);
  assert.match(walletReference, /still polls Clink's device-token endpoint, not Google/u);
  assert.match(walletReference, /An explicit Google choice takes priority over a cached email/u);
});

test('legacy OTP re-login retains explicit email priority and cached-email compatibility', () => {
  const explicit = classifyWalletIntent({
    text: 'log in again with current@example.com',
    walletStatus: { data: { email: 'cached@example.com', hasAuthorization: true } },
  });
  assert.equal(explicit.action, 'START_FRESH_WALLET_INIT');
  assert.equal(explicit.email, 'current@example.com');

  const cached = classifyWalletIntent({
    text: 'log in again',
    loginMethod: 'email',
    walletStatus: { data: { email: 'cached@example.com', hasAuthorization: true } },
  });
  assert.equal(cached.action, 'START_FRESH_WALLET_INIT');
  assert.equal(cached.email, 'cached@example.com');

  const negated = classifyWalletIntent({ text: "don't log in again with current@example.com" });
  assert.equal(negated.action, 'DO_NOT_START_WALLET_INIT');
});

const cachedEmailInputs = [
  { currentEmail: 'cached@example.com' },
  { current_email: 'cached@example.com' },
  { walletStatus: { data: { email: 'cached@example.com', hasAuthorization: true } } },
  { wallet_status: { data: { email: 'cached@example.com' } } },
  { status: { data: { email: 'cached@example.com' } } },
];

test('Main re-login without a current-request email starts Portal without cached identity', () => {
  for (const cached of [{}, ...cachedEmailInputs]) {
    const result = classifyWalletIntent({ text: 'log in again', ...cached });
    assert.equal(result.route, 'WALLET_RELOGIN');
    assert.equal(result.action, 'START_FRESH_WALLET_INIT');
    assert.equal(result.loginMethod, 'portal');
    assert.equal(result.terminal, false);
    assert.equal(Object.hasOwn(result, 'email'), false);
    assert.equal(Object.hasOwn(result, 'missing'), false);
  }
});

for (const loginMethod of ['portal', 'google']) {
  test(`${loginMethod} choice omits even an explicit or cached email`, () => {
    for (const cached of cachedEmailInputs) {
      const result = classifyWalletIntent({
        text: 'log in again with current@example.com',
        loginMethod,
        email: 'structured@example.com',
        walletEmail: 'wallet@example.com',
        wallet_email: 'wallet-alias@example.com',
        ...cached,
      });
      assert.equal(result.action, 'START_FRESH_WALLET_INIT');
      assert.equal(result.loginMethod, 'portal');
      assert.equal(Object.hasOwn(result, 'email'), false);
    }
  });
}

for (const loginMethod of ['email', 'otp']) {
  test(`${loginMethod} choice retains cached-email fallback and asks when missing`, () => {
    for (const cached of cachedEmailInputs) {
      const result = classifyWalletIntent({ intent: 'wallet_relogin', loginMethod, ...cached });
      assert.equal(result.action, 'START_FRESH_WALLET_INIT');
      assert.equal(result.loginMethod, 'email');
      assert.equal(result.email, 'cached@example.com');
    }
    const missing = classifyWalletIntent({ intent: 'wallet_relogin', loginMethod });
    assert.equal(missing.action, 'ASK_FOR_WALLET_EMAIL');
    assert.equal(missing.loginMethod, 'email');
    assert.deepEqual(missing.missing, ['email']);
  });
}

test('current-request email aliases retain OTP without selecting a provider from the address', () => {
  for (const key of ['email', 'walletEmail', 'wallet_email']) {
    const result = classifyWalletIntent({
      intent: 'wallet_relogin',
      [key]: 'google@example.com',
      currentEmail: 'cached@example.com',
    });
    assert.equal(result.action, 'START_FRESH_WALLET_INIT');
    assert.equal(result.loginMethod, 'email');
    assert.equal(result.email, 'google@example.com');
  }
});

test('a malformed supplied email is not silently converted into a Portal login', () => {
  const result = classifyWalletIntent({ intent: 'wallet_relogin', email: 'invalid-email' });
  assert.equal(result.action, 'ASK_FOR_WALLET_EMAIL');
  assert.equal(result.loginMethod, 'email');
  assert.deepEqual(result.missing, ['email']);
});

test('an invalid explicit login method cannot silently choose another login path', () => {
  for (const loginMethod of [null, '', true, ['google'], {}, 'unsupported']) {
    const result = classifyWalletIntent({ intent: 'wallet_relogin', loginMethod });
    assert.equal(result.action, 'DO_NOT_START_WALLET_INIT');
    assert.equal(result.reason, 'wallet_login_method_invalid');
    assert.equal(result.terminal, true);
  }
});

for (const loginMethod of ['portal', 'google', 'email', 'otp']) {
  test(`${loginMethod} cannot bypass non-authorizing re-login language or explicit denial`, () => {
    for (const text of [
      "don't log in again",
      'how to log in again?',
      'if I log in again',
      'I previously logged in again',
      'reproduce the log in again bug',
    ]) {
      const result = classifyWalletIntent({
        intent: 'wallet_relogin',
        text,
        loginMethod,
        currentEmail: 'cached@example.com',
      });
      assert.equal(result.action, 'DO_NOT_START_WALLET_INIT', text);
      assert.equal(result.route, 'NO_ACTION', text);
    }
    for (const key of [
      'walletReloginAuthorized', 'wallet_relogin_authorized',
      'reloginAuthorized', 'relogin_authorized',
    ]) {
      const result = classifyWalletIntent({
        intent: 'wallet_relogin',
        loginMethod,
        [key]: false,
      });
      assert.equal(result.action, 'DO_NOT_START_WALLET_INIT', key);
      assert.equal(result.reason, 'wallet_relogin_not_authorized', key);
    }
    assert.equal(classifyWalletIntent({ text: 'show wallet status', loginMethod }), null);
    assert.equal(classifyWalletIntent({ loginMethod }), null);
    assert.equal(classifyWalletIntent({ text: 'reauthorize this purchase', loginMethod }), null);
  });
}

test('Portal re-login stays out of payment and does not override anonymous Catalog routing', () => {
  const relogin = classifyPaymentIntent({
    text: 'log in again',
    loginMethod: 'google',
    currentEmail: 'cached@example.com',
    merchantId: 'merchant_test',
    amount: '10',
    currency: 'USD',
  });
  assert.equal(relogin.route, 'WALLET_RELOGIN');
  assert.equal(relogin.action, 'START_FRESH_WALLET_INIT');
  assert.equal(Object.hasOwn(relogin, 'email'), false);
  assert.equal(Object.hasOwn(relogin, 'amount'), false);

  const catalog = classifyPaymentIntent({
    intent: 'catalog_search',
    catalogQuery: 'coffee',
    catalogLanguage: 'en-US',
    text: 'log in again',
    loginMethod: 'google',
    currentEmail: 'cached@example.com',
  });
  assert.equal(catalog.route, 'CATALOG_SEARCH');
  assert.equal(catalog.walletGate, 'SKIP');
});

// These fixtures cover existing Skill behavior, not a new Main bundle or live login.
const startMarker = 'Starting wallet login; this attempt takes precedence over any earlier one.';
const emailUrl = 'https://portal.example.test/login?user_code=TEST#email=user%40example.test&name=user';
const progress = [
  startMarker,
  'Complete authorization in your browser:',
  emailUrl,
  'Opening your browser...',
  '',
].join('\n');

test('legacy email login waits for the original polling marker before requesting user action', () => {
  const beforePoll = classifyWalletInitObservation({ stderr: progress, running: true });
  assert.equal(beforePoll.action, 'WAIT_FOR_WALLET_INIT_PROGRESS');
  assert.equal(beforePoll.oauthDevicePollActive, false);

  const polling = classifyWalletInitObservation({
    stderr: `${progress}Waiting for authorization...\n`,
    running: true,
  });
  assert.equal(polling.action, 'TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT');
  assert.equal(polling.oauthDevicePollActive, true);
  assert.equal(polling.authorizationUrl, undefined);
  assert.equal(polling.terminal, false);
});

test('legacy launch failure exposes only the current attempt URL once polling is active', () => {
  const stale = progress.replace('user_code=TEST', 'user_code=OLD');
  const result = classifyWalletInitObservation({
    stderr: `${stale}${progress}Warning: could not open the browser automatically\nWaiting for authorization...\n`,
    running: true,
  });
  assert.equal(result.action, 'SHOW_OAUTH_VERIFICATION_URL_AND_WAIT');
  assert.equal(result.authorizationUrl, emailUrl);
  assert.equal(result.oauthDevicePollActive, true);
  assert.equal(result.terminal, false);
});

test('both URL shapes remain user-only Clink device-poll handoffs, not Google event watches', () => {
  for (const url of [emailUrl, 'https://portal.example.test/login?user_code=TEST']) {
    const result = classifyPageHandoff({ kind: 'OAUTH_DEVICE_VERIFICATION', url });
    assert.equal(result.actor, 'USER_DEVICE_ONLY');
    assert.equal(result.agentBrowserAllowed, false);
    assert.equal(result.action, 'DEFER_OAUTH_TO_WALLET_WORKFLOW');
    assert.deepEqual(result.cliFlags, ['--open']);
    assert.deepEqual(result.completionEvents, []);
    assert.equal(result.watch, 'oauth-device-token-poll');
    assert.equal(result.emitUrl, false);
  }
});

const portalUrl = 'https://portal.example.test:443/login?user_code=TEST%2BCODE&flow=wallet';
function portalProgress(...lines) {
  return [startMarker, 'Complete authorization in your browser:', portalUrl, ...lines, ''].join('\n');
}

test('Portal URL with no fragment waits for browser and Clink polling evidence', () => {
  for (const lines of [
    [],
    ['Opening your browser...'],
    ['Opening your browser...', 'Could not open the browser automatically'],
  ]) {
    const result = classifyWalletInitObservation({
      running: true,
      stderr: portalProgress(...lines),
    });
    assert.equal(result.action, 'WAIT_FOR_WALLET_INIT_PROGRESS');
    assert.equal(result.oauthDevicePollActive, false);
    assert.equal(result.authorizationUrl, undefined);
  }
  const result = classifyWalletInitObservation({
    running: true,
    stderr: portalProgress('Opening your browser...', 'Waiting for authorization...'),
  });
  assert.equal(result.action, 'TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT');
  assert.equal(result.oauthDevicePollActive, true);
  assert.equal(result.authorizationUrl, undefined);
  assert.equal(result.terminal, false);
});

test('Portal launch failure hands off the exact no-email URL after the Clink wait marker', () => {
  const result = classifyWalletInitObservation({
    running: true,
    stderr: portalProgress(
      'Opening your browser...',
      'Could not open the browser automatically',
      'Waiting for authorization...',
    ).replaceAll('\n', '\r\n'),
  });
  assert.equal(result.action, 'SHOW_OAUTH_VERIFICATION_URL_AND_WAIT');
  assert.equal(result.authorizationUrl, portalUrl);
  assert.equal(result.oauthDevicePollActive, true);
  assert.equal(result.terminal, false);
});

test('a split Portal URL stays private and polling without browser handoff still fails', () => {
  const split = classifyWalletInitObservation({
    running: true,
    stderr: portalProgress().trimEnd(),
  });
  assert.equal(split.action, 'WAIT_FOR_WALLET_INIT_PROGRESS');
  assert.equal(split.authorizationUrl, undefined);

  const noOpen = classifyWalletInitObservation({
    running: true,
    stderr: portalProgress('Waiting for authorization...'),
  });
  assert.equal(noOpen.action, 'SURFACE_ERROR');
  assert.equal(noOpen.reason, 'wallet_init_open_flag_missing');
  assert.equal(noOpen.authorizationUrl, undefined);
});

test('an old OTP attempt cannot lend its failure or polling state to a new Portal attempt', () => {
  const stale = `${progress}Could not open the browser automatically\nWaiting for authorization...\n`;
  const current = portalProgress('Opening your browser...');
  const beforePoll = classifyWalletInitObservation({ running: true, stderr: stale + current });
  assert.equal(beforePoll.action, 'WAIT_FOR_WALLET_INIT_PROGRESS');
  assert.equal(beforePoll.oauthDevicePollActive, false);
  assert.equal(beforePoll.authorizationUrl, undefined);

  const polling = classifyWalletInitObservation({
    running: true,
    stderr: `${stale}${current}Waiting for authorization...\n`,
  });
  assert.equal(polling.action, 'TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT');
  assert.equal(polling.browserOpenFailed, false);
  assert.equal(polling.authorizationUrl, undefined);
});

test('implicit observations reject invalid device URLs and partial email fragments', () => {
  for (const url of [
    'not-a-url',
    'https://portal.example.test/login',
    'https://portal.example.test/login?user_code=',
    'javascript:alert(1)?user_code=TEST',
    'ftp://portal.example.test/login?user_code=TEST',
    `${portalUrl}#email=user%40example.test`,
    `${portalUrl}#name=user`,
    `${portalUrl}#email=user%40example.test&name=`,
    `${portalUrl}#email=&name=user`,
  ]) {
    const result = classifyWalletInitObservation({
      running: true,
      stderr: portalProgress(
        'Opening your browser...',
        'Could not open the browser automatically',
        'Waiting for authorization...',
      ).replace(portalUrl, url),
    });
    assert.equal(result.action, 'SURFACE_ERROR', url);
    assert.equal(result.reason, 'wallet_init_verification_url_incomplete', url);
    assert.equal(result.authorizationUrl, undefined, url);
  }
});

for (const loginMethod of ['portal', 'google']) {
  test(`${loginMethod} accepts verbatim server URL context used by the matching Main CLI`, () => {
    for (const url of [
      `${portalUrl}#server-context`,
      'https://portal.example.test/login?session=server-issued',
      'https://portal.example.test/login?session=server-issued#server-context',
    ]) {
      const prefix = portalProgress('Opening your browser...').replace(portalUrl, url);
      const pending = classifyWalletInitObservation({ loginMethod, running: true, stderr: prefix });
      assert.equal(pending.action, 'WAIT_FOR_WALLET_INIT_PROGRESS', url);
      assert.equal(pending.oauthDevicePollActive, false, url);

      const polling = classifyWalletInitObservation({
        loginMethod,
        running: true,
        stderr: `${prefix}Waiting for authorization...\n`,
      });
      assert.equal(polling.action, 'TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT', url);
      assert.equal(polling.authorizationUrl, undefined, url);

      const failedOpen = classifyWalletInitObservation({
        loginMethod,
        running: true,
        stderr: `${prefix}Could not open the browser automatically\nWaiting for authorization...\n`,
      });
      assert.equal(failedOpen.action, 'SHOW_OAUTH_VERIFICATION_URL_AND_WAIT', url);
      assert.equal(failedOpen.authorizationUrl, url);
      assert.equal(failedOpen.oauthDevicePollActive, true);
      const handoff = classifyPageHandoff({ kind: 'OAUTH_DEVICE_VERIFICATION', url });
      assert.equal(handoff.actor, 'USER_DEVICE_ONLY');
      assert.equal(handoff.action, 'DEFER_OAUTH_TO_WALLET_WORKFLOW');
      assert.deepEqual(handoff.completionEvents, []);
    }
  });
}

test('opaque server URLs require explicit Portal context and do not weaken email OTP validation', () => {
  for (const loginMethod of [undefined, 'email', 'otp']) {
    const result = classifyWalletInitObservation({
      loginMethod,
      running: true,
      stderr: portalProgress(
        'Opening your browser...',
        'Could not open the browser automatically',
        'Waiting for authorization...',
      ).replace(portalUrl, 'https://portal.example.test/login?session=server-issued#server-context'),
    });
    assert.equal(result.action, 'SURFACE_ERROR');
    assert.equal(result.reason, 'wallet_init_verification_url_incomplete');
    assert.equal(result.authorizationUrl, undefined);
  }
});

test('explicit Portal context still rejects malformed and non-HTTP verification URLs', () => {
  for (const url of ['not-a-url', 'javascript:alert(1)', 'file:///login', 'ftp://portal.example.test/login']) {
    const result = classifyWalletInitObservation({
      loginMethod: 'portal',
      running: true,
      stderr: portalProgress(
        'Opening your browser...',
        'Could not open the browser automatically',
        'Waiting for authorization...',
      ).replace(portalUrl, url),
    });
    assert.equal(result.action, 'SURFACE_ERROR', url);
    assert.equal(result.authorizationUrl, undefined, url);
  }
});

test('explicit email OTP observations still require the complete email and name fragment', () => {
  for (const loginMethod of ['email', 'otp']) {
    const incomplete = classifyWalletInitObservation({
      loginMethod,
      running: true,
      stderr: portalProgress('Opening your browser...', 'Waiting for authorization...'),
    });
    assert.equal(incomplete.action, 'SURFACE_ERROR');
    assert.equal(incomplete.reason, 'wallet_init_verification_url_incomplete');
    assert.equal(incomplete.authorizationUrl, undefined);

    const valid = classifyWalletInitObservation({
      loginMethod,
      running: true,
      stderr: `${progress}Waiting for authorization...\n`,
    });
    assert.equal(valid.action, 'TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT');
    assert.equal(valid.oauthDevicePollActive, true);
  }
});

test('the selected Portal method can be carried into observations without an email', () => {
  const intent = classifyWalletIntent({
    intent: 'wallet_relogin',
    loginMethod: 'google',
    currentEmail: 'cached@example.com',
  });
  const result = classifyWalletInitObservation({
    loginMethod: intent.loginMethod,
    running: true,
    stderr: portalProgress('Opening your browser...', 'Waiting for authorization...'),
  });
  assert.equal(result.action, 'TELL_USER_BROWSER_OPEN_REQUESTED_AND_WAIT');
  assert.equal(result.oauthDevicePollActive, true);
});

test('a Google login result without Clink OAuth evidence cannot report wallet readiness', () => {
  const result = classifyWalletInitObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: { googleAuthenticated: true, email: 'user@example.test', customerId: 'customer_test' },
    },
  });
  assert.equal(result.action, 'SURFACE_ERROR');
  assert.equal(result.walletReady, undefined);
});

test('Clink OAuth completion retains the customer identity and existing first-card continuation', () => {
  const data = {
    customerId: 'customer_test',
    email: 'user@example.test',
    hasAuthorization: true,
    authorizationType: 'oauth',
    hasCustomerApiKey: false,
    paymentMethodsCached: true,
    paymentMethodCount: 1,
  };
  const ready = classifyWalletInitObservation({ exitCode: 0, stdout: { ok: true, data } });
  assert.equal(ready.action, 'RETURN_WALLET_READY');
  assert.equal(ready.data.customerId, data.customerId);

  const firstCard = classifyWalletInitObservation({
    exitCode: 0,
    stdout: {
      ok: true,
      data: {
        ...data,
        paymentMethodCount: 0,
        bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
      },
    },
  });
  assert.equal(firstCard.action, 'START_WATCHED_CARD_BINDING');
  assert.equal(firstCard.terminal, false);
  assert.equal(firstCard.bindingUrlRequired, true);
});
