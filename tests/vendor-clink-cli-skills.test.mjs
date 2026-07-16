import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
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

test('vendored CLI discovers skills list and tip commands', () => {
  assert.match(runBundle(['--help']), /skills\s+Discover, install, and tip skills/u);
  assert.match(runBundle(['skills', '--help']), /skills <list\|install\|tip>/u);
  assert.match(runBundle(['skills', 'list', '--help']), /skills list --all/u);
  assert.match(runBundle(['skills', 'list', '--help']), /--tippable/u);
  const tipHelp = runBundle(['skills', 'tip', '--help']);
  assert.match(tipHelp, /--publisher <publisher>/u);
  assert.match(tipHelp, /\[--version <versionNo>\]/u);
  assert.doesNotMatch(tipHelp, /--number|--expected-skill-id/u);
});

test('vendored CLI metadata tracks the latest upstream package version', () => {
  assert.equal(vendorPackage.version, '0.1.5');
});

test('vendored CLI embeds the .dev sandbox API, agent, and dashboard domains', () => {
  assert.match(bundleSource, /https:\/\/api\.clinkbill\.dev/u);
  assert.match(bundleSource, /https:\/\/agent\.clinkbill\.dev/u);
  assert.match(bundleSource, /https:\/\/dashboard\.clinkbill\.dev/u);
  assert.match(runBundle(['skills', 'list', '--help']), /https:\/\/dashboard\.clinkbill\.dev/u);
});

test('vendored instruction sign-url exposes identifiers for correlated activation watches', () => {
  const result = runBundleJson([
    'instruction', 'sign-url',
    '--payment-instrument-id', 'pi_contract',
    '--purchase-instruction-id', 'ins_contract',
    '--no-watch',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.data.instructionId, 'ins_contract');
  assert.equal(result.data.paymentInstrumentId, 'pi_contract');
});

test('vendored CLI versioned identity tip dry-run is side-effect free and normalized', () => {
  const result = runBundleJson([
    'skills', 'tip',
    '--publisher', 'clinkpay',
    '--name', 'pollyreach',
    '--version', 'v1.2.3',
    '--amount', '2',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    status: 'planned',
    publisher: 'clinkpay',
    skillName: 'pollyreach',
    versionNo: 'v1.2.3',
    amount: 2,
    currency: 'USD',
    dryRun: true,
  });
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
