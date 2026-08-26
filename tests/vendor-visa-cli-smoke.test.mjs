import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = join(root, 'bin', 'visa-cli');
const windowsCli = join(root, 'bin', 'visa-cli.cmd');
const vendorPackage = JSON.parse(
  await readFile(join(root, 'vendor', 'visa-cli', 'package.json'), 'utf8'),
);
const vendorBundle = await readFile(
  join(root, 'vendor', 'visa-cli', 'visa-cli.bundle.mjs'),
);

function run(args) {
  return spawnSync(cli, args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: join(root, '.test-home-does-not-exist'),
    },
  });
}

test('launchers and Visa Edition provenance are exact', async () => {
  assert.ok(((await stat(cli)).mode & 0o111) !== 0);
  assert.match(await readFile(cli, 'utf8'), /vendor\/visa-cli\/visa-cli\.bundle\.mjs/u);
  assert.match(
    await readFile(windowsCli, 'utf8'),
    /vendor\\visa-cli\\visa-cli\.bundle\.mjs/u,
  );
  assert.equal(vendorPackage.name, 'visa-cli-vendored');
  assert.equal(vendorPackage.version, '0.2.30');
  assert.equal(vendorPackage.edition, 'visa');
  assert.equal(
    vendorPackage.upstreamCommit,
    '8dc6eacb13936885c892763aceaabe0eeb78007f',
  );
  assert.deepEqual(vendorPackage.bin, {
    'visa-cli': 'visa-cli.bundle.mjs',
  });
  assert.equal(
    createHash('sha256').update(vendorBundle).digest('hex'),
    vendorPackage.bundleSha256,
  );
});

test('Visa Edition exposes all fourteen Base Commands', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0, result.stderr);

  const baseCommands = [
    'wallet',
    'card',
    'risk',
    'skills',
    'pay',
    'refund',
    'ucp-checkout',
    'ucp-catalog',
    'catalog',
    'ucp-order',
    'instruction',
    'events',
    'tool',
    'config',
  ];

  for (const command of baseCommands) {
    assert.match(result.stdout, new RegExp(`^  ${command}\\s`, 'mu'));
    const help = run([command, '--help']);
    assert.equal(help.status, 0, `${command}: ${help.stderr}`);
  }
});

test('Visa discovery and the three aggregate commands remain available', () => {
  for (const command of [
    'recommend',
    'detail',
    'taxonomy',
    'product-search',
    'commerce-login',
    'commerce-run',
  ]) {
    const result = run(['visa', command, '--help']);
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      new RegExp(`visa ${command}`, 'u'),
    );
  }
});

test('public Skill listing requires the real --all contract', () => {
  const help = run(['skills', 'list', '--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /skills list --all/u);
  assert.match(help.stdout, /--tippable/u);

  const missingAll = run(['skills', 'list', '--format', 'json']);
  assert.equal(missingAll.status, 2, missingAll.stderr);
  assert.match(missingAll.stderr, /skills list requires --all/u);
});

test('aggregate commands support side-effect-free planning', () => {
  const productSearch = run([
    'visa',
    'product-search',
    '--merchant-url',
    'https://merchant.example/products',
    '--query',
    'Example product',
    '--language',
    'en',
    '--limit',
    '1',
    '--sandbox',
    '--dry-run',
    '--format',
    'json',
  ]);
  assert.equal(productSearch.status, 0, productSearch.stderr);
  const productSearchPlan = JSON.parse(productSearch.stdout).data;
  assert.equal(productSearchPlan.status, 'dry_run');
  assert.equal(productSearchPlan.sideEffects, false);

  const instructionContext = {
    title: 'Example product',
    mandates: [{
      title: 'Example product',
      description: 'Purchase the selected Visa Program',
      amountLimit: 1,
      currencyCode: 'USD',
      merchantCategoryCode: '5999',
    }],
  };
  const commerceLogin = run([
    'visa',
    'commerce-login',
    '--context',
    JSON.stringify({
      environment: 'uat',
      instructionContext,
    }),
    '--confirm-purchase',
    '--open',
    '--dry-run',
    '--format',
    'json',
  ]);
  assert.equal(commerceLogin.status, 0, commerceLogin.stderr);
  const commerceLoginPlan = JSON.parse(commerceLogin.stdout).data;
  assert.equal(commerceLoginPlan.status, 'dry_run');
  assert.equal(commerceLoginPlan.sideEffects, false);

  const commerceRun = run([
    'visa',
    'commerce-run',
    '--context',
    JSON.stringify({
      mode: 'prepare',
      target: 'login',
      environment: 'uat',
      requestText: 'Log in to Visa Benefit',
    }),
    '--open',
    '--dry-run',
    '--format',
    'json',
  ]);
  assert.equal(commerceRun.status, 0, commerceRun.stderr);
  assert.equal(JSON.parse(commerceRun.stdout).data.dryRun, true);
});
