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
  'https://api.clinkbill.com/agent/cwallet/oauth/device/authorization';

test('production launchers pin the distribution to production', async () => {
  assert.match(
    await readFile(wrapper, 'utf8'),
    /CLINK_WALLET_INIT_ENVIRONMENT=production/u,
  );
  assert.match(
    await readFile(windowsWrapper, 'utf8'),
    /CLINK_WALLET_INIT_ENVIRONMENT=production/u,
  );
});

test('production launcher ignores a sandbox API override', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'visa-skill-production-wrapper-'));
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
      CLINK_BASE_URL: 'https://uat-api.clinkbill.com',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.request.url, expectedUrl);
});

test('production launcher plans Catalog access against the production API', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'visa-skill-production-catalog-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const result = spawnSync(wrapper, [
    'visa',
    'product-search',
    '--merchant-url',
    'https://merchant.example/products',
    '--query',
    'Example product',
    '--language',
    'en',
    '--dry-run',
    '--format',
    'json',
  ], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(result.stdout).data.apiBaseUrl,
    'https://api.clinkbill.com',
  );
});

test('production launcher rejects sandbox and test flags', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'visa-skill-production-flags-'));
  context.after(() => rm(home, { recursive: true, force: true }));

  for (const flag of ['--sandbox', '--test']) {
    const conflicting = spawnSync(wrapper, [
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
    assert.equal(conflicting.status, 2);
    assert.match(
      conflicting.stderr,
      /wallet init environment is fixed to production/u,
    );
  }
});
