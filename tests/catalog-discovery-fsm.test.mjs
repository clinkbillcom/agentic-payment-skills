import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CatalogDiscoveryState,
  CatalogDiscoveryAction,
  CATALOG_CHANNEL_EATS365,
  CATALOG_SUPPORTED_COUNTRIES,
  classifyCatalogDiscovery,
  resolveCatalogExt,
  resolveContextCountry,
  formatCatalogDiscoveryFsmMarker,
} from '../lib/catalog-discovery-fsm.mjs';

const bruceLeeMerchant = {
  domain_name: 'www.bruceleeclub.com',
  merchant_id: 'mcht_frnz6yfrz1sd',
  enabled: true,
  description: 'Official online store of Bruce Lee Club. Licensed fan and collector goods: apparel and T-shirts, memorabilia, books, posters, accessories.',
};

const shopifyMerchant = {
  domain_name: 'uebmaw-it.myshopify.com',
  merchant_id: 'mcht_frnagwqi4k43',
  enabled: true,
  description: 'Shopify storefront selling Bruce Lee Club collaboration merchandise, mainly limited-run tops and shirts.',
};

const merchantListOutput = { merchants: [bruceLeeMerchant, shopifyMerchant] };

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
  assert.equal(result.command, 'clink-cli tool internal-ucp get-merchant-list --format json');
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
  assert.match(result.candidates[0].description, /Bruce Lee Club/u);
});

test('drops disabled and description-less merchants from the candidate set', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: {
      merchants: [
        bruceLeeMerchant,
        { ...shopifyMerchant, enabled: false },
        { domain_name: 'silent.example.com', merchant_id: 'mcht_silent' },
      ],
    },
  });

  assert.equal(result.state, CatalogDiscoveryState.MERCHANT_INTENT_MATCH_REQUIRED);
  assert.deepEqual(result.candidates.map((entry) => entry.merchantId), ['mcht_frnz6yfrz1sd']);
});

test('rejects a merchant-list envelope without a merchants array', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: [bruceLeeMerchant],
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.reason, 'invalid_merchant_list_output');
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
    "clink-cli ucp-catalog search --merchant-id mcht_frnz6yfrz1sd --query 'bruce lee t-shirt' --format json",
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
  assert.equal(result.messages.length, 1);
  assert.equal(result.terminal, true);
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
    "clink-cli catalog search --query 'bruce lee t-shirt' --format json",
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
    "clink-cli catalog search --query 'iced matcha latte' --format json",
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
    'clink-cli catalog search --query \'iced matcha latte\''
      + ' --channel-type eats365'
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
    assert.equal(result.command, "clink-cli catalog search --query croissant --format json");
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
    merchantListOutput: JSON.stringify({ ok: true, data: merchantListOutput }),
    matchedMerchantId: 'mcht_frnz6yfrz1sd',
    merchantSearchOutput: JSON.stringify({ ok: true, data: { products: [{ id: 'product_1' }] } }),
  });

  assert.equal(result.state, CatalogDiscoveryState.CATALOG_RESULTS_READY);
  assert.equal(result.productCount, 1);
});

test('surfaces a merchant-list CLI error without falling back to a search', () => {
  const result = classifyCatalogDiscovery({
    query: 'bruce lee t-shirt',
    merchantListOutput: { ok: false, error: { type: 'config_error', message: 'run wallet init' } },
  });

  assert.equal(result.state, CatalogDiscoveryState.CLI_ERROR);
  assert.equal(result.action, CatalogDiscoveryAction.SURFACE_ERROR);
  assert.equal(result.reason, 'merchant_list_error');
  assert.equal(result.errorCode, 'config_error');
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
