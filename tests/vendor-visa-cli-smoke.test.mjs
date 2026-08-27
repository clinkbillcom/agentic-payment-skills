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
  assert.equal(vendorPackage.version, '0.2.32');
  assert.equal(vendorPackage.edition, 'visa');
  assert.equal(
    vendorPackage.upstreamCommit,
    '625eb133f946ade532a10f282e5005f4a92f9c5f',
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

test('public Fuhui discovery supports authoritative merchant lookup and cursor pagination', () => {
  const merchantList = run([
    'tool',
    'internal-ucp',
    'get-merchant-list',
    '--sandbox',
    '--format',
    'json',
  ]);
  assert.equal(merchantList.status, 0, merchantList.stderr);
  const merchantDocument = JSON.parse(merchantList.stdout);
  const fuhui = merchantDocument.merchants.filter((merchant) =>
    merchant.enabled === true && /Fuhui/iu.test(merchant.description ?? '')
  );
  assert.ok(fuhui.length >= 1);
  for (const merchant of fuhui) {
    assert.match(merchant.merchant_id, /^mcht_[a-z0-9]+$/u);
    assert.match(merchant.domain_name, /^[a-z0-9.-]+$/u);
    assert.match(merchant.merchant_url, /^https:\/\//u);
  }

  const catalogPage = run([
    'ucp-catalog',
    'search',
    '--merchant-id',
    fuhui[0].merchant_id,
    '--query',
    'supermarket voucher',
    '--language',
    'zh-HK',
    '--limit',
    '100',
    '--cursor',
    'cursor_example',
    '--sandbox',
    '--dry-run',
    '--format',
    'json',
  ]);
  assert.equal(catalogPage.status, 0, catalogPage.stderr);
  const request = JSON.parse(catalogPage.stdout).data.request;
  assert.equal(request.body.query, 'supermarket voucher');
  assert.equal(request.body.context.language, 'zh-Hant');
  assert.deepEqual(request.body.pagination, {
    cursor: 'cursor_example',
    limit: 100,
  });
});

test('broad Visa availability explicitly requests every Program page', () => {
  const result = run([
    'visa',
    'recommend',
    '我想知道香港有哪些 visa权益可以用',
    '--all',
    '--lang',
    'zh-HK',
    '--dry-run',
    '--format',
    'json',
  ]);
  assert.equal(result.status, 0, result.stderr);
  const request = JSON.parse(result.stdout).data.request;
  assert.match(request.url, /limit=50/u);
  assert.match(request.url, /page=1/u);
  assert.match(request.url, /region%5B%5D=hk/u);
  assert.equal(request.headers['X-Locale'], 'zh-HK');
});

test('broad Catalog search is anonymous and carries the locked query and language', () => {
  const result = run([
    'catalog',
    'search',
    '--query',
    'XX coffee',
    '--language',
    'zh-HK',
    '--sandbox',
    '--dry-run',
    '--format',
    'json',
  ]);
  assert.equal(result.status, 0, result.stderr);
  const request = JSON.parse(result.stdout).data.request;
  assert.match(request.url, /\/agent\/ucp\/extra\/catalog\/search$/u);
  assert.equal(request.body.query, 'XX coffee');
  assert.equal(request.body.context.language, 'zh-Hant');
});

test('Catalog purchase mode is executable with the complete frozen contract', () => {
  const result = run([
    'visa',
    'commerce-run',
    '--context',
    JSON.stringify({
      mode: 'catalog_purchase',
      environment: 'uat',
      requestText: 'Buy one selected Catalog voucher',
      selection: {
        merchantUrl: 'https://merchant.example/products/voucher-1',
        productId: 'voucher-1',
        productQuery: 'Catalog voucher',
        quantity: 1,
      },
      expected: {
        merchantName: 'Example Merchant',
        itemTitle: 'Catalog voucher',
        amount: '10.00',
        currency: 'USD',
        availability: 'IN_STOCK',
      },
      instructionContext: {
        title: 'Buy Catalog voucher',
        mandates: [{
          title: 'Catalog voucher',
          description: 'Purchase the selected Catalog product',
          amountLimit: '10.00',
          currencyCode: 'USD',
          merchantCategoryCode: '5999',
        }],
      },
      fulfillmentType: 'NO_SHIPPING_REQUIRED',
      digitalDeliveryExpected: true,
    }),
    '--confirm-purchase',
    '--dry-run',
    '--format',
    'json',
  ]);

  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout).data;
  assert.equal(plan.mode, 'catalog_purchase');
  assert.equal(plan.status, 'dry_run');
  assert.equal(plan.sideEffects, false);
  assert.equal(plan.purchase.authorizedAvailability, 'IN_STOCK');
  assert.equal(plan.purchase.fulfillmentType, 'NO_SHIPPING_REQUIRED');
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
