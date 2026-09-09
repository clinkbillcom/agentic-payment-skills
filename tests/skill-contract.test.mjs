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
const quickContracts = [
  skill.slice(
    skill.indexOf('### Quick Instruction Card Gate'),
    skill.indexOf('## Intent Routing'),
  ),
  agent.slice(agent.indexOf('Portal owns card binding and VIC.')),
].map((text) => text.replace(/`/gu, '').replace(/\s+/gu, ' '));

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
  assert.equal(packageJson.version, '0.1.84');
  assert.deepEqual(packageJson.bin, { 'visa-cli': './bin/visa-cli' });
  assert.deepEqual(packageJson.scripts, {
    test: 'node --test tests/*.test.mjs',
  });
  assert.ok(skill.includes(`Visa Skill ${packageJson.version}.`));
  assert.ok(skill.includes(`version: "${packageJson.version}"`));
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
    [
      'references/change-log.md',
      'references/quick-instruction-cases.md',
      'references/visa-recommend-filters.md',
    ],
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

test('initial Visa discovery runs one matched-merchant aggregate without broad Catalog', () => {
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
    /Initial shopping discovery[\s\S]*exactly one `visa recommend-products`[\s\S]*unchanged original current user request/iu,
  );
  assert.match(
    discovery,
    /Never pass[\s\S]*`--include-broad-catalog` or `--broad-queries`/iu,
  );
  assert.match(
    discovery,
    /merchant list once[\s\S]*Program `code`[\s\S]*merchant `ext\.visa_program_id`[\s\S]*Offer URL never selects a merchant/iu,
  );
  assert.match(
    discovery,
    /positional query[\s\S]*only primary text[\s\S]*Visa recommendation sends taxonomy filters only[\s\S]*no keyword[\s\S]*Program-to-merchant match[\s\S]*merchant's Catalog query[\s\S]*Offer titles must[\s\S]*not replace/iu,
  );
  assert.match(
    singleCommand,
    /visa recommend-products "<original-current-user-query>"[\s\S]*--region <region> --category <category>[\s\S]*--anonymous[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(singleCommand, /--filter-sets/u);
  assert.doesNotMatch(
    singleCommand,
    /<environment-flag>|--sandbox|--test|--include-broad-catalog|--broad-queries/u,
  );
  assert.match(
    aggregateCommand,
    /exactly four genuinely different safe plans[\s\S]*recommend-products "<original-current-user-query>"[\s\S]*--filter-sets[\s\S]*filter-1[\s\S]*filter-2[\s\S]*filter-3[\s\S]*filter-4[\s\S]*--anonymous[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(
    aggregateCommand,
    /<environment-flag>|--sandbox|--test|--include-broad-catalog|--broad-queries/u,
  );
  assert.match(
    discovery,
    /Never duplicate filters[\s\S]*fan out reward types[\s\S]*multiple Agent-managed Shell commands[\s\S]*one taxonomy snapshot[\s\S]*four parallel Visa[\s\S]*de-duplicates by Program code/iu,
  );
  assert.match(
    discovery,
    /Read[\s\S]*`references\/visa-recommend-filters\.md`/u,
  );
  assert.match(
    discovery,
    /Never add `--include-provider-products`, `--include-broad-catalog`, or[\s\S]*`--broad-queries`[\s\S]*Agent-managed[\s\S]*Catalog command/iu,
  );
  assert.match(
    discovery,
    /aggregate owns one[\s\S]*anonymous merchant-list read[\s\S]*exact Program-code matching[\s\S]*matched-merchant[\s\S]*Catalog search/iu,
  );
  assert.match(
    discovery,
    /does not[\s\S]*log in[\s\S]*bind a card[\s\S]*create an Instruction[\s\S]*Checkout[\s\S]*payment/iu,
  );
  assert.match(
    skill,
    /visa recommend-products[\s\S]*also omit them[\s\S]*rely[\s\S]*bundled launcher/iu,
  );
  assert.match(
    agent,
    /product-match[\s\S]*never runs broad Catalog[\s\S]*never pass --include-broad-catalog[\s\S]*--broad-queries[\s\S]*never call standalone catalog search as fallback/iu,
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

test('Visa availability returns Program-matched products plus unmatched Benefits only', () => {
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
    /What Visa Benefits can I use in Hong Kong[\s\S]*one[\s\S]*Visa recommendation[\s\S]*configured internal product matching/iu,
  );
  assert.match(
    discovery,
    /broad availability wording[\s\S]*always add `--all`[\s\S]*complete regional[\s\S]*set/iu,
  );
  assert.match(
    allCommand,
    /visa recommend-products "<original-current-user-query>"[\s\S]*<individual-filter-flags>[\s\S]*--anonymous[\s\S]*--all[\s\S]*--lang/iu,
  );
  assert.doesNotMatch(
    allCommand,
    /--filter-sets|--include-provider-products|--include-broad-catalog|--broad-queries|<environment-flag>|--sandbox|--test/u,
  );
  assert.match(
    discovery,
    /Hong Kong destination[\s\S]*`--region hk`[\s\S]*single-filter call[\s\S]*four-set aggregate mode[\s\S]*"region": \["hk"\][\s\S]*never add an outer `--region`/iu,
  );
  assert.match(
    discovery,
    /Read only the aggregate `products` and `visaBenefits` collections/iu,
  );
  assert.match(
    discovery,
    /`products` contains only verified internal UCP products[\s\S]*exact[\s\S]*Program-to-merchant matching[\s\S]*matched Program must not be displayed again[\s\S]*Benefit/iu,
  );
  assert.match(
    discovery,
    /`matchedPrograms` array[\s\S]*purchase provenance only[\s\S]*Never use it[\s\S]*Benefit title[\s\S]*Offer URL[\s\S]*returnedProductCount>0[\s\S]*returnedVisaBenefitCount=0[\s\S]*products only/iu,
  );
  assert.match(
    discovery,
    /`visaBenefits` contains Programs[\s\S]*did not resolve[\s\S]*exact orderable[\s\S]*only source for user-facing Benefit rows/iu,
  );
  assert.match(
    discovery,
    /Lightly check both collections[\s\S]*original request[\s\S]*Drop clearly unrelated rows[\s\S]*coffee excludes supermarket products\/Benefits[\s\S]*Keep plausible aliases\/translations/iu,
  );
  assert.match(
    agent,
    /Read only products and visaBenefits[\s\S]*Products contains only verified internal UCP[\s\S]*products from exact Program-to-merchant matching[\s\S]*matchedPrograms is purchase provenance only[\s\S]*visaBenefits is the only source/iu,
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
    /Add `purpose`, `attribute`, `card_level`, or `card_issuer` only[\s\S]*explicitly stated[\s\S]*otherwise omit/iu,
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
    /Visa recommendation uses only[\s\S]*taxonomy filters[\s\S]*sends no[\s\S]*keyword[\s\S]*unchanged positional query[\s\S]*Program-matched[\s\S]*merchant Catalog search[\s\S]*Never pass `--include-broad-catalog`[\s\S]*`--broad-queries`/iu,
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
    'edu_other', 'other', 'other_uncategorized', 'new_customer', 'limited_time',
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
    /香港超市和百货优惠[\s\S]*shopping_supermarket shopping_department_mall[\s\S]*香港本地超市[\s\S]*region=hk[\s\S]*category=shopping_supermarket[\s\S]*purpose=local[\s\S]*我想下单咖啡[\s\S]*category=dining_cafe_bakery/iu,
  );
  assert.match(
    agent,
    /Every plan must include region[\s\S]*at least one category[\s\S]*remembered search region[\s\S]*else hk[\s\S]*multiple values as OR[\s\S]*purpose[\s\S]*attribute[\s\S]*card_level[\s\S]*card_issuer only[\s\S]*explicitly stated[\s\S]*Never[\s\S]*limit or page/iu,
  );
});

test('discovery never fills reward_type and keeps region, category, and explicit local purpose', () => {
  assert.match(skill, /Never fill `reward_type`[\s\S]*filter objects or pass `--reward-type`/u);
  assert.match(agent, /Never fill reward_type[\s\S]*objects or pass --reward-type/u);
  assert.match(filterReference, /Never fill `reward_type` or pass `--reward-type`/u);
  for (const text of [skill, agent, filterReference]) {
    assert.doesNotMatch(text, /reward_type=coupon|Set `?reward_type`? only when/u);
  }
  assert.match(skill, /Keep region, category, and explicitly requested purpose such as local/u);
  assert.doesNotMatch(filterReference, /^reward_type:/mu);
});

test('a Visa miss never starts Catalog fallback', () => {
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
    /fallback_all_offers[\s\S]*no_matching_offers[\s\S]*zero Programs[\s\S]*Visa miss[\s\S]*Never display fallback Visa rows/iu,
  );
  assert.match(
    fallback,
    /Visa relaxes[\s\S]*explicitly requested taxonomy axis[\s\S]*no strict[\s\S]*match and stop without Catalog fallback/iu,
  );
  assert.match(
    fallback,
    /Every command error also stops/iu,
  );
  assert.match(
    fallback,
    /Visa miss[\s\S]*do not display fallback Visa rows or search Catalog[\s\S]*both[\s\S]*products and Benefits are empty[\s\S]*no-results/iu,
  );
  assert.match(
    agent,
    /Visa miss, relaxed[\s\S]*explicit filter, or command error never starts Catalog fallback/iu,
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

test('direct shopping remains Visa-first without broad or Catalog-only routing', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa Benefit And Product Discovery'),
  );
  const discovery = skill.slice(
    skill.indexOf('## Visa Benefit And Product Discovery'),
    skill.indexOf('### Selected Visa Benefit Resolution'),
  );

  assert.match(
    routing,
    /Every initial product, category, merchant, buy\/order\/checkout, and Benefit request[\s\S]*same Visa-first aggregate[\s\S]*never runs broad Catalog/iu,
  );
  assert.match(
    routing,
    /我想下单咖啡[\s\S]*有咖啡的券吗[\s\S]*有哪些咖啡权益[\s\S]*differ only by taxonomy filters/iu,
  );
  assert.match(
    routing,
    /Never route initial shopping discovery directly to `catalog search`/iu,
  );
  assert.match(
    discovery,
    /For "我想下单咖啡"[\s\S]*`dining_cafe_bakery`[\s\S]*do not invent a `reward_type`[\s\S]*unchanged[\s\S]*query is not sent to Visa[\s\S]*used only for a Program-matched merchant/iu,
  );
  assert.doesNotMatch(discovery, /visa recommend-products --include-broad-catalog/u);
  assert.doesNotMatch(skill, /## Catalog Purchase Fast Path/u);
  assert.doesNotMatch(agent, /mode=catalog_purchase|catalogProvenance/u);
  assert.match(
    readme,
    /direct shopping through the same Visa-only Offer and matched-merchant flow/iu,
  );
  assert.match(
    readmeZh,
    /直接购物也只使用 Visa Offer 与命中商户搜索，不进入广域 Catalog/iu,
  );
});

test('internal acceptance labels never leak into Skill-facing instructions', () => {
  assert.doesNotMatch(combined, /\bCases?\s+[1-4]\b/iu);
  assert.match(
    skill,
    /Classify the request silently[\s\S]*Never announce the classification[\s\S]*user-facing text/iu,
  );
});

test('purchase uses a generated snapshot without Agent-authored Program or Instruction fields', () => {
  const section = skill.slice(
    skill.indexOf('## Visa Purchase Fast Path'),
    skill.indexOf('### Visa Preparation'),
  );
  assert.match(section, /purchaseContext` unchanged[\s\S]*mode=selected_product/u);
  assert.match(section, /Do not build an Instruction context, infer MCC, copy Program fields/u);
  assert.match(section, /purchaseContextUnavailable/u);
  assert.doesNotMatch(section, /```json|program-currency|selected-program-title/u);
  assert.match(agent, /same file in commerce-login and commerce-run/u);
});

test('short purchase replies bind the unchanged order without restatement', () => {
  for (const reply of ['买这个', '帮我下单', '确认购买', 'buy this', 'confirm purchase']) {
    assert.ok(skill.includes(reply), reply);
    assert.ok(agent.includes(reply), reply);
  }
  assert.match(skill, /one exact product and its displayed order facts are unchanged/u);
  assert.match(skill, /Never require the user\s+to repeat the full order or follow a confirmation template/u);
  assert.match(skill, /genuinely missing or materially changed facts/u);
  assert.doesNotMatch(skill, /recommend-products -> ask to order/u);
  assert.match(skill, /never silently reduce the quantity\s+or split the purchase/u);
  assert.match(skill, /one product with quantity 1 only/u);
});

test('pre-command notices distinguish optional login and authorization pages without asking again', () => {
  for (const text of [skill, agent]) {
    assert.ok(text.includes('现在启动登录流程，可能打开浏览器登录页面。'));
    assert.ok(text.includes('登录已就绪，直接执行购买流程，可能打开浏览器授权页面。'));
    assert.doesNotMatch(text, /现在启动登录流程，浏览器会打开授权页面/u);
  }
  assert.match(skill, /already-ready login does not\s+need another login page/u);
  assert.match(agent, /notices, not questions; execute immediately without waiting for a reply/u);
});

// These assertions validate the written contracts, not CLI or backend execution.
test('Quick contract: creation follows card readiness, never the legacy ID field name', () => {
  for (const normalized of quickContracts) {
    assert.match(normalized, /At Quick creation, an eligible selected VIC-ready Visa card yields a CREATED Quick bound to its paymentInstrumentId, without activation; otherwise the new Quick is PENDING/u);
    assert.match(normalized, /LOGIN and REGISTER both support these outcomes/u);
    assert.match(normalized, /legacy response field pendingInstructionId carries an ID, not a status/u);
    assert.match(normalized, /Use the actual Instruction status from the response and exact-GET; never infer PENDING from the field name/u);
    assert.match(normalized, /Preserve existing matching Quicks as-is; do not relabel a historical PENDING when card readiness changes/u);
    assert.match(normalized, /returns login-ready for a valid CREATED, PENDING, or ACTIVE Quick, without waiting for activation or opening VIC/u);
  }
});

test('Quick contract: CREATED opens original ID with its bound card without binding or VIC wait', () => {
  for (const normalized of quickContracts) {
    const created = normalized.slice(
      normalized.indexOf('With a CREATED Quick,'),
      normalized.indexOf('With a VIC-ready Visa card and a historical PENDING Quick,'),
    );
    assert.match(created, /immediately have CLI --open open the exact CLI-returned \/passkey-auth\/\{pi\}\?type=visa&instructionId=\{ORIGINAL_QUICK_ID\} URL using the original Quick ID and its bound paymentInstrumentId/u);
    assert.match(created, /Do not wait for binding or VIC\. Never substitute a different card/u);
    assert.match(created, /missing or mismatched binding requires a stop, not selection by list order/u);
    assert.match(created, /Portal's existing \/sign activates that same CREATED Quick/u);
    assert.match(created, /CREATED is not ACTIVE and does not permit Checkout before authorization/u);
  }
});

test('Quick contract: no-card PENDING timeout requests binding only within 15 minutes', () => {
  for (const normalized of quickContracts) {
    assert.match(normalized, /With no Visa card and a PENDING Quick Instruction, wait at most 15 minutes/u);
    assert.match(normalized, /On timeout, if there is still no Visa card, stop waiting and ask the user to bind a Visa card/u);
    assert.match(normalized, /Agent Portal entry as a binding link; the Portal home page is allowed for binding only/u);
    assert.match(normalized, /Do not ask the user to activate the Instruction or show a VIC\/Instruction activation link in this no-card state/u);
    assert.match(normalized, /Preserve the same Quick Instruction ID; never create a second/u);
  }
});

test('Quick contract: exact card VIC URL requires original-ID ceremony association', () => {
  for (const normalized of quickContracts) {
    assert.match(normalized, /With a PENDING Quick and a Visa card but no VIC, return the CLI's exact VIC URL for that card, never the Portal home page as a VIC link/u);
    assert.match(normalized, /same ceremony must be associated with the original Quick ID; if that association is unknown, do not promise automatic activation/u);
    assert.match(normalized, /Do not create another Instruction/u);
  }
});

test('Quick contract: historical VIC-ready PENDING keeps original-ID Passkey URL and existing sign', () => {
  for (const normalized of quickContracts) {
    assert.match(normalized, /With a VIC-ready Visa card and a historical PENDING Quick, CLI --open opens the exact \/passkey-auth\/\{pi\}\?type=visa&instructionId=\{ORIGINAL_QUICK_ID\} URL/u);
    assert.match(normalized, /Use only the CLI-returned URL: \{pi\} is the selected paymentInstrumentId and instructionId is the original Quick ID\. Never construct this URL/u);
    assert.match(normalized, /required backend contract is CWallet compatibility for Portal's existing \/sign: authorization activates the original Quick ID in this state/u);
    assert.match(normalized, /Never create another Instruction or wait for binding/u);
  }
});

test('Quick contract: browser failure exits and allowed rerun preserves original ID without creates', () => {
  for (const normalized of quickContracts) {
    assert.match(normalized, /CLI opens the browser, not an Agent browser tool; the Portal home page is not an activation link/u);
    assert.match(normalized, /After a successful opening, wait without another chat confirmation/u);
    assert.match(normalized, /On opener failure, return the original Quick's exact manual link and exit/u);
    assert.match(normalized, /CLI-permitted pre-Checkout rerun resumes the identical command and frozen context with the original Quick ID and zero creates/u);
    assert.match(normalized, /If the installed CLI cannot provide this path, report the limitation; never fall back to creating or selecting another Instruction/u);
  }
});

test('Quick contract: original matching ACTIVE is reused and another ACTIVE cannot displace it', () => {
  for (const normalized of quickContracts) {
    assert.match(normalized, /With an existing Quick, exact-GET and validate the original ID against the frozen purchase and card/u);
    assert.match(normalized, /Never switch an existing Quick to any other ACTIVE Instruction, even when it matches the same purchase/u);
    assert.match(normalized, /Missing or mismatched Quick state requires a stop, not a new selection/u);
    assert.match(normalized, /With an existing matching Quick already ACTIVE, reuse that exact ID directly\. Do not create an Instruction or request another authorization/u);
  }
});

test('Quick contract: only the no-Quick path retains normal ACTIVE reuse and ordinary create', () => {
  for (const normalized of quickContracts) {
    assert.match(normalized, /Without a Quick, normal matching ACTIVE reuse and ordinary Instruction creation remain unchanged/u);
    assert.match(normalized, /Do not discard a Quick ID to enter that path/u);
  }
  for (const text of [skill, agent]) {
    const normalized = text.replace(/`/gu, '').replace(/\s+/gu, ' ');
    assert.match(normalized, /With an existing Quick, create zero additional Instructions in every case/u);
    assert.doesNotMatch(
      normalized,
      /VIC-ready\/PENDING (?:exception|replacement)|Case C permits|unless Case C|except for the (?:one|single)|one (?:new|replacement) card-bound|creates exactly one card-bound|third Instruction|Continue with the new ID|first reuse an exact matching ACTIVE|ordinary activation of the no-card PENDING/u,
    );
  }
});

test('manual browser failure returns control and permits only an explicit pre-checkout continuation', () => {
  assert.match(skill, /Failed or explicitly disabled opening returns promptly with `manualOpenUrl`/u);
  assert.match(skill, /rerunAllowed=true[\s\S]*resumeMode=same_command[\s\S]*checkoutStarted=false/u);
  assert.match(skill, /After the user\s+returns, execute the identical command with the unchanged context file/u);
  assert.match(skill, /Do not immediately loop the command/u);
  assert.match(agent, /rerunAllowed=true[\s\S]*resumeMode=same_command[\s\S]*checkoutStarted=false/u);
  assert.match(skill, /browserLaunch=launched[\s\S]*does not call for a message, link/u);
  assert.match(skill, /No intermediate Shell output is required/u);
  assert.match(skill, /After possible Checkout creation[\s\S]*read-only recovery/u);
  assert.doesNotMatch(skill, /1-2 second initial result window|do not re-run login or purchase/u);
});

test('order replies include the CLI Portal link and never substitute a UCP identity', () => {
  assert.match(skill, /returns `orderUrl`[\s\S]*clickable "View order" link/u);
  assert.match(skill, /Never build `\/transaction\/` from a UCP `order\.id`, Checkout ID/u);
  assert.match(skill, /orderUrlUnavailable[\s\S]*do not invent an ID or retry/u);
  assert.match(agent, /orderUrl as a clickable 查看订单 \/ View order link/u);
});

test('Visa fast path preserves aggregate order and never decomposes purchase', () => {
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
  assert.match(section, /PRODUCT_VERIFIED[\s\S]*CONTINUE_TO_COMMERCE_LOGIN[\s\S]*productResolution=internal-ucp-catalog/u);
  assert.equal((section.match(/--context-file <purchase-context\.json>/gu) ?? []).length, 2);
  assert.match(section, /start login once without another conversation\s+checkpoint/u);
  assert.match(section, /When login is ready, immediately run commerce-run/u);
  assert.match(section, /without asking for authorization or another user reply/u);
  assert.match(section, /After successful browser opening, remain silent/u);
  assert.match(section, /single\s+purchase authorization/iu);
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

test('Portal owns binding and only the existing-card path may open VIC once', () => {
  const gate = skill.slice(
    skill.indexOf('### Quick Instruction Card Gate'),
    skill.indexOf('## Intent Routing'),
  );

  assert.match(gate, /Portal owns card binding and VIC/u);
  assert.match(gate, /CLI never opens Bind Card/u);
  assert.match(gate, /`commerce-login` saves the Quick ID and returns login-ready for a valid\s+CREATED, PENDING, or ACTIVE Quick/u);
  assert.match(gate, /without waiting for activation or opening VIC/u);
  assert.match(gate, /`commerce-run` owns card\/VIC\/Instruction waiting and handoffs/u);
  assert.match(gate, /ongoing VIC state must not trigger another automatic VIC opening/u);
  assert.match(gate, /exact PENDING before its VIC authorization starts/u);
  assert.match(gate, /LOGIN and REGISTER both/u);
  assert.match(gate, /same card to be VIC-ready and the original Quick to be ACTIVE/u);
  assert.match(gate, /existing matching Quick already ACTIVE, reuse that exact ID directly/u);
  assert.match(gate, /Never switch an existing Quick to any other ACTIVE/u);
  assert.match(gate, /timeout[\s\S]*explicit pre-Checkout same-command permission or read-only[\s\S]*timeout alone never permits another Instruction or payment retry/iu);

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
    /restricted-category enforcement/iu,
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

test('purchase route is preserved in the CLI snapshot instead of reconstructed by the Agent', () => {
  assert.match(skill, /selected row's\s+`purchaseContext` unchanged/u);
  assert.match(skill, /Do not build an Instruction context, infer MCC, copy Program fields/u);
  assert.doesNotMatch(skill, /authoritative-program-commerce-url/u);
});

test('recommend-products always carries a category or an explicit --all browse', () => {
  assert.match(skill, /Natural language never replaces the category flag/u);
  assert.match(skill, /every strict call carries\s+`--region` and at least one `--category`/u);
  assert.match(skill, /超市 \/ 街市 map\s+to `shopping_supermarket`/u);
  assert.match(skill, /region-only\s+browse must add `--all`/u);
  assert.match(skill, /filters\s+incomplete/u);
  assert.match(filterReference, /Natural language never replaces `category`/u);
  assert.match(filterReference, /region-only\s+browse\s+requires `--all`/u);
});
