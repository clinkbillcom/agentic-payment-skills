import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
