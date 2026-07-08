import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const readmeZh = await readFile(new URL('../README.zh.md', import.meta.url), 'utf8');
const walletConfig = await readFile(new URL('../references/clink-wallet-config.md', import.meta.url), 'utf8');
const paymentRefund = await readFile(new URL('../references/clink-payment-refund.md', import.meta.url), 'utf8');
const ucpCheckout = await readFile(new URL('../references/clink-ucp-checkout.md', import.meta.url), 'utf8');

test('skill frontmatter stays compact and trigger-focused', () => {
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? '';
  const description = frontmatter.match(/^description:\s*"?(.+?)"?$/mu)?.[1] ?? '';

  assert.ok(frontmatter.length <= 1024, `frontmatter length ${frontmatter.length} exceeds 1024`);
  assert.match(description, /^Use when/u);
});

test('main skill routes direct and session pay through authorization resolver before pay', () => {
  assert.match(skill, /lib\/authorization-workflow-fsm\.mjs/u);
  assert.match(skill, /AUTHORIZATION_FSM/u);
  assert.match(skill, /Direct\/session payment is explicitly authorized/u);
  assert.match(skill, /Visa \+ VIC ready/u);
  assert.match(skill, /non-Visa or Visa without VIC readiness/u);
  assert.doesNotMatch(skill, /Direct\/session non-Visa payment is explicitly authorized \| Run `clink-cli pay`/u);
});

test('payment reference documents Visa VIC resolver bypass branch', () => {
  assert.match(paymentRefund, /Direct\/Session Pay Authorization Resolver/u);
  assert.match(paymentRefund, /non-Visa/u);
  assert.match(paymentRefund, /Visa but VIC is not enabled/u);
  assert.match(paymentRefund, /bypass instruction matching/u);
  assert.match(paymentRefund, /Visa \+ VIC ready/u);
});

test('wallet init documents email OTP recovery flow', () => {
  assert.match(walletConfig, /BOOTSTRAP_OTP_REQUIRED/u);
  assert.match(walletConfig, /71160015/u);
  assert.match(walletConfig, /Verification code has been sent to this email/u);
  assert.match(walletConfig, /clink-cli wallet init --email <email> --name <name> --otp <email_otp> --format json/u);
  assert.match(skill, /lib\/wallet-workflow-fsm\.mjs/u);
  assert.match(skill, /WALLET_FSM/u);
  assert.match(skill, /--otp <email_otp>/u);
});

test('UCP checkout workflow uses parse-item as the product analysis command', () => {
  assert.match(skill, /clink-cli tool parse-item --url <item_url>/u);
  assert.match(ucpCheckout, /clink-cli tool parse-item --url <item_url>/u);
  assert.match(ucpCheckout, /parse-item returns product-page facts/u);
  assert.match(ucpCheckout, /quantity comes from the user intent/u);
  assert.match(ucpCheckout, /merchantCategoryCode comes from agent classification/u);
  assert.doesNotMatch(skill, /clink-cli tool item-id/u);
  assert.doesNotMatch(ucpCheckout, /clink-cli tool item-id/u);
});

test('skill documents intent routing and checkout route FSMs', () => {
  assert.match(skill, /lib\/payment-intent-router-fsm\.mjs/u);
  assert.match(skill, /PAYMENT_INTENT_FSM/u);
  assert.match(skill, /explicit buy\/order\/checkout language or an upstream purchaseIntent/u);
  assert.match(skill, /lib\/ucp-checkout-route-fsm\.mjs/u);
  assert.match(skill, /UCP_CHECKOUT_ROUTE_FSM/u);
});

test('UCP checkout route probes standard UCP profile before external default', () => {
  assert.match(ucpCheckout, /known standard UCP domain allowlist/u);
  assert.match(ucpCheckout, /www\.bruceleeclub\.com/u);
  assert.match(ucpCheckout, /\.well-known\/ucp-clink/u);
  assert.match(ucpCheckout, /parseable JSON/u);
  assert.match(ucpCheckout, /clink-cli tool get-rest-endpoint --url <standard_ucp_url> --format json/u);
  assert.match(ucpCheckout, /services\.\*\.endpoint/u);
  assert.match(ucpCheckout, /provider.*clinkbill/u);
  assert.match(ucpCheckout, /provider.*not.*clinkbill.*external/u);
  assert.match(ucpCheckout, /--endpoint <rest_endpoint>/u);
  assert.match(ucpCheckout, /standard_ucp_profile_absent/u);
});

test('README summaries include the standard UCP provider gate', () => {
  assert.match(readme, /get-rest-endpoint/u);
  assert.match(readme, /provider.*clinkbill/u);
  assert.match(readme, /external checkout/u);
  assert.match(readmeZh, /get-rest-endpoint/u);
  assert.match(readmeZh, /provider.*clinkbill/u);
  assert.match(readmeZh, /external checkout/u);
});
