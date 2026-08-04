import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const bundlePath = fileURLToPath(
  new URL('../vendor/clink-cli/clink-cli.bundle.mjs', import.meta.url),
);
const vendorPackage = JSON.parse(
  await readFile(new URL('../vendor/clink-cli/package.json', import.meta.url), 'utf8'),
);
const bundleSource = await readFile(bundlePath, 'utf8');

const testEnv = {
  ...process.env,
  CLINK_BASE_URL: 'https://uat-api.clinkbill.com',
  CLINK_CUSTOMER_ID: 'cust_bundle_contract',
  CLINK_CUSTOMER_API_KEY: 'test_bundle_contract_key',
};

function runBundle(args) {
  const result = runBundleRaw(args);
  assert.equal(
    result.status,
    0,
    `bundle command failed: ${args.join(' ')}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  return result.stdout;
}

function runBundleRaw(args) {
  return spawnSync(process.execPath, [bundlePath, ...args], {
    encoding: 'utf8',
    env: testEnv,
  });
}

function runBundleJson(args) {
  return JSON.parse(runBundle(args));
}

function runBundleAsync(args, env = {}) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...testEnv, ...env };
    for (const [key, value] of Object.entries(childEnv)) {
      if (value === undefined) {
        delete childEnv[key];
      }
    }
    const child = spawn(process.execPath, [bundlePath, ...args], {
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('vendored wallet OAuth init uses Bearer, returns binding URL, redacts status, and logs out', async () => {
  const requestPaths = [];
  const authorizationHeaders = [];
  const server = createServer((request, response) => {
    requestPaths.push(request.url);
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/oauth/device/authorization') {
      response.end(JSON.stringify({
        device_code: 'device_wallet_init_contract',
        user_code: 'ABCD-EFGH',
        verification_uri: 'https://agent.clinkbill.com/login',
        verification_uri_complete: 'https://agent.clinkbill.com/login?user_code=ABCD-EFGH',
        expires_in: 600,
        interval: 1,
      }));
      return;
    }
    if (request.url === '/agent/cwallet/oauth/token') {
      response.end(JSON.stringify({
        token_type: 'Bearer',
        access_token: 'access_wallet_init_contract',
        expires_in: 3600,
        refresh_token: 'refresh_wallet_init_contract',
        refresh_expires_in: 2592000,
        customer_id: 'cus_wallet_init_contract',
        scope: 'wallet:read offline_access',
      }));
      return;
    }
    if (request.url === '/agent/cwallet/oauth/revoke') {
      response.end(JSON.stringify({ revoked: true }));
      return;
    }
    if (request.url === '/agent/cwallet/card/bindingLink') {
      authorizationHeaders.push(request.headers.authorization);
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=%E4%B8%AD%E6%96%87%20value',
          paymentMethodsVoList: [
            { paymentInstrumentId: 'pi_wallet_init_contract' },
          ],
        },
      }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const home = await mkdtemp(join(tmpdir(), 'clink-wallet-init-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const stubBin = join(home, 'bin');
    await mkdir(stubBin, { recursive: true });
    for (const executable of ['open', 'xdg-open']) {
      const executablePath = join(stubBin, executable);
      await writeFile(executablePath, '#!/bin/sh\nexit 0\n', 'utf8');
      await chmod(executablePath, 0o755);
    }
    const env = {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      PATH: `${stubBin}:${process.env.PATH ?? ''}`,
    };
    const result = await runBundleAsync([
      'wallet', 'init',
      '--email', 'wallet-init@example.com',
      '--no-open',
      '--format', 'json',
    ], env);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Complete authorization in your browser:/u);
    assert.match(result.stderr, /user_code=ABCD-EFGH/u);
    assert.doesNotMatch(result.stderr, /Opening your browser/iu);
    assert.doesNotMatch(result.stderr, /Could not open (?:a|the) browser automatically/iu);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.data.hasAuthorization, true);
    assert.equal(output.data.authorizationType, 'oauth');
    assert.equal(output.data.name, 'wallet-init');
    assert.equal('oauthRequired' in output.data, false);
    assert.equal(
      output.data.bindingUrl,
      'https://agent.clinkbill.com',
    );
    assert.equal(output.data.paymentMethodsCached, true);
    assert.equal(output.data.paymentMethodCount, 1);
    assert.deepEqual(authorizationHeaders, ['Bearer access_wallet_init_contract']);

    const status = await runBundleAsync([
      'wallet', 'status', '--format', 'json',
    ], env);
    assert.equal(status.status, 0, status.stderr);
    const statusOutput = JSON.parse(status.stdout);
    assert.equal(statusOutput.data.hasAuthorization, true);
    assert.equal(statusOutput.data.hasStoredAuthorization, true);
    assert.equal(statusOutput.data.authorizationEnvironmentMatches, true);
    assert.equal(statusOutput.data.authorizationType, 'oauth');
    assert.equal(statusOutput.data.oauthRequired, true);
    assert.equal(statusOutput.data.name, 'wallet-init');
    assert.doesNotMatch(status.stdout, /access_wallet_init_contract|refresh_wallet_init_contract/u);

    const mismatchedStatus = await runBundleAsync([
      'wallet', 'status', '--format', 'json',
    ], { ...env, CLINK_BASE_URL: 'https://api.clinkbill.com' });
    assert.equal(mismatchedStatus.status, 0, mismatchedStatus.stderr);
    const mismatchedStatusOutput = JSON.parse(mismatchedStatus.stdout);
    assert.equal(mismatchedStatusOutput.data.hasAuthorization, false);
    assert.equal(mismatchedStatusOutput.data.hasStoredAuthorization, true);
    assert.equal(mismatchedStatusOutput.data.authorizationEnvironmentMatches, false);
    assert.equal(mismatchedStatusOutput.data.authorizationType, null);
    assert.equal(mismatchedStatusOutput.data.oauthRequired, true);

    const logout = await runBundleAsync([
      'wallet', 'logout', '--format', 'json',
    ], env);
    assert.equal(logout.status, 0, logout.stderr);
    const logoutOutput = JSON.parse(logout.stdout);
    assert.equal(logoutOutput.data.loggedOut, true);
    assert.equal(logoutOutput.data.authorizationRemoved, true);
    assert.equal(logoutOutput.data.serverRevocation, 'succeeded');
    assert.equal('oauthRequired' in logoutOutput.data, false);

    const statusAfterLogout = await runBundleAsync([
      'wallet', 'status', '--format', 'json',
    ], env);
    assert.equal(statusAfterLogout.status, 0, statusAfterLogout.stderr);
    const statusAfterLogoutOutput = JSON.parse(statusAfterLogout.stdout);
    assert.equal(statusAfterLogoutOutput.data.hasAuthorization, false);
    assert.equal(statusAfterLogoutOutput.data.hasStoredAuthorization, false);
    assert.equal(statusAfterLogoutOutput.data.authorizationEnvironmentMatches, null);
    assert.equal(statusAfterLogoutOutput.data.authorizationType, null);
    assert.equal(statusAfterLogoutOutput.data.oauthRequired, true);
    assert.equal(statusAfterLogoutOutput.data.hasCustomerApiKey, false);

    const rejectedFallback = await runBundleAsync([
      'risk', 'get', '--format', 'json',
    ], env);
    assert.equal(rejectedFallback.status, 3);
    assert.match(rejectedFallback.stderr, /Login required/u);

    assert.deepEqual(requestPaths, [
      '/agent/cwallet/oauth/device/authorization',
      '/agent/cwallet/oauth/token',
      '/agent/cwallet/card/bindingLink',
      '/agent/cwallet/oauth/revoke',
    ]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored wallet status preserves a complete legacy CSK wallet', async () => {
  const home = await mkdtemp(join(tmpdir(), 'clink-wallet-csk-'));
  try {
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(
      join(configDirectory, 'config.json'),
      JSON.stringify({
        baseUrl: 'https://uat-api.clinkbill.com',
        defaultOpenLinks: false,
        customerId: 'cus_legacy_contract',
        customerApiKey: 'csk_legacy_contract',
      }),
      { encoding: 'utf8', mode: 0o600 },
    );

    const result = await runBundleAsync([
      'wallet', 'status', '--format', 'json',
    ], {
      HOME: home,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.customerId, 'cus_legacy_contract');
    assert.equal(output.data.hasAuthorization, false);
    assert.equal(output.data.hasStoredAuthorization, false);
    assert.equal(output.data.authorizationEnvironmentMatches, null);
    assert.equal(output.data.authorizationType, 'csk');
    assert.equal(output.data.oauthRequired, false);
    assert.equal(output.data.hasCustomerApiKey, true);
    assert.doesNotMatch(result.stdout, /csk_legacy_contract/u);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored wallet status preserves a never-OAuth legacy CSK from the environment', async () => {
  const home = await mkdtemp(join(tmpdir(), 'clink-wallet-env-csk-'));
  try {
    const result = await runBundleAsync([
      'wallet', 'status', '--format', 'json',
    ], { HOME: home });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.customerId, 'cust_bundle_contract');
    assert.equal(output.data.hasAuthorization, false);
    assert.equal(output.data.hasStoredAuthorization, false);
    assert.equal(output.data.authorizationEnvironmentMatches, null);
    assert.equal(output.data.authorizationType, 'csk');
    assert.equal(output.data.oauthRequired, false);
    assert.equal(output.data.hasCustomerApiKey, true);
    assert.doesNotMatch(result.stdout, /test_bundle_contract_key/u);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored CLI never persists a replacement legacy customer API key', async () => {
  const home = await mkdtemp(join(tmpdir(), 'clink-wallet-config-csk-'));
  try {
    const result = await runBundleAsync([
      'config', 'set', 'customer-api-key', 'replacement-secret', '--format', 'json',
    ], {
      HOME: home,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });
    assert.equal(result.status, 3);
    assert.match(result.stderr, /customer-api-key cannot be set in local config/u);
    assert.doesNotMatch(result.stdout + result.stderr, /replacement-secret/u);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored malformed OAuth config cannot downgrade to environment or stored CSK', async () => {
  let requestCount = 0;
  const server = createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ code: 200, data: {} }));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const home = await mkdtemp(join(tmpdir(), 'clink-wallet-malformed-oauth-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(
      join(configDirectory, 'config.json'),
      JSON.stringify({
        baseUrl,
        defaultOpenLinks: false,
        customerId: 'stored_customer',
        customerApiKey: 'stored_csk',
        authorization: {
          type: 'oauth',
          accessToken: 'incomplete_access_token',
          refreshToken: 'incomplete_refresh_token',
        },
      }),
      { encoding: 'utf8', mode: 0o600 },
    );

    const status = await runBundleAsync([
      'wallet', 'status', '--format', 'json',
    ], { HOME: home, CLINK_BASE_URL: baseUrl });
    assert.equal(status.status, 0, status.stderr);
    const statusOutput = JSON.parse(status.stdout);
    assert.equal(statusOutput.data.hasAuthorization, false);
    assert.equal(statusOutput.data.hasStoredAuthorization, false);
    assert.equal(statusOutput.data.authorizationEnvironmentMatches, null);
    assert.equal(statusOutput.data.authorizationType, null);
    assert.equal(statusOutput.data.oauthRequired, true);
    assert.equal(statusOutput.data.hasCustomerApiKey, false);

    const result = await runBundleAsync([
      'risk', 'get', '--format', 'json',
    ], { HOME: home, CLINK_BASE_URL: baseUrl });
    assert.equal(result.status, 3);
    assert.match(result.stderr, /Login required/u);
    assert.equal(requestCount, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored CLI discovers skills list and tip commands', () => {
  assert.match(runBundle(['--help']), /skills\s+Discover, install, and tip skills/u);
  assert.match(runBundle(['skills', '--help']), /skills <list\|install\|tip>/u);
  const listHelp = runBundle(['skills', 'list', '--help']);
  assert.match(listHelp, /skills list --all/u);
  assert.match(listHelp, /--tippable/u);
  assert.match(listHelp, /nonempty publisher, name, and versionNo/u);
  assert.match(listHelp, /tipsConfigJson\.enabled=true/u);
  const tipHelp = runBundle(['skills', 'tip', '--help']);
  assert.match(tipHelp, /--publisher <publisher>/u);
  assert.doesNotMatch(tipHelp, /--version|--number|--expected-skill-id/u);
  assert.match(
    runBundle(['skills', 'install', '--help']),
    /skills install <publisher>\/<skillName>\[@<version>\]/u,
  );
});

test('vendored CLI exposes ucp-catalog and keeps catalog cross-merchant only', () => {
  const rootHelp = runBundle(['--help']);
  const catalogHelp = runBundle(['ucp-catalog', '--help']);
  const productHelp = runBundle(['ucp-catalog', 'product', '--help']);
  assert.match(rootHelp, /ucp-catalog/u);
  assert.match(rootHelp, /^\s*catalog\s/mu);
  assert.match(catalogHelp, /ucp-catalog search/u);
  assert.match(catalogHelp, /ucp-catalog product/u);
  assert.match(productHelp, /--product-id <id>/u);
  assert.match(productHelp, /\/agent\/ucp\/\{merchantId\}\/catalog\/product/u);

  // catalog is the cross-merchant path that answers "who carries this"; naming a merchant is the
  // scoped question, so help must route the caller to ucp-catalog instead. Asserted through help
  // rather than a run, because config checks fire before flag validation under the test env.
  const crossMerchantHelp = runBundle(['catalog', 'search', '--help']);
  assert.match(crossMerchantHelp, /Takes no --merchant-id/u);
  assert.match(crossMerchantHelp, /use ucp-catalog search when the merchant is already known/iu);
});

test('vendored CLI metadata records its upstream merge base', () => {
  assert.equal(vendorPackage.version, '0.2.3');
  assert.equal(
    vendorPackage.upstreamCommit,
    '6e7cc041c87fb37b1eafbe70cd510254cef3c248',
  );
  assert.equal('upstreamDirty' in vendorPackage, false);
  assert.equal('upstreamPatch' in vendorPackage, false);
  assert.match(bundleSource, /urn:ietf:params:oauth:grant-type:device_code/u);
  assert.match(bundleSource, /\/agent\/cwallet\/oauth\/device\/authorization/u);
  assert.match(bundleSource, /requestJsonWithOAuthRetry/u);
  assert.match(bundleSource, /Authentication changed while the command was in progress/u);
  assert.match(bundleSource, /Wallet login changed while webhook events were in progress/u);
  assert.match(bundleSource, /Webhook event customer does not match the authenticated wallet/u);
  assert.match(bundleSource, /customer-api-key cannot be set in local config/u);
  assert.doesNotMatch(bundleSource, /\/agent\/cwallet\/customer\/bootstrap/u);
});

test('vendored CLI embeds the test API, agent, and dashboard domains', () => {
  assert.match(bundleSource, /https:\/\/api\.clinkbill\.dev/u);
  assert.match(bundleSource, /https:\/\/agent\.clinkbill\.dev/u);
  assert.match(bundleSource, /https:\/\/dashboard\.clinkbill\.dev/u);
  assert.doesNotMatch(runBundle(['skills', 'list', '--help']), /--sandbox|--test|--base-url/u);
});

test('vendored instruction sign-url exposes identifiers for correlated activation watches', async () => {
  const home = await mkdtemp(join(tmpdir(), 'clink-instruction-sign-url-'));
  try {
    const execution = await runBundleAsync([
      'instruction', 'sign-url',
      '--payment-instrument-id', 'pi_contract',
      '--purchase-instruction-id', 'ins_contract',
      '--no-watch',
      '--format', 'json',
    ], { HOME: home });
    assert.equal(execution.status, 0, execution.stderr);
    const result = JSON.parse(execution.stdout);
    assert.equal(result.ok, true);
    assert.equal(result.data.instructionId, 'ins_contract');
    assert.equal(result.data.paymentInstrumentId, 'pi_contract');
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored CLI versionless identity tip dry-run is side-effect free and normalized', () => {
  const result = runBundleJson([
    'skills', 'tip',
    '--publisher', 'clinkpay',
    '--name', 'pollyreach',
    '--amount', '2',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    status: 'planned',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    amount: 2,
    currency: 'USD',
    dryRun: true,
  });
});

test('vendored CLI rejects versioned Skill Tips and wallet OTP input', () => {
  const versionedTip = runBundleRaw([
    'skills', 'tip',
    '--publisher', 'clinkpay',
    '--name', 'pollyreach',
    '--version', 'v1.2.3',
    '--amount', '2',
    '--dry-run',
    '--format', 'json',
  ]);
  assert.equal(versionedTip.status, 2);
  assert.match(versionedTip.stderr, /--version is not supported by skills tip/u);

  const walletOtp = runBundleRaw([
    'wallet', 'init',
    '--email', 'wallet@example.com',
    '--otp', '123456',
    '--format', 'json',
  ]);
  assert.equal(walletOtp.status, 2);
  assert.match(walletOtp.stderr, /--otp is no longer used by wallet init/u);
});

test('vendored CLI rejects Number as a payment target', () => {
  const result = runBundleRaw([
    'skills', 'tip',
    '--number', '2',
    '--amount', '2',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown option: --number/u);
});

test('vendored CLI latest Skill install dry-run omits the requested version', () => {
  const result = runBundleJson([
    'skills', 'install',
    'clinkpay/PollyReach',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.data.publisher, 'clinkpay');
  assert.equal(result.data.skillName, 'PollyReach');
  assert.equal(result.data.requestedVersion, null);
  assert.equal(result.data.action, 'planned');
  assert.equal(result.data.dryRun, true);
});

test('vendored CLI exact Skill install dry-run keeps version in the package operand', () => {
  const result = runBundleJson([
    'skills', 'install',
    'clinkpay/PollyReach@v1.2.3',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.data.publisher, 'clinkpay');
  assert.equal(result.data.skillName, 'PollyReach');
  assert.equal(result.data.requestedVersion, 'v1.2.3');
  assert.equal(result.data.action, 'planned');
  assert.equal(result.data.dryRun, true);
});

test('vendored CLI preserves a Skill install name containing spaces', () => {
  const result = runBundleJson([
    'skills', 'install',
    'Jeff/SEO Deep Audit@v1.0.0',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.data.publisher, 'Jeff');
  assert.equal(result.data.skillName, 'SEO Deep Audit');
  assert.equal(result.data.requestedVersion, 'v1.0.0');
  assert.equal(result.data.action, 'planned');
  assert.equal(result.data.dryRun, true);
});

test('vendored CLI preserves Chinese publisher and Skill names', () => {
  const result = runBundleJson([
    'skills', 'install',
    '艺术家/跨境数据分析套件@v1.0.0',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.data.publisher, '艺术家');
  assert.equal(result.data.skillName, '跨境数据分析套件');
  assert.equal(result.data.requestedVersion, 'v1.0.0');
  assert.equal(result.data.action, 'planned');
  assert.equal(result.data.dryRun, true);
});

test('vendored CLI rejects a separate Skill install version flag', () => {
  const result = runBundleRaw([
    'skills', 'install',
    'clinkpay/PollyReach',
    '--version', 'v1.2.3',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /--version is not supported by skills install/u);
});

test('vendored CLI rejects a literal latest Skill install version', () => {
  const result = runBundleRaw([
    'skills', 'install',
    'clinkpay/PollyReach@latest',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /invalid skill package/u);
});
