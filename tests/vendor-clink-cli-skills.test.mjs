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

async function loadInstrumentedWatchEvents() {
  const start = bundleSource.indexOf('// dist/events.js');
  const end = bundleSource.indexOf('// dist/help.js', start);
  assert.notEqual(start, -1, 'events implementation marker missing from bundle');
  assert.notEqual(end, -1, 'events implementation end marker missing from bundle');
  const instrumentedSource = bundleSource.slice(start, end)
    .replace(
      'error instanceof CliError',
      'error && typeof error === "object"',
    )
    .replace(
      'records = await pollWebhookEvents({',
      'records = await (options2.pollWebhookEvents ?? pollWebhookEvents)({',
    )
    .replace(
      'polledIdentity = runtimeAuthorizationIdentity(runtimeState.value);',
      'polledIdentity = options2.runtimeAuthorizationIdentity?.(runtimeState.value) ?? { type: "none" };',
    )
    .replace(
      'assertPolledEventCustomers(records, polledIdentity);',
      'options2.assertPolledEventCustomers?.(records, polledIdentity);',
    )
    .replace(
      'const watchIdentity = runtimeAuthorizationIdentity(runtimeState.value);',
      'const watchIdentity = options2.runtimeAuthorizationIdentity?.(runtimeState.value) ?? { type: "none" };',
    )
    .replace(
      'authorizationIdentityCanContinue(watchIdentity, polledIdentity)',
      '(options2.authorizationIdentityCanContinue?.(watchIdentity, polledIdentity) ?? true)',
    );
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    `${instrumentedSource}\nexport { watchEvents };`,
  ).toString('base64')}`;
  return import(moduleUrl);
}

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

function runBundleRaw(args, env = {}) {
  const childEnv = { ...testEnv, ...env };
  for (const [key, value] of Object.entries(childEnv)) {
    if (value === undefined) {
      delete childEnv[key];
    }
  }
  return spawnSync(process.execPath, [bundlePath, ...args], {
    encoding: 'utf8',
    env: childEnv,
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

function spawnBundleLive(args, env = {}) {
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
  let status;
  let spawnError;
  const waiters = new Set();
  const notify = () => {
    for (const waiter of waiters) waiter();
  };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
    notify();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
    notify();
  });
  child.once('error', (error) => {
    spawnError = error;
    notify();
  });
  child.once('close', (code) => {
    status = code;
    notify();
  });

  const snapshot = () => ({ child, stdout, stderr, status, spawnError });
  const waitFor = async (predicate, message, timeoutMs = 5_000) => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate(snapshot())) {
      if (spawnError) throw spawnError;
      if (Date.now() >= deadline) {
        throw new Error(`${message}\nstdout=${stdout}\nstderr=${stderr}`);
      }
      await new Promise((resolve) => {
        const remaining = Math.max(1, deadline - Date.now());
        const timer = setTimeout(() => {
          waiters.delete(onUpdate);
          resolve();
        }, Math.min(remaining, 50));
        const onUpdate = () => {
          clearTimeout(timer);
          waiters.delete(onUpdate);
          resolve();
        };
        waiters.add(onUpdate);
      });
    }
    return snapshot();
  };

  return { child, snapshot, waitFor };
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address();
}

function jsonLines(value) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readRequestJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}

async function stopLiveProcess(live) {
  if (live && live.snapshot().status === undefined) {
    live.child.kill();
    await live.waitFor(
      ({ status }) => status !== undefined,
      'live bundle process did not stop',
    );
  }
}

test('vendored wallet init keeps polling OAuth without starting an Event Hub watch', async () => {
  const requestPaths = [];
  let tokenRequests = 0;
  const server = createServer((request, response) => {
    requestPaths.push(request.url);
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/oauth/device/authorization') {
      response.end(JSON.stringify({
        device_code: 'device_wallet_pending_contract',
        user_code: 'PEND-ING1',
        verification_uri: 'https://agent.clinkbill.com/login',
        verification_uri_complete: 'https://agent.clinkbill.com/login?user_code=PEND-ING1',
        expires_in: 600,
        interval: 0,
      }));
      return;
    }
    if (request.url === '/agent/cwallet/oauth/token') {
      tokenRequests += 1;
      if (tokenRequests === 1) {
        response.end(JSON.stringify({ error: 'authorization_pending' }));
        return;
      }
      response.end(JSON.stringify({
        token_type: 'Bearer',
        access_token: 'access_wallet_pending_contract',
        expires_in: 3600,
        refresh_token: 'refresh_wallet_pending_contract',
        refresh_expires_in: 2592000,
        customer_id: 'cus_wallet_pending_contract',
        agent_client_id: 'acl_wallet_pending_contract',
        visa_registration_status: 'UNKNOWN',
        scope: 'wallet:read wallet:setup events:read offline_access',
      }));
      return;
    }
    if (request.url === '/agent/cwallet/card/bindingLink') {
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=init-secret#fragment',
          paymentMethodsVoList: [],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      response.statusCode = 500;
      response.end(JSON.stringify({ code: 500, message: 'wallet init must not poll Event Hub' }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-wallet-pending-'));
  let live;

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    live = spawnBundleLive([
      'wallet', 'init',
      '--email', 'wallet-pending@example.com',
      '--no-open',
      '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    const pending = await live.waitFor(
      ({ stderr }) => stderr.includes('Waiting for authorization...') && tokenRequests === 1,
      'wallet init did not reach the pending OAuth state',
    );
    assert.equal(pending.status, undefined);
    assert.equal(pending.stdout, '');
    assert.deepEqual(requestPaths, [
      '/agent/cwallet/oauth/device/authorization',
      '/agent/cwallet/oauth/token',
    ]);
    assert.equal(requestPaths.includes('/agent/cwallet/card/bindingLink'), false);
    assert.equal(requestPaths.includes('/agent/event-hub/webhook-events/poll'), false);

    const completed = await live.waitFor(
      ({ status }) => status !== undefined,
      'wallet init did not complete after OAuth authorization',
      5_000,
    );
    assert.equal(completed.status, 0, completed.stderr);
    assert.equal(tokenRequests, 2);
    assert.deepEqual(requestPaths, [
      '/agent/cwallet/oauth/device/authorization',
      '/agent/cwallet/oauth/token',
      '/agent/cwallet/oauth/token',
      '/agent/cwallet/card/bindingLink',
    ]);
    const output = JSON.parse(completed.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.data.hasAuthorization, true);
    assert.equal(output.data.authorizationType, 'oauth');
    assert.equal(output.data.customerId, 'cus_wallet_pending_contract');
    assert.equal(
      output.data.bindingUrl,
      'https://agent.clinkbill.com/payment-method-setup?email=wallet-pending%40example.com',
    );
    assert.equal(output.data.paymentMethodCount, 0);
    assert.equal(requestPaths.includes('/agent/event-hub/webhook-events/poll'), false);
    assert.doesNotMatch(completed.stdout, /init-secret/u);
  } finally {
    await stopLiveProcess(live);
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored wallet init treats missing or malformed paymentMethodsVoList as unknown', async () => {
  for (const fixture of [
    { name: 'missing' },
    { name: 'malformed', paymentMethodsVoList: { unexpected: true } },
  ]) {
    const requestPaths = [];
    const bindingSecret = `binding-secret-${fixture.name}`;
    const server = createServer((request, response) => {
      requestPaths.push(request.url);
      response.writeHead(200, { 'content-type': 'application/json' });
      if (request.url === '/agent/cwallet/oauth/device/authorization') {
        response.end(JSON.stringify({
          device_code: `device_wallet_invalid_cards_${fixture.name}`,
          user_code: 'CARD-LIST',
          verification_uri: 'https://agent.clinkbill.com/login',
          verification_uri_complete: 'https://agent.clinkbill.com/login?user_code=CARD-LIST',
          expires_in: 600,
          interval: 0,
        }));
        return;
      }
      if (request.url === '/agent/cwallet/oauth/token') {
        response.end(JSON.stringify({
          token_type: 'Bearer',
          access_token: `access_wallet_invalid_cards_${fixture.name}`,
          expires_in: 3600,
          refresh_token: `refresh_wallet_invalid_cards_${fixture.name}`,
          refresh_expires_in: 2592000,
          customer_id: `cus_wallet_invalid_cards_${fixture.name}`,
          agent_client_id: `acl_wallet_invalid_cards_${fixture.name}`,
          visa_registration_status: 'UNKNOWN',
          scope: 'wallet:read wallet:setup offline_access',
        }));
        return;
      }
      if (request.url === '/agent/cwallet/card/bindingLink') {
        response.end(JSON.stringify({
          code: 200,
          data: {
            bindingUrl: `https://agent.clinkbill.com/card-binding?token=${bindingSecret}#fragment`,
            ...Object.prototype.hasOwnProperty.call(fixture, 'paymentMethodsVoList')
              ? { paymentMethodsVoList: fixture.paymentMethodsVoList }
              : {},
          },
        }));
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({ code: 404, message: 'not found' }));
    });
    const address = await listen(server);
    const home = await mkdtemp(join(tmpdir(), `clink-wallet-invalid-cards-${fixture.name}-`));

    try {
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const result = await runBundleAsync([
        'wallet', 'init',
        '--email', `wallet-invalid-cards-${fixture.name}@example.com`,
        '--no-open',
        '--format', 'json',
      ], {
        HOME: home,
        CLINK_BASE_URL: baseUrl,
        CLINK_CUSTOMER_ID: undefined,
        CLINK_CUSTOMER_API_KEY: undefined,
      });

      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.equal(output.ok, true);
      assert.equal(output.data.hasAuthorization, true);
      assert.equal(output.data.authorizationType, 'oauth');
      assert.equal(output.data.bindingUrl, null);
      assert.equal(output.data.paymentMethodsCached, false);
      assert.equal(output.data.paymentMethodCount, 0);
      assert.match(
        output.data.paymentMethodsCacheError,
        /paymentMethodsVoList[\s\S]*(missing|invalid)|missing or invalid paymentMethodsVoList/u,
      );
      assert.deepEqual(requestPaths, [
        '/agent/cwallet/oauth/device/authorization',
        '/agent/cwallet/oauth/token',
        '/agent/cwallet/card/bindingLink',
      ]);
      assert.doesNotMatch(
        `${result.stdout}\n${result.stderr}`,
        new RegExp(`card-binding|${bindingSecret}|#fragment`, 'u'),
      );
      const storedConfig = JSON.parse(
        await readFile(join(home, '.clink-cli', 'config.json'), 'utf8'),
      );
      assert.equal('paymentMethods' in storedConfig, false);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await rm(home, { recursive: true, force: true });
    }
  }
});

test('vendored wallet init cannot emit success after a post-commit takeover', async () => {
  let authorizationRequests = 0;
  let firstBindingRequests = 0;
  let secondTokenRequests = 0;
  let releaseFirstBinding;
  const firstBindingGate = new Promise((resolve) => { releaseFirstBinding = resolve; });
  const server = createServer(async (request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/oauth/device/authorization') {
      authorizationRequests += 1;
      const suffix = authorizationRequests === 1 ? 'first' : 'second';
      response.end(JSON.stringify({
        device_code: `device_wallet_takeover_${suffix}`,
        user_code: authorizationRequests === 1 ? 'TAKE-OVER1' : 'TAKE-OVER2',
        verification_uri: 'https://agent.clinkbill.com/login',
        verification_uri_complete: `https://agent.clinkbill.com/login?user_code=${authorizationRequests === 1 ? 'TAKE-OVER1' : 'TAKE-OVER2'}`,
        expires_in: 600,
        interval: 0,
      }));
      return;
    }
    if (request.url === '/agent/cwallet/oauth/token') {
      const body = await readRequestJson(request);
      if (body.device_code === 'device_wallet_takeover_second') {
        secondTokenRequests += 1;
        response.end(JSON.stringify({ error: 'authorization_pending' }));
        return;
      }
      response.end(JSON.stringify({
        token_type: 'Bearer',
        access_token: 'access_wallet_takeover_first',
        expires_in: 3600,
        refresh_token: 'refresh_wallet_takeover_first',
        refresh_expires_in: 2592000,
        customer_id: 'cus_wallet_takeover_first',
        agent_client_id: 'acl_wallet_takeover_first',
        visa_registration_status: 'UNKNOWN',
        scope: 'wallet:read wallet:setup offline_access',
      }));
      return;
    }
    if (request.url === '/agent/cwallet/card/bindingLink') {
      firstBindingRequests += 1;
      await firstBindingGate;
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=takeover-secret#fragment',
          paymentMethodsVoList: [],
        },
      }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-wallet-post-commit-takeover-'));
  let first;
  let second;

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const env = {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    };
    first = spawnBundleLive([
      'wallet', 'init',
      '--email', 'wallet-takeover-first@example.com',
      '--no-open',
      '--format', 'json',
    ], env);

    const firstCommitted = await first.waitFor(
      () => firstBindingRequests === 1,
      'first wallet init did not reach its post-commit card refresh',
    );
    assert.equal(firstCommitted.status, undefined);
    assert.equal(firstCommitted.stdout, '');

    second = spawnBundleLive([
      'wallet', 'init',
      '--email', 'wallet-takeover-second@example.com',
      '--no-open',
      '--format', 'json',
    ], env);
    const secondPending = await second.waitFor(
      ({ stderr }) => stderr.includes('Waiting for authorization...')
        && secondTokenRequests >= 1,
      'second wallet init did not supersede the first and enter pending authorization',
    );
    assert.equal(secondPending.status, undefined);
    assert.equal(secondPending.stdout, '');

    releaseFirstBinding();
    const superseded = await first.waitFor(
      ({ status }) => status !== undefined,
      'superseded post-commit wallet init did not stop',
    );
    assert.equal(superseded.status, 4, superseded.stderr);
    assert.equal(superseded.stdout, '');
    assert.match(superseded.stderr, /A newer wallet init started/u);
    assert.doesNotMatch(
      superseded.stderr,
      /takeover-secret|card-binding|#fragment/u,
    );
  } finally {
    releaseFirstBinding();
    await stopLiveProcess(first);
    await stopLiveProcess(second);
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

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
        agent_client_id: 'acl_wallet_init_contract',
        visa_registration_status: 'UNKNOWN',
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
      'https://agent.clinkbill.com/payment-method-setup?email=wallet-init%40example.com',
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

test('vendored card binding-link exposes its URL only after the default watch is ready', async () => {
  const requestPaths = [];
  const ackBodies = [];
  let pollRequests = 0;
  let releaseFirstPoll;
  const firstPollGate = new Promise((resolve) => { releaseFirstPoll = resolve; });
  const unrelatedEvent = {
    eventId: 'evt_binding_unrelated',
    eventType: 'agent_order.created',
    customerId: 'cus_card_watch',
    resourceId: 'order_other',
    payload: JSON.stringify({ data: { orderId: 'order_other' } }),
  };
  const addedEvent = {
    eventId: 'evt_binding_added',
    eventType: 'payment_method.added',
    customerId: 'cus_card_watch',
    resourceId: 'pi_binding_added',
    payload: JSON.stringify({
      data: {
        customerId: 'cus_card_watch',
        paymentInstrumentId: 'pi_binding_added',
      },
    }),
  };
  const server = createServer(async (request, response) => {
    requestPaths.push(request.url);
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/card/bindingLink') {
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=watch-secret#fragment',
          paymentMethodsVoList: [],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      pollRequests += 1;
      if (pollRequests === 1) await firstPollGate;
      response.end(JSON.stringify({
        code: 200,
        data: { records: pollRequests === 1 ? [unrelatedEvent] : [addedEvent] },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/ack') {
      const body = await readRequestJson(request);
      ackBodies.push(body);
      response.end(JSON.stringify({
        code: 200,
        data: { deletedCount: body.eventIds.length, notFoundEventIds: [] },
      }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-card-watch-'));
  let live;

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(
      join(configDirectory, 'config.json'),
      JSON.stringify({
        baseUrl,
        defaultOpenLinks: false,
        customerId: 'cus_card_watch',
        customerApiKey: 'csk_card_watch',
      }),
      { encoding: 'utf8', mode: 0o600 },
    );
    live = spawnBundleLive([
      'card', 'binding-link',
      '--no-open',
      '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    const polling = await live.waitFor(
      () => pollRequests === 1,
      'card binding watch did not start its first Event Hub poll',
    );
    assert.equal(polling.status, undefined);
    assert.equal(polling.stdout, '');
    assert.doesNotMatch(
      polling.stderr,
      /agent\.clinkbill\.com|card-binding|watch-secret|fragment/u,
    );
    releaseFirstPoll();

    const ready = await live.waitFor(
      ({ stdout, stderr }) => stdout.includes('"watchReady":true')
        && stderr.includes('Waiting for events'),
      'card binding watch did not become ready before exposing its URL',
    );
    assert.equal(ready.status, undefined);
    assert.equal(pollRequests, 1);
    assert.deepEqual(requestPaths.slice(0, 2), [
      '/agent/cwallet/card/bindingLink',
      '/agent/event-hub/webhook-events/poll',
    ]);
    assert.deepEqual(jsonLines(ready.stdout), [{
      ok: true,
      data: {
        bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
        paymentMethodsVoList: [],
        watchReady: true,
        watchEventType: 'payment_method.added',
      },
    }]);
    assert.doesNotMatch(ready.stdout, /card-binding|watch-secret|fragment/u);
    assert.match(ready.stderr, /https:\/\/agent\.clinkbill\.com/u);

    const unrelatedPreserved = await live.waitFor(
      ({ status, stdout }) => pollRequests >= 2
        && status === undefined
        && jsonLines(stdout).length === 1,
      'card binding watch did not preserve the unrelated event and continue',
      7_000,
    );
    assert.equal(unrelatedPreserved.status, undefined);
    assert.deepEqual(ackBodies, []);
    assert.equal(jsonLines(unrelatedPreserved.stdout).length, 1);

    const completed = await live.waitFor(
      ({ status }) => status !== undefined,
      'card binding watch did not finish on payment_method.added',
      12_000,
    );
    assert.equal(completed.status, 0, completed.stderr);
    assert.ok(pollRequests >= 2);
    assert.deepEqual(ackBodies, [{ eventIds: ['evt_binding_added'] }]);
    const envelopes = jsonLines(completed.stdout);
    assert.equal(envelopes.length, 2);
    assert.equal(envelopes[1].ok, true);
    assert.equal(envelopes[1].data.watched, true);
    assert.equal(envelopes[1].data.timedOut, false);
    assert.deepEqual(envelopes[1].data.ackedEventIds, ['evt_binding_added']);
    assert.equal(envelopes[1].data.events.length, 1);
    assert.equal(envelopes[1].data.events[0].eventType, 'payment_method.added');
    assert.equal(envelopes[1].data.events[0].eventId, 'evt_binding_added');
    assert.doesNotMatch(completed.stdout, /watch-secret|fragment/u);
    assert.deepEqual(requestPaths.slice(0, 2), [
      '/agent/cwallet/card/bindingLink',
      '/agent/event-hub/webhook-events/poll',
    ]);
  } finally {
    await stopLiveProcess(live);
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored card binding-link does not expose an old wallet URL after login takeover', async () => {
  let releaseFirstPoll;
  const firstPollGate = new Promise((resolve) => { releaseFirstPoll = resolve; });
  let pollRequests = 0;
  const server = createServer(async (request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/card/bindingLink') {
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=takeover-secret',
          paymentMethodsVoList: [],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      pollRequests += 1;
      await firstPollGate;
      response.end(JSON.stringify({ code: 200, data: { records: [] } }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-card-watch-takeover-'));
  let live;

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    const configPath = join(configDirectory, 'config.json');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(configPath, JSON.stringify({
      baseUrl,
      defaultOpenLinks: false,
      customerId: 'cus_card_old',
      customerApiKey: 'csk_card_old',
    }), { encoding: 'utf8', mode: 0o600 });
    live = spawnBundleLive([
      'card', 'binding-link', '--no-open', '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    await live.waitFor(
      () => pollRequests === 1,
      'card binding watch did not start its first Event Hub poll',
    );
    await writeFile(configPath, JSON.stringify({
      baseUrl,
      defaultOpenLinks: false,
      customerId: 'cus_card_new',
      customerApiKey: 'csk_card_new',
    }), { encoding: 'utf8', mode: 0o600 });
    releaseFirstPoll();

    const completed = await live.waitFor(
      ({ status }) => status !== undefined,
      'card binding watch did not reject the wallet takeover',
    );
    assert.equal(completed.status, 4, completed.stderr);
    assert.equal(completed.stdout, '');
    assert.match(completed.stderr, /Authentication changed|Wallet login changed|newer wallet init/u);
    assert.doesNotMatch(
      `${completed.stdout}\n${completed.stderr}`,
      /agent\.clinkbill\.com|takeover-secret|watchReady/u,
    );
  } finally {
    releaseFirstPoll?.();
    await stopLiveProcess(live);
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored card binding-link validates first-poll event customer before exposing its URL', async () => {
  let pollRequests = 0;
  const server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/card/bindingLink') {
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=customer-secret',
          paymentMethodsVoList: [],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      pollRequests += 1;
      response.end(JSON.stringify({
        code: 200,
        data: {
          records: [{
            eventId: 'evt_wrong_customer',
            eventType: 'payment_method.added',
            customerId: 'cus_other',
            resourceId: 'pi_other',
            payload: JSON.stringify({ data: { customerId: 'cus_other' } }),
          }],
        },
      }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-card-watch-customer-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(join(configDirectory, 'config.json'), JSON.stringify({
      baseUrl,
      defaultOpenLinks: false,
      customerId: 'cus_card_expected',
      customerApiKey: 'csk_card_expected',
    }), { encoding: 'utf8', mode: 0o600 });

    const result = await runBundleAsync([
      'card', 'binding-link', '--no-open', '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    assert.equal(result.status, 4, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(pollRequests, 1);
    assert.match(result.stderr, /Webhook event customer does not match/u);
    assert.doesNotMatch(
      `${result.stdout}\n${result.stderr}`,
      /agent\.clinkbill\.com|customer-secret|watchReady/u,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('deferred card handoff gets a full watch window after readiness', async () => {
  const { watchEvents } = await loadInstrumentedWatchEvents();
  const startedAtMs = 1_000;
  const maxDurationMs = 10_000;
  const pollIntervalMs = 1_000;
  let currentTimeMs = startedAtMs;
  let pollRequests = 0;
  let readyAtMs;
  const result = await watchEvents({
    runtimeConfig: {},
    url: 'https://agent.clinkbill.com',
    label: 'card binding',
    eventType: 'payment_method.added',
    deferHandoffUntilReady: true,
    maxDurationMs,
    pollIntervalMs,
    now: () => currentTimeMs,
    sleep: async (durationMs) => { currentTimeMs += durationMs; },
    log: () => {},
    runtimeAuthorizationIdentity: () => ({ type: 'none' }),
    pollWebhookEvents: async () => {
      pollRequests += 1;
      if (pollRequests === 1) {
        currentTimeMs = startedAtMs + maxDurationMs - pollIntervalMs - 1;
      }
      return [];
    },
    onReady: () => { readyAtMs = currentTimeMs; },
  });

  assert.equal(readyAtMs, startedAtMs + maxDurationMs - pollIntervalMs - 1);
  assert.equal(result.timedOut, true);
  assert.ok(
    currentTimeMs - readyAtMs >= maxDurationMs - pollIntervalMs,
    `watch ended only ${currentTimeMs - readyAtMs}ms after readiness`,
  );
  assert.ok(pollRequests > 2);
});

test('vendored card binding-link fails closed when Event Hub omits records', async () => {
  let pollRequests = 0;
  const server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/card/bindingLink') {
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=malformed-watch-secret',
          paymentMethodsVoList: [],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      pollRequests += 1;
      response.end(JSON.stringify({ code: 200, data: {} }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-card-watch-malformed-poll-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(join(configDirectory, 'config.json'), JSON.stringify({
      baseUrl,
      defaultOpenLinks: false,
      customerId: 'cus_card_watch_malformed',
      customerApiKey: 'csk_card_watch_malformed',
    }), { encoding: 'utf8', mode: 0o600 });

    const result = await runBundleAsync([
      'card', 'binding-link',
      '--no-open',
      '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    assert.equal(result.status, 5, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(pollRequests, 1);
    const error = JSON.parse(result.stderr);
    assert.equal(error.error.type, 'api_error');
    assert.equal(error.error.code, 502);
    assert.match(error.error.message, /missing or invalid records|expected data\.records to be an array/u);
    assert.doesNotMatch(
      `${result.stdout}\n${result.stderr}`,
      /agent\.clinkbill\.com|malformed-watch-secret|watchReady/u,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored card binding-link --no-watch exits without polling Event Hub', async () => {
  const requestPaths = [];
  const server = createServer((request, response) => {
    requestPaths.push(request.url);
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/cwallet/card/bindingLink') {
      response.end(JSON.stringify({
        code: 200,
        data: {
          bindingUrl: 'https://agent.clinkbill.com/card-binding?token=no-watch-secret#fragment',
          paymentMethodsVoList: [],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      response.statusCode = 500;
      response.end(JSON.stringify({ code: 500, message: 'unexpected Event Hub poll' }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-card-no-watch-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(
      join(configDirectory, 'config.json'),
      JSON.stringify({
        baseUrl,
        defaultOpenLinks: false,
        customerId: 'cus_card_no_watch',
        customerApiKey: 'csk_card_no_watch',
      }),
      { encoding: 'utf8', mode: 0o600 },
    );
    const result = await runBundleAsync([
      'card', 'binding-link',
      '--no-watch',
      '--no-open',
      '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(jsonLines(result.stdout), [{
      ok: true,
      data: {
        bindingUrl: 'https://agent.clinkbill.com/payment-method-setup',
        paymentMethodsVoList: [],
        watchReady: false,
        watchEventType: null,
      },
    }]);
    assert.deepEqual(requestPaths, ['/agent/cwallet/card/bindingLink']);
    assert.doesNotMatch(result.stdout, /card-binding|no-watch-secret|fragment/u);
    assert.match(result.stderr, /Watch not started \(--no-watch\)/u);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored card refresh rejects missing or malformed paymentMethodsVoList without clearing cache', async () => {
  for (const fixture of [
    { name: 'missing' },
    { name: 'malformed', paymentMethodsVoList: 'not-an-array' },
  ]) {
    const bindingSecret = `card-refresh-secret-${fixture.name}`;
    const server = createServer((request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      if (request.url === '/agent/cwallet/card/bindingLink') {
        response.end(JSON.stringify({
          code: 200,
          data: {
            bindingUrl: `https://agent.clinkbill.com/card-binding?token=${bindingSecret}#fragment`,
            ...Object.prototype.hasOwnProperty.call(fixture, 'paymentMethodsVoList')
              ? { paymentMethodsVoList: fixture.paymentMethodsVoList }
              : {},
          },
        }));
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({ code: 404, message: 'not found' }));
    });
    const address = await listen(server);
    const home = await mkdtemp(join(tmpdir(), `clink-card-invalid-list-${fixture.name}-`));

    try {
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const configPath = join(home, '.clink-cli', 'config.json');
      await mkdir(join(home, '.clink-cli'), { recursive: true });
      await writeFile(configPath, JSON.stringify({
        baseUrl,
        defaultOpenLinks: false,
        customerId: 'cus_card_invalid_list',
        customerApiKey: 'csk_card_invalid_list',
        paymentMethods: [{ paymentInstrumentId: 'pi_cached_before_invalid_refresh' }],
      }), { encoding: 'utf8', mode: 0o600 });

      const result = await runBundleAsync([
        'card', 'binding-link',
        '--no-watch',
        '--no-open',
        '--format', 'json',
      ], {
        HOME: home,
        CLINK_BASE_URL: baseUrl,
        CLINK_CUSTOMER_ID: undefined,
        CLINK_CUSTOMER_API_KEY: undefined,
      });

      assert.equal(result.status, 5, result.stderr);
      assert.equal(result.stdout, '');
      const error = JSON.parse(result.stderr);
      assert.equal(error.ok, false);
      assert.equal(error.error.type, 'api_error');
      assert.equal(error.error.code, 502);
      assert.match(error.error.message, /missing or invalid paymentMethodsVoList/u);
      assert.doesNotMatch(
        `${result.stdout}\n${result.stderr}`,
        new RegExp(`card-binding|${bindingSecret}|#fragment`, 'u'),
      );
      const storedConfig = JSON.parse(await readFile(configPath, 'utf8'));
      assert.deepEqual(storedConfig.paymentMethods, [
        { paymentInstrumentId: 'pi_cached_before_invalid_refresh' },
      ]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await rm(home, { recursive: true, force: true });
    }
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
  assert.match(crossMerchantHelp, /address_country is a discovery hint, not a strict filter/u);
  assert.match(crossMerchantHelp, /Published external-store mappings\s+currently cover HK and SG/u);
  assert.match(crossMerchantHelp, /other ISO codes may leave results un-narrowed/u);
  assert.match(crossMerchantHelp, /bounded, non-exhaustive result window and currently exposes no pagination/u);
  assert.doesNotMatch(crossMerchantHelp, /--cursor <cursor>|--limit <n>/u);
});

test('vendored CLI exposes the complete instruction status set', () => {
  const instructionListHelp = runBundle(['instruction', 'list', '--help']);
  assert.match(
    instructionListHelp,
    /CREATED, ACTIVE, PENDING, INPROGRESS, COMPLETED,\s+CANCELLED, EXPIRED, DECLINED/u,
  );
});

test('vendored CLI documents typed polling as a draining any-of filter', () => {
  const eventsHelp = runBundle(['events', 'poll', '--help']);
  assert.match(eventsHelp, /--type <type\[,type\.\.\.\]>/u);
  assert.match(eventsHelp, /comma-separated list waits for any listed type/u);
  assert.match(eventsHelp, /Unrelated records\s+are acknowledged and skipped/u);
  assert.match(eventsHelp, /With both --type and --no-ack[\s\S]*unrelated records are still\s+acknowledged/u);
  assert.match(eventsHelp, /Without --type[\s\S]*--no-ack acknowledges none/u);
  assert.doesNotMatch(eventsHelp, /unrelated events\s+stay on the queue|without acknowledging anything/iu);
  assert.match(bundleSource, /requestedTypes/u);
});

test('vendored CLI exposes the strict checkout event selector', () => {
  const eventsHelp = runBundle(['events', 'poll', '--help']);
  assert.match(eventsHelp, /--checkout-id <id>/u);
  assert.match(eventsHelp, /eventTypes plus selectors\.checkoutId to Event Hub before pagination/u);
  assert.match(bundleSource, /recordMatchesCheckoutId/u);
  assert.match(bundleSource, /data\?\.checkout_id/u);
  assert.match(bundleSource, /agentInstructionInfo", "ucpCheckoutId"/u);
  assert.match(bundleSource, /nextToken: checkoutNextToken/u);
  assert.match(bundleSource, /cursor-backed selector support is required/u);
  assert.match(bundleSource, /assertValidWatchTarget\(options2\)/u);
  assert.match(bundleSource, /assertValidCollectTarget\(options2\)/u);
  assert.doesNotMatch(bundleSource, /checkoutIds\.every\(\(candidate\) => candidate === expectedCheckoutId\)/u);
});

test('vendored instruction watches preserve unmatched same-type events', () => {
  const protectedInstructionWatches = bundleSource.match(
    /eventType: "purchase_instruction\.activated",[\s\S]{0,240}?ackUnmatchedEvents: false/gu,
  ) ?? [];
  assert.ok(
    protectedInstructionWatches.length >= 2,
    'instruction create and sign-url must both preserve unmatched activation events',
  );
});

test('vendored instruction matching fails closed across every identifier alias', async () => {
  const start = bundleSource.indexOf('// dist/events.js');
  const helperStart = bundleSource.indexOf('function resolvedTypedIdentifierAliases(', start);
  const helperEnd = bundleSource.indexOf('function isInstructionIdentifierKey(', helperStart);
  const matcherEnd = bundleSource.indexOf('var realSleep =', start);
  assert.notEqual(start, -1, 'events implementation marker missing from bundle');
  assert.notEqual(helperStart, -1, 'strict identifier resolver missing from bundle');
  assert.notEqual(helperEnd, -1, 'strict identifier resolver end marker missing from bundle');
  assert.notEqual(matcherEnd, -1, 'instruction matcher end marker missing from bundle');
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    `${bundleSource.slice(start, matcherEnd)}\n${bundleSource.slice(helperStart, helperEnd)}\nexport { eventMatchesInstruction };`,
  ).toString('base64')}`;
  const { eventMatchesInstruction } = await import(moduleUrl);
  const expectedInstructionId = 'ins_target';
  const base = {
    eventId: 'evt_instruction',
    eventType: 'purchase_instruction.activated',
    known: true,
    summary: 'activated',
  };

  assert.equal(eventMatchesInstruction({
    ...base,
    resourceId: expectedInstructionId,
    data: {
      instruction_id: expectedInstructionId,
      purchase_instruction_id: expectedInstructionId,
    },
  }, expectedInstructionId), true);

  for (const event of [
    { ...base, resourceId: 'ins_other', data: { instructionId: expectedInstructionId } },
    { ...base, data: { instructionId: expectedInstructionId, purchaseInstructionId: null } },
    { ...base, data: { instruction_id: expectedInstructionId, purchase_instruction_id: '   ' } },
    {
      ...base,
      data: { instructionId: expectedInstructionId, purchaseInstructionId: [expectedInstructionId] },
    },
  ]) {
    assert.equal(eventMatchesInstruction(event, expectedInstructionId), false);
  }
});

test('vendored events poll filters checkout success before ACK', async () => {
  const targetCheckoutId = 'checkout_target';
  const otherEvent = {
    eventId: 'evt_other_checkout',
    eventType: 'agent_order.succeeded',
    customerId: 'cus_checkout_filter',
    resourceId: 'payment_order_other',
    payload: JSON.stringify({
      data: { checkoutId: 'checkout_other', orderId: 'payment_order_other' },
    }),
  };
  const missingCheckoutEvent = {
    eventId: 'evt_missing_checkout',
    eventType: 'agent_order.succeeded',
    customerId: 'cus_checkout_filter',
    resourceId: targetCheckoutId,
    payload: JSON.stringify({ data: { orderId: 'payment_order_missing_checkout' } }),
  };
  const targetEvent = {
    eventId: 'evt_target_checkout',
    eventType: 'agent_order.succeeded',
    customerId: 'cus_checkout_filter',
    resourceId: 'payment_order_target',
    payload: JSON.stringify({
      data: { checkout_id: targetCheckoutId, orderId: 'payment_order_target' },
    }),
  };
  const malformedCheckoutEvents = [
    { checkoutId: targetCheckoutId, checkout_id: 'checkout_other' },
    { checkoutId: targetCheckoutId, checkout_id: null },
    { checkoutId: targetCheckoutId, checkout_id: '   ' },
    { checkoutId: targetCheckoutId, checkout_id: 123 },
    { checkoutId: targetCheckoutId, checkout_id: [targetCheckoutId] },
    { checkoutId: targetCheckoutId, checkout_id: { id: targetCheckoutId } },
  ].map((data, index) => ({
    eventId: `evt_malformed_checkout_${index}`,
    eventType: 'agent_order.succeeded',
    customerId: 'cus_checkout_filter',
    resourceId: `payment_order_malformed_${index}`,
    payload: JSON.stringify({ data }),
  }));
  const unrelatedTypeEvent = {
    eventId: 'evt_unrelated_type',
    eventType: 'payment_method.updated',
    customerId: 'cus_checkout_filter',
    resourceId: 'pi_unrelated',
    payload: JSON.stringify({ data: { paymentInstrumentId: 'pi_unrelated' } }),
  };
  const pollBodies = [];
  const ackBodies = [];
  const server = createServer(async (request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      pollBodies.push(await readRequestJson(request));
      response.end(JSON.stringify({
        code: 200,
        data: {
          records: [
            otherEvent,
            missingCheckoutEvent,
            ...malformedCheckoutEvents,
            targetEvent,
            unrelatedTypeEvent,
          ],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/ack') {
      const body = await readRequestJson(request);
      ackBodies.push(body);
      response.end(JSON.stringify({
        code: 200,
        data: { deletedCount: body.eventIds.length, notFoundEventIds: [] },
      }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-checkout-filter-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(join(configDirectory, 'config.json'), JSON.stringify({
      baseUrl,
      defaultOpenLinks: false,
      customerId: 'cus_checkout_filter',
      customerApiKey: 'csk_checkout_filter',
    }), { encoding: 'utf8', mode: 0o600 });

    const result = await runBundleAsync([
      'events', 'poll',
      '--type', 'agent_order.succeeded',
      '--checkout-id', targetCheckoutId,
      '--max-wait', '1',
      '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.ready, true);
    assert.deepEqual(output.data.events.map(({ eventId }) => eventId), ['evt_target_checkout']);
    assert.deepEqual(output.data.ackedEventIds, ['evt_target_checkout']);
    assert.deepEqual(ackBodies, [{
      eventIds: ['evt_target_checkout'],
    }]);
    assert.deepEqual(pollBodies, [{
      pageSize: 20,
      eventTypes: ['agent_order.succeeded'],
      selectors: { checkoutId: targetCheckoutId },
    }]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored checkout no-ack preserves every event while returning only the selected checkout', async () => {
  const targetCheckoutId = 'checkout_target_no_ack';
  const ackBodies = [];
  const server = createServer(async (request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      response.end(JSON.stringify({
        code: 200,
        data: {
          records: [
            {
              eventId: 'evt_other_checkout_no_ack',
              eventType: 'agent_order.succeeded',
              customerId: 'cus_checkout_filter_no_ack',
              resourceId: 'payment_order_other_no_ack',
              payload: JSON.stringify({
                data: { checkoutId: 'checkout_other_no_ack', orderId: 'payment_order_other_no_ack' },
              }),
            },
            {
              eventId: 'evt_target_checkout_no_ack',
              eventType: 'agent_order.succeeded',
              customerId: 'cus_checkout_filter_no_ack',
              resourceId: 'payment_order_target_no_ack',
              payload: JSON.stringify({
                data: { checkoutId: targetCheckoutId, orderId: 'payment_order_target_no_ack' },
              }),
            },
            {
              eventId: 'evt_unrelated_type_no_ack',
              eventType: 'payment_method.updated',
              customerId: 'cus_checkout_filter_no_ack',
              resourceId: 'pi_unrelated_no_ack',
              payload: JSON.stringify({ data: { paymentInstrumentId: 'pi_unrelated_no_ack' } }),
            },
          ],
        },
      }));
      return;
    }
    if (request.url === '/agent/event-hub/webhook-events/ack') {
      const body = await readRequestJson(request);
      ackBodies.push(body);
      response.end(JSON.stringify({
        code: 200,
        data: { deletedCount: body.eventIds.length, notFoundEventIds: [] },
      }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-checkout-filter-no-ack-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(join(configDirectory, 'config.json'), JSON.stringify({
      baseUrl,
      defaultOpenLinks: false,
      customerId: 'cus_checkout_filter_no_ack',
      customerApiKey: 'csk_checkout_filter_no_ack',
    }), { encoding: 'utf8', mode: 0o600 });

    const result = await runBundleAsync([
      'events', 'poll',
      '--type', 'agent_order.succeeded',
      '--checkout-id', targetCheckoutId,
      '--no-ack',
      '--max-wait', '1',
      '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.ready, true);
    assert.deepEqual(output.data.events.map(({ eventId }) => eventId), [
      'evt_target_checkout_no_ack',
    ]);
    assert.deepEqual(output.data.ackedEventIds, []);
    assert.deepEqual(ackBodies, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored checkout event poll preserves checkout id in timeout resume command', async () => {
  const pollBodies = [];
  const server = createServer(async (request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    if (request.url === '/agent/event-hub/webhook-events/poll') {
      pollBodies.push(await readRequestJson(request));
      response.end(JSON.stringify({ code: 200, data: { records: [] } }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found' }));
  });
  const address = await listen(server);
  const home = await mkdtemp(join(tmpdir(), 'clink-checkout-timeout-'));

  try {
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const configDirectory = join(home, '.clink-cli');
    await mkdir(configDirectory, { recursive: true });
    await writeFile(join(configDirectory, 'config.json'), JSON.stringify({
      baseUrl,
      defaultOpenLinks: false,
      customerId: 'cus_checkout_timeout',
      customerApiKey: 'csk_checkout_timeout',
    }), { encoding: 'utf8', mode: 0o600 });

    const result = await runBundleAsync([
      'events', 'poll',
      '--type', 'agent_order.succeeded',
      '--checkout-id', 'checkout_timeout',
      '--max-wait', '1',
      '--format', 'json',
    ], {
      HOME: home,
      CLINK_BASE_URL: baseUrl,
      CLINK_CUSTOMER_ID: undefined,
      CLINK_CUSTOMER_API_KEY: undefined,
    });

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.timedOut, true);
    assert.match(output.data.resumeCommand, /--checkout-id checkout_timeout/u);
    assert.ok(pollBodies.length >= 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored events poll rejects checkout id without one supported event type', async () => {
  const home = await mkdtemp(join(tmpdir(), 'clink-checkout-validation-'));
  try {
    for (const args of [
      ['--checkout-id', 'checkout_invalid'],
      ['--checkout-id', '   '],
      ['--type', 'payment_method.added', '--checkout-id', 'checkout_invalid'],
      ['--type', 'agent_order.succeeded,agent_order.failed', '--checkout-id', 'checkout_invalid'],
    ]) {
      const result = runBundleRaw(
        ['events', 'poll', ...args, '--format', 'json'],
        { HOME: home },
      );
      assert.equal(result.status, 2, result.stderr);
      assert.match(result.stderr, /(?:invalid --checkout-id|--checkout-id requires)/u);
      assert.doesNotMatch(result.stderr, /Login required/u);
    }
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test('vendored CLI metadata tracks the main edition and production contracts', () => {
  assert.equal(vendorPackage.version, '0.2.18');
  assert.equal(vendorPackage.edition, 'main');
  assert.equal(
    vendorPackage.upstreamCommit,
    'c66961a77be86759e1f5116edf46c955b6160147',
  );
  assert.equal('backportCommits' in vendorPackage, false);
  assert.equal('bundleSha256' in vendorPackage, false);
  assert.equal('upstreamDirty' in vendorPackage, false);
  assert.equal('upstreamPatch' in vendorPackage, false);
  assert.match(
    bundleSource,
    /if \(!sameFingerprint\(currentFingerprint, placedFingerprint\)\)/u,
  );
  assert.match(bundleSource, /if \(parentCreated && removedPlacedTarget\)/u);
  assert.match(bundleSource, /\/agent\/cwallet\/oauth\/browser-handoffs/u);
  assert.match(
    bundleSource,
    /completeUrl = parseCompleteUrl\(requiredString\(data\.complete_url\), portalOrigin, handoffId\)/u,
  );
  assert.match(bundleSource, /decodeURIComponent\(lastSegment\) !== handoffId/u);
  assert.match(bundleSource, /urn:ietf:params:oauth:grant-type:device_code/u);
  assert.match(bundleSource, /\/agent\/cwallet\/oauth\/device\/authorization/u);
  assert.match(bundleSource, /requestJsonWithOAuthRetry/u);
  assert.match(bundleSource, /Authentication changed while the command was in progress/u);
  assert.match(bundleSource, /Wallet login changed while webhook events were in progress/u);
  assert.match(bundleSource, /Webhook event customer does not match the authenticated wallet/u);
  assert.match(bundleSource, /staleEventCutoffMs/u);
  assert.match(bundleSource, /eventTimePrecisionMs/u);
  assert.match(bundleSource, /customer-api-key cannot be set in local config/u);
  assert.match(bundleSource, /A newer wallet init started/u);
  assert.match(bundleSource, /Starting wallet login/u);
  assert.match(bundleSource, /watchReady/u);
  assert.match(bundleSource, /eventType: "payment_method\.added"/u);
  assert.doesNotMatch(bundleSource, /CLINK_CONFIG_DIR/u);
  assert.doesNotMatch(bundleSource, /\/agent\/cwallet\/customer\/bootstrap/u);
});

test('vendored CLI embeds the .dev test API, agent, and dashboard domains', () => {
  assert.match(bundleSource, /https:\/\/api\.clinkbill\.dev/u);
  assert.match(bundleSource, /https:\/\/agent\.clinkbill\.dev/u);
  assert.match(bundleSource, /https:\/\/dashboard\.clinkbill\.dev/u);
  assert.doesNotMatch(runBundle(['skills', 'list', '--help']), /--sandbox|--test|--base-url/u);
});

test('vendored instruction sign-url exposes correlation identifiers and carries configured email', async () => {
  const home = await mkdtemp(join(tmpdir(), 'clink-instruction-sign-url-'));
  try {
    const configDir = join(home, '.clink-cli');
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, 'config.json'), JSON.stringify({
      baseUrl: 'https://uat-api.clinkbill.com',
      defaultOpenLinks: false,
      email: 'buyer@example.com',
    }));
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
    assert.equal(
      result.data.url,
      'https://uat-agent.clinkbill.com/passkey-auth/pi_contract?type=visa&instructionId=ins_contract&email=buyer%40example.com',
    );
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

  const walletName = runBundleRaw([
    'wallet', 'init',
    '--email', 'wallet@example.com',
    '--name', 'Wallet User',
    '--format', 'json',
  ]);
  assert.equal(walletName.status, 2);
  assert.match(walletName.stderr, /--name is no longer used by wallet init/u);
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

const hasAggregateUcpCheckoutRun = bundleSource.includes('clink ucp-checkout run')
  && bundleSource.includes('--confirm-purchase')
  && bundleSource.includes('--wait-delivery');

test('vendored CLI aggregate UCP checkout contract after official upstream sync', {
  skip: hasAggregateUcpCheckoutRun
    ? false
    : 'awaiting official clink-cli bundle sync; source/FSM/docs tests remain authoritative',
}, () => {
  const result = runBundleRaw(['ucp-checkout', 'run', '--help']);
  assert.equal(result.status, 0, result.stderr);
  for (const contract of [
    /ucp-checkout run/u,
    /--endpoint/u,
    /--merchant-url/u,
    /--merchant-category-code/u,
    /--currency/u,
    /--line-items/u,
    /--payment-instrument-id/u,
    /--confirm-purchase/u,
    /--wait-delivery/u,
    /--max-wait/u,
  ]) {
    assert.match(result.stdout, contract);
  }
});
