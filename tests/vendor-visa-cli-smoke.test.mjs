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
const VISA_SELECT_REWARD_OFFER_URL = 'https://vsrp.hk/p/o5s';
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
const defaultHome = await mkdtemp(join(tmpdir(), 'visa-skill-default-home-'));
const readyHome = await createReadyVisaHome();

test.after(async () => {
  await Promise.all([
    rm(defaultHome, { force: true, recursive: true }),
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
      HOME: options.home ?? defaultHome,
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
        HOME: options.home ?? defaultHome,
        VISA_SKILL_SMOKE_SCENARIO: scenario,
        ...options.env,
      },
    },
  );
}

function versionAtLeast(version, minimum) {
  const current = version.split('.').slice(0, 3).map(Number);
  const required = minimum.split('.').slice(0, 3).map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (current[index] !== required[index]) {
      return current[index] > required[index];
    }
  }
  return true;
}

test('launchers and Visa Edition provenance are exact', async () => {
  assert.ok(((await stat(cli)).mode & 0o111) !== 0);
  assert.match(await readFile(cli, 'utf8'), /vendor\/visa-cli\/visa-cli\.bundle\.mjs/u);
  assert.match(
    await readFile(windowsCli, 'utf8'),
    /vendor\\visa-cli\\visa-cli\.bundle\.mjs/u,
  );
  assert.equal(vendorPackage.name, 'visa-cli-vendored');
  assert.equal(vendorPackage.version, '0.2.49');
  assert.equal(vendorPackage.edition, 'visa');
  assert.equal(
    vendorPackage.upstreamCommit,
    'a2b1295aae5bd5e157d99001d26d1a10628785e3',
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

test('Visa region, discovery, and aggregate commands remain available', () => {
  for (const command of [
    'region',
    'recommend',
    'recommend-products',
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

  const aggregateHelp = run(['visa', 'recommend-products', '--help']);
  assert.equal(aggregateHelp.status, 0, aggregateHelp.stderr);
  assert.match(aggregateHelp.stdout, /--include-broad-catalog/u);
  assert.match(
    aggregateHelp.stdout,
    /same\s+products collection without source grouping/iu,
  );
});

test('Visa region persists HK/CN source selection for later recommendations', async () => {
  const home = await mkdtemp(join(tmpdir(), 'visa-skill-region-home-'));
  const env = {
    VSRA_BASE_URL: '',
    VSRA_ENV: 'production',
    VSRA_CN_BASE_URL: '',
    VSRA_HK_BASE_URL: '',
  };
  try {
    const initial = run(['visa', 'region', 'get', '--format', 'json'], {
      home,
      env,
    });
    assert.equal(initial.status, 0, initial.stderr);
    const initialData = JSON.parse(initial.stdout).data;
    assert.equal(initialData.region, 'hk');
    assert.equal(
      initialData.sourceEndpoint,
      'https://vsra.visaselectrewardhk.com',
    );

    const selected = run(['visa', 'region', 'set', 'cn', '--format', 'json'], {
      home,
      env,
    });
    assert.equal(selected.status, 0, selected.stderr);
    const selectedData = JSON.parse(selected.stdout).data;
    assert.equal(selectedData.region, 'cn');
    assert.equal(selectedData.sourceEndpoint, 'https://vsra.offerpluscn.com');

    const config = JSON.parse(
      await readFile(join(home, '.clink-cli', 'config.json'), 'utf8'),
    );
    assert.equal(config.visa.activeMarket, 'cn');

    const recommendation = run([
      'visa',
      'recommend',
      '中国权益',
      '--type',
      'benefit',
      '--anonymous',
      '--dry-run',
      '--format',
      'json',
    ], { home, env });
    assert.equal(recommendation.status, 0, recommendation.stderr);
    const recommendationData = JSON.parse(recommendation.stdout).data;
    assert.equal(recommendationData.sourceRegion, 'cn');
    assert.equal(
      recommendationData.sourceEndpoint,
      'https://vsra.offerpluscn.com',
    );
    assert.equal(
      new URL(recommendationData.request.url).host,
      'vsra.offerpluscn.com',
    );

    const hkSearch = runWithMock([
      'visa',
      'recommend',
      'visa 香港超市有什么优惠',
      '--type',
      'benefit',
      '--region',
      'hk',
      '--category',
      'shopping_supermarket',
      '--purpose',
      'local',
      '--anonymous',
      '--format',
      'json',
    ], 'visa-only', {
      home,
      env: {
        ...env,
        VSRA_BASE_URL: 'https://vsra.example.test',
        CLINK_WALLET_INIT_ENVIRONMENT: 'sandbox',
      },
    });
    assert.equal(hkSearch.status, 0, hkSearch.stderr);
    const hkSearchData = JSON.parse(hkSearch.stdout).data;
    assert.equal(hkSearchData.sourceRegion, 'hk');
    assert.equal(hkSearchData.sourceRegionReason, 'destination_region');
    const updatedConfig = JSON.parse(
      await readFile(join(home, '.clink-cli', 'config.json'), 'utf8'),
    );
    assert.equal(updatedConfig.visa.activeMarket, 'hk');

    const remembered = run([
      'visa',
      'recommend',
      'Visa权益',
      '--type',
      'benefit',
      '--anonymous',
      '--dry-run',
      '--format',
      'json',
    ], { home, env });
    assert.equal(remembered.status, 0, remembered.stderr);
    const rememberedData = JSON.parse(remembered.stdout).data;
    assert.equal(rememberedData.sourceRegion, 'hk');
    assert.equal(rememberedData.sourceRegionReason, 'saved_or_default');

    const unsupported = run(['visa', 'region', 'set', 'tw'], { home, env });
    assert.equal(unsupported.status, 2, unsupported.stderr);
    assert.match(unsupported.stderr, /Visa region must be hk or cn/u);
  } finally {
    await rm(home, { force: true, recursive: true });
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

test('Visa-only recommendation never calls UCP or Catalog', () => {
  const filterSets = [
    { region: ['hk'], category: ['dining_cafe_bakery'], type: 'benefit' },
    {
      region: ['hk'],
      category: ['dining_cafe_bakery'],
      reward_type: ['coupon'],
      type: 'benefit',
    },
    {
      region: ['hk'],
      category: ['dining_cafe_bakery'],
      purpose: ['local'],
      type: 'benefit',
    },
    {
      region: ['hk'],
      keyword: 'Visa coffee benefit',
      type: 'benefit',
    },
  ];
  const result = runWithMock([
    'visa',
    'recommend',
    '香港有没有咖啡权益',
    '--filter-sets',
    JSON.stringify(filterSets),
    '--lang',
    'zh-HK',
    '--anonymous',
    '--format',
    'json',
  ], 'visa-only', {
    env: {
      VSRA_BASE_URL: 'https://vsra.example.test',
      CLINK_WALLET_INIT_ENVIRONMENT: 'sandbox',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout).data;

  assert.equal(output.recommendationMode, 'matching_offers');
  assert.equal(output.filterSelection.requestCount, 4);
  assert.equal(output.filterSelection.parallel, true);
  assert.equal(output.filterSelection.dedupeKey, 'program.code');
  assert.deepEqual(output.filterSelection.filterSets, filterSets);
  assert.deepEqual(output.response.data.items, [{
    code: 'P_VISA_ONLY',
    title: 'Visa coffee benefit',
  }]);
  assert.equal('providerProducts' in output, false);
  assert.equal('resultSections' in output, false);
});

test('broad Visa availability explicitly requests every Program page', () => {
  const filterSets = [
    { region: ['hk'] },
    { region: ['hk'], type: 'benefit' },
    { region: ['hk'], purpose: ['local'] },
    { region: ['hk'], card_level: ['all'] },
  ];
  const result = run([
    'visa',
    'recommend',
    '我想知道香港有哪些 visa权益可以用',
    '--filter-sets',
    JSON.stringify(filterSets),
    '--anonymous',
    '--all',
    '--lang',
    'zh-HK',
    '--dry-run',
    '--format',
    'json',
  ]);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout).data;
  assert.equal(output.requests.length, 4);
  assert.equal(output.filterSelection.requestCount, 4);
  for (const { plan } of output.requests) {
    assert.match(plan.request.url, /limit=50/u);
    assert.match(plan.request.url, /page=1/u);
    assert.match(plan.request.url, /region%5B%5D=hk/u);
    assert.equal(plan.request.headers['X-Locale'], 'zh-HK');
  }
});

test('Visa miss falls back to all-channel Catalog and can return Eats365 coffee', () => {
  const recommendation = runWithMock([
    'visa',
    'recommend',
    '咖啡优惠',
    '--filter-sets',
    '[{"region":["hk"],"category":["dining_cafe_bakery"]},{"region":["hk"],"category":["dining_cafe_bakery"],"reward_type":["coupon"]},{"region":["hk"],"category":["dining_cafe_bakery"],"purpose":["local"]},{"region":["hk"],"keyword":"咖啡优惠"}]',
    '--lang',
    'zh-HK',
    '--anonymous',
    '--format',
    'json',
  ], 'visa-miss-catalog', {
    env: {
      VSRA_BASE_URL: 'https://vsra.example.test',
      CLINK_WALLET_INIT_ENVIRONMENT: 'sandbox',
    },
  });
  assert.equal(recommendation.status, 0, recommendation.stderr);
  const recommendationData = JSON.parse(recommendation.stdout).data;
  assert.equal(recommendationData.recommendationMode, 'no_matching_offers');
  assert.equal(recommendationData.returnedOfferCount, 0);

  const catalog = runWithMock([
    'catalog',
    'search',
    '--query',
    '咖啡优惠',
    '--language',
    'zh-HK',
    '--context',
    '{"address_region":"HK"}',
    '--sandbox',
    '--format',
    'json',
  ], 'visa-miss-catalog');
  assert.equal(catalog.status, 0, catalog.stderr);
  const output = JSON.parse(catalog.stdout);
  assert.match(JSON.stringify(output), /10210949/u);
  assert.match(JSON.stringify(output), /Americano/u);
});

test('selected Visa Benefit can resolve to an exact internal UCP product', () => {
  const result = runWithMock([
    'visa',
    'product-search',
    '--merchant-url',
    VISA_SELECT_REWARD_OFFER_URL,
    '--query',
    'Selected Visa Program',
    '--language',
    'zh-HK',
    '--limit',
    '1',
    '--sandbox',
    '--format',
    'json',
  ], 'visa-select-reward-internal-match');

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout).data;
  assert.equal(output.state, 'PRODUCT_VERIFIED');
  assert.equal(output.action, 'CONTINUE_TO_COMMERCE_LOGIN');
  assert.equal(output.productResolution, 'internal-ucp-catalog');
  assert.equal(output.merchantId, 'mcht_ftmse61a6az0');
  assert.equal(
    output.endpoint,
    'https://uat-api.clinkbill.com/agent/ucp/mcht_ftmse61a6az0',
  );
  assert.equal(output.product.itemId, 'benefit-product-1');
  assert.equal(output.product.currency, 'HKD');
  assert.equal(output.product.totalAmountMajor, '10');
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

test('internal Catalog voucher enters catalog_purchase without Program metadata', () => {
  const result = run([
    'visa',
    'commerce-run',
    '--context',
    JSON.stringify(catalogVoucherPurchaseContext()),
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
  assert.equal(plan.purchase.productId, 'provider_product_1');
  assert.equal(
    plan.purchase.merchantUrl,
    'https://vtravel.link2shops.com/yiyuan/',
  );
  assert.match(plan.purchase.endpoint, /mcht_ftmse61a6az0/u);
  assert.equal(plan.purchase.totalPrice, '1');
  assert.equal(plan.purchase.currency, 'USD');
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
  const pendingInstructionPrepare = versionAtLeast(
    vendorPackage.version,
    '0.2.41',
  );
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
  assert.equal(
    output.data.stage,
    pendingInstructionPrepare
      ? 'pending_instruction_prepare'
      : 'card_refresh',
  );
  assert.equal(output.data.status, 'failed');
  assert.match(
    output.data.error.message,
    pendingInstructionPrepare
      ? /intentional pending instruction stop after product resolution/iu
      : /intentional card refresh stop after product resolution/iu,
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

function catalogVoucherPurchaseContext() {
  return {
    mode: 'catalog_purchase',
    environment: 'uat',
    requestText: 'Buy the selected provider voucher',
    selection: {
      merchantUrl: 'https://vtravel.link2shops.com/yiyuan/',
      merchantId: 'mcht_ftmse61a6az0',
      endpoint:
        'https://uat-api.clinkbill.com/agent/ucp/mcht_ftmse61a6az0',
      productId: 'provider_product_1',
      productQuery: 'Watsons HKD 100 voucher',
      quantity: 1,
    },
    expected: {
      merchantName: 'vtravel.link2shops.com',
      itemTitle: 'Watsons HKD 100 voucher',
      amount: '1.00',
      currency: 'USD',
      availability: 'IN_STOCK',
    },
    instructionContext: {
      title: 'Watsons HKD 100 voucher',
      mandates: [{
        title: 'Watsons HKD 100 voucher',
        description: 'Purchase the selected Catalog product',
        amountLimit: '1.00',
        currencyCode: 'USD',
        merchantCategoryCode: '5999',
      }],
    },
    fulfillmentType: 'NO_SHIPPING_REQUIRED',
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
    buyer: {
      first_name: 'Test',
      last_name: 'Buyer',
      phone_number: '+85261234567',
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

function coffeeCatalogResponse() {
  return {
    groups: [{
      channel_type: 'eats365',
      store_id: 'chaptercoffee_kowloontong',
      name: 'Chapter Coffee',
      products: [{
        id: '10210949',
        title: 'Americano',
        url: productUrl,
        variants: [{
          id: '10210949',
          title: 'Americano',
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
  };
}

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  if (scenario === 'visa-only') {
    if (url.pathname.includes('/agent/ucp/')) {
      throw new Error('Visa-only recommendation must not request UCP');
    }
    if (url.pathname.endsWith('/taxonomy')) {
      return jsonResponse({ success: true, data: {} });
    }
    if (url.pathname.endsWith('/programs/recommend')) {
      return jsonResponse({
        success: true,
        data: {
          total: 1,
          page: 1,
          limit: 10,
          count: 1,
          items: [{
            code: 'P_VISA_ONLY',
            title: 'Visa coffee benefit',
          }],
        },
      });
    }
    throw new Error('unexpected Visa-only request: ' + url.href);
  }

  if (scenario === 'visa-miss-catalog') {
    if (url.pathname.endsWith('/taxonomy')) {
      return jsonResponse({ success: true, data: {} });
    }
    if (url.pathname.endsWith('/programs/recommend')) {
      return jsonResponse({
        success: true,
        data: {
          total: 0,
          page: 1,
          limit: 10,
          count: 0,
          items: [],
        },
      });
    }
    if (url.pathname === '/agent/ucp/extra/catalog/search') {
      const body = JSON.parse(String(init?.body));
      if (
        body.query !== '咖啡优惠'
        || body.context?.language !== 'zh-Hant'
        || body.context?.address_region !== 'HK'
        || body.channel_type !== undefined
      ) {
        throw new Error(
          'unexpected Visa-miss Catalog request: ' + JSON.stringify(body),
        );
      }
      return jsonResponse(coffeeCatalogResponse());
    }
    throw new Error('unexpected Visa-miss request: ' + url.href);
  }

  if (scenario === 'visa-select-reward-internal-match') {
    if (url.pathname.endsWith('/agent/ucp/merchants')) {
      throw new Error('exact UAT offer alias must bypass merchant-list lookup');
    }
    if (
      url.pathname
      === '/agent/ucp/mcht_ftmse61a6az0/catalog/search'
    ) {
      if (init?.method !== 'POST') {
        throw new Error('unexpected internal Catalog method: ' + init?.method);
      }
      const body = JSON.parse(String(init.body));
      if (
        body.query !== 'Selected Visa Program'
        || body.pagination?.limit !== 1
      ) {
        throw new Error(
          'unexpected internal Benefit search: ' + JSON.stringify(body),
        );
      }
      return jsonResponse({
        products: [{
          id: 'benefit-product-1',
          title: 'Selected Visa Program',
          sourceTitle: 'Selected Visa Program',
          url:
            'https://vtravel.link2shops.com/yiyuan/'
            + '?product_id=benefit-product-1',
          price: { amount: 1000, currency: 'HKD' },
          availability: { available: true, status: 'in_stock' },
          seller: { name: 'Visa Benefit Catalog Merchant' },
        }],
        pagination: { has_next_page: false },
      });
    }
    throw new Error(
      'unexpected Visa Select Reward request: ' + url.href,
    );
  }

  if (url.pathname.endsWith('/agent/ucp/merchants')) {
    if ((init?.method ?? 'GET') !== 'GET') {
      throw new Error('unexpected Merchant API method: ' + init?.method);
    }
    return jsonResponse([{
      merchant_id: 'mcht_provider123',
      merchant_name: 'Visa Benefit Catalog Provider',
      description: 'Visa benefit redemption and internal Catalog checkout',
      domain: 'https://provider.example/benefits/',
    }]);
  }

  if (scenario === 'eats365-success') {
    if (url.pathname === '/agent/ucp/extra/catalog/product') {
      if (init?.method !== 'POST') {
        throw new Error('unexpected exact Catalog method: ' + init?.method);
      }
      const body = JSON.parse(String(init.body));
      if (
        body.id !== '10210949'
        || body.channel_type !== 'eats365'
        || body.store_id !== 'chaptercoffee_kowloontong'
        || body.region !== 'hk'
        || body.context?.language !== 'zh-Hans'
      ) {
        throw new Error('unexpected exact Catalog request: ' + JSON.stringify(body));
      }
      const response = coffeeCatalogResponse();
      response.groups[0].products[0].title = '美式咖啡 Americano';
      response.groups[0].products[0].variants[0].title =
        '美式咖啡 Americano';
      return jsonResponse({ product: response.groups[0].products[0] });
    }
    if (url.pathname === '/agent/cwallet/card/bindingLink') {
      throw new Error('intentional card refresh stop after product resolution');
    }
    if (url.pathname === '/agent/cwallet/instructions/pending') {
      throw new Error(
        'intentional pending instruction stop after product resolution',
      );
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
