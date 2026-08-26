import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wrapper = new URL('../bin/clink', import.meta.url).pathname;
const expectedUrl = 'https://uat-api.clinkbill.com/agent/cwallet/oauth/device/authorization';

test('wrapper pins wallet init to sandbox regardless of option ordering', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'clink-payment-wrapper-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const cases = [
    ['wallet', 'init', '--email', 'user@example.com', '--dry-run', '--format', 'json'],
    ['--format', 'json', 'wallet', 'init', '--email', 'user@example.com', '--dry-run'],
    ['wallet', '--dry-run', 'init', '--email', 'user@example.com', '--format', 'json'],
  ];

  for (const args of cases) {
    const result = spawnSync(wrapper, args, {
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        CLINK_BASE_URL: 'https://api.clinkbill.com',
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.request.url, expectedUrl);
  }
});

test('wrapper accepts an explicit matching --sandbox wallet environment', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'clink-payment-wrapper-sandbox-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const result = spawnSync(wrapper, [
    'wallet', 'init', '--sandbox', '--email', 'user@example.com',
    '--dry-run', '--format', 'json',
  ], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.request.url, expectedUrl);
});

test('wrapper rejects a conflicting --test wallet environment', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'clink-payment-wrapper-conflict-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const result = spawnSync(wrapper, [
    'wallet', 'init', '--test', '--email', 'user@example.com',
    '--dry-run', '--format', 'json',
  ], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /wallet init environment is fixed to sandbox/u);
});

test('wrapper pins public Catalog commands to sandbox', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'clink-payment-wrapper-catalog-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const result = spawnSync(wrapper, [
    'ucp-catalog', 'search', '--merchant-id', 'merchant_1', '--query', 'watch',
    '--dry-run', '--format', 'json',
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      CLINK_BASE_URL: 'https://api.clinkbill.com',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(result.stdout).data.request.url,
    'https://uat-api.clinkbill.com/agent/ucp/merchant_1/catalog/search',
  );
});

test('wrapper rejects a conflicting --test Catalog environment', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'clink-payment-wrapper-catalog-conflict-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const result = spawnSync(wrapper, [
    'catalog', 'search', '--query', 'watch', '--test', '--dry-run', '--format', 'json',
  ], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /--sandbox and --test cannot be used together/u);
});

test('wallet init rejects --name and derives the name from the email', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'clink-payment-wrapper-name-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const result = spawnSync(wrapper, [
    'wallet',
    'init',
    '--email',
    'user@example.com',
    '--name',
    'Alice',
    '--dry-run',
    '--format',
    'json',
  ], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /--name is no longer used by wallet init/u);
});

test('wrapper accepts zero arguments', () => {
  const result = spawnSync(wrapper, [], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Clink customer wallet CLI/u);
});
