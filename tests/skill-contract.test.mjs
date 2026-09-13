import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const skillPath = join(root, 'SKILL.md');
const skill = await readFile(skillPath, 'utf8');
const readme = await readFile(join(root, 'README.md'), 'utf8');
const readmeZh = await readFile(join(root, 'README.zh.md'), 'utf8');
const agent = await readFile(join(root, 'agents', 'openai.yaml'), 'utf8');
const pendingReference = await readFile(
  join(root, 'references', 'visa-pending-instructions.md'),
  'utf8',
);
const combined = [skill, readme, readmeZh, agent].join('\n');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const vendorPackage = JSON.parse(
  await readFile(join(root, 'vendor', 'visa-cli', 'package.json'), 'utf8'),
);

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

test('package exposes the bundled Visa launcher and current version', () => {
  assert.equal(packageJson.name, 'visa-skill');
  assert.equal(packageJson.version, '0.1.96');
  assert.deepEqual(packageJson.bin, { 'visa-cli': './bin/visa-cli' });
  assert.deepEqual(packageJson.scripts, { test: 'node --test tests/*.test.mjs' });
  assert.ok(skill.includes(`Visa Skill ${packageJson.version}.`));
  assert.ok(skill.includes(`version: "${packageJson.version}"`));
  assert.ok(readme.includes(`Skill \`${packageJson.version}\``));
  assert.ok(readmeZh.includes(`Skill 版本：\`${packageJson.version}\``));
  assert.match(skill, /vendor\/visa-cli\/visa-cli\.bundle\.mjs/u);
  assert.match(combined, /bin\/visa-cli/u);
  assert.doesNotMatch(combined, /vendor\/clink-cli|bin\/clink\b/u);
});

test('Skill routes the supported commerce and payment intent', () => {
  const description = skill.match(/^description:\s*"([^"]+)"/mu)?.[1] ?? '';
  for (const phrase of [
    'pay/支付/付款',
    'buy or order/购买/下单/订购',
    'place an order/点单/点餐',
    'checkout',
    'shopping/购物',
    'coupons/优惠券',
    'vouchers/代金券',
    'discounts/优惠',
    'benefits/权益',
    'gift cards',
    'merchant offers',
    'product discovery',
  ]) assert.match(description, new RegExp(phrase, 'iu'), phrase);
  assert.doesNotMatch(description, /coffee|咖啡/u);
});

test('startup execution is short and non-exploratory', () => {
  assert.match(
    skill,
    /resolved Skill Path is authoritative[\s\S]*Execute its launcher directly[\s\S]*Never[\s\S]*ls[\s\S]*stat[\s\S]*find[\s\S]*which[\s\S]*test -x[\s\S]*If direct execution fails/iu,
  );
  assert.match(
    skill,
    /Keep normal execution small[\s\S]*Do not read reference files[\s\S]*invoke runtime `--help`[\s\S]*fixed `sleep`/iu,
  );
  assert.doesNotMatch(combined, /visa-recommend-filters\.md|quick-instruction-cases\.md/u);
});

test('runtime package ships only current aggregate diagnostic references', async () => {
  assert.deepEqual(
    (await walk(join(root, 'references')))
      .map((path) => relative(root, path))
      .sort(),
    [
      'references/visa-browser-open.md',
      'references/visa-commerce-login.md',
      'references/visa-commerce-run.md',
      'references/visa-pending-instructions.md',
      'references/visa-product-search.md',
      'references/visa-recommend-products.md',
      'references/visa-recommend.md',
    ],
  );
  for (const path of ['lib', 'scripts', 'docs']) {
    await assert.rejects(stat(join(root, path)));
  }
  const runtimeFiles = (await walk(root))
    .map((path) => relative(root, path))
    .filter((path) => !path.startsWith('vendor/'))
    .filter((path) => !path.startsWith('tests/'))
    .filter((path) => /\.(?:js|mjs|cjs|ts)$/u.test(path));
  assert.deepEqual(runtimeFiles, []);
});

test('aggregate references map failures to stages and safe atomic commands', async () => {
  const expected = {
    'visa-recommend.md': ['visa recommend', 'retryFilters', 'never authorizes'],
    'visa-recommend-products.md': ['visa recommend-products', 'productMatching.failures', 'product-search'],
    'visa-product-search.md': ['visa product-search', 'PRODUCT_SELECTION_REQUIRED', 'PRODUCT_VERIFIED'],
    'visa-commerce-login.md': ['visa commerce-login', 'quick_instruction_get', 'browser-open'],
    'visa-commerce-run.md': ['visa commerce-run', 'instruction_create', 'read-only'],
    'visa-pending-instructions.md': ['visa pending-instructions', 'activation_ready', 'select_in_portal'],
    'visa-browser-open.md': ['visa browser-open', 'manual_required', 'browser-opened'],
  };
  for (const [name, needles] of Object.entries(expected)) {
    const text = await readFile(join(root, 'references', name), 'utf8');
    for (const needle of needles) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      assert.match(text, new RegExp(escaped, 'u'), name);
    }
    assert.match(text, /Do not|Never/u, name);
  }
  assert.match(skill, /Normal successful execution does not read references/u);
  assert.match(skill, /read only the reference matching that command/u);
  assert.match(agent, /Never blindly decompose a failed purchase/u);
});

test('discovery keeps region and Catalog guidance in the main Skill', () => {
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  assert.match(discovery, /exactly one `visa recommend-products`/u);
  assert.match(discovery, /Every recommendation request carries `--region`/u);
  assert.match(discovery, /Add `--category` when the user names a category/u);
  assert.match(discovery, /Omit `--category` for a genuinely generic regional request/u);
  assert.match(
    discovery,
    /If another axis or code is needed[\s\S]*visa taxonomy[\s\S]*GET \{base_url\}\/api\/v1\/taxonomy/iu,
  );
  assert.match(discovery, /Visa recommendation sends taxonomy filters only and no keyword/u);
  assert.match(discovery, /Program-to-merchant[\s\S]*Catalog query/u);
  assert.doesNotMatch(discovery, /references\/visa-recommend-filters\.md/u);
});

test('discovery remains Visa-first and does not use broad Catalog fallback', () => {
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  assert.match(discovery, /Never pass[\s\S]*`--include-broad-catalog` or `--broad-queries`/u);
  assert.match(discovery, /never pass `--keyword`/u);
  assert.match(discovery, /exact Program `code`[\s\S]*merchant `ext\.visa_program_id`/u);
  assert.match(discovery, /Offer titles must not replace it/u);
  assert.match(discovery, /one strict explicit-filter request by default/u);
  assert.match(discovery, /four genuinely different safe plans/u);
  assert.match(skill, /Never fill `reward_type`[\s\S]*--reward-type/u);
  assert.match(agent, /Never fill reward_type[\s\S]*--reward-type/u);
});

test('source region stays user-owned and searches do not switch it', () => {
  const sourceRegion = skill.slice(
    skill.indexOf('### Benefit Source Region'),
    skill.indexOf('### Catalog Money'),
  );
  assert.match(sourceRegion, /A search never changes it/u);
  assert.match(sourceRegion, /Omit `--market` in every Benefit search/u);
  assert.match(sourceRegion, /taxonomy `--region` is a destination, never a source/u);
  assert.match(sourceRegion, /`visa region set <hk\|cn>` only when the user explicitly asks/u);
  assert.match(sourceRegion, /persists nothing/u);
  assert.match(agent, /never switches the HK\/CN source/u);
});

test('result presentation keeps products and Benefits distinct', () => {
  assert.match(skill, /Read only the aggregate `products` and `visaBenefits` collections/u);
  assert.match(skill, /`products` first[\s\S]*`visaBenefits`/u);
  assert.match(skill, /only `products` remain[\s\S]*products only/u);
  assert.match(skill, /only `visaBenefits` remain[\s\S]*Benefits only/u);
  assert.match(skill, /both filtered collections are empty[\s\S]*no-results/u);
  assert.match(skill, /`matchedPrograms` array[\s\S]*purchase provenance only/u);
  assert.match(skill, /visaBenefits[\s\S]*only source for user-facing Benefit rows/u);
});

test('purchase uses one frozen context and direct flat CLI input', () => {
  const purchase = skill.slice(
    skill.indexOf('## Visa Purchase Fast Path'),
    skill.indexOf('### Visa Preparation'),
  );
  assert.match(purchase, /purchaseContext` unchanged[\s\S]*in memory|purchaseContext unchanged[\s\S]*in memory/u);
  assert.match(purchase, /Do not create a[\s\S]*local JSON file/u);
  assert.equal((purchase.match(/--mode selected_product[\s\S]*?--digital-delivery-expected/gu) ?? []).length, 2);
  assert.doesNotMatch(purchase, /--context-file|same file/u);
  assert.doesNotMatch(purchase, /--context '<purchase-context-json>'/u);
  assert.match(purchase, /PRODUCT_VERIFIED[\s\S]*CONTINUE_TO_COMMERCE_LOGIN/u);
  assert.match(purchase, /never run or refresh `visa detail`/iu);
  assert.match(agent, /same frozen facts as flat --xxx arguments/u);
  assert.match(agent, /Never create a context file/u);
});

test('browser operations are split from commerce aggregates', () => {
  assert.match(skill, /visa browser-open --url <operation-url>/u);
  assert.match(skill, /--browser-opened/u);
  assert.match(skill, /--manual-completed/u);
  assert.match(skill, /manual-completed[\s\S]*checks status first[\s\S]*(?:does not reopen|must not be opened again)/u);
  assert.match(skill, /closed page[\s\S]*not business success|failed browser launch[\s\S]*not business/iu);
  assert.match(skill, /If the host Agent name is known[\s\S]*replace `\{agent\}`/u);
  assert.match(skill, /If\s+it is unknown[\s\S]*never emit the literal placeholder/u);
  assert.match(agent, /dedicated browser-open operation/u);
  assert.match(agent, /manual completion[\s\S]*check the state and do not reopen/u);
});

test('Quick Instruction keeps only current principles', () => {
  const section = skill.slice(
    skill.indexOf('### Quick Instruction Principles'),
    skill.indexOf('### Pending Instruction Recovery'),
  );
  assert.match(section, /Freeze one purchase context and one selected PI/u);
  assert.match(section, /default PI/u);
  assert.match(section, /explicitly chooses an alternate PI/u);
  assert.match(section, /only a complete, usable,\s+unconsumed `ACTIVE` Instruction/u);
  assert.match(section, /Never reuse PENDING or CREATED/u);
  assert.match(section, /no reusable ACTIVE exists[\s\S]*ordinary PI-bound Instruction/u);
  assert.match(section, /new PENDING[\s\S]*Instruction/u);
  assert.match(section, /no default PI exists[\s\S]*do not choose a card implicitly/u);
  assert.match(section, /changed default PI stops/u);
  assert.match(section, /10 minutes/u);
  assert.match(section, /--browser-opened[\s\S]*--manual-completed/u);
});

test('activatable contract separates backend continuation from user-selected activation', () => {
  assert.match(
    skill,
    /only binds a card and completes VIC[\s\S]*newest PENDING row by descending `createTime`/u,
  );
  assert.match(
    skill,
    /user actively chooses a PENDING Instruction[\s\S]*`bind-pi -> ordinary activation`/u,
  );
  assert.match(
    skill,
    /activatable` is a read-only recovery\/list\s+contract[\s\S]*does not itself select, bind, or activate/u,
  );
  assert.match(
    pendingReference,
    /backend continuation[\s\S]*descending `createTime`[\s\S]*bind-pi -> ordinary activation/u,
  );
});

test('non-idempotent pending creation stays outside normal purchase matching', () => {
  assert.match(skill, /non-idempotent Pending creator/u);
  assert.match(skill, /always creates one new PENDING Instruction/u);
  assert.match(skill, /pending-instruction create[\s\S]*explicit atomic\/test command only/u);
  assert.match(skill, /unknown result[\s\S]*activatable[\s\S]*Retry at most once/u);
  assert.match(agent, /pending-instruction create command is non-idempotent/u);
});

test('Skill keeps purchase, browser, payment, and delivery safety boundaries', () => {
  assert.match(skill, /Never rerun `visa commerce-run` after it may have created a Checkout/u);
  assert.match(skill, /unknown result[\s\S]*resubmission/u);
  assert.match(skill, /one Checkout creation, at most one completion|Never rerun `visa commerce-run` after it may have created a Checkout/u);
  assert.match(skill, /Portal owns binding and VIC/u);
  assert.match(skill, /Never expose Tokens, OTPs[\s\S]*raw card data[\s\S]*secrets/u);
  assert.match(readme, /orderUrl[\s\S]*clickable[\s\S]*View order link/u);
  assert.match(readmeZh, /查看订单/u);
});

test('current Skill does not retain legacy provider labels', async () => {
  const testDocuments = await Promise.all(
    (await walk(join(root, 'tests'))).map((path) => readFile(path, 'utf8')),
  );
  const searchable = [...Object.values({ skill, readme, readmeZh, agent }), ...testDocuments].join('\n');
  for (const label of [['Fu', 'hui'].join(''), ['富', '惠'].join('')]) {
    assert.equal(searchable.toLocaleLowerCase().includes(label.toLocaleLowerCase()), false);
  }
});
