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
  assert.equal(packageJson.version, '0.1.70');
  assert.deepEqual(packageJson.bin, { 'visa-cli': './bin/visa-cli' });
  assert.deepEqual(packageJson.scripts, {
    test: 'node --test tests/*.test.mjs',
  });
  assert.match(skill, /Visa Skill 0\.1\.70/u);
  assert.match(skill, /version: "0\.1\.70"/u);
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
    /resolved Skill Path is authoritative[\s\S]*Execute its launcher directly[\s\S]*Never[\s\S]*`ls`[\s\S]*`stat`[\s\S]*`find`[\s\S]*`which`[\s\S]*`test -x`[\s\S]*list `bin\/`[\s\S]*If direct execution fails/iu,
  );
  assert.match(
    skill,
    /does not claim complete\s+behavioral equivalence[\s\S]*former Agent-side orchestration/iu,
  );
});

test('initial Visa discovery runs one aggregate with parallel broad Catalog', () => {
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
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
  assert.match(
    skill,
    /Distribution And Purchase Environment[\s\S]*bundled launcher already pins[\s\S]*Anonymous discovery invokes it directly/iu,
  );
  assert.match(
    discovery,
    /initial shopping discovery[\s\S]*exactly one `visa recommend-products`[\s\S]*unchanged original\s+current user request[\s\S]*`--include-broad-catalog`[\s\S]*broad all-channel Catalog[\s\S]*in parallel with Visa recommendation[\s\S]*merchant list once[\s\S]*exact `code`[\s\S]*`ext\.visa_program_id`[\s\S]*Offer URL[\s\S]*never selects a merchant[\s\S]*only primary search text[\s\S]*Never pass `--keyword`[\s\S]*Visa recommendation sends taxonomy filters only[\s\S]*no keyword[\s\S]*Program-matched merchant Catalog[\s\S]*first broad Catalog query[\s\S]*Offer\s+titles[\s\S]*must not replace/iu,
  );
  assert.match(
    singleCommand,
    /visa recommend-products "<original-current-user-query>"[\s\S]*<individual-filter-flags>[\s\S]*--anonymous[\s\S]*--include-broad-catalog[\s\S]*--broad-queries[\s\S]*product-query-1[\s\S]*product-query-2[\s\S]*product-query-3[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(singleCommand, /--filter-sets/u);
  assert.doesNotMatch(singleCommand, /<environment-flag>|--sandbox|--test/u);
  assert.match(
    aggregateCommand,
    /exactly four genuinely different safe plans[\s\S]*recommend-products "<original-current-user-query>"[\s\S]*--filter-sets[\s\S]*filter-1[\s\S]*filter-2[\s\S]*filter-3[\s\S]*filter-4[\s\S]*--anonymous[\s\S]*--include-broad-catalog[\s\S]*--broad-queries[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(aggregateCommand, /<environment-flag>|--sandbox|--test/u);
  assert.match(
    discovery,
    /Never duplicate filters[\s\S]*fan out reward types[\s\S]*multiple Agent-managed Shell commands[\s\S]*one taxonomy snapshot[\s\S]*four parallel Visa[\s\S]*de-duplicates by Program code[\s\S]*Broad query variants[\s\S]*same CLI\s+command[\s\S]*never multiply Visa requests/iu,
  );
  assert.match(
    discovery,
    /Read[\s\S]*`references\/visa-recommend-filters\.md`/u,
  );
  assert.match(
    discovery,
    /Never add `--include-provider-products`[\s\S]*Agent-managed[\s\S]*product-search[\s\S]*merchant-list[\s\S]*aggregate owns one[\s\S]*anonymous merchant-list read[\s\S]*exact Program-code matching[\s\S]*never parses an unconfigured/iu,
  );
  assert.match(
    discovery,
    /does not log in[\s\S]*bind a card[\s\S]*create an Instruction[\s\S]*Checkout[\s\S]*payment/iu,
  );
  assert.match(
    skill,
    /visa recommend-products[\s\S]*also omit them[\s\S]*rely[\s\S]*bundled launcher/iu,
  );
});

test('anonymous discovery never preflights wallet environment', () => {
  const environment = skill.slice(
    skill.indexOf('### Distribution And Purchase Environment'),
    skill.indexOf('### Benefit Source Region'),
  );
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  const wallet = skill.slice(
    skill.indexOf('### CAP-WALLET:'),
    skill.indexOf('### CAP-CARD:'),
  );

  assert.match(
    environment,
    /bundled launcher already pins[\s\S]*Anonymous discovery invokes it directly[\s\S]*omits `--sandbox`\/`--test`[\s\S]*never[\s\S]*determine, inspect, infer, or override[\s\S]*run any shell or authentication preflight/iu,
  );
  assert.match(
    environment,
    /Only after[\s\S]*exact product[\s\S]*authorizes an authenticated\s+purchase[\s\S]*wallet and purchase environments agree/iu,
  );
  assert.match(
    wallet,
    /wallet status[\s\S]*explicit wallet request[\s\S]*after[\s\S]*exact product selection[\s\S]*Never use it to preflight anonymous discovery/iu,
  );
  assert.doesNotMatch(
    discovery,
    /wallet status|wallet init|visa status|config get|authentication preflight/iu,
  );
  assert.match(
    agent,
    /resolved Skill Path and launcher are[\s\S]*authoritative[\s\S]*Execute it directly[\s\S]*never run ls[\s\S]*stat[\s\S]*find[\s\S]*which[\s\S]*test -x[\s\S]*launcher already pins[\s\S]*anonymous[\s\S]*omits --sandbox\/--test[\s\S]*Check wallet environment only[\s\S]*exact product selection[\s\S]*explicit purchase authorization/iu,
  );
});

test('Benefit source region resolves inside recommend without a preflight', () => {
  const sourceRegion = skill.slice(
    skill.indexOf('### Benefit Source Region'),
    skill.indexOf('### Catalog Money'),
  );

  assert.match(
    sourceRegion,
    /unique taxonomy `--region hk`[\s\S]*`--region cn`[\s\S]*selects that[\s\S]*endpoint[\s\S]*persists it as the next default/iu,
  );
  assert.match(
    sourceRegion,
    /no HK\/CN region[\s\S]*omit `--market`[\s\S]*saved value[\s\S]*initializes missing config to `hk`/iu,
  );
  assert.match(
    sourceRegion,
    /source and destination are explicitly different[\s\S]*`--market <source>`[\s\S]*`--region <destination>`[\s\S]*Explicit market[\s\S]*wins/iu,
  );
  assert.match(
    sourceRegion,
    /Never run `visa region get` or `visa region set` as a search preflight[\s\S]*only when the user separately asks/iu,
  );
  assert.match(
    sourceRegion,
    /returned `sourceRegion`[\s\S]*`sourceEndpoint`[\s\S]*match the selection/iu,
  );
  assert.match(
    sourceRegion,
    /Taxonomy `--region`[\s\S]*where a Benefit is usable[\s\S]*unique HK\/CN value[\s\S]*next source default[\s\S]*other or multi-value destinations do not/iu,
  );
  assert.match(
    agent,
    /unique[\s\S]*--region hk[\s\S]*--region cn[\s\S]*selects that endpoint[\s\S]*persists[\s\S]*no HK\/CN region[\s\S]*saved config[\s\S]*explicitly different[\s\S]*--market <source>[\s\S]*explicit market wins[\s\S]*Never run visa region get\/set/iu,
  );
  assert.match(
    filterReference,
    /Required Shape[\s\S]*`region`[\s\S]*user destination[\s\S]*remembered region[\s\S]*`hk`[\s\S]*`category`/iu,
  );
});

test('broad Visa availability matches products and retains unmatched Benefits', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa Benefit And Product Discovery'),
  );
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  const allCommand = discovery.slice(
    discovery.indexOf('For broad availability wording'),
    discovery.indexOf('For a Hong Kong destination'),
  );

  assert.match(
    routing,
    /What Visa Benefits can I use in Hong Kong[\s\S]*one[\s\S]*recommendation[\s\S]*configured internal product matching/iu,
  );
  assert.match(
    discovery,
    /broad availability wording[\s\S]*always add `--all`[\s\S]*complete regional\s+set/iu,
  );
  assert.match(
    allCommand,
    /visa recommend-products "<original-current-user-query>"[\s\S]*<individual-filter-flags>[\s\S]*--anonymous[\s\S]*--all[\s\S]*--include-broad-catalog[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(allCommand, /--filter-sets/u);
  assert.doesNotMatch(allCommand, /--include-provider-products/u);
  assert.doesNotMatch(allCommand, /<environment-flag>|--sandbox|--test/u);
  assert.match(
    discovery,
    /Hong Kong destination[\s\S]*`--region hk`[\s\S]*single-filter call[\s\S]*four-set aggregate mode[\s\S]*"region": \["hk"\][\s\S]*never add an outer `--region`/iu,
  );
  assert.match(
    discovery,
    /Read only[\s\S]*`products`[\s\S]*`visaBenefits`/iu,
  );
  assert.match(
    discovery,
    /`products` is one unified list[\s\S]*Visa-linked[\s\S]*broad Catalog[\s\S]*Do not group or label[\s\S]*Preserve `catalogProvenance` internally[\s\S]*matched Program[\s\S]*must not be displayed again as a Benefit/iu,
  );
  assert.match(
    discovery,
    /internal broad candidate[\s\S]*item URL[\s\S]*environment-locked provider registry[\s\S]*Never invent a URL[\s\S]*unregistered URL-less candidate/iu,
  );
  for (const field of [
    'merchantId',
    'merchantUrl',
    'endpoint',
    'providerKey',
    'registryVersion',
    'product.itemId',
    'catalogProvenance',
  ]) {
    assert.match(discovery, new RegExp(`\`${field.replace('.', '\\.')}\``, 'u'));
  }
  assert.match(
    discovery,
    /`matchedPrograms` array[\s\S]*purchase provenance only[\s\S]*Never use it[\s\S]*Benefit title[\s\S]*Offer URL[\s\S]*returnedProductCount>0[\s\S]*returnedVisaBenefitCount=0[\s\S]*products only/iu,
  );
  assert.match(
    discovery,
    /`visaBenefits` contains Programs[\s\S]*did not resolve/iu,
  );
  assert.match(
    discovery,
    /`visaBenefits` is the only source[\s\S]*user-facing Benefit rows[\s\S]*empty[\s\S]*display no Benefit[\s\S]*`matchedPrograms`/iu,
  );
  assert.match(
    discovery,
    /hard[\s\S]*constraints[\s\S]*preserve code, title, order, summary, dates, and URL/iu,
  );
  assert.match(
    discovery,
    /Lightly check both collections[\s\S]*original request[\s\S]*Drop clearly unrelated rows[\s\S]*coffee excludes supermarket products\/Benefits[\s\S]*Keep plausible aliases\/translations/iu,
  );
  assert.match(
    discovery,
    /`broadCatalogSearch\.coverage=partial`[\s\S]*incomplete broad product[\s\S]*preserving linked products and Benefits/iu,
  );
  assert.match(
    agent,
    /read only\s+references\/visa-recommend-filters\.md[\s\S]*smallest safe[\s\S]*one strict explicit-filter call by default[\s\S]*--filter-sets only when exactly four genuinely different safe plans[\s\S]*Run exactly one visa[\s\S]*recommend-products/iu,
  );
  assert.match(
    agent,
    /matchedPrograms is purchase provenance only[\s\S]*never reconstruct a Benefit[\s\S]*visaBenefits is the only source[\s\S]*returnedProductCount>0[\s\S]*returnedVisaBenefitCount=0[\s\S]*products only/iu,
  );
  assert.match(
    agent,
    /lightly check every[\s\S]*original request[\s\S]*product title\/sourceTitle\/merchant[\s\S]*Benefit title\/summary\/tags[\s\S]*coffee[\s\S]*excludes supermarket gift cards[\s\S]*Keep[\s\S]*translations[\s\S]*brand aliases[\s\S]*category synonyms[\s\S]*do not invent[\s\S]*constraints/iu,
  );
  assert.match(
    agent,
    /URL-less internal broad product[\s\S]*locked provider registry[\s\S]*never invent a URL/iu,
  );
  for (const field of [
    'merchantId',
    'merchantUrl',
    'endpoint',
    'productId',
    'providerKey',
    'registryVersion',
    'catalogProvenance',
  ]) {
    assert.match(agent, new RegExp(field, 'u'));
  }
  assert.match(
    agent,
    /selected registered product[\s\S]*mode=catalog_purchase[\s\S]*exact-revalidate[\s\S]*Catalog[\s\S]*product API[\s\S]*drift stops/iu,
  );
  assert.match(
    agent,
    /Other or[\s\S]*multi-value destinations do not update the[\s\S]*saved source/iu,
  );
});

test('discovery presents products first and stays silent about empty collections', () => {
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );
  const resultContract = skill.slice(
    skill.indexOf('## Result Contract'),
    skill.indexOf('## Safety Summary'),
  );

  for (const document of [discovery, resultContract, agent]) {
    assert.match(
      document,
      /products`?\s+first[\s\S]*visaBenefits/iu,
    );
    assert.match(
      document,
      /only\s+`?products`?\s+remain[\s\S]*products only[\s\S]*do not mention missing[\s\S]*Benefits/iu,
    );
    assert.match(
      document,
      /only\s+`?visaBenefits`?\s+remain[\s\S]*Benefits only[\s\S]*do not mention missing[\s\S]*products/iu,
    );
    assert.match(
      document,
      /both filtered collections are empty[\s\S]*no-results|no result only when[\s\S]*both filtered collections are empty/iu,
    );
  }
  assert.match(
    readme,
    /orderable products first[\s\S]*Benefits[\s\S]*empty sections are omitted[\s\S]*both[\s\S]*collections are empty/iu,
  );
  assert.match(
    readmeZh,
    /可下单商品优先[\s\S]*相关权益其次[\s\S]*空集合不单独说明[\s\S]*两边[\s\S]*都为空/iu,
  );
});

test('compact filter reference defines schema, selection priority, and intent boundary', () => {
  assert.match(
    filterReference,
    /Every request or `--filter-sets` object requires[\s\S]*`region`[\s\S]*`category`/iu,
  );
  assert.match(
    filterReference,
    /`category`[\s\S]*Multiple[\s\S]*values are OR[\s\S]*Different axes are AND/iu,
  );
  assert.match(
    filterReference,
    /"region": \["hk"\][\s\S]*"category": \["shopping_supermarket", "shopping_department_mall"\]/u,
  );
  assert.match(
    filterReference,
    /Add `purpose`, `reward_type`, `attribute`, `card_level`, or `card_issuer` only[\s\S]*explicitly stated[\s\S]*otherwise omit/iu,
  );
  assert.match(
    filterReference,
    /Generic `优惠`[\s\S]*`权益`[\s\S]*`benefit`[\s\S]*`offer` selects none/iu,
  );
  for (const field of ['type', 'keyword', 'limit', 'page']) {
    assert.doesNotMatch(filterReference, new RegExp(`"${field}"\\s*:`, 'u'));
  }
  assert.match(
    filterReference,
    /Prefer one multi-category plan[\s\S]*`--filter-sets`[\s\S]*four genuinely different safe plans[\s\S]*each still\s+requires region\/category/iu,
  );
  assert.match(
    filterReference,
    /Visa recommendation uses only[\s\S]*taxonomy filters[\s\S]*sends no[\s\S]*keyword[\s\S]*unchanged positional query[\s\S]*matched-merchant Catalog[\s\S]*first broad search[\s\S]*`--broad-queries`/iu,
  );
  const taxonomyCodes = [
    'outbound', 'study', 'local', 'inbound', 'haitao',
    'cn', 'hmt', 'kj', 'sea', 'anz', 'eu', 'na', 'mideast', 'sasia',
    'africa', 'global', 'hk', 'mo', 'tw', 'jp', 'kr', 'th', 'my', 'sg',
    'vn', 'ph', 'id', 'kh', 'la', 'bn', 'mv', 'au', 'nz', 'gb', 'fr',
    'de', 'it', 'es', 'ch', 'nl', 'be', 'at', 'pt', 'gr', 'ie', 'us',
    'ca', 'mx', 'ae', 'qa', 'sa', 'in', 'np', 'bd', 'pk', 'ma', 'za', 'eg',
    'dining', 'dining_restaurant', 'dining_cafe_bakery', 'dining_bar',
    'dining_fast_casual', 'dining_fine', 'dining_delivery_food', 'dining_other',
    'shopping', 'shopping_department_mall', 'shopping_supermarket',
    'shopping_fashion', 'shopping_luxury', 'shopping_beauty',
    'shopping_jewelry_watches', 'shopping_electronics', 'shopping_duty_free',
    'shopping_specialty', 'shopping_other', 'lodging', 'lodging_hotel',
    'lodging_resort', 'lodging_apartment', 'lodging_budget', 'lodging_other',
    'airfare', 'airfare_ticket', 'airfare_upgrade', 'airfare_lounge',
    'airfare_baggage', 'airfare_other', 'ground_transport',
    'transport_car_rental', 'transport_ride_taxi', 'transport_airport_transfer',
    'transport_transit_rail', 'transport_fuel_parking', 'transport_other',
    'travel_service', 'travel_visa', 'travel_insurance', 'travel_medical',
    'travel_tour_activity', 'travel_tax_refund', 'travel_concierge',
    'travel_other', 'entertainment', 'ent_attraction', 'ent_cinema_show',
    'ent_culture', 'ent_sports', 'ent_nightlife_gaming', 'ent_other',
    'wellness', 'wellness_spa_massage', 'wellness_beauty_salon',
    'wellness_fitness', 'wellness_medical', 'wellness_onsen', 'wellness_other',
    'telecom', 'telecom_roaming', 'telecom_sim_esim', 'telecom_wifi',
    'telecom_mobile', 'telecom_other', 'financial_service', 'fin_fx',
    'fin_installment', 'fin_insurance', 'fin_other', 'education',
    'edu_study_abroad', 'edu_course', 'edu_tuition', 'edu_student_living',
    'edu_other', 'other', 'other_uncategorized', 'discount', 'cashback',
    'coupon', 'points', 'privilege', 'gift', 'new_customer', 'limited_time',
    'limited_quantity', 'no_threshold', 'stackable', 'online_only',
    'instore_only', 'app_exclusive', 'applepay', 'reservation_required',
    'free_cancellation', 'family_friendly', 'couple', 'group', 'pet_friendly',
    'senior_friendly', 'premium', 'exclusive', 'classic', 'gold', 'platinum',
    'signature', 'infinite', 'business', 'business_gold', 'business_platinum',
    'business_signature', 'corporate', 'all', 'BOC', 'BOCOM', 'CCB', 'ICBC',
    'ABC', 'CITIC', 'CGB', 'CMB', 'PAB', 'SPDB', 'CIB', 'HXB', 'CMBC',
    'BOB', 'BOS', 'CEB', 'CITI', 'BEA', 'SCB', 'NCB', 'HKB', 'BOJ', 'BOD',
    'HSB', 'BODG', 'JXB', 'BOZ', 'CQRCB', 'BONB', 'BOG', 'BOX', 'ZJTLB',
    'HRB', 'BRCB', 'GRCB', 'BOH', 'CZB', 'BOSZ', 'NYRCB', 'BOGY', 'BOCS',
    'BOJL', 'SJB', 'BOCD', 'XIB', 'PSBC', 'SRCB', 'FUBON', 'CITICDB',
    'CCBDB', 'BOCDB', 'CMBDB', 'ABCDB', 'CIBPLATINUM', 'BOCAPP',
  ];
  for (const code of taxonomyCodes) {
    assert.match(filterReference, new RegExp(`\\b${code}\\b`, 'u'), code);
  }
  assert.match(
    filterReference,
    /香港超市和百货优惠[\s\S]*shopping_supermarket shopping_department_mall[\s\S]*香港本地超市优惠券[\s\S]*purpose=local[\s\S]*reward_type=coupon[\s\S]*我想下单咖啡[\s\S]*category=dining_cafe_bakery/iu,
  );
  assert.match(
    agent,
    /Every plan must include region[\s\S]*at least one category[\s\S]*remembered search region[\s\S]*else hk[\s\S]*multiple values as OR[\s\S]*purpose[\s\S]*reward_type[\s\S]*attribute[\s\S]*card_level[\s\S]*card_issuer only[\s\S]*explicitly stated[\s\S]*Never[\s\S]*limit or page/iu,
  );
});

test('a Visa miss suppresses fallback rows but keeps parallel broad products', () => {
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
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
    /Visa relaxes[\s\S]*compatible CLI[\s\S]*`ok=true`[\s\S]*`recommendationMode=no_matching_offers`[\s\S]*`strictMatchFailure\.code=relaxed_explicit_filters`[\s\S]*broad products remain/iu,
  );
  assert.match(
    fallback,
    /legacy `ok=false` relaxation error[\s\S]*incompatible[\s\S]*discarded broad results[\s\S]*Every other[\s\S]*error also stops/iu,
  );
  assert.match(
    fallback,
    /Never display fallback Visa rows/iu,
  );
  assert.match(
    fallback,
    /Visa miss[\s\S]*do not display fallback Visa rows[\s\S]*presentation rules[\s\S]*surviving broad products[\s\S]*Never announce[\s\S]*missing Visa Benefits while products remain/iu,
  );
  assert.match(
    agent,
    /Explicit Visa filter relaxation[\s\S]*ok=true[\s\S]*recommendationMode=no_matching_offers[\s\S]*strictMatchFailure\.code=relaxed_explicit_filters[\s\S]*retaining broad\s+products/iu,
  );
  assert.match(
    agent,
    /legacy ok=false relaxation error[\s\S]*incompatible[\s\S]*stops/iu,
  );
  assert.match(
    agent,
    /every other error stops/iu,
  );
  assert.match(
    agent,
    /suppress fallback Visa rows[\s\S]*result-presentation rules[\s\S]*Never announce a Visa miss[\s\S]*products\s+remain/iu,
  );
  assert.doesNotMatch(fallback, /bin\/visa-cli catalog search/u);
});

test('unmatched Visa Benefit supports detail without another product search', () => {
  const selected = skill.slice(
    skill.indexOf('### Selected Visa Benefit Resolution'),
    skill.indexOf('## Visa Purchase Fast Path'),
  );

  const detail = selected.indexOf('bin/visa-cli visa detail');
  const productSearch = selected.indexOf('bin/visa-cli visa product-search');
  assert.ok(detail >= 0);
  assert.equal(productSearch, -1);
  assert.match(
    selected,
    /unmatched Visa Benefit[\s\S]*stable Program code[\s\S]*visa detail[\s\S]*activity summary[\s\S]*do not rerun[\s\S]*or add a[\s\S]*purchase CTA/iu,
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
    /Do not rerun `visa product-search`[\s\S]*add a purchase CTA[\s\S]*authorized exact[\s\S]*never `visa detail`/iu,
  );
});

test('direct shopping uses combined Visa and broad Catalog discovery', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa Benefit And Product Discovery'),
  );
  const catalogPurchase = skill.slice(
    skill.indexOf('## Catalog Purchase Fast Path'),
    skill.indexOf('### Visa Preparation'),
  );

  assert.match(
    routing,
    /Every product, category, or merchant discovery[\s\S]*buy\/order\/checkout request[\s\S]*combined Visa and broad-Catalog[\s\S]*even without[\s\S]*Visa[\s\S]*我想下单咖啡[\s\S]*same one-round aggregate/iu,
  );
  assert.match(
    routing,
    /我想下单咖啡[\s\S]*有咖啡的券吗[\s\S]*Visa 咖啡优惠券[\s\S]*有哪些咖啡权益[\s\S]*taxonomy filters differ/iu,
  );
  assert.match(
    routing,
    /Never route initial shopping discovery directly to `catalog search`/iu,
  );
  assert.match(
    catalogPurchase,
    /Initial shopping discovery already ran broad Catalog inside[\s\S]*visa recommend-products --include-broad-catalog[\s\S]*Never call standalone[\s\S]*catalog search[\s\S]*Preserve[\s\S]*catalogProvenance/iu,
  );
  assert.doesNotMatch(
    catalogPurchase,
    /<Skill Path>\/bin\/visa-cli catalog search[\s\S]*--query/iu,
  );
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
    /broad Catalog product[\s\S]*aggregate[\s\S]*no matched Visa Program[\s\S]*ordinary\s+Catalog shopping[\s\S]*must\s+not[\s\S]*inherit Visa Program eligibility/iu,
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
    /registered URL-less internal candidate[\s\S]*CLI-returned[\s\S]*`merchantId`[\s\S]*registry `merchantUrl`[\s\S]*`endpoint`[\s\S]*`productId`[\s\S]*never[\s\S]*invent an item URL[\s\S]*mode=catalog_purchase[\s\S]*bypass the[\s\S]*merchant list[\s\S]*exact-revalidate[\s\S]*Catalog product API[\s\S]*drift stops/iu,
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
    /"expected"[\s\S]*"amount": "<product\.totalAmountMajor>"[\s\S]*"currency": "<product\.currency>"[\s\S]*"amountLimit": "<product\.totalAmountMajor>"[\s\S]*"currencyCode": "<product\.currency>"/iu,
  );
  assert.doesNotMatch(
    catalogPurchase,
    /<structured-catalog-purchase-price>|<structured-catalog-purchase-currency>/u,
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
    /Program `P2026080006`[\s\S]*merchant-list[\s\S]*`ext\.visa_program_id`[\s\S]*mcht_ftmse61a6az0[\s\S]*Wellcome supermarket gift-card[\s\S]*MCC `5411`/iu,
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
    /Program merchantCategoryCode first[\s\S]*absent[\s\S]*complete frozen merchant\/product context[\s\S]*Program P2026080006[\s\S]*ext\.visa_program_id[\s\S]*mcht_ftmse61a6az0[\s\S]*MCC 5411[\s\S]*Freeze the\s+resolved MCC/iu,
  );
});

test('Visa fast path preserves aggregate order and never decomposes purchase', () => {
  const route = skill.indexOf(
    'visa recommend-products -> ask to order ->',
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
    /latest unchanged[\s\S]*`recommend-products` snapshot[\s\S]*directly in `visa commerce-login`[\s\S]*never run or refresh `visa detail`/iu,
  );
  assert.doesNotMatch(
    section,
    /<Skill Path>\/bin\/visa-cli visa detail/u,
  );
  assert.match(
    agent,
    /explicitly authorizes buy, order, or checkout[\s\S]*directly to commerce-login[\s\S]*never run or refresh visa detail/iu,
  );
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
  assert.match(
    section,
    /login context[\s\S]*"expected"[\s\S]*"amount": "<product\.totalAmountMajor>"[\s\S]*"currency": "<verified-currency>"[\s\S]*"amountLimit": "<product\.totalAmountMajor>"/iu,
  );
  assert.match(
    section,
    /Set login\/purchase `expected\.amount`[\s\S]*every `amountLimit`[\s\S]*`product\.totalAmountMajor`[\s\S]*Never copy `unitPriceMinor`[\s\S]*`totalAmountMinor`[\s\S]*quantity >1[\s\S]*`unitPriceMajor`/iu,
  );
  assert.match(
    section,
    /`totalAmountMinor=100`[\s\S]*`totalAmountMajor="1"`[\s\S]*all three major-unit fields[\s\S]*`"1"`/iu,
  );
  assert.doesNotMatch(section, /<exact-program-price>/u);
  assert.match(
    agent,
    /Every commerce-login context includes expected\.amount[\s\S]*expected\.currency[\s\S]*product\.totalAmountMajor[\s\S]*every amountLimit[\s\S]*never copy unitPriceMinor[\s\S]*totalAmountMinor[\s\S]*quantity above 1[\s\S]*never use unitPriceMajor/iu,
  );
  assert.match(section, /single\s+purchase authorization/iu);
  assert.match(
    section,
    /CLI\s+alone owns the Pending Instruction Card\s+Gate/iu,
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

test('purchase context maps merchantUrl to the recommend-products merchant route, never the Program page', () => {
  assert.match(skill, /"merchantUrl": "<verified-merchant-route-url>"/u);
  assert.match(skill, /products\[\]\.product\.merchantUrl/u);
  assert.match(skill, /products\[\]\.product\.productUrl/u);
  assert.match(skill, /Never use the Program `url`/u);
  assert.doesNotMatch(skill, /authoritative-program-commerce-url/u);
});
