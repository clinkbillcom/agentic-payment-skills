import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UcpCheckoutRouteState,
  UcpCheckoutRoute,
  UcpCheckoutRouteAction,
  classifyUcpCheckoutRoute,
} from '../lib/ucp-checkout-route-fsm.mjs';

test('routes Bruce Lee Club domain to standard UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'www.bruceleeclub.com',
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
  });

  assert.equal(result.state, UcpCheckoutRouteState.STANDARD_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_STANDARD_UCP_CHECKOUT);
  assert.equal(result.reason, 'standard_ucp_domain_match');
  assert.equal(result.merchantDomain, 'www.bruceleeclub.com');
});

test('derives Bruce Lee Club domain from selected item URL', () => {
  const result = classifyUcpCheckoutRoute({
    selectedItemUrl: 'https://www.bruceleeclub.com/products/bruce-lee-toy-nunchakus-yellow',
  });

  assert.equal(result.state, UcpCheckoutRouteState.STANDARD_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.STANDARD_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_STANDARD_UCP_CHECKOUT);
  assert.equal(result.merchantDomain, 'www.bruceleeclub.com');
});

test('routes non-standard domains to external UCP checkout', () => {
  const result = classifyUcpCheckoutRoute({
    merchantOrigin: 'https://crazy-store-e9vyrbxn.myshopify.com',
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'external_ucp_default');
  assert.equal(result.merchantDomain, 'crazy-store-e9vyrbxn.myshopify.com');
});

test('does not treat apex Bruce Lee Club domain as standard without explicit allowlist entry', () => {
  const result = classifyUcpCheckoutRoute({
    merchantDomain: 'bruceleeclub.com',
  });

  assert.equal(result.state, UcpCheckoutRouteState.EXTERNAL_ROUTE_SELECTED);
  assert.equal(result.route, UcpCheckoutRoute.EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.action, UcpCheckoutRouteAction.CREATE_EXTERNAL_UCP_CHECKOUT);
  assert.equal(result.reason, 'external_ucp_default');
});

test('asks for route input when merchant domain cannot be resolved', () => {
  const result = classifyUcpCheckoutRoute({});

  assert.equal(result.state, UcpCheckoutRouteState.CHECKOUT_ROUTE_INPUT_MISSING);
  assert.equal(result.route, UcpCheckoutRoute.INPUT_REQUIRED);
  assert.equal(result.action, UcpCheckoutRouteAction.ASK_FOR_CHECKOUT_ROUTE_INPUT);
  assert.equal(result.reason, 'merchant_domain_missing');
  assert.deepEqual(result.missing, ['merchantDomain']);
});
