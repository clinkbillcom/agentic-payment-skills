import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  classifyTransportError,
  parseTarget,
  runNetworkPreflight,
} from '../scripts/network-preflight.mjs';

function runCli(arguments_, environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL('../scripts/network-preflight.mjs', import.meta.url)), ...arguments_],
      {
        cwd: tmpdir(),
        env: { ...process.env, ...environment },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test('sandbox-disabled environment is only a hint and never skips the actual probe', async () => {
  let fetchCalls = 0;
  const result = await runNetworkPreflight('https://api.clinkbill.com/private?token=secret', {
    environment: { CODEX_SANDBOX_NETWORK_DISABLED: '1' },
    fetchImpl: async () => {
      fetchCalls += 1;
      return { status: 204 };
    },
  });

  assert.equal(fetchCalls, 1);
  assert.deepEqual(result, {
    ok: true,
    kind: 'HTTP_REACHABLE',
    host: 'api.clinkbill.com',
    origin: 'https://api.clinkbill.com',
    httpStatus: 204,
  });
});

test('failed probe retains the sandbox hint without claiming it caused the failure', async () => {
  const cause = Object.assign(new Error('connection refused'), {
    code: 'ECONNREFUSED',
    syscall: 'connect',
    hostname: 'api.clinkbill.com',
  });
  const result = await runNetworkPreflight('https://api.clinkbill.com/private?token=secret', {
    environment: { CODEX_SANDBOX_NETWORK_DISABLED: '1' },
    fetchImpl: async () => { throw new TypeError('fetch failed', { cause }); },
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'CONNECT',
    host: 'api.clinkbill.com',
    origin: 'https://api.clinkbill.com',
    cause: {
      name: 'Error',
      code: 'ECONNREFUSED',
      message: 'connection refused',
      syscall: 'connect',
      hostname: 'api.clinkbill.com',
    },
    sandboxNetworkDisabledHint: true,
    suggestedConfig: 'sandbox_workspace_write.network_access=true',
  });
});

test('every HTTP response proves reachability and the request is side-effect free', async () => {
  for (const status of [401, 404, 405, 500]) {
    let observed;
    const result = await runNetworkPreflight('https://merchant.example/path?signature=secret#fragment', {
      environment: {},
      fetchImpl: async (url, init) => {
        observed = { url, init };
        return { status };
      },
    });

    assert.deepEqual(result, {
      ok: true,
      kind: 'HTTP_REACHABLE',
      host: 'merchant.example',
      origin: 'https://merchant.example',
      httpStatus: status,
    });
    assert.equal(observed.url, 'https://merchant.example');
    assert.equal(observed.init.method, 'HEAD');
    assert.equal(observed.init.redirect, 'manual');
    assert.equal(observed.init.body, undefined);
    assert.equal(observed.init.headers, undefined);
  }
});

test('preflight identity preserves the HTTPS port for origin-scoped caching', async () => {
  const observedUrls = [];
  const fetchImpl = async (url) => {
    observedUrls.push(url);
    return { status: 404 };
  };
  const defaultPort = await runNetworkPreflight('https://merchant.example/path', {
    environment: {},
    fetchImpl,
  });
  const customPort = await runNetworkPreflight('https://merchant.example:8443/path', {
    environment: {},
    fetchImpl,
  });

  assert.equal(defaultPort.origin, 'https://merchant.example');
  assert.equal(customPort.origin, 'https://merchant.example:8443');
  assert.notEqual(defaultPort.origin, customPort.origin);
  assert.deepEqual(observedUrls, ['https://merchant.example', 'https://merchant.example:8443']);
});

test('nested DNS, timeout, connection, and TLS causes are retained and classified', () => {
  const cases = [
    ['ENOTFOUND', 'DNS'],
    ['EAI_AGAIN', 'DNS'],
    ['ETIMEDOUT', 'TIMEOUT'],
    ['ECONNREFUSED', 'CONNECT'],
    ['CERT_HAS_EXPIRED', 'TLS'],
    ['DEPTH_ZERO_SELF_SIGNED_CERT', 'TLS'],
    ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'TLS'],
  ];

  for (const [code, expectedKind] of cases) {
    const nested = Object.assign(new Error('sanitized transport failure'), {
      code,
      syscall: 'connect',
      hostname: 'merchant.example',
    });
    const top = new TypeError('fetch failed', { cause: nested });
    const result = classifyTransportError(top);

    assert.equal(result.kind, expectedKind);
    assert.equal(result.cause.code, code);
    assert.equal(result.cause.syscall, 'connect');
    assert.equal(result.cause.hostname, 'merchant.example');
  }
});

test('preflight failure never emits a path, query, fragment, or credential', async () => {
  const nested = Object.assign(new Error('GET https://user:pass@merchant.example/private?token=secret failed'), {
    code: 'ENOTFOUND',
    hostname: 'merchant.example',
  });
  const result = await runNetworkPreflight('https://merchant.example/private?signature=secret#fragment', {
    environment: {},
    fetchImpl: async () => { throw new TypeError('fetch failed', { cause: nested }); },
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.kind, 'DNS');
  assert.doesNotMatch(serialized, /private|signature|secret|user|pass/u);
});

test('target validation accepts dynamic HTTPS origins and rejects unsafe targets without fetch', async () => {
  assert.equal(parseTarget('https://s3.us-west-2.amazonaws.com/signed?x=1').origin, 'https://s3.us-west-2.amazonaws.com');
  assert.equal(parseTarget('https://dynamic-merchant.example/path').host, 'dynamic-merchant.example');
  assert.throws(() => parseTarget('http://api.clinkbill.com'), /HTTPS/u);
  assert.throws(() => parseTarget('https://user:pass@api.clinkbill.com'), /credentials/u);

  let fetchCalls = 0;
  const result = await runNetworkPreflight('http://api.clinkbill.com', {
    environment: {},
    fetchImpl: async () => { fetchCalls += 1; },
  });
  assert.equal(fetchCalls, 0);
  assert.equal(result.kind, 'INVALID_TARGET');
});

test('programmatic timeout validation fails before fetch', async () => {
  for (const timeoutMs of [0, 99, 100.5, 60_001, Number.NaN]) {
    let fetchCalls = 0;
    const result = await runNetworkPreflight('https://api.clinkbill.com', {
      environment: {},
      timeoutMs,
      fetchImpl: async () => { fetchCalls += 1; },
    });
    assert.equal(fetchCalls, 0);
    assert.equal(result.kind, 'INVALID_TIMEOUT');
  }
});

test('CLI runs by absolute path outside the Skill cwd and sanitizes invalid targets', async () => {
  const result = await runCli(
    ['http://api.clinkbill.com/private?token=secret'],
    { CODEX_SANDBOX_NETWORK_DISABLED: '1' },
  );

  assert.equal(result.code, 1);
  assert.equal(result.signal, null);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim().split('\n').length, 1);
  const envelope = JSON.parse(result.stderr);
  assert.equal(envelope.kind, 'INVALID_TARGET');
  assert.doesNotMatch(result.stderr, /private|token|secret/u);
});

test('abort is classified as a timeout and the injected request observes cancellation', async () => {
  let signal;
  const preflight = runNetworkPreflight('https://merchant.example', {
    environment: {},
    timeoutMs: 100,
    fetchImpl: async (_url, init) => {
      signal = init.signal;
      await once(signal, 'abort');
      throw Object.assign(new Error('request aborted'), { name: 'AbortError' });
    },
  });

  const result = await preflight;
  assert.equal(signal.aborted, true);
  assert.equal(result.kind, 'TIMEOUT');
  assert.equal(result.cause.code, 'ETIMEDOUT');
});

test('the deepest cause matching the classification is preserved', () => {
  const dnsCause = Object.assign(new Error('getaddrinfo ENOTFOUND merchant.example'), {
    code: 'ENOTFOUND',
    syscall: 'getaddrinfo',
    hostname: 'merchant.example',
  });
  const wrapperCause = Object.assign(new Error('connect failed', { cause: dnsCause }), {
    code: 'ERR_NETWORK',
  });
  const result = classifyTransportError(new TypeError('fetch failed', { cause: wrapperCause }));

  assert.equal(result.kind, 'DNS');
  assert.equal(result.cause.code, 'ENOTFOUND');
  assert.equal(result.cause.syscall, 'getaddrinfo');
});
