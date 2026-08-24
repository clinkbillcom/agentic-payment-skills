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
  assert.equal(packageJson.version, '1.13.0');
  assert.match(skill, /version: "1\.13\.0"/u);
});

test('Skill documents the single foreground aggregate checkout contract', () => {
  for (const token of [
    '`RUN_UCP_CHECKOUT`',
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
    'explicitPurchaseAuthorized=true',
  ]) {
    assert.ok(reference.includes(gate), `${gate} must stay in the run contract`);
  }
  assert.doesNotMatch(reference, /^clink ucp-checkout create /mu);
  assert.doesNotMatch(reference, /^clink ucp-checkout complete /mu);
  assert.doesNotMatch(reference, /^clink events poll --type agent_order\.succeeded/mu);
  assert.doesNotMatch(reference, /freeze `endpoint=null`/u);
  assert.match(reference, /resolved `endpoint` for either route/u);
  assert.match(reference, /ordinary checkout envelope with `classifyUcpCheckoutRunResumeObservation`/u);
  assert.match(reference, /Never use a fixed `sleep`, runtime `--help`/u);
});

test('English and Chinese READMEs adopt the aggregate command', () => {
  assert.match(readme, /one foreground `clink ucp-checkout run/u);
  assert.match(readme, /do not query `--help` at runtime, sleep, background it/u);
  assert.match(readmeZh, /只以前台方式执行一次 `clink ucp-checkout run/u);
  assert.match(readmeZh, /不得查询 `--help`、固定 `sleep`、转后台/u);
});
