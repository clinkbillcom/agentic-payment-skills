import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UcpCheckoutRouteState,
  UcpCheckoutRoute,
  UcpCheckoutRouteAction,
  classifyUcpCheckoutRoute,
} from '../lib/ucp-checkout-route-fsm.mjs';

const modelMaxProductUrl = 'https://modelmax-store-uat.myshopify.com/products/demo';
const unknownProductUrl = 'https://shop.example.com/products/demo';
const internalEndpoint = 'https://uat-api.clinkbill.com/agent/ucp/mcht_fcq09yoqqink';
const walletOrigin = 'https://uat-api.clinkbill.com';
const externalEndpoint = `${walletOrigin}/agent/ucp/external`;
const walletStatus = { ok: true, data: { baseUrl: walletOrigin } };

function classifyExternalGatewayFallback(walletEvidence = {}) {
  return classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: '{"ucp":true}',
    restEndpointProvider: 'otherpay',
    ...walletEvidence,
  });
}

test('requests CLI internal endpoint discovery before any profile probe', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: modelMaxProductUrl,
  });

  assert.equal(result.state, UcpCheckoutRouteState.INTERNAL_ENDPOINT_REQUIRED);
  assert.equal(result.route, UcpCheckoutRoute.INTERNAL_UCP_ENDPOINT_DISCOVERY);
  assert.equal(result.action, UcpCheckoutRouteAction.GET_INTERNAL_UCP_ENDPOINT);
  assert.equal(result.reason, 'internal_ucp_endpoint_required');
  assert.equal(result.productUrl, modelMaxProductUrl);
  assert.equal(
    result.command,
    `clink tool internal-ucp get-endpoint --product-url ${modelMaxProductUrl} --format json`,
  );
});

test('ignores legacy sandbox input and never emits an environment flag', () => {
  for (const environmentHint of [undefined, true, false]) {
    const result = classifyUcpCheckoutRoute({
      selectedItemUrl: modelMaxProductUrl,
      ...(environmentHint === undefined ? {} : { sandbox: environmentHint }),
    });

    assert.equal(
      result.command,
      `clink tool internal-ucp get-endpoint --product-url ${modelMaxProductUrl} --format json`,
    );
    assert.doesNotMatch(result.command, /--sandbox|--test|--base-url/u);
  }
});

test('quotes internal endpoint discovery product URLs with query parameters', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: `${modelMaxProductUrl}?variant=123&selling_plan=456`,
  });

  assert.equal(
    result.command,
    `clink tool internal-ucp get-endpoint --product-url '${modelMaxProductUrl}?variant=123&selling_plan=456' --format json`,
  );
});

test('routes a configured CLI endpoint directly to internal UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: modelMaxProductUrl,
    walletStatus,
    internalUcpEndpointOutput: {
      domainName: 'modelmax-store-uat.myshopify.com',
      merchantId: 'mcht_fcq09yoqqink',
      provider: 'clinkbill',
      endpoint: internalEndpoint,
    },
  });

  assert.equal(result.state, UcpCheckoutRouteState.INTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.INTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_INTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'internal_ucp_cli_endpoint_resolved');
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, internalEndpoint);
  assert.equal(result.provider, 'clinkbill');
  assert.equal(result.merchantId, 'mcht_fcq09yoqqink');
});

test('falls back to standard profile discovery only for NOT_IN_INTERNAL_UCP_LIST', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
  });

  assert.equal(result.state, UcpCheckoutRouteState.STANDARD_PROFILE_CHECK_REQUIRED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_PROFILE_CHECK);
  assert.equal(result.action, UcpCheckoutRouteAction.CHECK_STANDARD_UCP_PROFILE);
  assert.equal(result.reason, 'standard_ucp_profile_check_required');
  assert.equal(result.profileUrl, 'https://shop.example.com/.well-known/ucp-clink');
});

test('surfaces unexpected internal endpoint CLI errors without profile fallback', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: {
      ok: false,
      error: { code: 'CONFIG_INVALID', message: 'invalid internal config' },
    },
  });

  assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
  assert.equal(result.route, UcpCheckoutRoute.ERROR);
  assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
  assert.equal(result.reason, 'internal_ucp_endpoint_error');
  assert.equal(result.errorCode, 'CONFIG_INVALID');
});

test('surfaces malformed internal endpoint output without profile fallback', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: '<html>not json</html>',
  });

  assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
  assert.equal(result.reason, 'invalid_internal_ucp_endpoint_output');
});

test('requires REST endpoint discovery after fallback finds a JSON standard profile', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: JSON.stringify({
      services: {
        'dev.ucp.shopping': [{ transport: 'rest', endpoint: 'https://agent.clinkbill.com/ucp/mcht_123' }],
      },
    }),
  });

  assert.equal(result.state, UcpCheckoutRouteState.REST_ENDPOINT_REQUIRED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_REST_ENDPOINT_DISCOVERY);
  assert.equal(result.action, UcpCheckoutRouteAction.GET_REST_ENDPOINT);
  assert.equal(result.restEndpointUrl, 'https://agent.clinkbill.com/ucp/mcht_123');
});

test('routes fallback clinkbill provider discovery to internal UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    walletStatus,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: '{"ucp":true}',
    restEndpointProvider: 'clinkbill',
    restEndpoint: `${walletOrigin}/agent/ucp/mcht_123`,
  });

  assert.equal(result.state, UcpCheckoutRouteState.INTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.INTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_INTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'internal_ucp_clinkbill_provider');
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, `${walletOrigin}/agent/ucp/mcht_123`);
});

test('fails closed when fallback clinkbill discovery has no safe endpoint', () => {
  for (const endpoint of [
    undefined,
    'not-a-url',
    'http://uat-api.clinkbill.com/agent/ucp/mcht_123',
    'ftp://agent.clinkbill.com/ucp/mcht_123',
    'https://user:secret@agent.clinkbill.com/ucp/mcht_123',
    'https://agent.clinkbill.com/ucp/mcht_123?environment=other',
    'https://agent.clinkbill.com/ucp/mcht_123#other',
  ]) {
    const result = classifyUcpCheckoutRoute({
      selectedItemUrl: unknownProductUrl,
      walletStatus,
      internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
      standardUcpProfileResponse: '{"ucp":true}',
      restEndpointProvider: 'clinkbill',
      ...(endpoint === undefined ? {} : { restEndpoint: endpoint }),
    });

    assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
    assert.equal(result.route, UcpCheckoutRoute.ERROR);
    assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
    assert.equal(result.reason, 'invalid_standard_ucp_internal_endpoint');
    assert.equal(result.endpoint, undefined);
  }
});

test('routes fallback non-clinkbill providers to external checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    walletStatus,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: '{"ucp":true}',
    restEndpointProvider: 'otherpay',
    restEndpoint: `${walletOrigin}/partners/otherpay/ucp/`,
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_provider_not_clinkbill_external');
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, `${walletOrigin}/partners/otherpay/ucp`);
});

test('derives the wallet external endpoint when a non-clinkbill provider omits its endpoint', () => {
  const result = classifyExternalGatewayFallback({ walletStatus });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_provider_not_clinkbill_external');
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, externalEndpoint);
});

test('routes fallback REST endpoint errors to external checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: '{"ucp":true}',
    getRestEndpointOutput: { error_code: 'NO_UCP_REST_ENDPOINT' },
    walletStatus,
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_unavailable_external');
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, externalEndpoint);
});

test('routes profile absence to external checkout after internal list miss', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileChecked: true,
    standardUcpProfileResponse: '<html>not json</html>',
    walletStatus,
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_profile_absent');
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, externalEndpoint);
});

test('fails closed on every wallet-gateway fallback when wallet status is missing', () => {
  const inputs = [
    {
      selectedItemUrl: unknownProductUrl,
      internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
      standardUcpProfileResponse: '{"ucp":true}',
      restEndpointProvider: 'otherpay',
    },
    {
      selectedItemUrl: unknownProductUrl,
      internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
      standardUcpProfileResponse: '{"ucp":true}',
      getRestEndpointOutput: { error_code: 'NO_UCP_REST_ENDPOINT' },
    },
    {
      selectedItemUrl: unknownProductUrl,
      internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
      standardUcpProfileChecked: true,
      standardUcpProfileResponse: '<html>not json</html>',
    },
  ];

  for (const input of inputs) {
    const result = classifyUcpCheckoutRoute(input);
    assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
    assert.equal(result.route, UcpCheckoutRoute.ERROR);
    assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
    assert.equal(result.reason, 'external_checkout_wallet_environment_unverified');
    assert.equal(result.endpoint, undefined);
  }
});

test('fails closed on malformed, unsuccessful, or unsafe wallet-status evidence', () => {
  const evidenceCases = [
    {},
    { walletStatus: 'not-json' },
    { walletStatus: { ok: false, data: { baseUrl: walletOrigin } } },
    {
      walletStatus: {
        ok: true,
        data: { baseUrl: walletOrigin },
        error: { code: 'STATUS_FAILED' },
      },
    },
    { walletStatus: { ok: true, data: {} } },
    { walletStatus: { ok: true, data: { baseUrl: 'not-a-url' } } },
    { walletStatus: { ok: true, data: { baseUrl: 'http://uat-api.clinkbill.com' } } },
    { walletStatus: { ok: true, data: { baseUrl: 'ftp://api.clinkbill.com' } } },
    { walletStatus: { ok: true, data: { baseUrl: 'https://user:secret@api.clinkbill.com' } } },
  ];

  for (const evidence of evidenceCases) {
    const result = classifyExternalGatewayFallback(evidence);
    assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
    assert.equal(result.route, UcpCheckoutRoute.ERROR);
    assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
    assert.equal(result.reason, 'external_checkout_wallet_environment_unverified');
    assert.equal(result.endpoint, undefined);
  }
});

test('fails closed when wallet-status or explicit base-URL evidence conflicts', () => {
  const otherOrigin = 'https://api.clinkbill.com';
  const evidenceCases = [
    {
      walletStatus,
      wallet_status: { ok: true, data: { baseUrl: otherOrigin } },
    },
    {
      walletStatus: {
        ok: true,
        data: { baseUrl: walletOrigin, base_url: otherOrigin },
      },
    },
    { walletStatus, walletBaseUrl: otherOrigin },
    { walletStatus, walletBaseUrl: walletOrigin, wallet_base_url: otherOrigin },
  ];

  for (const evidence of evidenceCases) {
    const result = classifyExternalGatewayFallback(evidence);
    assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
    assert.equal(result.route, UcpCheckoutRoute.ERROR);
    assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
    assert.equal(result.reason, 'external_checkout_wallet_environment_conflict');
    assert.equal(result.endpoint, undefined);
  }
});

test('accepts consistent wallet-status aliases and freezes their normalized origin', () => {
  const result = classifyExternalGatewayFallback({
    walletStatus: JSON.stringify({
      ok: true,
      data: { baseUrl: `${walletOrigin}/wallet-status?source=cli` },
    }),
    wallet_status: { base_url: `${walletOrigin}/` },
    walletBaseUrl: walletOrigin,
    wallet_base_url: `${walletOrigin}/api`,
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, externalEndpoint);
});

test('rejects an unsafe resolved non-clinkbill endpoint instead of falling back', () => {
  const endpoints = [
    'not-a-url',
    'http://uat-api.clinkbill.com/ucp',
    'ftp://pay.example.com/ucp',
    'https://user:secret@pay.example.com/ucp',
    'https://pay.example.com/ucp?environment=other',
    'https://pay.example.com/ucp#other',
  ];

  for (const endpoint of endpoints) {
    const result = classifyUcpCheckoutRoute({
      selectedItemUrl: unknownProductUrl,
      internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
      standardUcpProfileResponse: '{"ucp":true}',
      restEndpointProvider: 'otherpay',
      restEndpoint: endpoint,
      walletStatus,
    });

    assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
    assert.equal(result.route, UcpCheckoutRoute.ERROR);
    assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
    assert.equal(result.reason, 'invalid_standard_ucp_external_endpoint');
    assert.equal(result.endpoint, undefined);
  }
});

test('requires authoritative wallet evidence for every selected endpoint route', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: modelMaxProductUrl,
    internalUcpEndpointOutput: {
      domainName: 'modelmax-store-uat.myshopify.com',
      merchantId: 'mcht_fcq09yoqqink',
      provider: 'clinkbill',
      endpoint: internalEndpoint,
    },
  });

  assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
  assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
  assert.equal(result.reason, 'external_checkout_wallet_environment_unverified');
  assert.equal(result.endpoint, undefined);
});

test('fails closed when any resolved endpoint is not same-origin with the frozen wallet', () => {
  const cases = [
    {
      internalUcpEndpointOutput: {
        domainName: 'modelmax-store-uat.myshopify.com',
        merchantId: 'mcht_fcq09yoqqink',
        provider: 'clinkbill',
        endpoint: 'https://api.clinkbill.com/agent/ucp/mcht_123',
      },
    },
    {
      internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
      standardUcpProfileResponse: '{"ucp":true}',
      restEndpointProvider: 'clinkbill',
      restEndpoint: 'https://api.clinkbill.com/agent/ucp/mcht_123',
    },
    {
      internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
      standardUcpProfileResponse: '{"ucp":true}',
      restEndpointProvider: 'otherpay',
      restEndpoint: 'https://pay.example.com/ucp',
    },
  ];

  for (const routeCase of cases) {
    const result = classifyUcpCheckoutRoute({
      selectedItemUrl: unknownProductUrl,
      walletStatus,
      ...routeCase,
    });
    assert.equal(result.state, UcpCheckoutRouteState.CLI_ERROR);
    assert.equal(result.action, UcpCheckoutRouteAction.SURFACE_ERROR);
    assert.equal(result.reason, 'checkout_endpoint_wallet_environment_conflict');
    assert.equal(result.endpoint, undefined);
  }
});

test('freezes canonical HTTPS wallet origin and endpoint like the CLI bundle', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: modelMaxProductUrl,
    walletStatus: {
      ok: true,
      data: { baseUrl: 'https://UAT-API.CLINKBILL.COM:443/wallet/status?source=cli' },
    },
    internalUcpEndpointOutput: {
      domainName: 'modelmax-store-uat.myshopify.com',
      merchantId: 'mcht_fcq09yoqqink',
      provider: 'clinkbill',
      endpoint: 'https://UAT-API.CLINKBILL.COM:443/agent/ucp/mcht_123///',
    },
  });

  assert.equal(result.state, UcpCheckoutRouteState.INTERNAL_ROUTE_SELECTED);
  assert.equal(result.walletOrigin, walletOrigin);
  assert.equal(result.endpoint, `${walletOrigin}/agent/ucp/mcht_123`);
});

test('asks for route input when a product URL cannot be resolved', () => {
  const result = classifyUcpCheckoutRoute({});

  assert.equal(result.state, UcpCheckoutRouteState.CHECKOUT_ROUTE_INPUT_MISSING);
  assert.equal(result.route, UcpCheckoutRoute.INPUT_REQUIRED);
  assert.equal(result.action, UcpCheckoutRouteAction.ASK_FOR_CHECKOUT_ROUTE_INPUT);
  assert.equal(result.reason, 'product_url_missing');
  assert.deepEqual(result.missing, ['productUrl']);
});
