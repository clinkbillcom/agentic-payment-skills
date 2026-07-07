import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const readmeZh = await readFile(new URL('../README.zh.md', import.meta.url), 'utf8');
const ucpCheckout = await readFile(new URL('../references/clink-ucp-checkout.md', import.meta.url), 'utf8');

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing section start: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test('UCP checkout physical-goods shipping accepts any complete standard address', () => {
  assert.match(skill, /standard complete shipping address/u);
  assert.doesNotMatch(skill, /UCP checkout[\s\S]{0,240}US shipping address/u);

  assert.match(readme, /complete standard shipping address/u);
  assert.doesNotMatch(readme, /UCP checkout[\s\S]{0,240}US shipping address/u);
  assert.match(readmeZh, /完整的标准收货地址/u);
  assert.doesNotMatch(readmeZh, /UCP 商品下单[\s\S]{0,240}美国收货地址/u);
});

test('UCP checkout address reference requires ISO country codes without US-only wording', () => {
  const shippingSection = sectionBetween(
    ucpCheckout,
    '## Step 0.5: Classify Fulfillment And Shipping',
    '## Step 1: Refresh Payment Instrument',
  );

  assert.match(shippingSection, /standard complete shipping address/u);
  assert.match(shippingSection, /ISO 3166-1 alpha-2/u);
  assert.match(shippingSection, /countryCode/u);
  assert.match(shippingSection, /address_country/u);
  assert.doesNotMatch(
    shippingSection,
    /standard US shipping address|one US shipping address|real US address|countryCode` must be `US`|address_country` must be `US`/u,
  );
});
