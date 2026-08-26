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
  assert.equal(packageJson.version, '0.1.26');
  assert.deepEqual(packageJson.bin, { 'visa-cli': './bin/visa-cli' });
  assert.deepEqual(packageJson.scripts, {
    test: 'node --test tests/*.test.mjs',
  });
  assert.match(skill, /vendor\/visa-cli\/visa-cli\.bundle\.mjs/u);
  assert.match(combined, /bin\/visa-cli/u);
  assert.doesNotMatch(combined, /vendor\/clink-cli|bin\/clink\b/u);
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
    /Queries never proactively log in[\s\S]*visa recommend[\s\S]*visa detail[\s\S]*visa taxonomy/iu,
  );
  assert.match(
    skill,
    /fallback_all_offers[\s\S]*Do not rank, display, recommend, or purchase fallback rows/iu,
  );
  assert.match(
    skill,
    /query-only request[\s\S]*present the enriched results and stop/iu,
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
    /CLI alone decides[\s\S]*Quick Instruction activation\s+wait/iu,
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
    /must be completed by\s+the user in the operating system's browser/iu,
  );
  assert.match(skill, /Alipay QR is not a browser page/iu);
  assert.match(skill, /No payment, Tip, refund, Checkout completion[\s\S]*blindly retried/iu);
});
