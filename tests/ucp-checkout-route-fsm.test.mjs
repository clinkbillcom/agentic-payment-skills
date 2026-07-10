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
    `clink-cli tool internal-ucp get-endpoint --product-url ${modelMaxProductUrl} --sandbox --format json`,
  );
});

test('allows an explicit production environment override for internal endpoint discovery', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: modelMaxProductUrl,
    sandbox: false,
  });

  assert.equal(
    result.command,
    `clink-cli tool internal-ucp get-endpoint --product-url ${modelMaxProductUrl} --format json`,
  );
});

test('quotes internal endpoint discovery product URLs with query parameters', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: `${modelMaxProductUrl}?variant=123&selling_plan=456`,
    sandbox: true,
  });

  assert.equal(
    result.command,
    `clink-cli tool internal-ucp get-endpoint --product-url '${modelMaxProductUrl}?variant=123&selling_plan=456' --sandbox --format json`,
  );
});

test('routes a configured CLI endpoint directly to internal UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: modelMaxProductUrl,
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
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: '{"ucp":true}',
    restEndpointProvider: 'clinkbill',
    restEndpoint: 'https://agent.clinkbill.com/ucp/mcht_123',
  });

  assert.equal(result.state, UcpCheckoutRouteState.INTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.INTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_INTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'internal_ucp_clinkbill_provider');
});

test('routes fallback non-clinkbill providers to external checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: '{"ucp":true}',
    restEndpointProvider: 'otherpay',
    restEndpoint: 'https://pay.example.com/ucp',
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_provider_not_clinkbill_external');
});

test('routes fallback REST endpoint errors to external checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileResponse: '{"ucp":true}',
    getRestEndpointOutput: { error_code: 'NO_UCP_REST_ENDPOINT' },
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_unavailable_external');
});

test('routes profile absence to external checkout after internal list miss', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: unknownProductUrl,
    internalUcpEndpointOutput: { error_code: 'NOT_IN_INTERNAL_UCP_LIST' },
    standardUcpProfileChecked: true,
    standardUcpProfileResponse: '<html>not json</html>',
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_profile_absent');
});

test('asks for route input when a product URL cannot be resolved', () => {
  const result = classifyUcpCheckoutRoute({});

  assert.equal(result.state, UcpCheckoutRouteState.CHECKOUT_ROUTE_INPUT_MISSING);
  assert.equal(result.route, UcpCheckoutRoute.INPUT_REQUIRED);
  assert.equal(result.action, UcpCheckoutRouteAction.ASK_FOR_CHECKOUT_ROUTE_INPUT);
  assert.equal(result.reason, 'product_url_missing');
  assert.deepEqual(result.missing, ['productUrl']);
});
