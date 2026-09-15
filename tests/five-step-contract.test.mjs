import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const skill = await read('SKILL.md');
const agent = await read('agents/openai.yaml');
const paymentMethod = await read('references/visa-payment-method.md');
const instruction = await read('references/visa-instruction.md');
const checkout = await read('references/visa-checkout.md');
const login = await read('references/visa-init.md');

function section(document, heading) {
  const lines = document.split('\n');
  const start = lines.findIndex((line) => line === heading);
  assert.notEqual(start, -1, `missing ${heading}`);
  const level = heading.match(/^#+/u)[0].length;
  let end = start + 1;
  while (end < lines.length) {
    const next = lines[end].match(/^(#+) /u);
    if (next && next[1].length <= level) break;
    end += 1;
  }
  return lines.slice(start + 1, end).join('\n');
}

function codeBlocks(document) {
  return [...document.matchAll(/```text\n([\s\S]*?)\n```/gu)]
    .map((match) => match[1]);
}

const shared = codeBlocks(section(skill, '### Shared Purchase Arguments'))[0];
const stringOptions = [
  'mode', 'environment', 'request-text', 'merchant-id', 'endpoint',
  'merchant-url', 'merchant-name', 'product-id', 'title', 'amount', 'currency',
  'quantity', 'availability', 'digital-delivery-expected', 'mandate-mcc',
  'payment-instrument-id', 'selection-source', 'format', 'resume',
  'instruction-id', 'authorization-deadline', 'purchase-instruction-id',
  'mandate-id', 'url',
];
const options = Object.fromEntries(stringOptions.map((name) => [name, { type: 'string' }]));
for (const name of ['confirm-purchase', 'sandbox', 'start', 'no-open']) {
  options[name] = { type: 'boolean' };
}

// Parse documented argv without executing mutations or depending on a future vendor.
function parseExample(example) {
  const expanded = example
    .replace('<Skill Path>/bin/visa-cli ', '')
    .replaceAll('<purchase-args>', shared)
    .replaceAll('\\\n', ' ')
    .replace(/\[([^\]]+)\]/gu, '$1');
  const args = (expanded.match(/"[^"]*"|<[^>]*>|\S+/gu) ?? [])
    .map((token) => token.startsWith('"') ? token.slice(1, -1) : token);
  const parsed = parseArgs({ args, options, allowPositionals: true, strict: true });
  return { command: parsed.positionals.join(' '), flags: { ...parsed.values } };
}

const loginSection = section(skill, '### Standalone Login');
const purchaseLoginSection = section(skill, '### Step2: Purchase Login');
const resolveSection = section(skill, '### Step3: Resolve Payment Method');
const instructionSection = section(skill, '### Step4: Select Or Authorize An Instruction');
const checkoutSection = section(skill, '### Step5: Checkout Once');
const loginExamples = codeBlocks(loginSection).map(parseExample);
const resolveExamples = codeBlocks(resolveSection).map(parseExample);
const instructionExamples = codeBlocks(instructionSection).map(parseExample);
const checkoutExample = parseExample(codeBlocks(checkoutSection)[0]);
const instructionCommands = instructionExamples
  .filter(({ command }) => command.startsWith('visa instruction '));
const purchaseFlags = parseExample(shared).flags;

function table(document, header) {
  const lines = document.split('\n');
  const start = lines.indexOf(header);
  assert.notEqual(start, -1, `missing table ${header}`);
  const cells = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  const keys = cells(header);
  const rows = [];
  for (let index = start + 2; lines[index]?.startsWith('|'); index += 1) {
    const values = cells(lines[index]);
    assert.equal(values.length, keys.length, lines[index]);
    rows.push(Object.fromEntries(keys.map((key, cell) => [key, values[cell]])));
  }
  return rows;
}

test('Agent command plans allow login before discovery without an enforced pipeline', () => {
  const plans = table(section(skill, '### Independent Invocation'),
    '| Request/state | Agent command plan | Boundary |');
  const commands = (row) => [...row['Agent command plan'].matchAll(/`([^`]+)`/gu)]
    .map((match) => match[1]);
  const byRequest = Object.fromEntries(plans.map((row) => [row['Request/state'], row]));
  assert.deepEqual(commands(byRequest['Login only; no product']), ['visa init']);
  assert.equal(byRequest['Login only; no product'].Boundary, 'Report login; stop');
  assert.deepEqual(commands(byRequest['Login, then ask for offers']), [
    'visa init', 'visa recommend-products',
  ]);
  assert.equal(byRequest['Login, then ask for offers'].Boundary, 'No card/Instruction/Checkout');
  assert.deepEqual(commands(byRequest['Browse while logged out or logged in']), ['visa recommend-products']);
  assert.deepEqual(commands(byRequest['Check card readiness; authenticated, no product']), ['visa payment-method resolve']);
  assert.equal(byRequest['Check card readiness; authenticated, no product'].Boundary, 'Report card state; stop');
  assert.deepEqual(commands(byRequest['Resume exact authorization; complete context']), [
    'visa instruction get', 'visa instruction wait',
  ]);
  assert.deepEqual(commands(byRequest['Authorized purchase; ready PI and selected ACTIVE pair']), ['visa checkout']);
  assert.match(skill, /Independent invocation does not bypass business prerequisites/u);
  assert.match(agent, /The Agent owns orchestration and semantic\s+purchase validation/u);
  assert.match(login, /independently callable before recommend/u);
  assert.match(login, /Report and stop for login-only intent/u);
});

test('purchase-context validation is numeric/MCC-only while semantics and safety retain their owners', () => {
  const ownership = section(skill, '### Validation Ownership');
  const checks = table(ownership, '| Check | Owner |');
  assert.deepEqual(checks.filter(({ Owner }) => Owner === 'CLI purchase-context validator')
    .map(({ Check }) => Check), ['Currency, amount, MCC']);
  const semantic = checks.find(({ Owner }) => Owner === 'Agent').Check;
  for (const field of ['Intent', 'restricted-category meaning', 'title/description', 'merchant/SKU/denomination/region/quantity']) {
    assert.ok(semantic.includes(field), field);
  }
  assert.equal(checks.find(({ Check }) => Check === 'Auth, PI/VIC, ACTIVE, expiry, usage/reserve, recurring').Owner,
    'CLI command');
  assert.equal(checks.find(({ Check }) => Check === 'Authoritative merchant/product IDs, price/currency, availability').Owner,
    'CLI product revalidation');
  for (const text of [ownership, agent, instruction, checkout]) {
    const prose = text.replaceAll('`', '').replace(/\s+/gu, ' ');
    assert.match(prose, /purchase-context-validation\.ts checks only currency, amount(?:\/limit)?, and MCC/u);
    assert.match(prose, /(?:must not|never|does not|not) (?:validate )?title\/description/u);
  }
});

test('five-step examples separate auth, card resolution, authorization, and checkout', () => {
  assert.deepEqual(loginExamples.map(({ command }) => command), ['visa init', 'visa init']);
  assert.deepEqual(loginExamples.map(({ flags }) => flags), [
    { sandbox: true, start: true, 'no-open': true, format: 'json' },
    { sandbox: true, resume: '<id>', 'no-open': true, format: 'json' },
  ]);
  assert.deepEqual(resolveExamples.map(({ command }) => command), [
    'visa payment-method resolve', 'visa payment-method resolve',
  ]);
  assert.deepEqual(resolveExamples.map(({ flags }) => flags), [
    { environment: 'sandbox', format: 'json' },
    {
      environment: 'sandbox', 'payment-instrument-id': '<id>',
      'selection-source': 'explicit', format: 'json',
    },
  ]);
  assert.deepEqual(instructionCommands.map(({ command }) => command), [
    'visa instruction bind-pi',
    'visa instruction candidates', 'visa instruction create',
    'visa instruction get', 'visa instruction wait',
  ]);
  assert.equal(checkoutExample.command, 'visa checkout');
  assert.match(loginSection, /pure login without purchase context/u);
  assert.match(loginSection, /Never call[\s\S]*`wallet init`/u);
  const purchaseLogin = parseExample(codeBlocks(purchaseLoginSection)[0]);
  assert.equal(purchaseLogin.command, 'visa commerce-login');
  for (const [name, value] of Object.entries(purchaseFlags)) {
    assert.equal(purchaseLogin.flags[name], value, name);
  }
  assert.equal(purchaseLogin.flags['confirm-purchase'], true);
  assert.equal(purchaseLogin.flags['no-open'], true);
  assert.match(purchaseLoginSection, /ONLY the persisted default PI/u);
  assert.match(purchaseLoginSection, /Other cards never affect Quick/u);
  assert.match(purchaseLoginSection, /Unauthenticated: send instructionContext through Benefit OAuth/u);
});

test('every Step4/5 example carries identical flat purchase facts and frozen PI/source', () => {
  assert.deepEqual(Object.keys(purchaseFlags).sort(), [
    'mode', 'environment', 'request-text', 'merchant-id', 'endpoint',
    'merchant-url', 'merchant-name', 'product-id', 'title', 'amount', 'currency',
    'quantity', 'availability', 'digital-delivery-expected', 'mandate-mcc',
  ].sort());
  assert.equal(purchaseFlags.mode, 'selected_product');
  assert.equal(purchaseFlags.environment, 'sandbox');
  assert.equal(purchaseFlags.quantity, '1');
  for (const { command, flags } of [...instructionCommands, checkoutExample]) {
    for (const [name, value] of Object.entries(purchaseFlags)) {
      assert.equal(flags[name], value, `${command}: frozen ${name}`);
    }
    assert.equal(flags['payment-instrument-id'], '<pi>', command);
    assert.equal(flags['selection-source'], '<default|explicit>', command);
    assert.equal(flags.format, 'json', command);
    assert.equal(flags['confirm-purchase'] ?? false, /(?:create|bind-pi|checkout)$/u.test(command), command);
    assert.equal(flags['context-file'], undefined);
    assert.equal(flags.context, undefined);
  }
});

test('get/wait require exact Instruction and original deadline, checkout requires both IDs', () => {
  const byCommand = Object.fromEntries(instructionCommands.map(({ command, flags }) => [command, flags]));
  assert.equal(byCommand['visa instruction bind-pi']['instruction-id'], '<id>');
  assert.equal(byCommand['visa instruction bind-pi']['authorization-deadline'], '<ms>');
  assert.match(instructionSection, /SAME ID/u);
  assert.match(instructionSection, /get\/wait` are read-only/u);
  assert.equal(byCommand['visa instruction get']['instruction-id'], '<id>');
  assert.equal(byCommand['visa instruction wait']['instruction-id'], '<id>');
  assert.equal(byCommand['visa instruction wait']['authorization-deadline'], '<ms>');
  assert.equal(checkoutExample.flags['purchase-instruction-id'], '<id>');
  assert.equal(checkoutExample.flags['mandate-id'], '<id>');
  assert.match(instructionSection, /epoch milliseconds/u);
  assert.match(instructionSection, /`get` checks immediately/u);
  assert.match(instructionSection, /at most 600 seconds[\s\S]*original epoch-ms/u);
  assert.match(instructionSection, /No resume, manual completion, or reopening resets it/u);
  assert.match(instructionSection, /Both are read-only and never reopen or recreate/u);
});

test('every Step3 outcome forbids opening and creation, and only ready freezes the pair', () => {
  const rows = table(paymentMethod,
    '| condition | output | action | browser_open | instruction_create | continuation |');
  assert.deepEqual(rows.map(({ condition }) => condition), [
    'no_card', 'no_default', 'vic_incomplete_supported', 'vic_unsupported',
    'vic_unknown', 'card_read_failed', 'explicit_not_ready', 'ready_default', 'ready_explicit',
    'ready_explicit_without_default',
  ]);
  for (const row of rows) {
    assert.equal(row.browser_open, 'never', row.condition);
    assert.equal(row.instruction_create, 'never', row.condition);
    assert.equal(row.continuation, row.condition.startsWith('ready_') ? 'frozen_pair' : 'same_resolve');
  }
  const byCondition = Object.fromEntries(rows.map((row) => [row.condition, row]));
  assert.equal(byCondition.no_card.output, 'bindCardUrl (Portal root)');
  assert.equal(byCondition.no_default.output, 'manageCardUrl');
  assert.equal(byCondition.vic_incomplete_supported.output, 'vicUrl');
  for (const condition of ['vic_unsupported', 'vic_unknown', 'card_read_failed']) {
    assert.equal(byCondition[condition].action, 'stop', condition);
  }
  for (const source of ['default', 'explicit']) {
    assert.equal(byCondition[`ready_${source}`].output, `paymentInstrumentId + selectionSource=${source}`);
    assert.equal(byCondition[`ready_${source}`].action, 'step4');
  }
  assert.equal(byCondition.ready_explicit_without_default.action, 'step4');
  assert.equal(byCondition.ready_explicit_without_default.output,
    'paymentInstrumentId + selectionSource=explicit');
  assert.match(resolveSection, /without asking which card/u);
  assert.match(resolveSection, /repeat the same resolve command/u);
  assert.match(resolveSection, /explicit alternate must become[\s\S]*VIC-ready too/u);
});

test('default changes and explicit alternates retain different continuation rules', () => {
  const identity = section(skill, '### Purchase Identity');
  assert.match(identity, /changed default PI stops a default-based purchase and requires reconfirmation/u);
  assert.match(identity, /alternate PI remains selected despite a later default[\s\S]*owned, usable, and VIC-ready/u);
  assert.match(identity, /carry both unchanged through Steps 4-5/u);
  assert.match(paymentMethod, /Do not ask to make it default/u);
  assert.match(agent, /Freeze BOTH through Steps 4-5/u);
});

test('candidate technical gates include amount coverage rather than amount equality', () => {
  const gates = table(instruction, '| gate | requirement |');
  assert.deepEqual(gates.map(({ gate }) => gate), [
    'status', 'paymentInstrumentId', 'currency', 'amount', 'MCC',
    'expiry', 'usage/reserve', 'recurring',
  ]);
  assert.equal(gates.find(({ gate }) => gate === 'amount').requirement, 'limit >= purchase amount');
  assert.match(gates.find(({ gate }) => gate === 'status').requirement, /ACTIVE only; never reuse PENDING\/CREATED/u);
  assert.match(gates.find(({ gate }) => gate === 'usage/reserve').requirement, /not consumed or reserved/u);
  assert.match(instruction, /read-only and returns all eligible Instructions/u);
  for (const field of ['eligibleMandates', 'mandateId', 'title', 'description', 'amount/currency/MCC']) {
    assert.ok(instruction.includes(field), field);
  }
});

test('semantic selection accepts translations but rejects identity drift and ambiguous evidence', () => {
  const decisions = Object.fromEntries(table(instruction, '| evidence | decision |')
    .map(({ evidence, decision }) => [evidence, decision]));
  assert.equal(decisions[
    'Same merchant/SKU/denomination/region/quantity with equivalent translated titles'
  ], 'reuse_exact_pair');
  assert.equal(decisions['Same product facts with a paraphrased description'], 'reuse_exact_pair');
  assert.equal(decisions['Identical title/description but verified different SKU'], 'no_match');
  for (const dimension of ['merchant', 'SKU', 'denomination', 'region', 'quantity']) {
    assert.equal(decisions[`Verified different ${dimension}`], 'no_match', dimension);
  }
  assert.equal(decisions['Matching price only, product evidence missing'], 'stop_ambiguous');
  assert.equal(decisions['Unresolved multiple plausible Mandates'], 'stop_ambiguous');
  assert.equal(decisions['Candidate read failed or coverage unknown'], 'stop_read_only');
  assert.equal(decisions['Complete eligible set empty'], 'create_ordinary');
  assert.match(instructionSection, /Ambiguous evidence[\s\S]*not guess or create/u);
  assert.match(instructionSection, /ordinary PI-bound CREATED Instruction, never PENDING and never `bind-pi`/u);
});

test('allowed activation opens only exact manual URL and continuation never reopens', () => {
  const openers = instructionExamples.filter(({ command }) => command === 'visa browser-open');
  assert.deepEqual(openers.map(({ flags }) => flags), [{ url: '<manualOpenUrl>', format: 'json' }]);
  assert.equal(resolveExamples.some(({ command }) => command === 'visa browser-open'), false);
  assert.match(skill, /allowed only for Step2[\s\S]*login and Step4 Instruction activation/u);
  assert.match(instructionSection, /Tell the user[\s\S]*actual host's built-in browser[\s\S]*then run:/u);
  assert.match(skill, /If it is unknown[\s\S]*不要使用 Agent 内置浏览器/u);
  assert.match(skill, /never emit the literal placeholder/u);
});

test('checkout has exact gates, no hidden preparation, and refuses repeated submission', () => {
  assert.match(checkoutSection, /exact-GET verification of the ACTIVE[\s\S]*chosen eligible Mandate/u);
  assert.match(checkoutSection, /product merchant\/product IDs, amount, currency, and availability/u);
  assert.match(checkoutSection, /no implicit login, card selection, Instruction matching, creation, or[\s\S]*browser opening/u);
  assert.match(checkoutSection, /--phase checkout_started` refuses repeats/u);
  assert.match(checkoutSection, /Never clear the phase/u);
  assert.match(checkout, /only exact CLI-returned read-only recovery/u);
  assert.match(checkout, /never retry create\/complete\/payment/u);
});

test('client authorization selection never claims a backend wire or resolver change', () => {
  for (const [name, text] of Object.entries({ skill: checkoutSection, agent, checkout })) {
    assert.match(text, /client gate|CLIENT GATE/u, name);
    assert.match(text, /UCP complete wire[\s\S]*carries\s+PI only/u, name);
    assert.match(text, /backend[\s\S]*resolver[\s\S]*(?:is|remains) unchanged/u, name);
    assert.match(text, /(?:Do not|do not) claim[\s\S]*(?:backend|consumed)/u, name);
  }
});

test('unrelated base capabilities remain available in the Skill', () => {
  const ids = [...skill.matchAll(/^### (CAP-[A-Z-]+):/gmu)].map((match) => match[1]);
  assert.deepEqual(ids, [
    'CAP-WALLET', 'CAP-CARD', 'CAP-RISK', 'CAP-CATALOG', 'CAP-PAY', 'CAP-ALIPAY-QR',
    'CAP-UCP', 'CAP-INSTRUCTION', 'CAP-REFUND', 'CAP-EVENTS',
    'CAP-SKILLS-LIST', 'CAP-SKILLS-TIP', 'CAP-SKILLS-INSTALL',
  ]);
  assert.match(skill, /--payment-method-type ALIPAY --terminal-qr/u);
  assert.match(skill, /Current CLI support is full refund only/u);
});
