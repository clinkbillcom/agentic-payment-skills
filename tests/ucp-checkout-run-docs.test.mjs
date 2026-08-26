import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [packageJson, skill, reference, readme, readmeZh] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../SKILL.md', import.meta.url), 'utf8'),
  readFile(new URL('../references/clink-ucp-checkout.md', import.meta.url), 'utf8'),
  readFile(new URL('../README.md', import.meta.url), 'utf8'),
  readFile(new URL('../README.zh.md', import.meta.url), 'utf8'),
]);

test('feature version is synchronized across package and Skill metadata', () => {
  assert.equal(packageJson.version, '1.14.0');
  assert.match(skill, /version: "1\.14\.0"/u);
});

test('Skill documents the single foreground aggregate checkout contract', () => {
  for (const token of [
    '`RUN_UCP_CHECKOUT`',
    '`CLAIM_UCP_CHECKOUT_ATTEMPT`',
    '`FIX_CHECKOUT_RUN_GATES`',
    '`FIX_CHECKOUT_RUN_INPUT`',
    '`RETURN_UCP_CHECKOUT_COMPLETED`',
    '`RETURN_UCP_DELIVERY_READY`',
    '`RETURN_UCP_DELIVERY_FAILED`',
    '`RESUME_UCP_CHECKOUT_READ_ONLY`',
    'classifyUcpCheckoutRunRequest',
    'classifyUcpCheckoutRunObservation',
    'classifyUcpCheckoutRunResumeObservation',
    'explicitPurchaseAuthorized=true',
  ]) {
    assert.ok(skill.includes(token), `${token} must stay documented`);
  }
  assert.match(skill, /one foreground `clink ucp-checkout run/u);
  assert.match(skill, /Do not query `--help`[\s\S]*?fixed `sleep`/u);
});

test('UCP reference uses final gate names and no manual mutation sequence', () => {
  for (const gate of [
    'productSelectionFrozen=true',
    'fulfillmentAndAddressReady=true',
    'paymentInstrumentReady=true',
    'authorizationGatePassed=true',
    'restrictedCategoryGatePassed=true',
    'checkoutRouteResolved=true',
    'checkoutExecutionClaimed=false',
    'explicitPurchaseAuthorized=true',
  ]) {
    assert.ok(reference.includes(gate), `${gate} must stay in the run contract`);
  }
  assert.doesNotMatch(reference, /^clink ucp-checkout create /mu);
  assert.doesNotMatch(reference, /^clink ucp-checkout complete /mu);
  assert.doesNotMatch(reference, /^clink events poll --type agent_order\.succeeded/mu);
  assert.doesNotMatch(reference, /freeze `endpoint=null`/u);
  assert.match(reference, /canonical same-wallet-origin HTTPS `endpoint`/u);
  assert.match(reference, /ordinary checkout envelope with `classifyUcpCheckoutRunResumeObservation`/u);
  assert.match(reference, /stage=create,status=ready_for_complete\|processing\|pending/u);
  assert.match(reference, /stage=complete,status=complete_in_progress\|processing\|pending\|ready_for_complete/u);
  assert.match(reference, /different returned order ID fails closed/u);
  assert.match(reference, /Every nested field named `amount` or `price`[\s\S]*decimal string/u);
  assert.match(reference, /derive `<wallet_origin>\/agent\/ucp\/external`/u);
  assert.match(reference, /\[--buyer '<frozen_canonical_buyer_json>'\]/u);
  assert.match(reference, /intentionally rejects `--instruction-id` and `--mandate-id`/u);
  assert.match(reference, /Never use a fixed `sleep`, runtime `--help`/u);
});

test('English and Chinese READMEs adopt the aggregate command', () => {
  assert.match(readme, /one foreground `clink ucp-checkout run/u);
  assert.match(readme, /do not query `--help` at runtime, sleep, background it/u);
  assert.match(readmeZh, /前台方式执行一次 `clink ucp-checkout run/u);
  assert.match(readmeZh, /不得查询 `--help`、固定 `sleep`、转后台/u);
});

test('UCP docs freeze claim, endpoint, environment, and aggregate recovery invariants', () => {
  assert.match(reference, /CLAIM_UCP_CHECKOUT_ATTEMPT/u);
  assert.match(reference, /AWAITING_EXECUTION` to `EXECUTING/u);
  assert.match(reference, /already `EXECUTING` or `CONSUMED`[\s\S]*replay returns no command/u);
  assert.match(reference, /nonempty unique frozen `checkoutAttemptId`/u);

  assert.match(reference, /absolute HTTPS URL[\s\S]*no credentials, query, or fragment/u);
  assert.match(reference, /default HTTPS port[\s\S]*strips trailing slashes/u);
  assert.match(reference, /canonical endpoint origin must exactly equal.*wallet-status origin/u);
  assert.match(reference, /cross-origin non-clinkbill endpoint is terminal/u);

  assert.match(reference, /CLINK_BASE_URL=<frozen_wallet_origin>/u);
  assert.match(reference, /read-only resume validator requires and preserves the exact `CLINK_BASE_URL/u);
  assert.match(reference, /stage=create,status=ready_for_complete\|processing\|pending[\s\S]*payment was not submitted/u);
  assert.match(reference, /stage=complete,status=unknown[\s\S]*GET reconciliation/u);

  assert.match(reference, /ready=true.*timedOut=false.*status=ready/u);
  assert.match(reference, /ready=false.*timedOut=false.*status=failed/u);
  assert.match(reference, /ready=false.*timedOut=true/u);
  assert.match(reference, /`delivery` may be null/u);
  assert.match(reference, /Top-level `checkoutId` \/ `checkout_id`[\s\S]*must all be nonempty strings and agree/u);
  assert.match(reference, /normal completed bundle places the order under `complete\.order`/u);
  assert.match(reference, /blank, null, non-string, or conflicting alias fails closed/u);
});
