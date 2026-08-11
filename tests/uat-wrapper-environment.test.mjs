import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wrapper = new URL('../bin/clink', import.meta.url).pathname;
const expectedUrl = 'https://api.clinkbill.com/agent/cwallet/oauth/device/authorization';

test('wrapper pins wallet init to production regardless of option ordering', async (context) => {
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
        // The distribution pin outranks CLINK_BASE_URL, so a stray override cannot
        // silently move wallet init off production.
        CLINK_BASE_URL: 'https://uat-api.clinkbill.com',
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.request.url, expectedUrl);
  }
});

for (const flag of ['--sandbox', '--test']) {
  test(`wrapper rejects a conflicting ${flag} wallet environment`, async (context) => {
    const home = await mkdtemp(join(tmpdir(), 'clink-payment-wrapper-conflict-'));
    context.after(() => rm(home, { recursive: true, force: true }));
    const result = spawnSync(wrapper, [
      'wallet',
      'init',
      flag,
      '--email',
      'user@example.com',
      '--dry-run',
      '--format',
      'json',
    ], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home },
    });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /wallet init environment is fixed to production/u);
  });
}

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

test('TRAE wrapper isolates wallet config in a sandbox-writable directory', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'clink-payment-trae-wrapper-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const env = {
    ...process.env,
    HOME: home,
    TRAE_SANDBOX_SBOX_ID: 'test-sandbox',
  };

  const setResult = spawnSync(wrapper, ['config', 'set', 'name', 'trae-probe', '--format', 'json'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(setResult.status, 0, setResult.stderr);

  const configDir = join(home, '.local', 'share', 'clink-cli', 'trae-work-cn');
  const configPath = join(configDir, 'config.json');
  assert.equal((await stat(configDir)).mode & 0o777, 0o700);
  assert.equal((await stat(configPath)).mode & 0o777, 0o600);

  const statusResult = spawnSync(wrapper, ['wallet', 'status', '--format', 'json'], {
    encoding: 'utf8',
    env,
  });
  assert.equal(statusResult.status, 0, statusResult.stderr);
  assert.equal(JSON.parse(statusResult.stdout).data.configPath, configPath);
});

test('wrapper accepts zero arguments', () => {
  const result = spawnSync(wrapper, [], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Clink customer wallet CLI/u);
});
