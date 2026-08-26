import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CatalogEnvironment,
  CatalogDiscoveryState,
  CatalogDiscoveryAction,
  CATALOG_CHANNEL_EATS365,
  CATALOG_SUPPORTED_COUNTRIES,
  classifyCatalogDiscovery as classifyCatalogDiscoveryRaw,
  resolveCatalogEnvironment,
  resolveCatalogLanguage,
  resolveCatalogExt,
  resolveContextCountry,
  formatCatalogDiscoveryFsmMarker,
} from '../lib/catalog-discovery-fsm.mjs';
import {
  PaymentAuthorizationSource,
  PaymentExecutionDecision,
  PaymentIntentAction,
  PaymentRoutingOperation,
  classifyPaymentIntent,
} from '../lib/payment-intent-router-fsm.mjs';
import {
  UcpCheckoutRouteAction,
  classifyUcpCheckoutRoute,
} from '../lib/ucp-checkout-route-fsm.mjs';
import {
  UcpCheckoutWorkflowAction,
  classifyUcpCheckoutPrerequisites,
} from '../lib/ucp-checkout-workflow-fsm.mjs';

const bruceLeeMerchant = {
  domain: 'https://WWW.BruceLeeClub.com',
  merchant_id: 'mcht_frnz6yfrz1sd',
  merchant_name: 'Bruce Lee Club',
  description: 'Official online store of Bruce Lee Club. Licensed fan and collector goods: apparel and T-shirts, memorabilia, books, posters, accessories.',
};

const shopifyMerchant = {
  domain: 'https://uebmaw-it.myshopify.com/',
  merchant_id: 'mcht_frnagwqi4k43',
  merchant_name: 'Bruce Lee Collaboration Store',
  description: 'Shopify storefront selling Bruce Lee Club collaboration merchandise, mainly limited-run tops and shirts.',
};

const merchantListData = [bruceLeeMerchant, shopifyMerchant];
const merchantListOutput = { ok: true, data: merchantListData };

function classifyCatalogDiscovery(input = {}) {
  const hasLanguage = ['catalogLanguage', 'catalog_language', 'language']
    .some((field) => input[field] !== undefined);
  return classifyCatalogDiscoveryRaw({
    ...(hasLanguage ? {} : { catalogLanguage: 'en' }),
    ...input,
  });
}

test('asks for a query before touching the CLI', () => {
  const result = classifyCatalogDiscovery({});

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_INPUT_MISSING);
  assert.equal(result.action, CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT);
  assert.equal(result.reason, 'catalog_query_missing');
  assert.deepEqual(result.missing, ['query']);
});

test('loads the supported merchant list before any catalog search', () => {
  const result = classifyCatalogDiscovery({ query: 'bruce lee t-shirt' });

  assert.equal(result.state, CatalogDiscoveryState.MERCHANT_LIST_REQUIRED);
  assert.equal(result.action, CatalogDiscoveryAction.GET_MERCHANT_LIST);
  assert.equal(result.reason, 'merchant_list_required');
  assert.equal(result.catalogEnvironment, CatalogEnvironment.PRODUCTION);
  assert.equal(result.command, 'clink ucp-merchant list --internal --format json');
});

test('uses one explicit catalog environment across merchant-list, scoped, and broad commands', () => {
  for (const [catalogEnvironment, flag] of [
    [CatalogEnvironment.TEST, '--test'],
    [CatalogEnvironment.SANDBOX, '--sandbox'],
  ]) {
    const merchantList = classifyCatalogDiscovery({
      query: 'bruce lee t-shirt',
      catalogEnvironment,
    });
    assert.equal(merchantList.catalogEnvironment, catalogEnvironment);
    assert.equal(
      merchantList.command,
      `clink ucp-merchant list --internal ${flag} --format json`,
    );

    const scoped = classifyCatalogDiscovery({
      query: 'bruce lee t-shirt',
      catalogEnvironment,
      merchantListOutput,
      matchedMerchantId: 'mcht_frnz6yfrz1sd',
    });
    assert.equal(scoped.catalogEnvironment, catalogEnvironment);
    assert.equal(
      scoped.command,
      `clink ucp-catalog search --merchant-id mcht_frnz6yfrz1sd`
        + ` --query 'bruce lee t-shirt' --language en ${flag} --format json`,
    );

    const broad = classifyCatalogDiscovery({
      query: 'iced matcha latte',
      catalogEnvironment,
      merchantListOutput,
      merchantMatch: false,
    });
    assert.equal(broad.catalogEnvironment, catalogEnvironment);
    assert.equal(
      broad.command,
      `clink catalog search --query 'iced matcha latte' --language en ${flag} --format json`,
    );
  }
});

test('rejects unsupported catalog environments instead of inheriting wallet state', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    catalogEnvironment: 'uat',
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_INPUT_INVALID);
  assert.equal(result.action, CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT);
  assert.equal(result.reason, 'catalog_environment_invalid');
  assert.equal(result.command, undefined);
  assert.deepEqual(resolveCatalogEnvironment({}), {
    valid: true,
    catalogEnvironment: CatalogEnvironment.PRODUCTION,
    flag: '',
  });
});

test('catalog environment aliases ignore blanks and accept one canonical value', () => {
  assert.deepEqual(resolveCatalogEnvironment({
    catalogEnvironment: '   ',
    catalog_environment: 'SANDBOX',
  }), {
    valid: true,
    catalogEnvironment: CatalogEnvironment.SANDBOX,
    flag: '--sandbox',
  });
  assert.deepEqual(resolveCatalogEnvironment({
    catalogEnvironment: 'TEST',
    catalog_environment: 'test',
  }), {
    valid: true,
    catalogEnvironment: CatalogEnvironment.TEST,
    flag: '--test',
  });
});

test('catalog environment aliases fail closed when non-empty values conflict', () => {
  const resolution = resolveCatalogEnvironment({
    catalogEnvironment: 'sandbox',
    catalog_environment: 'test',
  });
  const result = classifyCatalogDiscovery({
    query: 'gift card',
    catalogEnvironment: 'sandbox',
    catalog_environment: 'test',
  });

  assert.deepEqual(resolution, {
    valid: false,
    reason: 'catalog_environment_conflict',
    values: ['sandbox', 'test'],
  });
  assert.equal(result.state, CatalogDiscoveryState.CATALOG_INPUT_INVALID);
  assert.equal(result.reason, 'catalog_environment_conflict');
  assert.equal(result.command, undefined);
});

test('passes the canonical Agent-selected language with --language on scoped search', () => {
  const result = classifyCatalogDiscovery({
    query: '屈臣氏',
    catalogEnvironment: CatalogEnvironment.TEST,
    language: 'zh-hans',
    merchantListOutput,
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
  });

  assert.equal(result.catalogLanguage, 'zh-Hans');
  assert.equal(
    result.command,
    'clink ucp-catalog search --merchant-id mcht_frnz6yfrz1sd'
      + ' --query \'屈臣氏\' --language zh-Hans'
      + ' --test --format json',
  );
  assert.deepEqual(resolveCatalogLanguage({ catalogLanguage: 'zh-hans' }), {
    valid: true,
    catalogLanguage: 'zh-Hans',
  });
});

test('keeps --language separate from buyer-country context on broad search', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    catalogEnvironment: CatalogEnvironment.SANDBOX,
    catalogLanguage: 'zh-Hant-HK',
    addressCountry: 'HK',
    merchantListOutput,
    merchantMatch: false,
  });

  assert.equal(result.catalogLanguage, 'zh-Hant');
  assert.equal(
    result.command,
    'clink catalog search --query \'iced matcha latte\''
      + ' --language zh-Hant --context \'{"address_country":"HK"}\''
      + ' --sandbox --format json',
  );
});

test('rejects a non-BCP47 catalog language before running a command', () => {
  const result = classifyCatalogDiscovery({
    query: 'gift card',
    catalogLanguage: 'zh_Hans',
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_INPUT_INVALID);
  assert.equal(result.reason, 'catalog_language_invalid');
  assert.equal(result.catalogEnvironment, CatalogEnvironment.PRODUCTION);
  assert.equal(result.command, undefined);
});

test('requires a nonblank language before any Catalog discovery step', () => {
  for (const catalogLanguage of [undefined, null, '', '   ']) {
    const result = classifyCatalogDiscoveryRaw({
      query: '奶茶',
      catalogLanguage,
      merchantListOutput: { merchants: [] },
    });

    assert.equal(result.state, CatalogDiscoveryState.CATALOG_INPUT_MISSING);
    assert.equal(result.action, CatalogDiscoveryAction.ASK_FOR_CATALOG_INPUT);
    assert.equal(result.reason, 'catalog_language_missing');
    assert.deepEqual(result.missing, ['catalogLanguage']);
    assert.equal(result.command, undefined);
  }
});

test('catalog language aliases ignore blanks and require one canonical BCP47 value', () => {
  assert.deepEqual(resolveCatalogLanguage({
    catalogLanguage: '',
    catalog_language: 'zh-hans',
    language: 'zh-Hans',
  }), {
    valid: true,
    catalogLanguage: 'zh-Hans',
  });
  assert.deepEqual(resolveCatalogLanguage({
    catalogLanguage: 'iw',
    catalog_language: 'he',
  }), {
    valid: true,
    catalogLanguage: 'he',
  });
  assert.deepEqual(resolveCatalogLanguage({ catalogLanguage: 'fr-ca' }), {
    valid: true,
    catalogLanguage: 'fr-CA',
  });
});

test('catalog language normalization matches the CLI Chinese contract', () => {
  assert.deepEqual(resolveCatalogLanguage({
    catalogLanguage: 'zh-HK',
    catalog_language: 'zh-Hant-HK',
    language: 'zh-Hant',
  }), {
    valid: true,
    catalogLanguage: 'zh-Hant',
  });
  assert.deepEqual(resolveCatalogLanguage({ catalogLanguage: 'zh' }), {
    valid: true,
    catalogLanguage: 'zh-Hans',
  });
});

for (const catalogLanguage of ['und', 'zh-US', 'zh-Latn', `en-${'a'.repeat(65)}`, 123]) {
  test(`rejects a Catalog language the CLI would reject: ${String(catalogLanguage)}`, () => {
    assert.deepEqual(resolveCatalogLanguage({ catalogLanguage }), {
      valid: false,
      reason: 'catalog_language_invalid',
      value: catalogLanguage,
    });
  });
}

test('direct discovery fails closed instead of inferring language from a Chinese query', () => {
  const result = classifyCatalogDiscoveryRaw({
    query: '屈臣氏',
    merchantListOutput,
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
  });

  assert.equal(result.reason, 'catalog_language_missing');
  assert.equal(result.command, undefined);
});

test('catalog language aliases fail closed when canonical values conflict', () => {
  const resolution = resolveCatalogLanguage({
    catalogLanguage: 'zh-Hans',
    catalog_language: 'en-US',
  });
  const result = classifyCatalogDiscovery({
    query: 'gift card',
    catalogLanguage: 'zh-Hans',
    catalog_language: 'en-US',
  });

  assert.deepEqual(resolution, {
    valid: false,
    reason: 'catalog_language_conflict',
    values: ['zh-Hans', 'en-US'],
  });
  assert.equal(result.state, CatalogDiscoveryState.CATALOG_INPUT_INVALID);
  assert.equal(result.reason, 'catalog_language_conflict');
  assert.equal(result.command, undefined);
});

test('hands merchant descriptions to intent matching instead of guessing', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput,
  });

  assert.equal(result.state, CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED);
  assert.equal(result.action, CatalogDiscoveryAction.MATCH_MERCHANT_INTENT);
  assert.equal(result.reason, 'merchant_intent_match_required');
  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0].merchantId, 'mcht_frnz6yfrz1sd');
  assert.equal(result.candidates[0].merchantName, 'Bruce Lee Club');
  assert.equal(result.candidates[0].merchantUrl, 'https://www.bruceleeclub.com');
  assert.equal(result.candidates[0].domainName, 'www.bruceleeclub.com');
  assert.match(result.candidates[0].description, /Bruce Lee Club/u);
});

test('rejects an unsafe API domain instead of exposing a matchable merchant', () => {
  const result = classifyCatalogDiscovery({
    query: 'voucher',
    merchantListOutput: {
      ok: true,
      data: [{
        merchant_id: 'mcht_unsafe',
        merchant_name: 'Unsafe Merchant',
        description: 'Digital vouchers',
        domain: 'https://user:secret@merchant.example/',
      }],
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_merchant_list_output');
  assert.equal(result.errorCode, 'invalid_merchant_list_output');
});

for (const [field, value] of [
  ['merchant_id', 123],
  ['merchant_name', '   '],
  ['description', null],
]) {
  test(`rejects an invalid merchant API ${field}`, () => {
    const result = classifyCatalogDiscovery({
      query: 'voucher',
      merchantListOutput: {
        ok: true,
        data: [{
          merchant_id: 'mcht_1',
          merchant_name: 'Merchant',
          description: 'Digital vouchers',
          domain: 'https://merchant.example',
          [field]: value,
        }],
      },
    });

    assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
    assert.equal(result.reason, 'invalid_merchant_list_output');
  });
}

test('trusts the API active filter and drops only description-less merchants', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: { ok: true, data: [
        bruceLeeMerchant,
        { ...shopifyMerchant, enabled: false },
        {
          domain: 'https://silent.example.com/',
          merchant_id: 'mcht_silent',
          merchant_name: 'Silent Merchant',
          description: '   ',
        },
      ] },
  });

  assert.equal(result.state, CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED);
  assert.deepEqual(
    result.candidates.map((entry) => entry.merchantId),
    ['mcht_frnz6yfrz1sd', 'mcht_frnagwqi4k43'],
  );
});

test('rejects a merchant-list envelope without a merchants array', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: [bruceLeeMerchant],
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_merchant_list_output');
});

test('keeps the legacy merchants envelope as a compatibility adapter', () => {
  const result = classifyCatalogDiscovery({
    query: 'legacy voucher',
    merchantListOutput: {
      merchants: [{
        domain_name: 'legacy.example.com',
        merchant_url: 'https://legacy.example.com/shop/',
        merchant_id: 'mcht_legacy',
        description: 'Legacy voucher catalog',
      }, {
        domain_name: 'disabled.example.com',
        merchant_url: 'https://disabled.example.com/',
        merchant_id: 'mcht_disabled',
        description: 'Disabled legacy merchant',
        enabled: false,
      }],
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].merchantId, 'mcht_legacy');
  assert.equal(result.candidates[0].merchantUrl, 'https://legacy.example.com/shop/');
  assert.equal(result.candidates[0].domainName, 'legacy.example.com');
});

test('treats an empty merchant API data array as a valid list with no matchable merchants', () => {
  const result = classifyCatalogDiscovery({
    query: 'coffee',
    merchantListOutput: { ok: true, data: [] },
  });

  assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
  assert.equal(result.reason, 'no_matchable_merchant_candidate');
  assert.equal(
    result.command,
    'clink catalog search --query coffee --language en --format json',
  );
});

test('runs a merchant-scoped search when intent matches one merchant', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput,
    merchantMatch: { merchantId: 'mcht_frnz6yfrz1sd', reason: 'description names licensed apparel' },
  });

  assert.equal(result.state, CatalogDiscoveryState.MERCHANT_SCOPED_SEARCH_REQUIRED);
  assert.equal(result.action, CatalogDiscoveryAction.RUN_MERCHANT_SCOPED_CATALOG_SEARCH);
  assert.equal(result.reason, 'merchant_intent_matched');
  assert.equal(result.merchantId, 'mcht_frnz6yfrz1sd');
  assert.equal(result.matchReason, 'description names licensed apparel');
  assert.equal(
    result.command,
    "clink ucp-catalog search --merchant-id mcht_frnz6yfrz1sd --query 'bruce lee t-shirt' --language en --format json",
  );
});

test('rejects a matched merchant id that is not in the loaded candidate set', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput,
    matchedMerchantId: 'mcht_never_listed',
  });

  assert.equal(result.state, CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED);
  assert.equal(result.reason, 'merchant_match_not_in_candidates');
  assert.equal(result.rejectedMerchantId, 'mcht_never_listed');
});

test('rejects an ambiguous scoped merchant id without a URL or domain discriminator', () => {
  const duplicateMerchantId = 'mcht_ftmse61a6az0';
  const result = classifyCatalogDiscovery({
    query: 'vtravel voucher',
    merchantListOutput: {
      ok: true,
      data: [
        {
          domain: 'https://testa.link2shops.com/',
          merchant_id: duplicateMerchantId,
          merchant_name: 'Testa',
          description: 'Testa vouchers',
        },
        {
          domain: 'https://vtravel.link2shops.com/',
          merchant_id: duplicateMerchantId,
          merchant_name: 'Vtravel',
          description: 'Vtravel vouchers',
        },
      ],
    },
    matchedMerchantId: duplicateMerchantId,
  });

  assert.equal(result.action, CatalogDiscoveryAction.MATCH_MERCHANT_INTENT);
  assert.equal(result.reason, 'merchant_match_ambiguous');
  assert.equal(result.command, undefined);
});

test('scoped matching uses the selected candidate identity to disambiguate duplicate merchant ids', () => {
  const duplicateMerchantId = 'mcht_ftmse61a6az0';
  const vtravelUrl = 'https://vtravel.link2shops.com';
  const result = classifyCatalogDiscovery({
    query: 'vtravel voucher',
    catalogEnvironment: 'sandbox',
    catalogLanguage: 'zh-Hans',
    merchantListOutput: {
      ok: true,
      data: [
        {
          domain: 'https://testa.link2shops.com/',
          merchant_id: duplicateMerchantId,
          merchant_name: 'Testa',
          description: 'Testa vouchers',
        },
        {
          domain: vtravelUrl,
          merchant_id: duplicateMerchantId,
          merchant_name: 'Vtravel',
          description: 'Vtravel vouchers',
        },
      ],
    },
    merchantMatch: {
      merchantId: duplicateMerchantId,
      merchantDomain: 'vtravel.link2shops.com',
      merchantUrl: vtravelUrl,
      reason: 'description names the requested Vtravel voucher catalog',
    },
  });

  assert.equal(result.action, CatalogDiscoveryAction.RUN_MERCHANT_SCOPED_CATALOG_SEARCH);
  assert.equal(result.merchantId, duplicateMerchantId);
  assert.equal(result.merchantDomain, 'vtravel.link2shops.com');
  assert.equal(result.merchantUrl, vtravelUrl);
  assert.equal(
    result.command,
    `clink ucp-catalog search --merchant-id ${duplicateMerchantId}`
      + ` --query 'vtravel voucher' --language zh-Hans --sandbox --format json`,
  );
});

test('scoped matching rejects conflicting merchant domain and URL discriminators', () => {
  const result = classifyCatalogDiscovery({
    query: 'Bruce Lee shirt',
    merchantListOutput,
    merchantMatch: {
      merchantId: bruceLeeMerchant.merchant_id,
      merchantDomain: 'www.bruceleeclub.com',
      merchantUrl: shopifyMerchant.domain,
      reason: 'description match',
    },
  });

  assert.equal(result.action, CatalogDiscoveryAction.MATCH_MERCHANT_INTENT);
  assert.equal(result.reason, 'merchant_match_not_in_candidates');
  assert.equal(result.command, undefined);
});

test('broad results use their domain to disambiguate duplicate merchant ids', () => {
  const duplicateMerchantId = 'mcht_ftmse61a6az0';
  const result = classifyCatalogDiscovery({
    query: 'vtravel voucher',
    merchantListOutput: {
      ok: true,
      data: [
        {
          domain: 'https://testa.link2shops.com/',
          merchant_id: duplicateMerchantId,
          merchant_name: 'Testa',
          description: 'Testa vouchers',
        },
        {
          domain: 'https://vtravel.link2shops.com/',
          merchant_id: duplicateMerchantId,
          merchant_name: 'Vtravel',
          description: 'Vtravel vouchers',
        },
      ],
    },
    merchantMatch: false,
    broadSearchOutput: {
      groups: [{
        merchant_id: duplicateMerchantId,
        domain_name: 'vtravel.link2shops.com',
        products: [{ id: 'voucher_1', title: 'Vtravel voucher' }],
      }],
      total_products: 1,
    },
  });

  assert.equal(result.groups[0].merchantName, 'Vtravel');
  assert.equal(result.groups[0].merchantDomain, 'vtravel.link2shops.com');
  assert.equal(result.groups[0].merchantUrl, 'https://vtravel.link2shops.com');
  assert.equal(result.groups[0].products[0].merchantName, 'Vtravel');
  assert.equal(result.groups[0].products[0].merchantDomain, 'vtravel.link2shops.com');
  assert.equal(result.groups[0].products[0].merchantUrl, 'https://vtravel.link2shops.com');
});

test('returns merchant-scoped products without widening the search', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput,
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
    merchantSearchOutput: {
      products: [{ id: 'product_1', title: 'Bruce Lee Tee' }],
      messages: [{ type: 'info', code: 'partial_merchant_coverage', content: 'Searched 1 of 2' }],
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_RESULTS_READY);
  assert.equal(result.action, CatalogDiscoveryAction.RETURN_CATALOG_RESULTS);
  assert.equal(result.reason, 'merchant_scoped_search_matched');
  assert.equal(result.scope, 'MERCHANT_SCOPED');
  assert.equal(result.productCount, 1);
  assert.deepEqual(result.products[0], {
    id: 'product_1',
    title: 'Bruce Lee Tee',
    source: 'INTERNAL_UCP_CATALOG',
    merchantId: 'mcht_frnz6yfrz1sd',
    merchantName: 'Bruce Lee Club',
    merchantDomain: 'www.bruceleeclub.com',
    merchantUrl: 'https://www.bruceleeclub.com',
  });
  assert.equal(result.messages.length, 1);
  assert.equal(result.terminal, true);
});

test('rejects a new merchant API entry when its domain is missing', () => {
  const result = classifyCatalogDiscovery({
    query: 'voucher',
    merchantListOutput: {
      ok: true,
      data: [{
        merchant_id: 'mcht_1',
        merchant_name: 'Merchant',
        description: 'Digital vouchers',
      }],
    },
    matchedMerchantId: 'mcht_1',
    merchantSearchOutput: {
      products: [{ id: 'voucher_1', title: 'Voucher' }],
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_merchant_list_output');
});

test('falls back to broad search when the merchant-scoped search is empty', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput,
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
    merchantSearchOutput: { products: [] },
  });

  assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
  assert.equal(result.action, CatalogDiscoveryAction.RUN_BROAD_CATALOG_SEARCH);
  assert.equal(result.reason, 'merchant_scoped_search_empty');
  assert.equal(result.ext, null);
  assert.equal(
    result.command,
    "clink catalog search --query 'bruce lee t-shirt' --language en --format json",
  );
});

test('runs an unscoped broad search when intent matches no merchant', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: false,
  });

  assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
  assert.equal(result.reason, 'merchant_intent_match_failed');
  assert.equal(result.ext, null);
  assert.equal(
    result.command,
    "clink catalog search --query 'iced matcha latte' --language en --format json",
  );
});

test('skips intent matching when no merchant exposes a matchable description', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput: { merchants: [] },
  });

  assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
  assert.equal(result.reason, 'no_matchable_merchant_candidate');
});

test('uses the top-level channel selector and keeps a store id for response filtering', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: false,
    channelType: 'eats365',
    addressCountry: 'HK',
    storeId: 'arabica_cheklapkok',
  });

  assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
  assert.equal(result.ext, null);
  assert.equal(result.channelType, 'eats365');
  assert.equal(result.storeId, 'arabica_cheklapkok');
  assert.equal(result.country, 'HK');
  assert.equal(
    result.command,
    'clink catalog search --query \'iced matcha latte\''
      + ' --channel-type eats365'
      + ' --language en'
      + ' --context \'{"address_country":"HK"}\' --format json',
  );
  assert.doesNotMatch(result.command, /--ext|store_id/u);
});

test('normalizes the eat365 spelling to the backend channel type', () => {
  const result = classifyCatalogDiscovery({
    query: 'croissant',
    merchantListOutput,
    merchantMatch: false,
    channelType: 'eat365',
    addressCountry: 'hk',
  });

  assert.equal(result.channelType, CATALOG_CHANNEL_EATS365);
  assert.equal(result.country, 'HK');
  assert.equal(result.ext, null);
});

test('treats countries without catalog location mappings as unknown location', () => {
  for (const addressCountry of ['US', 'JP']) {
    const result = classifyCatalogDiscovery({
      query: 'croissant',
      merchantListOutput,
      merchantMatch: false,
      addressCountry,
    });

    assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
    assert.equal(result.country, null);
    assert.equal(result.command, "clink catalog search --query croissant --language en --format json");
    assert.doesNotMatch(result.command, /--context/u);
  }
});

test('accepts legacy HK and SG region aliases as country context', () => {
  for (const [region, country] of [['hk', 'HK'], ['SG', 'SG']]) {
    const result = classifyCatalogDiscovery({
      query: 'croissant',
      merchantListOutput,
      merchantMatch: false,
      region,
    });

    assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
    assert.equal(result.country, country);
    assert.match(result.command, new RegExp(`address_country.*${country}`, 'u'));
  }
});

test('requires a channel type before accepting a store id', () => {
  const result = classifyCatalogDiscovery({
    query: 'croissant',
    storeId: 'arabica_cheklapkok',
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_INPUT_MISSING);
  assert.equal(result.reason, 'catalog_channel_type_missing');
  assert.deepEqual(result.missing, ['channelType']);
});

test('a known store bypasses merchant-scoped matching and searches its platform channel', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: { merchantId: 'mcht_frnz6yfrz1sd' },
    merchantSearchOutput: { products: [{ id: 'wrong-internal-product' }] },
    channelType: 'eats365',
    storeId: 'arabica_cheklapkok',
  });

  assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
  assert.equal(result.reason, 'store_target_established');
  assert.equal(result.storeId, 'arabica_cheklapkok');
  assert.match(result.command, /--channel-type eats365/u);
  assert.doesNotMatch(result.command, /ucp-catalog|--merchant-id/u);
});

test('an explicit channel bypasses merchant-scoped matching even without a store target', () => {
  const result = classifyCatalogDiscovery({
    query: 'running shoes',
    merchantListOutput,
    merchantMatch: { merchantId: 'mcht_frnz6yfrz1sd' },
    merchantSearchOutput: { products: [{ id: 'wrong-internal-product' }] },
    channelType: 'eats365',
  });

  assert.equal(result.state, CatalogDiscoveryState.BROAD_SEARCH_REQUIRED);
  assert.equal(result.reason, 'channel_target_established');
  assert.equal(result.channelType, 'eats365');
  assert.match(result.command, /--channel-type eats365/u);
  assert.doesNotMatch(result.command, /ucp-catalog|--merchant-id/u);
});

test('preserves grouped broad-search target identity', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: false,
    broadSearchOutput: {
      groups: [
        {
          channel_type: 'eats365',
          store_id: 'arabica_cheklapkok',
          region: 'hk',
          name: '%Arabica (Alexandra House)',
          products: [{ id: 'p1' }, { id: 'p2' }],
        },
      ],
      total_products: 2,
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_RESULTS_READY);
  assert.equal(result.reason, 'broad_catalog_search_matched');
  assert.equal(result.scope, 'BROAD');
  assert.equal(result.productCount, 2);
  assert.equal(result.groups[0].store_id, 'arabica_cheklapkok');
  assert.equal(result.groups[0].region, 'hk');
});

test('filters broad-search groups to the requested store and recalculates product count', () => {
  const targetGroup = {
    channel_type: 'eats365',
    store_id: 'arabica_cheklapkok',
    region: 'hk',
    products: [{ id: 'target-product' }],
  };
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: false,
    channelType: 'eats365',
    storeId: 'arabica_cheklapkok',
    broadSearchOutput: {
      groups: [
        targetGroup,
        {
          channel_type: 'eats365',
          store_id: 'another_store',
          region: 'hk',
          products: [{ id: 'other-1' }, { id: 'other-2' }],
        },
      ],
      total_products: 3,
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_RESULTS_READY);
  assert.equal(result.productCount, 1);
  assert.deepEqual(result.groups, [targetGroup]);
  assert.equal(result.groups[0].region, 'hk');
  assert.equal(result.storeId, 'arabica_cheklapkok');
});

test('does not return products from another store when the requested store has no match', () => {
  const result = classifyCatalogDiscovery({
    query: 'birthday cake',
    merchantListOutput,
    merchantMatch: false,
    channelType: 'eats365',
    storeId: 'arabica_cheklapkok',
    broadSearchOutput: {
      groups: [{ store_id: 'another_store', products: [{ id: 'wrong-store-product' }] }],
      total_products: 1,
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.EXTERNAL_DISCOVERY_REQUIRED);
  assert.equal(result.reason, 'catalog_search_exhausted');
  assert.equal(result.storeId, 'arabica_cheklapkok');
});

test('derives the product count when the response omits total_products', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: false,
    broadSearchOutput: {
      groups: [
        { store_id: 'arabica_cheklapkok', products: [{ id: 'p1' }] },
        { store_id: 'HK026559', products: [{ id: 'p2' }, { id: 'p3' }] },
      ],
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_RESULTS_READY);
  assert.equal(result.productCount, 3);
});

test('delegates to external discovery when broad search returns nothing', () => {
  const result = classifyCatalogDiscovery({
    query: 'vintage typewriter ribbon',
    merchantListOutput,
    merchantMatch: false,
    broadSearchOutput: {
      groups: [],
      total_products: 0,
      messages: [{ type: 'info', code: 'no_results', content: 'No merchant matched this request' }],
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.EXTERNAL_DISCOVERY_REQUIRED);
  assert.equal(result.action, CatalogDiscoveryAction.DELEGATE_EXTERNAL_PRODUCT_DISCOVERY);
  assert.equal(result.reason, 'catalog_search_exhausted');
  assert.equal(result.terminal, true);
  assert.equal(result.messages.length, 1);
});

test('delegates to external discovery when a scoped store search returns nothing', () => {
  const result = classifyCatalogDiscovery({
    query: 'birthday cake',
    merchantListOutput,
    merchantMatch: false,
    channelType: 'eats365',
    addressCountry: 'HK',
    storeId: 'arabica_cheklapkok',
    broadSearchOutput: { groups: [], total_products: 0 },
  });

  assert.equal(result.state, CatalogDiscoveryState.EXTERNAL_DISCOVERY_REQUIRED);
  assert.equal(result.ext, null);
  assert.equal(result.channelType, 'eats365');
  assert.equal(result.storeId, 'arabica_cheklapkok');
  assert.equal(result.country, 'HK');
});

test('parses JSON string CLI output for every stage', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: JSON.stringify({ ok: true, data: merchantListData }),
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
    merchantSearchOutput: JSON.stringify({ ok: true, data: { products: [{ id: 'product_1' }] } }),
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_RESULTS_READY);
  assert.equal(result.productCount, 1);
});

test('surfaces a merchant-list CLI error without falling back to a search', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: {
      ok: false,
      error: { type: 'api_error', message: 'public merchant route unavailable' },
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.action, CatalogDiscoveryAction.SURFACE_ERROR);
  assert.equal(result.reason, 'merchant_list_error');
  assert.equal(result.errorCode, 'api_error');
  assert.equal(result.terminal, true);
});

test('surfaces a malformed merchant-list envelope as an error', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: 'not json at all',
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_merchant_list_output');
});

test('surfaces a merchant-scoped search error instead of widening the search', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput,
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
    merchantSearchOutput: { ok: false, error: { code: 'unavailable' } },
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'merchant_catalog_search_error');
  assert.equal(result.errorCode, 'unavailable');
});

test('surfaces a broad search error instead of claiming exhaustion', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: false,
    broadSearchOutput: { ok: false, error: { code: 'unavailable' } },
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'broad_catalog_search_error');
  assert.equal(result.errorCode, 'unavailable');
});

test('treats a missing groups array as malformed broad output', () => {
  const result = classifyCatalogDiscovery({
    query: 'iced matcha latte',
    merchantListOutput,
    merchantMatch: false,
    broadSearchOutput: { total_products: 0 },
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_broad_catalog_search_output');
});

test('resolveCatalogExt returns no ext for a plain unscoped search', () => {
  assert.deepEqual(resolveCatalogExt({}), { valid: true, ext: null });
});

test('resolveCatalogExt keeps channel and store selectors out of ext', () => {
  assert.deepEqual(
    resolveCatalogExt({ channelType: 'eat365', storeId: 'arabica_cheklapkok' }),
    {
      valid: true,
      ext: null,
      channelType: CATALOG_CHANNEL_EATS365,
      storeId: 'arabica_cheklapkok',
    },
  );
});

test('resolveContextCountry maps only HK and SG to catalog context', () => {
  assert.deepEqual(resolveContextCountry({ addressCountry: 'hk' }), { valid: true, country: 'HK' });
  assert.deepEqual(resolveContextCountry({ address_country: 'sg' }), { valid: true, country: 'SG' });
  assert.deepEqual(resolveContextCountry({ addressCountry: 'US' }), { valid: true, country: null });
  assert.deepEqual(resolveContextCountry({ addressCountry: 'JP' }), { valid: true, country: null });
  assert.deepEqual(CATALOG_SUPPORTED_COUNTRIES, ['HK', 'SG']);
});

test('formats an internal-only diagnostic marker', () => {
  const marker = formatCatalogDiscoveryFsmMarker({
    state: CatalogDiscoveryState.BROAD_SEARCH_REQUIRED,
    action: CatalogDiscoveryAction.RUN_BROAD_CATALOG_SEARCH,
    reason: 'merchant_intent_match_failed',
  });

  assert.equal(
    marker,
    '[CATALOG_DISCOVERY_FSM] state=BROAD_SEARCH_REQUIRED'
      + ' action=RUN_BROAD_CATALOG_SEARCH reason=merchant_intent_match_failed',
  );
});

test('frozen internal Catalog product reaches checkout guards without productUrl', () => {
  const merchantId = 'mcht_ftmse61a6az0';
  const merchantUrl = 'https://testa.link2shops.com';
  const merchantDomain = 'testa.link2shops.com';
  const itemId = '571d217de068498f8ba545a286900a16';
  const walletOrigin = 'https://uat-api.clinkbill.com';
  const endpoint = `${walletOrigin}/agent/ucp/${merchantId}`;
  const walletStatus = { ok: true, data: { baseUrl: walletOrigin } };
  const discovery = classifyCatalogDiscovery({
    query: '熊猫外卖券',
    catalogEnvironment: 'sandbox',
    catalogLanguage: 'zh-Hans',
    merchantListOutput: { ok: true, data: [{
        domain: merchantUrl,
        merchant_id: merchantId,
        merchant_name: 'Testa Vouchers',
        description: 'Fuhui UAT digital vouchers and coupons',
      }] },
    matchedMerchantId: merchantId,
    merchantSearchOutput: {
      products: [{
        id: itemId,
        title: 'HungryPanda(US)',
        price_range: {
          min: { amount: 100, currency: 'USD' },
          max: { amount: 100, currency: 'USD' },
        },
        variants: [{
          id: itemId,
          title: 'HungryPanda(US)',
          price: { amount: 100, currency: 'USD' },
          availability: { available: true, status: 'in_stock' },
        }],
      }],
    },
  });

  assert.equal(discovery.action, CatalogDiscoveryAction.RETURN_CATALOG_RESULTS);
  assert.equal(discovery.products[0].source, 'INTERNAL_UCP_CATALOG');
  assert.equal(discovery.products[0].merchantUrl, merchantUrl);
  assert.equal(Object.hasOwn(discovery.products[0], 'productUrl'), false);

  const selection = classifyPaymentIntent({
    text: '1',
    pendingCatalogProductSelection: {
      status: 'AWAITING_SELECTION',
      purchaseIntent: true,
      resultMode: 'PURCHASE_SELECTION',
      catalogQuery: '熊猫外卖券',
      catalogEnvironment: 'sandbox',
      catalogLanguage: 'zh-Hans',
      candidates: discovery.products,
    },
  });

  assert.equal(
    selection.action,
    PaymentIntentAction.RUN_UCP_CHECKOUT_FOR_SELECTED_CATALOG_PRODUCT,
  );

  const checkoutIntent = classifyPaymentIntent({
    routingContractVersion: 2,
    requestId: 'request_hungrypanda',
    turnId: 'turn_hungrypanda',
    operation: PaymentRoutingOperation.UCP_CHECKOUT,
    executionDecision: PaymentExecutionDecision.AUTHORIZED,
    authorizationSource: PaymentAuthorizationSource.CURRENT_USER_TURN,
    pendingCatalogProductSelection: selection.pendingCatalogProductSelection,
    selectedProduct: selection.selectedProduct,
    target: {
      source: selection.selectedProduct.source,
      merchantId: selection.selectedProduct.merchantId,
      merchantUrl: selection.selectedProduct.merchantUrl,
      merchantDomain: selection.selectedProduct.merchantDomain,
      itemId: selection.selectedProduct.productId,
      productName: selection.selectedProduct.productName,
      catalogEnvironment: selection.selectedProduct.catalogEnvironment,
      catalogLanguage: selection.selectedProduct.catalogLanguage,
    },
  });

  assert.equal(checkoutIntent.action, PaymentIntentAction.RUN_UCP_CHECKOUT_WORKFLOW);
  assert.equal(checkoutIntent.requiresProductParse, false);
  assert.equal(Object.hasOwn(checkoutIntent, 'productUrl'), false);

  const route = classifyUcpCheckoutRoute({
    merchantUrl: checkoutIntent.merchantUrl,
    walletStatus,
    internalUcpEndpointOutput: {
      domainName: merchantDomain,
      merchantId,
      provider: 'clinkbill',
      endpoint,
    },
  });

  assert.equal(route.action, UcpCheckoutRouteAction.CREATE_INTERNAL_UCP_CHECKOUT);
  assert.equal(route.endpoint, endpoint);

  const prerequisites = classifyUcpCheckoutPrerequisites({
    source: checkoutIntent.source,
    itemId: checkoutIntent.itemId,
    merchantUrl: checkoutIntent.merchantUrl,
    title: checkoutIntent.productName,
    currency: 'USD',
    amountMinor: 100,
    quantity: 1,
    fulfillmentType: 'NO_SHIPPING_REQUIRED',
    paymentInstrumentId: 'pm_test',
    selectedProduct: selection.selectedProduct,
    walletStatus,
  });

  assert.equal(prerequisites.action, UcpCheckoutWorkflowAction.LIST_AUTHORIZATIONS);
});
