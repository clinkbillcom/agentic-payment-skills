import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = join(root, 'bin', 'visa-cli');
const windowsCli = join(root, 'bin', 'visa-cli.cmd');
const vendorBundlePath = join(
  root,
  'vendor',
  'visa-cli',
  'visa-cli.bundle.mjs',
);
const vendorPackage = JSON.parse(
  await readFile(join(root, 'vendor', 'visa-cli', 'package.json'), 'utf8'),
);
const vendorBundle = await readFile(vendorBundlePath);
const mockPreloadPath = await createMockPreload();
const readyHome = await createReadyVisaHome();

test.after(async () => {
  await Promise.all([
    rm(readyHome, { force: true, recursive: true }),
    rm(dirname(mockPreloadPath), { force: true, recursive: true }),
  ]);
});

function run(args, options = {}) {
  return spawnSync(cli, args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: options.home ?? join(root, '.test-home-does-not-exist'),
      ...options.env,
    },
  });
}

function runWithMock(args, scenario, options = {}) {
  return spawnSync(
    process.execPath,
    ['--import', mockPreloadPath, vendorBundlePath, ...args],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: options.home ?? join(root, '.test-home-does-not-exist'),
        VISA_SKILL_SMOKE_SCENARIO: scenario,
        ...options.env,
      },
    },
  );
}

test('launchers and Visa Edition provenance are exact', async () => {
  assert.ok(((await stat(cli)).mode & 0o111) !== 0);
  assert.match(await readFile(cli, 'utf8'), /vendor\/visa-cli\/visa-cli\.bundle\.mjs/u);
  assert.match(
    await readFile(windowsCli, 'utf8'),
    /vendor\\visa-cli\\visa-cli\.bundle\.mjs/u,
  );
  assert.equal(vendorPackage.name, 'visa-cli-vendored');
  assert.equal(vendorPackage.version, '0.2.33');
  assert.equal(vendorPackage.edition, 'visa');
  assert.equal(
    vendorPackage.upstreamCommit,
    '55fd330ca8eb6f3cef4ca5b5721a71ca1f5fbabd',
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

test('public Fuhui discovery mocks the dynamic Merchant API and supports cursor pagination', () => {
  const merchantList = runWithMock([
    'tool',
    'internal-ucp',
    'get-merchant-list',
    '--format',
    'json',
  ], 'merchant-list', {
    env: {
      CLINK_UCP_MERCHANTS_URL:
        'https://mock.clink.invalid/agent/ucp/merchants',
    },
  });
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

test('Program purchase mode accepts the frozen context without program.code', () => {
  const result = run([
    'visa',
    'commerce-run',
    '--context',
    JSON.stringify(programPurchaseContext()),
    '--confirm-purchase',
    '--dry-run',
    '--format',
    'json',
  ]);

  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout).data;
  assert.equal(plan.mode, 'purchase');
  assert.equal(plan.status, 'dry_run');
  assert.equal(plan.sideEffects, false);
  assert.equal(plan.purchase.productId, 'program-voucher-1');
});

test('Eats365 manual_item_facts revalidates complete frozen Catalog provenance', () => {
  const result = runWithMock([
    'visa',
    'commerce-run',
    '--context',
    JSON.stringify(eats365CatalogPurchaseContext()),
    '--confirm-purchase',
    '--format',
    'json',
  ], 'eats365-success', { home: readyHome });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.data.stage, 'card_refresh');
  assert.equal(output.data.status, 'failed');
  assert.match(
    output.data.error.message,
    /intentional card refresh stop after product resolution/iu,
  );
});

test('Eats365 URL binds both the frozen store and product IDs', () => {
  for (const [label, merchantUrl, pattern] of [
    [
      'store',
      'https://app.eats365pos.com/hk/en/other_store/menu?product_id=10210949',
      /store does not match the frozen storeId/iu,
    ],
    [
      'product',
      `${EATS365_PRODUCT_URL}&product_id=other_product`,
      /product URL must contain only the frozen product_id/iu,
    ],
  ]) {
    const result = runWithMock([
      'visa',
      'commerce-run',
      '--context',
      JSON.stringify(eats365CatalogPurchaseContext({ merchantUrl })),
      '--confirm-purchase',
      '--format',
      'json',
    ], 'no-network', { home: readyHome });

    assert.equal(result.status, 0, `${label}: ${result.stderr}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.stage, 'product_resolution');
    assert.equal(output.data.status, 'failed');
    assert.match(output.data.error.message, pattern);
  }
});

test('mode=purchase never converts Eats365 manual_item_facts into Catalog fallback', () => {
  const result = runWithMock([
    'visa',
    'commerce-run',
    '--context',
    JSON.stringify(eats365ProgramPurchaseContext()),
    '--confirm-purchase',
    '--format',
    'json',
  ], 'no-network', { home: readyHome });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.data.stage, 'product_resolution');
  assert.equal(output.data.status, 'failed');
  assert.match(output.data.error.message, /EATS365_MANUAL_ITEM_REQUIRED/u);
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

function programPurchaseContext() {
  return {
    mode: 'purchase',
    environment: 'uat',
    requestText: 'Buy one selected Visa Program voucher',
    selection: {
      merchantUrl: 'https://merchant.example/products/program-voucher-1',
      productId: 'program-voucher-1',
      productQuery: 'Program voucher',
      quantity: 1,
    },
    expected: {
      merchantName: 'Example Merchant',
      itemTitle: 'Program voucher',
      amount: '1.00',
      currency: 'USD',
    },
    instructionContext: {
      title: 'Buy Program voucher',
      mandates: [{
        title: 'Program voucher',
        description: 'Purchase the selected Visa Program',
        amountLimit: '1.00',
        currencyCode: 'USD',
        merchantCategoryCode: '5999',
      }],
    },
    digitalDeliveryExpected: true,
  };
}

const EATS365_PRODUCT_URL =
  'https://app.eats365pos.com/hk/en/chaptercoffee_kowloontong/menu'
  + '?product_id=10210949';

function eats365CatalogPurchaseContext(overrides = {}) {
  return {
    mode: 'catalog_purchase',
    environment: 'uat',
    requestText: 'Buy the selected Americano',
    selection: {
      merchantUrl: overrides.merchantUrl ?? EATS365_PRODUCT_URL,
      channelType: 'eats365',
      storeId: 'chaptercoffee_kowloontong',
      catalogQuery: '咖啡',
      catalogEnvironment: 'sandbox',
      catalogLanguage: 'zh-Hans',
      productId: '10210949',
      productQuery: '美式咖啡 Americano',
      quantity: 1,
    },
    expected: {
      merchantName: 'Chapter Coffee',
      itemTitle: '美式咖啡 Americano',
      amount: '26.00',
      currency: 'HKD',
      availability: 'IN_STOCK',
    },
    instructionContext: {
      title: '美式咖啡 Americano',
      mandates: [{
        title: '美式咖啡 Americano',
        description: 'Purchase the selected Catalog product',
        amountLimit: '26.00',
        currencyCode: 'HKD',
        merchantCategoryCode: '5814',
      }],
    },
    fulfillmentType: 'NO_SHIPPING_REQUIRED',
    digitalDeliveryExpected: false,
  };
}

function eats365ProgramPurchaseContext() {
  const context = eats365CatalogPurchaseContext();
  context.mode = 'purchase';
  delete context.expected.availability;
  delete context.fulfillmentType;
  for (const field of [
    'channelType',
    'storeId',
    'catalogQuery',
    'catalogEnvironment',
    'catalogLanguage',
  ]) {
    delete context.selection[field];
  }
  return context;
}

async function createReadyVisaHome() {
  const home = await mkdtemp(join(tmpdir(), 'visa-skill-smoke-home-'));
  const configDirectory = join(home, '.clink-cli');
  await mkdir(configDirectory, { recursive: true });
  const now = Date.now();
  const customerId = 'customer-smoke';
  const issuerOrigin = 'https://uat-api.clinkbill.com';
  await writeFile(
    join(configDirectory, 'config.json'),
    `${JSON.stringify({
      baseUrl: issuerOrigin,
      defaultOpenLinks: false,
      customerId,
      oauthRequired: true,
      authorization: {
        type: 'oauth',
        customerId,
        customerIdVerified: true,
        sessionId: 'session-smoke',
        deviceId: '550e8400-e29b-41d4-a716-446655440000',
        issuerOrigin,
        tokenType: 'Bearer',
        accessToken: 'smoke-access-token',
        accessTokenExpiresAt: now + 3_600_000,
        refreshToken: 'smoke-refresh-token',
        refreshTokenExpiresAt: now + 86_400_000,
        agentClientId: 'acl_smoke',
        visaRegistrationStatus: 'SUCCEEDED',
        scope: 'benefit:read wallet:read payment:execute offline_access',
      },
      visa: {
        fsmState: 'CLINK_READY',
        activeMarket: 'hk',
        vsraTokens: {},
        benefitConnection: {
          customerId,
          issuerOrigin,
          connectedAt: new Date(now).toISOString(),
        },
      },
    }, null, 2)}\n`,
    'utf8',
  );
  return home;
}

async function createMockPreload() {
  const directory = await mkdtemp(join(tmpdir(), 'visa-skill-fetch-preload-'));
  const preloadPath = join(directory, 'mock-fetch.mjs');
  await writeFile(preloadPath, `
const scenario = process.env.VISA_SKILL_SMOKE_SCENARIO;
const productUrl =
  'https://app.eats365pos.com/hk/en/chaptercoffee_kowloontong/menu'
  + '?product_id=10210949';

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (scenario === 'merchant-list') {
    if (url.href !== 'https://mock.clink.invalid/agent/ucp/merchants') {
      throw new Error('unexpected Merchant API URL: ' + url.href);
    }
    if ((init?.method ?? 'GET') !== 'GET') {
      throw new Error('unexpected Merchant API method: ' + init?.method);
    }
    return jsonResponse({
      merchants: [{
        merchant_id: 'mcht_fuhuismoke',
        domain_name: 'vtravel.link2shops.com',
        merchant_url: 'https://vtravel.link2shops.com/yiyuan/',
        description: 'Fuhui Visa Offer merchant',
        enabled: true,
      }],
    });
  }

  if (scenario === 'eats365-success') {
    if (url.pathname === '/agent/ucp/extra/catalog/search') {
      if (init?.method !== 'POST') {
        throw new Error('unexpected broad Catalog method: ' + init?.method);
      }
      const body = JSON.parse(String(init.body));
      if (
        body.query !== '咖啡'
        || body.channel_type !== 'eats365'
        || body.context?.language !== 'zh-Hans'
      ) {
        throw new Error('unexpected broad Catalog request: ' + JSON.stringify(body));
      }
      return jsonResponse({
        groups: [{
          channel_type: 'eats365',
          store_id: 'chaptercoffee_kowloontong',
          name: 'Chapter Coffee',
          products: [{
            id: '10210949',
            title: '美式咖啡 Americano',
            url: productUrl,
            variants: [{
              id: '10210949',
              title: '美式咖啡 Americano',
              price: { amount: 2600, currency: 'HKD' },
              availability: { available: true, status: 'in_stock' },
              seller: { name: 'Chapter Coffee' },
            }],
            metadata: {
              channel_type: 'eats365',
              store_id: 'chaptercoffee_kowloontong',
            },
          }],
        }],
        total_products: 1,
      });
    }
    if (url.pathname === '/agent/cwallet/card/bindingLink') {
      throw new Error('intentional card refresh stop after product resolution');
    }
  }

  throw new Error(
    'unexpected network request for scenario '
    + scenario
    + ': '
    + url.href,
  );
};
`, 'utf8');
  return preloadPath;
}
