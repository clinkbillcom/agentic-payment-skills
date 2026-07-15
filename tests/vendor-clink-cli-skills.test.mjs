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

const testEnv = {
  ...process.env,
  CLINK_BASE_URL: 'https://uat-api.clinkbill.com',
  CLINK_CUSTOMER_ID: 'cust_bundle_contract',
  CLINK_CUSTOMER_API_KEY: 'test_bundle_contract_key',
};

function runBundle(args) {
  const result = spawnSync(process.execPath, [bundlePath, ...args], {
    encoding: 'utf8',
    env: testEnv,
  });
  assert.equal(
    result.status,
    0,
    `bundle command failed: ${args.join(' ')}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  return result.stdout;
}

function runBundleJson(args) {
  return JSON.parse(runBundle(args));
}

test('vendored CLI discovers skills list and tip commands', () => {
  assert.match(runBundle(['--help']), /skills\s+Discover, install, and tip skills/u);
  assert.match(runBundle(['skills', '--help']), /skills <list\|install\|tip>/u);
  assert.match(runBundle(['skills', 'list', '--help']), /skills list --all/u);
  assert.match(runBundle(['skills', 'tip', '--help']), /--publisher <publisher>/u);
  assert.match(runBundle(['skills', 'tip', '--help']), /--number <number>/u);
});

test('vendored CLI metadata tracks the latest upstream package version', () => {
  assert.equal(vendorPackage.version, '0.1.4');
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

test('vendored CLI identity tip dry-run is side-effect free and normalized', () => {
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

test('vendored CLI Number tip dry-run is side-effect free and normalized', () => {
  const result = runBundleJson([
    'skills', 'tip',
    '--number', '2',
    '--amount', '2',
    '--dry-run',
    '--format', 'json',
  ]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    status: 'planned',
    number: 2,
    amount: 2,
    currency: 'USD',
    dryRun: true,
  });
});
