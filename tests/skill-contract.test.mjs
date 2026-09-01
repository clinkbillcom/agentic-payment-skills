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
const filterReference = await readFile(
  join(root, 'references', 'visa-recommend-filters.md'),
  'utf8',
);
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const vendorPackage = JSON.parse(
  await readFile(join(root, 'vendor', 'visa-cli', 'package.json'), 'utf8'),
);
const documents = [skill, readme, readmeZh, agent, filterReference];
const combined = documents.join('\n');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

test('package exposes only the bundled Visa launcher and focused tests', () => {
  assert.equal(packageJson.name, 'visa-skill');
  assert.equal(packageJson.version, '0.1.49');
  assert.deepEqual(packageJson.bin, { 'visa-cli': './bin/visa-cli' });
  assert.deepEqual(packageJson.scripts, {
    test: 'node --test tests/*.test.mjs',
  });
  assert.match(skill, /Visa Skill 0\.1\.49/u);
  assert.match(skill, /version: "0\.1\.49"/u);
  assert.ok(
    readme.includes(
      `Skill \`${packageJson.version}\` vendors Visa CLI \`${vendorPackage.version}\` `
        + `from upstream commit\n\`${vendorPackage.upstreamCommit}\``,
    ),
  );
  assert.ok(readmeZh.includes(`Skill \`${packageJson.version}\``));
  assert.ok(readmeZh.includes(`Visa CLI \`${vendorPackage.version}\``));
  assert.ok(readmeZh.includes(vendorPackage.upstreamCommit));
  assert.match(skill, /vendor\/visa-cli\/visa-cli\.bundle\.mjs/u);
  assert.match(combined, /bin\/visa-cli/u);
  assert.doesNotMatch(combined, /vendor\/clink-cli|bin\/clink\b/u);
});

test('description routes broad payment and commerce intent without naming a product', () => {
  const description = skill.match(/^description:\s*"([^"]+)"/mu)?.[1] ?? '';

  assert.match(description, /even when Visa is not named/iu);
  assert.match(description, /pay\/支付\/付款/iu);
  assert.match(description, /buy or order\/购买\/下单\/订购/iu);
  assert.match(description, /place an order\/点单\/点餐/iu);
  assert.match(description, /checkout/iu);
  assert.match(description, /shopping\/购物/iu);
  assert.match(description, /coupons\/优惠券/iu);
  assert.match(description, /vouchers\/代金券/iu);
  assert.match(description, /discounts\/优惠/iu);
  assert.match(description, /benefits\/权益/iu);
  assert.match(description, /gift cards/iu);
  assert.match(description, /merchant offers/iu);
  assert.match(description, /product discovery/iu);
  assert.doesNotMatch(description, /coffee|咖啡/iu);
});

test('legacy provider labels are absent from Skill-facing files and tests', async () => {
  const forbidden = [
    ['Fu', 'hui'].join(''),
    ['富', '惠'].join(''),
  ];
  const testDocuments = await Promise.all(
    (await walk(join(root, 'tests'))).map((path) => readFile(path, 'utf8')),
  );
  const searchable = [...documents, ...testDocuments].join('\n');

  for (const label of forbidden) {
    assert.equal(
      searchable.toLocaleLowerCase().includes(label.toLocaleLowerCase()),
      false,
    );
  }
});

test('Skill stays within the runtime prompt budget', async () => {
  const skillBytes = (await stat(skillPath)).size;
  const startupBytes = await Promise.all([
    skillPath,
    join(root, 'agents', 'openai.yaml'),
  ].map(async (path) => (await stat(path)).size));

  assert.ok(skillBytes <= 48 * 1024, `SKILL.md is ${skillBytes} bytes`);
  assert.ok(
    startupBytes.reduce((sum, bytes) => sum + bytes, 0) <= 64 * 1024,
    'startup-readable files exceed 64 KiB',
  );
});

test('old workflow runtime, scripts, and docs are absent and filter reference is focused', async () => {
  for (const directory of ['lib', 'scripts', 'docs']) {
    await assert.rejects(stat(join(root, directory)));
  }
  assert.deepEqual(
    (await walk(join(root, 'references'))).map((path) => relative(root, path)),
    ['references/visa-recommend-filters.md'],
  );
  assert.ok(
    (await stat(join(root, 'references', 'visa-recommend-filters.md'))).size
      <= 4 * 1024,
  );

  const runtimeFiles = (await walk(root))
    .map((path) => relative(root, path))
    .filter((path) => !path.startsWith('vendor/'))
    .filter((path) => !path.startsWith('tests/'))
    .filter((path) => /\.(?:js|mjs|cjs|ts)$/u.test(path));
  assert.deepEqual(runtimeFiles, []);

  const trackedContract = documents.join('\n');
  assert.doesNotMatch(trackedContract, /\blib\/[^\s`]*fsm|classify[A-Z]\w+Observation/u);
  assert.doesNotMatch(trackedContract, /^## Action Matrix$/mu);
});

test('ordinary execution loads only the routed filter reference and stays non-exploratory', () => {
  assert.match(
    skill,
    /For Visa Benefit discovery, read only[\s\S]*visa-recommend-filters\.md[\s\S]*Otherwise do\s+not read reference files[\s\S]*invoke runtime[\s\S]*`--help`[\s\S]*fixed `sleep`/iu,
  );
  assert.match(skill, /shortest matching CLI capability/iu);
  assert.match(
    skill,
    /does not claim complete\s+behavioral equivalence[\s\S]*former Agent-side orchestration/iu,
  );
});

test('initial Visa discovery chooses one strict request or one four-set aggregate', () => {
  const discovery = skill.slice(
    skill.indexOf('## Visa-Only Benefit Discovery And Catalog Fallback'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  const singleCommand = discovery.slice(
    discovery.indexOf('Use one strict explicit-filter request by default'),
    discovery.indexOf('Only when exactly four'),
  );
  const aggregateCommand = discovery.slice(
    discovery.indexOf('Only when exactly four'),
    discovery.indexOf('Never add `--include-provider-products`'),
  );

  assert.match(skill, /Lock one language for the whole run/iu);
  assert.match(skill, /\ben\b[\s\S]*zh-CN[\s\S]*zh-TW[\s\S]*zh-HK/u);
  assert.match(skill, /Lock one environment[\s\S]*never mix environments/iu);
  assert.match(
    discovery,
    /exactly one initial Visa-only CLI\s+call[\s\S]*smallest safe filter shape/iu,
  );
  assert.match(
    singleCommand,
    /visa recommend[\s\S]*<individual-filter-flags>[\s\S]*--anonymous[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(singleCommand, /--filter-sets/u);
  assert.match(
    aggregateCommand,
    /exactly four genuinely different safe plans[\s\S]*--filter-sets[\s\S]*filter-1[\s\S]*filter-2[\s\S]*filter-3[\s\S]*filter-4[\s\S]*--anonymous[\s\S]*--lang/iu,
  );
  assert.match(
    discovery,
    /Never duplicate filters[\s\S]*fan out reward types[\s\S]*multiple Agent-managed Shell commands[\s\S]*one taxonomy snapshot[\s\S]*four parallel Visa[\s\S]*de-duplicates by Program code/iu,
  );
  assert.match(
    discovery,
    /Read `references\/visa-recommend-filters\.md`/u,
  );
  assert.match(
    discovery,
    /Agent owns[\s\S]*filter selection/iu,
  );
  assert.match(
    discovery,
    /CLI validates taxonomy codes[\s\S]*never derives filters[\s\S]*from the query/iu,
  );
  assert.match(
    discovery,
    /Never add `--include-provider-products`[\s\S]*do not issue `catalog search`[\s\S]*`ucp-catalog search`[\s\S]*merchant-list[\s\S]*only the Visa recommendation service/iu,
  );
  assert.match(
    discovery,
    /never\s+logs in[\s\S]*binds a card[\s\S]*creates an Instruction[\s\S]*prepares payment/iu,
  );
  assert.match(
    skill,
    /visa recommend[\s\S]*do not accept[\s\S]*--sandbox/iu,
  );
});

test('Benefit source region persists HK or CN independently from destination', () => {
  const sourceRegion = skill.slice(
    skill.indexOf('### Benefit Source Region'),
    skill.indexOf('### Catalog Money'),
  );

  assert.match(
    sourceRegion,
    /Explicit[\s\S]*HK\/Hong Kong region benefits[\s\S]*CN\/Mainland China region[\s\S]*visa region set <hk\|cn>/iu,
  );
  assert.match(
    sourceRegion,
    /no explicit source region[\s\S]*visa region get[\s\S]*Missing\s+config initializes to `hk`[\s\S]*reuse the saved value/iu,
  );
  assert.match(
    sourceRegion,
    /visa recommend[\s\S]*without `--market`[\s\S]*sourceRegion[\s\S]*sourceEndpoint[\s\S]*saved selection/iu,
  );
  assert.match(
    sourceRegion,
    /Source region[\s\S]*HK\/CN backend[\s\S]*Taxonomy `--region`[\s\S]*where a Benefit is usable[\s\S]*go to Hong Kong[\s\S]*without changing/iu,
  );
  assert.match(
    agent,
    /resolve the HK\/CN source endpoint[\s\S]*visa region set hk\|cn[\s\S]*visa region get[\s\S]*initializes to hk[\s\S]*recommend without --market[\s\S]*sourceRegion\/sourceEndpoint/iu,
  );
  assert.match(
    filterReference,
    /Source Region[\s\S]*visa region set <hk\|cn>[\s\S]*visa region get[\s\S]*defaults to HK[\s\S]*not taxonomy `region\[\]`/iu,
  );
});

test('broad Visa availability fetches every Benefit without initial Catalog work', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa-Only Benefit Discovery And Catalog Fallback'),
  );
  const discovery = skill.slice(
    skill.indexOf('## Visa-Only Benefit Discovery And Catalog Fallback'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  const allCommand = discovery.slice(
    discovery.indexOf('For broad availability wording'),
    discovery.indexOf('For a Hong Kong destination'),
  );

  assert.match(
    routing,
    /What Visa Benefits can I use in Hong Kong[\s\S]*Agent-selected-filter Visa Benefit discovery[\s\S]*must not query UCP/iu,
  );
  assert.match(
    discovery,
    /broad availability wording[\s\S]*always add `--all`[\s\S]*complete regional\s+set/iu,
  );
  assert.match(
    allCommand,
    /visa recommend[\s\S]*<individual-filter-flags>[\s\S]*--anonymous[\s\S]*--all[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(allCommand, /--filter-sets/u);
  assert.doesNotMatch(allCommand, /--include-provider-products/u);
  assert.match(
    discovery,
    /Hong Kong destination[\s\S]*`--region hk`[\s\S]*single-filter call[\s\S]*four-set aggregate mode[\s\S]*"region": \["hk"\][\s\S]*never add an outer `--region`/iu,
  );
  assert.match(
    discovery,
    /Retain only Programs[\s\S]*brand[\s\S]*category[\s\S]*geography[\s\S]*eligibility[\s\S]*dates[\s\S]*channel[\s\S]*hard constraints/iu,
  );
  assert.match(
    discovery,
    /at least one relevant Program[\s\S]*present those Visa Programs[\s\S]*do not call Catalog\s+during initial discovery/iu,
  );
  assert.match(
    discovery,
    /stable code[\s\S]*title-only fuzzy matching is\s+insufficient/iu,
  );
  assert.match(
    agent,
    /read only references\/visa-recommend-filters\.md[\s\S]*smallest safe[\s\S]*one strict explicit-filter call by default[\s\S]*--filter-sets only when exactly four genuinely different safe plans[\s\S]*Never fan out reward types[\s\S]*exactly one visa recommend/iu,
  );
  assert.match(
    agent,
    /Source region is independent from destination taxonomy --region[\s\S]*travel to Hong Kong[\s\S]*--region hk[\s\S]*without changing the saved source/iu,
  );
});

test('compact filter reference defines schema, selection priority, and intent boundary', () => {
  for (const field of [
    'type',
    'keyword',
    'limit',
    'page',
    'region',
    'category',
    'purpose',
    'reward_type',
    'attribute',
    'card_level',
    'card_issuer',
  ]) {
    assert.match(filterReference, new RegExp(`"${field}"`, 'u'));
  }
  assert.match(
    filterReference,
    /Build one strict JSON object[\s\S]*One safe plan is the default[\s\S]*--filter-sets[\s\S]*exactly four genuinely different safe plans[\s\S]*Never issue multiple Agent-managed/iu,
  );
  assert.match(
    filterReference,
    /keyword[\s\S]*exact official title[\s\S]*Never put a conversational question/iu,
  );
  assert.match(
    filterReference,
    /all recommendation filters[\s\S]*inside those objects[\s\S]*never combine them[\s\S]*outer individual filter flags/iu,
  );
  assert.match(
    filterReference,
    /Prefer one strict plan[\s\S]*If fewer than four safe variants exist[\s\S]*use one strict[\s\S]*never repeat or pad/iu,
  );
  assert.match(
    filterReference,
    /reward_type[\s\S]*explicitly names one[\s\S]*优惠[\s\S]*selects no reward type[\s\S]*Never fan[\s\S]*discount[\s\S]*coupon[\s\S]*cashback[\s\S]*privilege[\s\S]*single strict plan/iu,
  );
  assert.match(
    filterReference,
    /我想下单咖啡[\s\S]*catalog search[\s\S]*有咖啡的券吗[\s\S]*visa recommend[\s\S]*Agent-selected filters/iu,
  );
});

test('a Visa miss falls back once to all-channel UAT Catalog search', () => {
  const discovery = skill.slice(
    skill.indexOf('## Visa-Only Benefit Discovery And Catalog Fallback'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  const fallback = discovery.slice(
    discovery.indexOf('Treat `fallback_all_offers`'),
    discovery.indexOf('For count-only wording'),
  );

  assert.match(
    fallback,
    /fallback_all_offers[\s\S]*no_matching_offers[\s\S]*zero Programs[\s\S]*Visa miss/iu,
  );
  assert.match(
    fallback,
    /structured `ok=false`[\s\S]*`error\.type=api_error`[\s\S]*Visa recommendation relaxed explicitly requested filters:[\s\S]*same Visa\s+miss/iu,
  );
  assert.match(
    fallback,
    /Every\s+other error stops[\s\S]*timeout[\s\S]*network[\s\S]*authentication[\s\S]*validation[\s\S]*unrelated API error/iu,
  );
  assert.match(
    fallback,
    /Never display, rank, count,[\s\S]*fallback Visa rows/iu,
  );
  assert.match(
    fallback,
    /exactly one[\s\S]*all-channel broad Catalog fallback[\s\S]*original current user request/iu,
  );
  assert.match(
    agent,
    /ok=false[\s\S]*error\.type=api_error[\s\S]*message starts exactly Visa\s+recommendation relaxed explicitly requested filters:[\s\S]*every other error stops/iu,
  );
  assert.match(
    fallback,
    /bin\/visa-cli catalog search[\s\S]*--query "<original-current-user-query>"[\s\S]*--language <language-tag>[\s\S]*"address_region":"HK"[\s\S]*<environment-flag>/iu,
  );
  assert.match(
    fallback,
    /Omit `--channel-type`[\s\S]*every available[\s\S]*including Eats365/iu,
  );
  assert.match(
    fallback,
    /bounded, non-exhaustive[\s\S]*no pagination[\s\S]*never describe[\s\S]*complete\s+inventory/iu,
  );
  assert.match(
    fallback,
    /ordinary Catalog\s+products[\s\S]*without Visa eligibility or campaign terms[\s\S]*exact currently orderable product/iu,
  );
});

test('selected Visa Benefit prompts ordering only after an internal UCP match', () => {
  const selected = skill.slice(
    skill.indexOf('### Selected Visa Benefit Resolution'),
    skill.indexOf('## Visa Purchase Fast Path'),
  );

  const detail = selected.indexOf('bin/visa-cli visa detail');
  const productSearch = selected.indexOf('bin/visa-cli visa product-search');
  assert.ok(detail >= 0 && productSearch > detail);
  assert.match(
    selected,
    /stable Program code[\s\S]*authoritative activity detail[\s\S]*before any UCP/iu,
  );
  assert.match(
    selected,
    /activity summary[\s\S]*hard terms[\s\S]*dates[\s\S]*campaign\/activity URL/iu,
  );
  assert.match(
    selected,
    /Never infer a merchant route from an arbitrary[\s\S]*Visa\/VSRP campaign URL/iu,
  );
  assert.match(
    selected,
    /vsrp\.hk\/p\/o5s[\s\S]*maps[\s\S]*exact offer path[\s\S]*mcht_ftmse61a6az0[\s\S]*another path[\s\S]*is not an alias/iu,
  );
  assert.match(
    selected,
    /PRODUCT_VERIFIED[\s\S]*CONTINUE_TO_COMMERCE_LOGIN[\s\S]*productResolution=internal-ucp-catalog[\s\S]*same merchant and product identity[\s\S]*price[\s\S]*currency[\s\S]*availability/iu,
  );
  assert.match(
    selected,
    /external-page resolution[\s\S]*PRODUCT_UNAVAILABLE[\s\S]*no authoritative merchant[\s\S]*no internal UCP match/iu,
  );
  assert.match(
    selected,
    /internal UCP match[\s\S]*ask whether the user wants to order[\s\S]*not purchase authorization[\s\S]*explicit buy\/order reply/iu,
  );
  assert.match(
    selected,
    /Without an internal UCP match[\s\S]*activity introduction[\s\S]*authoritative activity link only[\s\S]*Do not end with "buy"[\s\S]*"order"[\s\S]*"checkout"/iu,
  );
});

test('direct and Visa-fallback shopping use aggregate Catalog purchase', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa-Only Benefit Discovery And Catalog Fallback'),
  );
  const catalogPurchase = skill.slice(
    skill.indexOf('## Catalog Purchase Fast Path'),
    skill.indexOf('### Visa Preparation'),
  );
  const discoveryCommand = catalogPurchase.slice(
    catalogPurchase.indexOf('Broad-Catalog discovery'),
    catalogPurchase.indexOf('Before login'),
  );

  assert.match(
    routing,
    /explicit buy\/order\/checkout request[\s\S]*no Visa[\s\S]*coupon[\s\S]*offer signal[\s\S]*我想下单咖啡[\s\S]*broad Catalog shopping/iu,
  );
  assert.match(
    routing,
    /有咖啡的券吗[\s\S]*Visa 咖啡优惠券[\s\S]*有哪些咖啡权益[\s\S]*Visa Benefit discovery/iu,
  );
  assert.match(
    discoveryCommand,
    /bin\/visa-cli catalog search[\s\S]*--query "<original-current-user-query>"[\s\S]*--language <language-tag>[\s\S]*"address_region":"HK"/iu,
  );
  assert.doesNotMatch(discoveryCommand, /address_country/iu);
  assert.doesNotMatch(
    discoveryCommand,
    /^<Skill Path>\/bin\/visa-cli visa recommend|^\s*--include-provider-products/mu,
  );
  assert.match(catalogPurchase, /bounded and non-exhaustive/iu);
  assert.match(
    skill,
    /Catalog Money[\s\S]*price\.amount[\s\S]*price_range\.\*\.amount[\s\S]*minor[\s\S]*100 USD[\s\S]*USD 1\.00[\s\S]*2600 HKD[\s\S]*HKD 26\.00/iu,
  );
  assert.match(
    skill,
    /denomination in a product title[\s\S]*HKD 100 Gift Card[\s\S]*face value `HKD 100`[\s\S]*purchase price `USD 1\.00`[\s\S]*never[\s\S]*`USD 100`/iu,
  );
  assert.match(
    agent,
    /Catalog price\.amount[\s\S]*minor\s+units[\s\S]*amount=100 USD is USD 1\.00[\s\S]*title denomination[\s\S]*separate/iu,
  );
  assert.match(
    catalogPurchase,
    /direct broad-Catalog shopping[\s\S]*Visa-no-match Catalog fallback[\s\S]*ordinary Catalog shopping[\s\S]*must not inherit Visa Program eligibility/iu,
  );
  assert.match(
    catalogPurchase,
    /merchantUrl[\s\S]*productId[\s\S]*title[\s\S]*price[\s\S]*currency[\s\S]*availability[\s\S]*merchantCategoryCode/iu,
  );
  assert.match(
    catalogPurchase,
    /direct-shopping internal merchant[\s\S]*selected `merchant_id`[\s\S]*`ucp-catalog product`[\s\S]*Do not purchase directly from a broad-search display row/iu,
  );
  assert.match(
    catalogPurchase,
    /four-digit MCC classified from the exact frozen[\s\S]*ask when confidence is low/iu,
  );
  assert.match(
    catalogPurchase,
    /Eats365[\s\S]*manual_item_facts[\s\S]*expected success result[\s\S]*broad Catalog candidate/iu,
  );
  assert.match(
    catalogPurchase,
    /mode=catalog_purchase[\s\S]*Eats365[\s\S]*without requesting the internal merchant list[\s\S]*manual-item signal[\s\S]*extra Catalog product endpoint[\s\S]*exact frozen[\s\S]*store[\s\S]*product ID[\s\S]*must not depend on broad[\s\S]*Catalog discovery[\s\S]*mode=purchase[\s\S]*ordinary internal[\s\S]*merchants/iu,
  );
  for (const field of ['channelType', 'storeId']) {
    assert.match(catalogPurchase, new RegExp(`"${field}"`, 'u'));
  }
  assert.match(
    catalogPurchase,
    /only `channelType` and `storeId` are required route fields[\s\S]*`catalogQuery`[\s\S]*`catalogEnvironment`[\s\S]*`catalogLanguage`[\s\S]*optional[\s\S]*compatibility metadata[\s\S]*must not block purchase/iu,
  );
  assert.match(
    catalogPurchase,
    /frozen selection URL may carry `product_id`[\s\S]*exact[\s\S]*response returns the same menu URL without that query/iu,
  );
  assert.match(
    catalogPurchase,
    /valid when host,[\s\S]*region, store path,[\s\S]*separately verified product ID match/iu,
  );
  assert.match(
    catalogPurchase,
    /coffee or quick-service food[\s\S]*MCC `5814`[\s\S]*NO_SHIPPING_REQUIRED[\s\S]*digitalDeliveryExpected=false/iu,
  );
  assert.match(
    catalogPurchase,
    /Before `visa commerce-login` for an Eats365 purchase[\s\S]*`first_name`[\s\S]*`last_name`[\s\S]*E\.164 `phone_number`[\s\S]*Do not create an[\s\S]*Instruction[\s\S]*wallet email automatically[\s\S]*never place it in metadata/iu,
  );
  assert.match(
    catalogPurchase,
    /"buyer"[\s\S]*"first_name"[\s\S]*"last_name"[\s\S]*"phone_number"/iu,
  );
  assert.match(
    catalogPurchase,
    /authoritative digital coupon or voucher[\s\S]*NO_SHIPPING_REQUIRED[\s\S]*digitalDeliveryExpected=true/iu,
  );
  assert.match(
    catalogPurchase,
    /"amountLimit": "<structured-catalog-purchase-price>"[\s\S]*"currencyCode": "<structured-catalog-purchase-currency>"/iu,
  );
  assert.match(
    catalogPurchase,
    /PHYSICAL_GOODS_REQUIRES_SHIPPING[\s\S]*same complete authoritative[\s\S]*shippingAddress[\s\S]*login `instructionContext`/iu,
  );
  assert.match(
    catalogPurchase,
    /"digitalDeliveryExpected": true[\s\S]*"digitalDeliveryExpected": false[\s\S]*identical object[\s\S]*instructionContext\.shippingAddress[\s\S]*high-confidence Agent classification[\s\S]*low confidence requires one question/iu,
  );
  assert.match(catalogPurchase, /"mode": "catalog_purchase"/u);
  assert.doesNotMatch(catalogPurchase, /"program"\s*:/u);

  const login = catalogPurchase.indexOf('visa commerce-login');
  const run = catalogPurchase.indexOf('bin/visa-cli visa commerce-run');
  assert.ok(login >= 0 && run > login);
  assert.match(
    catalogPurchase,
    /must support `mode=catalog_purchase` before this\s+path is released/iu,
  );
  assert.match(
    catalogPurchase,
    /Never\s+fall back to Program `mode=purchase`[\s\S]*`ucp-checkout run`/iu,
  );
  assert.match(
    catalogPurchase,
    /product-resolution title or price mismatch is not a discovery mechanism[\s\S]*Do not edit the title or amount by trial and error[\s\S]*obtain new purchase authorization/iu,
  );
});

test('internal acceptance labels never leak into Skill-facing instructions', () => {
  assert.doesNotMatch(combined, /\bCases?\s+[1-4]\b/iu);
  assert.match(
    skill,
    /Classify the request silently[\s\S]*Never announce the classification[\s\S]*user-facing text/iu,
  );
});

test('new commerce-run contexts omit program.code in both purchase modes', () => {
  const programPurchase = skill.slice(
    skill.indexOf('Build one frozen purchase context from the same Program'),
    skill.indexOf('Run exactly once in the foreground'),
  );
  const catalogPurchase = skill.slice(
    skill.indexOf('Build one frozen Catalog purchase context without a Program'),
    skill.indexOf('Run exactly once:', skill.indexOf('Build one frozen Catalog')),
  );
  for (const purchaseContext of [programPurchase, catalogPurchase]) {
    assert.doesNotMatch(purchaseContext, /"program"\s*:/u);
    assert.doesNotMatch(purchaseContext, /"programCode"\s*:/u);
  }
  assert.match(
    programPurchase,
    /Do not include a top-level `program` object or `metadata\.programCode`[\s\S]*compatibility/iu,
  );
  assert.match(
    skill,
    /New `mode=purchase` and `mode=catalog_purchase` contexts[\s\S]*omit[\s\S]*top-level `program`[\s\S]*`metadata\.programCode`/iu,
  );
});

test('Visa Program MCC is authoritative-first with bounded inference', () => {
  const section = skill.slice(
    skill.indexOf('## Visa Purchase Fast Path'),
    skill.indexOf('## Catalog Purchase Fast Path'),
  );

  assert.match(
    section,
    /Resolve one four-digit MCC with this strict priority[\s\S]*valid Program-provided `commerce\.merchantCategoryCode` unchanged/iu,
  );
  assert.match(
    section,
    /Program omits MCC[\s\S]*exact frozen[\s\S]*Program[\s\S]*merchant ID[\s\S]*merchant URL[\s\S]*product title\/source[\s\S]*fulfillment context[\s\S]*high-confidence/iu,
  );
  assert.match(
    section,
    /https:\/\/vsrp\.hk\/p\/o5s[\s\S]*mcht_ftmse61a6az0[\s\S]*Wellcome supermarket gift-card[\s\S]*MCC `5411`/iu,
  );
  assert.match(
    section,
    /invalid or conflicting Program MCC[\s\S]*title-only guess[\s\S]*broad[\s\S]*common-MCC fallback[\s\S]*low-confidence[\s\S]*stops before login/iu,
  );
  assert.match(
    section,
    /Freeze the resolved MCC once[\s\S]*login[\s\S]*Instruction[\s\S]*purchase context[\s\S]*Checkout/iu,
  );
  assert.match(
    section,
    /"merchantCategoryCode": "<resolved-four-digit-mcc>"/u,
  );
  assert.doesNotMatch(
    section,
    /Missing, invalid, or ambiguous MCC stops[\s\S]*do not infer it from Catalog data/iu,
  );
  assert.match(
    agent,
    /Program merchantCategoryCode first[\s\S]*absent[\s\S]*complete frozen merchant\/product context[\s\S]*vsrp\.hk\/p\/o5s[\s\S]*MCC 5411[\s\S]*Freeze the\s+resolved MCC/iu,
  );
});

test('Visa fast path preserves aggregate order and never decomposes purchase', () => {
  const route = skill.indexOf(
    'visa recommend -> visa detail -> visa product-search -> ask to order ->',
  );
  assert.ok(route >= 0);

  const section = skill.slice(
    skill.indexOf('## Visa Purchase Fast Path'),
    skill.indexOf('### Visa Preparation'),
  );
  const login = section.indexOf('visa commerce-login');
  const run = section.indexOf('visa commerce-run');
  assert.ok(login >= 0 && run > login);
  assert.match(
    section,
    /Program and Catalog identify the same merchant and product/iu,
  );
  assert.match(
    section,
    /productResolution=internal-ucp-catalog[\s\S]*external-page product is not\s+orderable/iu,
  );
  assert.match(
    section,
    /Catalog total and currency exactly equal[\s\S]*recommendation-backed/iu,
  );
  assert.match(section, /single\s+purchase authorization/iu);
  assert.match(
    section,
    /CLI alone owns the Pending Instruction Card\s+Gate/iu,
  );
  assert.match(
    section,
    /Never rerun `visa commerce-run` after it may have created a Checkout/iu,
  );
  assert.match(
    section,
    /Never\s+reconstruct `card`, `instruction`, `events`, `pay`, `ucp-checkout`, or[\s\S]*`ucp-order`/iu,
  );

  const atomicInvocation =
    /^\s*(?:<Skill Path>\/bin\/visa-cli\s+)?(?:card|instruction|events|pay|ucp-checkout|ucp-order)\b/mu;
  assert.doesNotMatch(section, atomicInvocation);
});

test('missing-card aggregate shows but never opens Bind Card and keeps exact PENDING wait', () => {
  const gate = skill.slice(
    skill.indexOf('### Pending Instruction Card Gate'),
    skill.indexOf('## Intent Routing'),
  );

  assert.match(
    gate,
    /eligible Visa Payment Instrument[\s\S]*`visaRegistrationSucceeded=true`[\s\S]*creates or reuses exactly[\s\S]*one no-card `PENDING` Instruction/iu,
  );
  assert.match(
    gate,
    /exact returned ID[\s\S]*never select a latest or similar PENDING/iu,
  );
  assert.match(
    gate,
    /return one exact Bind Card link[\s\S]*Show it without opening it/iu,
  );
  assert.match(
    gate,
    /click it[\s\S]*already-open Agent Portal/iu,
  );
  assert.match(
    gate,
    /Showing the link is not[\s\S]*completion[\s\S]*same CLI process stays foreground/iu,
  );
  assert.match(
    gate,
    /Payment[\s\S]*Instrument reaches `visaRegistrationSucceeded=true`[\s\S]*CWallet[\s\S]*automatically activates/iu,
  );
  assert.match(
    gate,
    /Continue only after[\s\S]*same-card[\s\S]*`visaRegistrationSucceeded=true`[\s\S]*exact Instruction[\s\S]*`ACTIVE`/iu,
  );
  assert.match(
    gate,
    /Timeout preserves that exact PENDING[\s\S]*read-only\s+continuation[\s\S]*Do not create another Instruction[\s\S]*retry payment/iu,
  );

  const cardCapability = skill.slice(
    skill.indexOf('### CAP-CARD:'),
    skill.indexOf('### CAP-RISK:'),
  );
  assert.match(
    cardCapability,
    /Show the exact link but never[\s\S]*`--open`[\s\S]*claim that showing it completed the action/iu,
  );
  assert.match(
    cardCapability,
    /authorized aggregate purchase[\s\S]*do not decompose[\s\S]*atomic card commands/iu,
  );
});

test('all absorbed Base capabilities have short fail-closed contracts', () => {
  for (const capability of [
    'CAP-WALLET',
    'CAP-CARD',
    'CAP-RISK',
    'CAP-CATALOG',
    'CAP-PAY',
    'CAP-ALIPAY-QR',
    'CAP-UCP',
    'CAP-INSTRUCTION',
    'CAP-REFUND',
    'CAP-EVENTS',
    'CAP-SKILLS-LIST',
    'CAP-SKILLS-TIP',
    'CAP-SKILLS-INSTALL',
  ]) {
    assert.match(skill, new RegExp(`### ${capability}:`, 'u'));
  }

  assert.match(
    skill,
    /complex capability lacks required input[\s\S]*fail closed/iu,
  );
  assert.match(skill, /Direct Pay[\s\S]*Session Pay/iu);
  assert.match(skill, /--payment-method-type ALIPAY --terminal-qr/iu);
  assert.match(
    skill,
    /ucp-checkout run[\s\S]*Never split the aggregate into manual create\/complete/iu,
  );
  assert.match(skill, /Use `skills list --all` for public Skills/iu);
  assert.match(
    skill,
    /Require exact `publisher\/name`[\s\S]*explicit Tip\s+authorization/iu,
  );
  assert.match(skill, /`publisher\/name@version` for a pinned release/iu);
});

test('restricted Instructions and generic Visa VIC UCP fail closed', () => {
  const restrictedGate = skill.slice(
    skill.indexOf('### Restricted Instruction Gate'),
    skill.indexOf('### Browser Boundary'),
  );
  assert.match(
    restrictedGate,
    /adult content[\s\S]*gambling[\s\S]*cryptocurrency[\s\S]*financial-product trading[\s\S]*tobacco[\s\S]*weapons/iu,
  );
  for (const mcc of ['7273', '7995', '6051', '6211', '5966', '5967', '5993']) {
    assert.match(restrictedGate, new RegExp(mcc, 'u'));
  }

  const purchaseSection = skill.slice(
    skill.indexOf('## Visa Purchase Fast Path'),
    skill.indexOf('### Visa Preparation'),
  );
  assert.match(
    purchaseSection,
    /complete purchase passes the Restricted Instruction Gate/iu,
  );

  const ucpSection = skill.slice(
    skill.indexOf('### CAP-UCP:'),
    skill.indexOf('### CAP-INSTRUCTION:'),
  );
  assert.match(
    ucpSection,
    /Visa with VIC[\s\S]*stop[\s\S]*cannot carry or safely\s+resolve an Instruction and Mandate/iu,
  );
});

test('funds, browser, and result boundaries remain explicit', () => {
  assert.match(
    skill,
    /Timeout, transport failure, an unknown result[\s\S]*never authorizes\s+resubmission/iu,
  );
  assert.match(skill, /event is a wake-up hint, not final truth/iu);
  assert.match(
    skill,
    /Payment success does not prove merchant receipt[\s\S]*entitlement[\s\S]*delivery/iu,
  );
  assert.match(
    skill,
    /OAuth[\s\S]*Agent Portal card\/VIC[\s\S]*belong in the user's browser/iu,
  );
  assert.match(skill, /Bind Card[\s\S]*never auto-open/iu);
  assert.match(skill, /Alipay QR is not a browser page/iu);
  assert.match(skill, /No payment, Tip, refund, Checkout completion[\s\S]*blindly retried/iu);
});
