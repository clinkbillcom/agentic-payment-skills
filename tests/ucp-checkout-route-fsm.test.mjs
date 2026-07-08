import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UcpCheckoutRouteState,
  UcpCheckoutRoute,
  UcpCheckoutRouteAction,
  classifyUcpCheckoutRoute,
} from '../lib/ucp-checkout-route-fsm.mjs';

test('requires REST endpoint discovery for Bruce Lee Club standard candidate', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'www.bruceleeclub.com',
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
  });

  assert.equal(result.state, UcpCheckoutRouteState.REST_ENDPOINT_REQUIRED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_REST_ENDPOINT_DISCOVERY);
  assert.equal(result.action, UcpCheckoutRouteAction.GET_REST_ENDPOINT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_required');
  assert.equal(result.merchantDomain, 'www.bruceleeclub.com');
  assert.match(result.command, /clink-cli tool get-rest-endpoint --url https:\/\/www\.bruceleeclub\.com\/products\/bruce-lee-toy-nunchakus-yellow --format json/u);
});

test('quotes REST endpoint discovery URL when the selected item URL has query parameters', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'www.bruceleeclub.com',
    selectedItemUrl: 'https://www.bruceleeclub.com/products/wax?variant=123&selling_plan=456',
  });

  assert.equal(result.state, UcpCheckoutRouteState.REST_ENDPOINT_REQUIRED);
  assert.equal(
    result.command,
    "clink-cli tool get-rest-endpoint --url 'https://www.bruceleeclub.com/products/wax?variant=123&selling_plan=456' --format json",
  );
});

test('routes clinkbill REST endpoint discovery output to standard UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
    restEndpointProvider: 'clinkbill',
    restEndpoint: 'https://agent.clinkbill.com/ucp',
  });

  assert.equal(result.state, UcpCheckoutRouteState.STANDARD_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_STANDARD_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_clinkbill_provider');
  assert.equal(result.merchantDomain, 'www.bruceleeclub.com');
  assert.equal(result.provider, 'clinkbill');
  assert.equal(result.endpoint, 'https://agent.clinkbill.com/ucp');
});

test('routes non-clinkbill REST endpoint discovery output to external UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'shop.example.com',
    standardUcpProfileResponse: '{"provider":"otherpay","endpoint":"https://pay.example.com/ucp"}',
    restEndpointProvider: 'otherpay',
    restEndpoint: 'https://pay.example.com/ucp',
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_provider_not_clinkbill_external');
  assert.equal(result.merchantDomain, 'shop.example.com');
  assert.equal(result.provider, 'otherpay');
});

test('routes REST endpoint discovery error envelope to external UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
    getRestEndpointOutput: JSON.stringify({
      ok: false,
      error: {
        code: 'NO_UCP_REST_ENDPOINT',
        message: 'No UCP REST endpoint was found',
      },
    }),
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_unavailable_external');
  assert.equal(result.errorCode, 'NO_UCP_REST_ENDPOINT');
});

test('routes REST endpoint discovery error envelope without code to external UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
    getRestEndpointOutput: JSON.stringify({
      ok: false,
      error: {
        type: 'ApiError',
        message: 'No UCP REST endpoint was found',
      },
    }),
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_unavailable_external');
  assert.equal(result.errorCode, 'ApiError');
});

test('routes invalid REST endpoint discovery output to external UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
    getRestEndpointOutput: '<html>not json</html>',
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_unavailable_external');
  assert.equal(result.errorCode, 'invalid_get_rest_endpoint_output');
});

test('routes REST endpoint discovery failed envelope without error body to external UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
    getRestEndpointOutput: JSON.stringify({ ok: false }),
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_unavailable_external');
  assert.equal(result.errorCode, 'get_rest_endpoint_failed');
});

test('checks non-allowlisted domains for a standard UCP profile before external checkout', () => {
  const result = classifyUcpCheckoutRoute({
    merchantOrigin: 'https://crazy-store-e9vyrbxn.myshopify.com',
  });

  assert.equal(result.state, UcpCheckoutRouteState.STANDARD_PROFILE_CHECK_REQUIRED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_PROFILE_CHECK);
  assert.equal(result.action, UcpCheckoutRouteAction.CHECK_STANDARD_UCP_PROFILE);
  assert.equal(result.reason, 'standard_ucp_profile_check_required');
  assert.equal(result.merchantDomain, 'crazy-store-e9vyrbxn.myshopify.com');
  assert.equal(result.profileUrl, 'https://crazy-store-e9vyrbxn.myshopify.com/.well-known/ucp-clink');
  assert.match(result.command, /curl .*https:\/\/crazy-store-e9vyrbxn\.myshopify\.com\/\.well-known\/ucp-clink/u);
});

test('requires REST endpoint discovery when non-allowlisted domains have a JSON standard UCP profile', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'shop.example.com',
    standardUcpProfileResponse: '{"checkout":{"create":"/agent/ucp/checkout-sessions"}}',
  });

  assert.equal(result.state, UcpCheckoutRouteState.REST_ENDPOINT_REQUIRED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_REST_ENDPOINT_DISCOVERY);
  assert.equal(result.action, UcpCheckoutRouteAction.GET_REST_ENDPOINT);
  assert.equal(result.reason, 'standard_ucp_rest_endpoint_required');
  assert.equal(result.merchantDomain, 'shop.example.com');
  assert.equal(result.profileUrl, 'https://shop.example.com/.well-known/ucp-clink');
  assert.match(result.command, /clink-cli tool get-rest-endpoint --url https:\/\/shop\.example\.com --format json/u);
});

test('uses the standard profile shopping endpoint for REST endpoint discovery when present', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'shop.example.com',
    standardUcpProfileResponse: JSON.stringify({
      services: {
        'dev.ucp.shopping': [
          {
            transport: 'rest',
            endpoint: 'https://agent.clinkbill.com/ucp/mcht_123',
          },
        ],
      },
    }),
  });

  assert.equal(result.state, UcpCheckoutRouteState.REST_ENDPOINT_REQUIRED);
  assert.equal(result.action, UcpCheckoutRouteAction.GET_REST_ENDPOINT);
  assert.equal(result.restEndpointUrl, 'https://agent.clinkbill.com/ucp/mcht_123');
  assert.match(result.command, /clink-cli tool get-rest-endpoint --url https:\/\/agent\.clinkbill\.com\/ucp\/mcht_123 --format json/u);
});

test('routes non-allowlisted domains to external checkout after the standard profile check fails', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'bruceleeclub.com',
    standardUcpProfileChecked: true,
    standardUcpProfileResponse: '<html>not json</html>',
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_profile_absent');
});

test('asks for route input when merchant domain cannot be resolved', () => {
  const result = classifyUcpCheckoutRoute({});

  assert.equal(result.state, UcpCheckoutRouteState.CHECKOUT_ROUTE_INPUT_MISSING);
  assert.equal(result.route, UcpCheckoutRoute.INPUT_REQUIRED);
  assert.equal(result.action, UcpCheckoutRouteAction.ASK_FOR_CHECKOUT_ROUTE_INPUT);
  assert.equal(result.reason, 'merchant_domain_missing');
  assert.deepEqual(result.missing, ['merchantDomain']);
});
