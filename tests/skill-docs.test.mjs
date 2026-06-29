import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);

async function readRepoFile(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function listMarkdownFiles(dir = rootDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'vendor') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

test('main skill uses lark-style metadata and delegates command details to references', async () => {
  const skill = await readRepoFile('SKILL.md');
  assert.match(skill, /metadata:\n\s+requires:\n\s+bins: \["node"\]/);
  assert.match(skill, /cliHelp: "node vendor\/clink-cli\/clink-cli\.bundle\.mjs --help;/);

  for (const reference of [
    'references/clink-cli-invocation.md',
    'references/clink-wallet-profile.md',
    'references/clink-async-events.md',
    'references/clink-instruction.md',
    'references/clink-payment-refund.md',
    'references/clink-ucp-checkout.md',
  ]) {
    assert.match(skill, new RegExp(reference.replaceAll('/', '\\/')));
    const fileStat = await stat(path.join(rootDir, reference));
    assert.equal(fileStat.isFile(), true);
  }

  assert.ok(
    skill.split('\n').length <= 260,
    'SKILL.md should stay concise and leave command details in references/',
  );
});

test('ucp checkout reference documents the product-order control flow', async () => {
  const ucp = await readRepoFile('references/clink-ucp-checkout.md');

  assert.match(ucp, /clink-cli instruction list --status ACTIVE/);
  assert.match(ucp, /filter out reserve/i);
  assert.match(ucp, /filter out inactive/i);
  assert.match(ucp, /amount hard match/i);
  assert.match(ucp, /merchant semantic/i);
  assert.match(ucp, /no matching instruction/i);
  assert.match(ucp, /create an instruction first/i);
  assert.match(ucp, /clink-cli tool item-id --url/);
  assert.match(ucp, /clink-cli ucp-checkout create/);
  assert.match(ucp, /--instruction-id/);
  assert.match(ucp, /--mandate-id/);
  assert.match(ucp, /clink-cli ucp-checkout complete/);
  assert.match(ucp, /--payment-instrument-id/);
  assert.match(ucp, /Idempotency-Key/i);
  assert.match(ucp, /state machine/i);
});

test('skill routes product purchases through ucp checkout reference', async () => {
  const skill = await readRepoFile('SKILL.md');

  assert.match(skill, /references\/clink-ucp-checkout\.md/);
  assert.match(skill, /UCP checkout/i);
  assert.match(skill, /product order/i);
  assert.match(skill, /instruction\/mandate/i);
  assert.match(skill, /tool item-id/i);
});

test('ucp checkout docs and vendored help use payment instrument, not credential token', async () => {
  for (const filePath of await listMarkdownFiles()) {
    const relativePath = path.relative(rootDir, filePath);
    const text = await readFile(filePath, 'utf8');
    assert.doesNotMatch(text, /--credential-token/, `${relativePath} still documents credential-token`);
  }

  const { stdout } = await execFileAsync(process.execPath, [
    path.join(rootDir, 'vendor/clink-cli/clink-cli.bundle.mjs'),
    'ucp-checkout',
    '--help',
  ]);

  assert.match(stdout, /complete\s+Complete checkout with a payment instrument/);
  assert.match(stdout, /--payment-instrument-id <id>\s+Required payment instrument ID for complete/);
  assert.match(stdout, /external complete sends payment_instrument_id only/);
  assert.doesNotMatch(stdout, /--credential-token/);
  assert.doesNotMatch(stdout, /Complete checkout with a credential token/);
});

test('skill markdown does not describe stale event cache or epoch instruction contracts', async () => {
  const stalePatterns = [
    /eventCache/,
    /Unix epoch seconds/,
    /1782345600/,
    /<unix-epoch-seconds>/,
  ];

  for (const filePath of await listMarkdownFiles()) {
    const relativePath = path.relative(rootDir, filePath);
    const text = await readFile(filePath, 'utf8');
    for (const pattern of stalePatterns) {
      assert.doesNotMatch(text, pattern, `${relativePath} contains stale ${pattern}`);
    }
  }
});

test('instruction reference documents the current datetime contract', async () => {
  const instruction = await readRepoFile('references/clink-instruction.md');
  assert.match(instruction, /yyyy-MM-dd HH:mm:ss/);
  assert.match(instruction, /effectiveUntilTime/);
  assert.match(instruction, /2026-06-30 23:59:59/);
});

test('async events reference treats config as latest wallet state, not event history', async () => {
  const events = await readRepoFile('references/clink-async-events.md');
  assert.match(events, /latest wallet state/i);
  assert.match(events, /does not persist historical event records/i);
  assert.match(events, /filter returned events by `type` and `resourceId`/);
});
