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
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const vendorPackage = JSON.parse(
  await readFile(join(root, 'vendor', 'visa-cli', 'package.json'), 'utf8'),
);
const documents = [skill, readme, readmeZh, agent];
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
  assert.equal(packageJson.version, '0.1.39');
  assert.deepEqual(packageJson.bin, { 'visa-cli': './bin/visa-cli' });
  assert.deepEqual(packageJson.scripts, {
    test: 'node --test tests/*.test.mjs',
  });
  assert.match(skill, /Visa Skill 0\.1\.39/u);
  assert.match(skill, /version: "0\.1\.39"/u);
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

test('old workflow runtime, references, scripts, and docs are absent', async () => {
  for (const directory of ['lib', 'scripts', 'references', 'docs']) {
    await assert.rejects(stat(join(root, directory)));
  }

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

test('ordinary execution is reference-free and non-exploratory', () => {
  assert.match(
    skill,
    /do not read reference files[\s\S]*invoke runtime `--help`[\s\S]*fixed `sleep`/iu,
  );
  assert.match(skill, /shortest matching CLI capability/iu);
  assert.match(
    skill,
    /does not claim complete\s+behavioral equivalence[\s\S]*former Agent-side orchestration/iu,
  );
});

test('Visa discovery remains query-only with language and environment locks', () => {
  assert.match(skill, /Lock one language for the whole run/iu);
  assert.match(skill, /\ben\b[\s\S]*zh-CN[\s\S]*zh-TW[\s\S]*zh-HK/u);
  assert.match(skill, /Lock one environment[\s\S]*never mix environments/iu);
  assert.match(
    skill,
    /Visa-related Benefit discovery must make exactly one initial discovery call[\s\S]*visa recommend[\s\S]*--include-provider-products[\s\S]*joined command never\s+logs in/iu,
  );
  assert.match(
    skill,
    /fallback_all_offers[\s\S]*never rank, display,[\s\S]*recommend, or purchase fallback rows/iu,
  );
  assert.match(
    skill,
    /query-only request[\s\S]*present the classified joined results and stop/iu,
  );
  assert.match(
    skill,
    /visa recommend[\s\S]*do not accept[\s\S]*--sandbox[\s\S]*destination\s+`--region hk`[\s\S]*issuing `--market hk` only/iu,
  );
});

test('broad Visa availability fetches every Benefit and applies orderable-first presentation', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa And Provider Catalog Joined Discovery'),
  );
  const joined = skill.slice(
    skill.indexOf('## Visa And Provider Catalog Joined Discovery'),
    skill.indexOf('## Visa Purchase Fast Path'),
  );

  assert.match(
    routing,
    /What Visa Benefits can I use in Hong Kong[\s\S]*orderable-first[\s\S]*presentation rule/iu,
  );
  assert.match(
    joined,
    /broad availability wording[\s\S]*always add `--all`[\s\S]*complete regional\s+set/iu,
  );
  assert.match(
    joined,
    /visa recommend[\s\S]*--include-provider-products[\s\S]*--all[\s\S]*--region hk[\s\S]*--lang/iu,
  );
  assert.match(
    joined,
    /exactly one initial discovery call[\s\S]*Do not issue a separate initial `ucp-catalog search`[\s\S]*second `visa recommend`/iu,
  );
  assert.doesNotMatch(joined, /at most\s+(?:the\s+)?five|top five/iu);
  assert.match(joined, /Joined Provider Contract/iu);
  assert.match(
    joined,
    /Do not call `tool internal-ucp get-merchant-list`[\s\S]*during joined Visa\/provider discovery/iu,
  );
  assert.match(
    joined,
    /The CLI is the only authority for the Visa Benefit Catalog provider registry[\s\S]*Skill must\s+not copy or maintain provider entries/iu,
  );
  assert.match(
    joined,
    /Visa Offer results[\s\S]*`providerProducts` or `directlyOrderable` results/iu,
  );
  assert.match(
    joined,
    /Both collections are authoritative[\s\S]*neither collection is automatically relevant[\s\S]*brand[\s\S]*category[\s\S]*geography[\s\S]*product[\s\S]*hard constraints/iu,
  );
  assert.match(
    joined,
    /Do not display, number, rank, select, or count an unrelated provider product[\s\S]*does not alter[\s\S]*`directlyOrderable` fact/iu,
  );
  assert.match(
    joined,
    /`orderableItems` is the only authoritative[\s\S]*`title`[\s\S]*`metadata\.displayTitle`[\s\S]*`sourceTitle`[\s\S]*`expected\.itemTitle`[\s\S]*`unitPriceMinor`[\s\S]*audit fact only[\s\S]*`unitPriceMajor`[\s\S]*major-unit unit price/iu,
  );
  assert.match(
    joined,
    /Never derive a purchase title or authorized amount from the raw[\s\S]*`product\.title`[\s\S]*`variant\.title`[\s\S]*`product\.price\.amount`[\s\S]*`variant\.price\.amount`[\s\S]*`price_range`/iu,
  );
  assert.match(
    joined,
    /CLI-owned joined aggregate[\s\S]*opaque provider\s+cursor[\s\S]*The Skill must not perform that traversal itself/iu,
  );
  assert.doesNotMatch(
    joined,
    /^<Skill Path>\/bin\/visa-cli ucp-catalog search\b/mu,
  );
  assert.match(
    joined,
    /repeated\/missing cursor[\s\S]*failed provider page[\s\S]*partial coverage[\s\S]*never call the result complete/iu,
  );
  assert.match(
    joined,
    /Preserve `productType=VISA_PROVIDER_PRODUCT`[\s\S]*provider-product collection[\s\S]*Program match is not required/iu,
  );
  assert.match(
    joined,
    /Preserve `PROGRAM_PROVIDER_MATCH`[\s\S]*joined CLI result proves[\s\S]*Never synthesize or force[\s\S]*never replace `VISA_PROVIDER_PRODUCT`/iu,
  );
  assert.match(
    joined,
    /VISA_PROGRAM_ONLY[\s\S]*no[\s\S]*verified orderable provider-product relationship/iu,
  );
  assert.match(
    joined,
    /relevant directly orderable product remains[\s\S]*display only[\s\S]*natural next[\s\S]*continue ordering[\s\S]*no relevant directly orderable product remains[\s\S]*display every relevant\s+Visa Offer/iu,
  );
  assert.match(
    joined,
    /internal only[\s\S]*Never expose labels such as Visa Offer[\s\S]*provider Catalog[\s\S]*Visa Program[\s\S]*explain the source[\s\S]*one natural answer/iu,
  );
  assert.doesNotMatch(
    joined,
    /Keep the Visa Offer collection and directly orderable provider-product\s+collection visibly distinct/iu,
  );
});

test('Visa category shopping uses the joined Visa plus provider route', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa And Provider Catalog Joined Discovery'),
  );
  const joined = skill.slice(
    skill.indexOf('## Visa And Provider Catalog Joined Discovery'),
    skill.indexOf('## Visa Purchase Fast Path'),
  );

  assert.match(
    routing,
    /Visa household-goods coupons[\s\S]*same joined discovery/iu,
  );
  assert.match(
    joined,
    /joined aggregate[\s\S]*original current\s+user query[\s\S]*locked language\/environment/iu,
  );
  assert.match(
    joined,
    /PROGRAM_PROVIDER_MATCH[\s\S]*joined CLI result proves[\s\S]*Never synthesize or force/iu,
  );
  assert.match(
    joined,
    /authoritative candidate sets[\s\S]*explicit brand[\s\S]*category[\s\S]*geography[\s\S]*product[\s\S]*hard constraints[\s\S]*generic\s+coupon[\s\S]*not relevant/iu,
  );
  assert.match(
    joined,
    /fallback_all_offers[\s\S]*relevant orderable product exists[\s\S]*without narrating the Offer miss/iu,
  );
  assert.match(
    joined,
    /voucher denomination and purchase price as separate facts[\s\S]*HKD 100[\s\S]*structured\s+Catalog[\s\S]*actual purchase price/iu,
  );
});

test('Visa merchant shopping uses joined discovery without false matching', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa And Provider Catalog Joined Discovery'),
  );
  const joined = skill.slice(
    skill.indexOf('## Visa And Provider Catalog Joined Discovery'),
    skill.indexOf('## Visa Purchase Fast Path'),
  );

  assert.match(
    routing,
    /Watsons coupons[\s\S]*same joined discovery/iu,
  );
  assert.match(
    joined,
    /entry Offer[\s\S]*campaign URL[\s\S]*similar title[\s\S]*never proves `PROGRAM_PROVIDER_MATCH`/iu,
  );
  assert.match(
    joined,
    /does not[\s\S]*remove[\s\S]*constant `VISA_PROVIDER_PRODUCT` product type/iu,
  );
  assert.match(
    joined,
    /follow-up[\s\S]*supermarket coupons/iu,
  );
  assert.match(
    joined,
    /follow-up[\s\S]*run one new\s+joined\s+command[\s\S]*Do not reuse\s+old provider rows/iu,
  );
  assert.match(
    joined,
    /provider product lacks one unambiguous[\s\S]*CLI-authoritative provider identity[\s\S]*merchant ID[\s\S]*HTTPS purchase route[\s\S]*unknown_provider/iu,
  );
  assert.match(
    joined,
    /Never force a Program\/provider match/iu,
  );
  assert.match(
    joined,
    /new query[\s\S]*invalidates the old ordering[\s\S]*stable\s+ID[\s\S]*title-only fuzzy matching is insufficient/iu,
  );
  assert.match(
    joined,
    /If at least one relevant directly orderable product remains[\s\S]*display only[\s\S]*those products[\s\S]*Do not mention missing or available Visa Offers[\s\S]*provider collection[\s\S]*Catalog sourcing/iu,
  );
  assert.match(
    joined,
    /If no relevant directly orderable product remains[\s\S]*display every relevant[\s\S]*Visa Offer[\s\S]*offer to show[\s\S]*details/iu,
  );
});

test('direct shopping skips Visa recommendation and uses aggregate Catalog purchase', () => {
  const routing = skill.slice(
    skill.indexOf('## Intent Routing'),
    skill.indexOf('## Visa And Provider Catalog Joined Discovery'),
  );
  const catalogPurchase = skill.slice(
    skill.indexOf('## Catalog Purchase Fast Path'),
    skill.indexOf('### Visa Preparation'),
  );
  const discoveryCommand = catalogPurchase.slice(
    catalogPurchase.indexOf('Direct broad-Catalog discovery'),
    catalogPurchase.indexOf('Before login'),
  );

  assert.match(
    routing,
    /Direct shopping requests without Visa wording[\s\S]*Buy me an XX coffee[\s\S]*broad Catalog shopping/iu,
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
    catalogPurchase,
    /selected `VISA_PROVIDER_PRODUCT`[\s\S]*registered provider purchase is a Visa\s+Benefit product/iu,
  );
  assert.match(
    catalogPurchase,
    /merchantUrl[\s\S]*productId[\s\S]*title[\s\S]*price[\s\S]*currency[\s\S]*availability[\s\S]*merchantCategoryCode/iu,
  );
  assert.match(
    catalogPurchase,
    /joined provider product[\s\S]*exact selected `orderableItems` entry[\s\S]*CLI-returned provider identity[\s\S]*Do not[\s\S]*rediscover or reinterpret title and price[\s\S]*Never query the merchant list/iu,
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
    /Registered provider coupons\/vouchers[\s\S]*NO_SHIPPING_REQUIRED[\s\S]*digitalDeliveryExpected=true/iu,
  );
  assert.match(
    catalogPurchase,
    /replace the shared `merchantId` and[\s\S]*`merchantUrl` placeholders[\s\S]*CLI-returned provider identity/iu,
  );
  assert.match(
    catalogPurchase,
    /Unknown or mismatched\s+provider identity stops before login/iu,
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

test('provider voucher face value is never treated as the structured purchase price', () => {
  const joined = skill.slice(
    skill.indexOf('### Product Type, Relation Label, And Presentation'),
    skill.indexOf('### Selected Program Resolution'),
  );
  const safety = skill.slice(skill.indexOf('## Safety Summary'));

  assert.match(
    joined,
    /HKD 100[\s\S]*voucher face value[\s\S]*structured\s+Catalog `price\.amount` and `price\.currency`[\s\S]*actual purchase price and\s+payment currency/iu,
  );
  assert.match(
    safety,
    /For registered provider products[\s\S]*Instruction and Checkout use only the[\s\S]*structured Catalog purchase price\/currency[\s\S]*voucher[\s\S]*face value[\s\S]*never compared as the purchase[\s\S]*price/iu,
  );
  assert.doesNotMatch(
    safety,
    /^-\s+Program and Catalog product, amount, and currency must agree\.$/mu,
  );
});

test('Visa fast path preserves aggregate order and never decomposes purchase', () => {
  const route = skill.indexOf(
    'visa recommend -> visa product-search -> visa commerce-login -> visa commerce-run',
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
