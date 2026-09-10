import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const paths = [
  'SKILL.md',
  'agents/openai.yaml',
  'README.md',
  'README.zh.md',
  'references/quick-instruction-cases.md',
  'references/change-log.md',
];
const artifacts = Object.fromEntries(await Promise.all(paths.map(async (path) => [
  path,
  (await readFile(new URL(path, root), 'utf8'))
    .replace(/`/gu, '').replace(/\s+/gu, ' '),
])));
const englishContracts = paths.filter((path) => path !== 'README.zh.md');

// This distribution ships rules, not an Agent-side Quick state machine.
test('Quick artifacts preserve actual status and the bound card in every English surface', () => {
  for (const path of englishContracts) {
    const text = artifacts[path];
    assert.match(text, /CREATED/u, path);
    assert.match(text, /paymentInstrumentId/u, path);
    assert.match(text, /pendingInstructionId/u, path);
    assert.match(text, /actual (?:returned )?Instruction status|Instruction's actual status|actual response status/u, path);
    assert.match(text, /PENDING/u, path);
    assert.match(text, /ACTIVE/u, path);
  }
});

test('Quick artifacts include the exact Passkey identity contract and no CREATED binding wait', () => {
  for (const path of ['SKILL.md', 'agents/openai.yaml', 'README.md', 'references/quick-instruction-cases.md']) {
    const text = artifacts[path];
    assert.match(text, /\/passkey-auth\/\{pi\}\?type=visa&instructionId=\{(?:ORIGINAL_QUICK_ID|originalId)\}/u, path);
    assert.match(text, /(?:original Quick ID and (?:its )?bound paymentInstrumentId|original Quick ID and bound paymentInstrumentId)/u, path);
    assert.match(text, /(?:Do not wait for binding or VIC|Do not wait for card binding or VIC)/u, path);
  }
});

test('Quick artifacts retain the 10-minute cap, unified recovery and original ACTIVE reuse', () => {
  for (const path of ['SKILL.md', 'agents/openai.yaml', 'README.md', 'references/quick-instruction-cases.md']) {
    const text = artifacts[path];
    assert.match(text, /10 minutes/u, path);
    assert.doesNotMatch(text, /15 minutes/u, path);
    assert.match(text, /pending-instructions/u, path);
    assert.match(text, /\/agent-authorization/u, path);
    for (const status of ['activation_link', 'card_selection_required', 'bind_in_portal', 'select_in_portal']) {
      assert.ok(text.includes(status), `${path} ${status}`);
    }
    assert.doesNotMatch(text, /(?:exact VIC URL|exact CLI VIC URL|exact CLI-returned VIC URL|Portal binding entry)/u, path);
    assert.match(text, /(?:already ACTIVE, reuse that exact ID|ACTIVE reuses the original ID|Reuse the original Quick ID directly)/u, path);
    assert.match(text, /(?:zero additional Instructions|zero additional creates)/u, path);
    assert.match(text, /Without a Quick, normal matching ACTIVE reuse and ordinary Instruction creation remain unchanged/u, path);
  }
});

test('Quick artifacts reject withdrawn always-PENDING and replacement permissions', () => {
  for (const [path, text] of Object.entries(artifacts)) {
    assert.doesNotMatch(text, /(?:always|invariably) (?:create[s]? (?:a |one )?(?:no-card )?)?PENDING|valid PENDING or ACTIVE Quick/u, path);
    assert.doesNotMatch(text, /Case C permits|unless Case C|creates exactly one card-bound|Continue with the new ID|first reuse an exact matching ACTIVE|may create (?:one|a) (?:replacement|card-bound) Instruction/u, path);
  }
  const chinese = artifacts['README.zh.md'];
  for (const required of ['真实响应', 'status', 'paymentInstrumentId', '不等绑卡/VIC', '超时', '10 分钟', 'pending-instructions', '/agent-authorization', 'ACTIVE 直接复用原 ID', '创建次数均为零']) {
    assert.ok(chinese.includes(required), required);
  }
});

test('Quick maintenance artifacts document precedence and do not claim runtime acceptance', () => {
  assert.match(artifacts['references/change-log.md'], /2026-09-09/u);
  assert.match(artifacts['references/change-log.md'], /2026-09-10/u);
  assert.match(artifacts['references/change-log.md'], /Supersedes the 2026-09-09 Case A exit/u);
  assert.match(artifacts['references/quick-instruction-cases.md'], /Case E: Recovery Without Exact Context/u);
  assert.match(artifacts['references/change-log.md'], /Do not relabel or replace/u);
  assert.match(artifacts['references/quick-instruction-cases.md'], /not CLI execution or backend deployment/u);
  for (const path of ['README.md', 'README.zh.md']) {
    assert.match(artifacts[path], /references\/quick-instruction-cases\.md/u);
    assert.match(artifacts[path], /references\/change-log\.md/u);
  }
});
