import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const paths = [
  'SKILL.md',
  'agents/openai.yaml',
  'README.md',
  'README.zh.md',
];
const artifacts = Object.fromEntries(await Promise.all(paths.map(async (path) => [
  path,
  await readFile(new URL(path, root), 'utf8'),
])));
const combined = Object.values(artifacts).join('\n');

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

test('runtime artifacts keep only current Quick principles', () => {
  for (const path of paths.filter((path) => !['agents/openai.yaml', 'README.md', 'README.zh.md'].includes(path))) {
    const text = artifacts[path];
    assert.match(text, /ACTIVE/u, path);
    assert.match(text, /PENDING/u, path);
    assert.match(text, /paymentInstrumentId|selected PI|selectedPI/u, path);
    assert.match(text, /selected PI|selectedPI/u, path);
    assert.match(text, /10 minutes|10 分钟/u, path);
  }
  assert.match(combined, /Never reuse PENDING or CREATED|PENDING and CREATED[\s\S]*never reused/u);
  assert.match(combined, /usable[\s\S]*ACTIVE[\s\S]*match|ACTIVE[\s\S]*match/u);
  assert.match(combined, /no replacement Instruction|replacement Instruction/u);
});

test('runtime artifacts describe the selected PI and browser recovery contract', () => {
  assert.match(combined, /default PI/u);
  assert.match(combined, /alternate PI/u);
  assert.match(combined, /browser-open --url/u);
  assert.match(combined, /browser-opened/u);
  assert.match(combined, /manual-completed/u);
  assert.match(combined, /system browser|系统浏览器/u);
  assert.match(combined, /built-in browser|内置浏览器/u);
  assert.match(combined, /checkoutStarted=false|before Checkout/u);
});

test('runtime artifacts do not load historical or filter reference files', async () => {
  assert.doesNotMatch(combined, /visa-recommend-filters\.md/u);
  assert.doesNotMatch(combined, /quick-instruction-cases\.md/u);
  assert.doesNotMatch(combined, /references\/change-log\.md/u);
  const referenceFiles = await walk(new URL('references/', root));
  assert.deepEqual(referenceFiles, []);
});

test('unknown browser host guidance never emits a placeholder', () => {
  assert.match(combined, /不要使用 Agent 内置浏览器/u);
  assert.match(combined, /never emit \{agent\}/u);
  assert.match(combined, /never emit the literal placeholder/u);
});
