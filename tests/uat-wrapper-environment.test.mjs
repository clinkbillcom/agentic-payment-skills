import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const wrapper = join(root, 'bin', 'visa-cli');
const windowsWrapper = join(root, 'bin', 'visa-cli.cmd');
const expectedUrl =
  'https://uat-api.clinkbill.com/agent/cwallet/oauth/device/authorization';

test('UAT launchers pin wallet initialization to sandbox', async () => {
  assert.match(
    await readFile(wrapper, 'utf8'),
    /CLINK_WALLET_INIT_ENVIRONMENT=sandbox/u,
  );
  assert.match(
    await readFile(windowsWrapper, 'utf8'),
    /CLINK_WALLET_INIT_ENVIRONMENT=sandbox/u,
  );
});

test('UAT launcher ignores a production API environment override', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'visa-skill-uat-wrapper-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const result = spawnSync(wrapper, [
    'wallet',
    'init',
    '--email',
    'user@example.com',
    '--dry-run',
    '--format',
    'json',
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      CLINK_BASE_URL: 'https://api.clinkbill.com',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.request.url, expectedUrl);
});

test('UAT launcher accepts sandbox and rejects test', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'visa-skill-uat-flags-'));
  context.after(() => rm(home, { recursive: true, force: true }));

  const sandbox = spawnSync(wrapper, [
    'wallet',
    'init',
    '--sandbox',
    '--email',
    'user@example.com',
    '--dry-run',
    '--format',
    'json',
  ], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });
  assert.equal(sandbox.status, 0, sandbox.stderr);
  assert.equal(JSON.parse(sandbox.stdout).data.request.url, expectedUrl);

  const conflicting = spawnSync(wrapper, [
    'wallet',
    'init',
    '--test',
    '--email',
    'user@example.com',
    '--dry-run',
    '--format',
    'json',
  ], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });
  assert.equal(conflicting.status, 2);
  assert.match(
    conflicting.stderr,
    /wallet init environment is fixed to sandbox/u,
  );
});
