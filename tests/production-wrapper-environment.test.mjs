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

test('production independent commands accept production inputs without network or browser actions', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'visa-production-independent-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  const purchase = [
    '--mode', 'selected_product', '--environment', 'production',
    '--request-text', 'Buy this fixture voucher', '--merchant-id', 'merchant_fixture',
    '--endpoint', 'https://api.clinkbill.com/agent/ucp/merchant_fixture',
    '--merchant-url', 'https://merchant.example/', '--merchant-name', 'Fixture merchant',
    '--product-id', 'fixture_sku', '--title', 'Fixture voucher',
    '--amount', '1', '--currency', 'USD', '--quantity', '1',
    '--availability', 'in_stock', '--digital-delivery-expected', 'true',
    '--payment-instrument-id', 'pi_fixture', '--selection-source', 'default',
  ];
  for (const args of [
    ['visa', 'login', '--environment', 'production'],
    ['visa', 'payment-method', 'resolve', '--environment', 'production'],
    ['visa', 'instruction', 'candidates', ...purchase],
    ['visa', 'instruction', 'create', ...purchase],
    ['visa', 'instruction', 'get', ...purchase, '--instruction-id', 'inst_fixture'],
    ['visa', 'checkout', ...purchase, '--purchase-instruction-id', 'inst_fixture', '--mandate-id', 'mandate_fixture'],
  ]) {
    const result = spawnSync(wrapper, [...args, '--dry-run', '--format', 'json'], {
      encoding: 'utf8', env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 0, `${args.slice(0, 3).join(' ')}: ${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).data.status, 'dry_run');
    assert.doesNotMatch(result.stdout, /https:\/\/uat-(?:api|agent)\.clinkbill\.com/u);
  }
});

test('production independent login and card commands reject a conflicting purchase environment', async (context) => {
  const home = await mkdtemp(join(tmpdir(), 'visa-production-independent-lock-'));
  context.after(() => rm(home, { recursive: true, force: true }));
  for (const command of [['visa', 'login'], ['visa', 'payment-method', 'resolve']]) {
    const result = spawnSync(wrapper, [...command, '--environment', 'sandbox', '--dry-run', '--format', 'json'], {
      encoding: 'utf8', env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /production/u);
  }
});

test('production Skill instructions and command references agree on environment', async () => {
  for (const file of [
    'SKILL.md', 'agents/openai.yaml', 'references/visa-login.md',
    'references/visa-payment-method.md', 'references/visa-instruction.md',
    'references/visa-checkout.md',
  ]) {
    const text = await readFile(join(root, file), 'utf8');
    assert.match(text, /--environment production/u, file);
    assert.doesNotMatch(text, /--environment sandbox|this UAT distribution/u, file);
  }
});
