# Skill Tip Intents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add safe public-skill listing and skill tipping by identity or list Number, with synchronous agent-pay success semantics and optional merchant account-event enrichment.

**Architecture:** Extend the existing payment intent router only for classification, add a focused skill-tip FSM for side-effecting lifecycle decisions and output normalization, and extend the generic event FSM with correlated account-event states. Synchronize the vendored CLI from verified clink-cli feature commit b14c787 (package version 0.1.4), then document the command workflow in a dedicated reference.

**Tech Stack:** Node.js 20+, ESM JavaScript, Node test runner, Markdown skill documentation, esbuild single-file CLI vendoring.

## Global Constraints

- Tips support USD only and use the refreshed default payment method selected inside clink-cli skills tip.
- A complete imperative request is authorization for that exact target and amount; questions and incomplete requests never execute payment.
- Synchronous skills tip status=paid backed by agent-pay status=1 is terminal payment success.
- account-created and account-reloaded are optional and mutually exclusive; absence or poll failure never downgrades PAID.
- Exit code 6 or client timeout is unknown payment state and must never be retried automatically.
- Number mode requires a displayed list snapshot and stops for fresh authorization if the selected row changes.
- The normal skill entrypoint remains bin/clink-cli; lock its production-default, sandbox/UAT, or explicit-base-url selection for the whole workflow.

---

## File Structure

- Modify lib/payment-intent-router-fsm.mjs for both new intent routes.
- Create lib/skill-tip-workflow-fsm.mjs for list normalization and tip lifecycle decisions.
- Modify lib/event-workflow-fsm.mjs for correlated account events.
- Add or modify focused tests under tests/.
- Create references/clink-skill-tip.md and update skill/readme references.
- Replace vendor/clink-cli/clink-cli.bundle.mjs with CLI 0.1.4.
- Bump package.json and SKILL.md to 1.4.0.

### Task 1: Extend Payment Intent Routing

**Files:**
- Modify: tests/payment-intent-router-fsm.test.mjs
- Modify: lib/payment-intent-router-fsm.mjs

**Interfaces:**
- Consumes: classifyPaymentIntent(input = {}).
- Produces: SKILL_TIP_LIST and SKILL_TIP state/route/action constants plus a normalized tip payload.

- [ ] **Step 1: Write failing route tests**

Add tests for the required examples and safety boundaries:

~~~js
test('routes a tippable skill list question before tip execution', () => {
  const result = classifyPaymentIntent({
    text: '目前clink payment skill 支持打赏哪些skill',
  });
  assert.equal(result.state, PaymentIntentState.SKILL_TIP_LIST_SELECTED);
  assert.equal(result.route, PaymentIntentRoute.SKILL_TIP_LIST);
  assert.equal(result.action, PaymentIntentAction.RUN_SKILL_TIP_LIST_WORKFLOW);
});

test('routes an explicitly authorized identity tip', () => {
  const result = classifyPaymentIntent({ text: '打赏 clinkpay/pollyreach 2usd' });
  assert.deepEqual(result.tip, {
    target: { kind: 'identity', publisher: 'clinkpay', skillName: 'pollyreach' },
    amount: '2',
    currency: 'USD',
    explicitlyAuthorized: true,
  });
});

test('routes a marked Number tip without confusing the amount', () => {
  const result = classifyPaymentIntent({ text: '打赏序号2的skill 2 USD' });
  assert.deepEqual(result.tip.target, { kind: 'number', number: 2 });
  assert.equal(result.tip.amount, '2');
});
~~~

Also cover missing target/amount, non-USD currency, how-to questions, dual targets, and existing direct/UCP regressions.

- [ ] **Step 2: Run the router test and verify RED**

~~~bash
node --test tests/payment-intent-router-fsm.test.mjs
~~~

Expected: missing new constants or current fallback routing causes assertion failures.

- [ ] **Step 3: Implement minimal router branches**

Add small helpers for list intent, imperative tip intent, identity/marked-Number extraction, positive decimal amount, normalized currency, and how-to question rejection. Run list routing before tip routing, and both before existing UCP/direct branches.

- [ ] **Step 4: Run the router test and verify GREEN**

Run the same command and expect all tests to pass.

- [ ] **Step 5: Commit**

~~~bash
git add lib/payment-intent-router-fsm.mjs tests/payment-intent-router-fsm.test.mjs
git commit -m "feat: route skill list and tip intents"
~~~

### Task 2: Add the Skill Tip Workflow FSM

**Files:**
- Create: tests/skill-tip-workflow-fsm.test.mjs
- Create: lib/skill-tip-workflow-fsm.mjs

**Interfaces:**
- Produces: classifySkillTipPrerequisites, classifySkillListObservation, classifySkillTipObservation, classifySkillTipAccountEventObservation, formatSkillTipFsmMarker, SkillTipState, and SkillTipAction.

- [ ] **Step 1: Write failing list and Number-snapshot tests**

~~~js
const list = classifySkillListObservation({
  ok: true,
  data: [{ Number: 2, publisher: 'clinkpay', name: 'Polly|Reach', skillId: 'skill_2' }],
});
assert.equal(list.action, SkillTipAction.RETURN_SKILL_TABLE);
assert.match(list.table, /Polly\\\|Reach/u);
assert.deepEqual(list.snapshot.rows[0], {
  number: 2,
  publisher: 'clinkpay',
  skillName: 'Polly|Reach',
  skillId: 'skill_2',
});

const drift = classifySkillTipPrerequisites({
  tip: {
    target: { kind: 'number', number: 2 },
    amount: '2',
    currency: 'USD',
    explicitlyAuthorized: true,
  },
  listedRows: [{ number: 2, publisher: 'clinkpay', skillName: 'Old', skillId: 'old' }],
  refreshedRows: [{ number: 2, publisher: 'clinkpay', skillName: 'New', skillId: 'new' }],
});
assert.equal(drift.action, SkillTipAction.ASK_FOR_REAUTHORIZATION);
~~~

Cover empty/malformed lists, missing snapshot, unchanged snapshot, and identity targets.

- [ ] **Step 2: Write failing payment-observation tests**

~~~js
const paid = classifySkillTipObservation({
  exitCode: 0,
  stdout: JSON.stringify({
    ok: true,
    data: {
      status: 'paid',
      publisher: 'clinkpay',
      skillName: 'PollyReach',
      amount: 2,
      currency: 'USD',
      merchantId: 'mcht_1',
      payment: { orderId: 'order_1', status: 1 },
    },
  }),
});
assert.equal(paid.state, SkillTipState.TIP_PAYMENT_SUCCEEDED);
assert.equal(paid.action, SkillTipAction.START_OPTIONAL_ACCOUNT_EVENT_WATCH);
assert.equal(paid.paymentStatus, 'PAID');
assert.equal(paid.terminal, false);
assert.deepEqual(paid.pollCommands, [
  'clink-cli events poll --type account-created --max-wait 60 --format json',
  'clink-cli events poll --type account-reloaded --max-wait 60 --format json',
]);
~~~

Add authorization_pending, payment_failed, exit 7/3DS, exit 6, malformed output, either account event, both timeouts, and poll errors. Timeout and poll error must retain paymentStatus=PAID.

- [ ] **Step 3: Run the new test and verify RED**

~~~bash
node --test tests/skill-tip-workflow-fsm.test.mjs
~~~

Expected: module-not-found for lib/skill-tip-workflow-fsm.mjs.

- [ ] **Step 4: Implement the minimal FSM**

Implement frozen enums, standard/multiline JSON envelope parsing, Markdown table escaping, Number identity comparison, exact CLI command builders, payment status classification, and optional poll aggregation. Use formatWorkflowMarker for SKILL_TIP_FSM.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the same command and expect all tests to pass.

- [ ] **Step 6: Commit**

~~~bash
git add lib/skill-tip-workflow-fsm.mjs tests/skill-tip-workflow-fsm.test.mjs
git commit -m "feat: add skill tip workflow FSM"
~~~

### Task 3: Extend Correlated Event Classification

**Files:**
- Modify: tests/event-workflow-fsm.test.mjs
- Modify: lib/event-workflow-fsm.mjs

**Interfaces:**
- Consumes: classifyEventWorkflow and correlateEventWorkflow.
- Produces: SKILL_TIP_ACCOUNT domain, account-created/reloaded states, and stable-resource correlation.

- [ ] **Step 1: Write failing event tests**

~~~js
test('classifies account-created for skill tips', () => {
  const result = classifyEventWorkflow({ type: 'account-created' });
  assert.equal(result.domain, EventWorkflowDomain.SKILL_TIP_ACCOUNT);
  assert.equal(result.state, EventWorkflowState.SKILL_TIP_ACCOUNT_CREATED);
});

test('correlates a skill tip account event by order id', () => {
  const result = correlateEventWorkflow(
    { type: 'account-reloaded', data: { orderId: 'order_1' } },
    { orderId: 'order_1' },
  );
  assert.equal(result.matched, true);
});
~~~

Add wrong-order, type-only, and customerId+merchantId fallback cases.

- [ ] **Step 2: Run event tests and verify RED**

~~~bash
node --test tests/event-workflow-fsm.test.mjs
~~~

Expected: new events classify as UNKNOWN.

- [ ] **Step 3: Implement event domain and correlation**

Add exact event strings, event-value extraction for orderId/customerId/merchantId/skillId, and a SKILL_TIP_ACCOUNT correlation policy that prefers orderId and otherwise requires a stable compound identity. Never match with no expected resource.

- [ ] **Step 4: Run event and tip tests and verify GREEN**

~~~bash
node --test tests/event-workflow-fsm.test.mjs tests/skill-tip-workflow-fsm.test.mjs
~~~

- [ ] **Step 5: Commit**

~~~bash
git add lib/event-workflow-fsm.mjs tests/event-workflow-fsm.test.mjs
git commit -m "feat: classify skill tip account events"
~~~

### Task 4: Synchronize and Contract-Test the Feature-Bearing CLI 0.1.4

**Files:**
- Create: tests/vendor-clink-cli-skills.test.mjs
- Modify: vendor/clink-cli/clink-cli.bundle.mjs

**Interfaces:**
- Produces: bundled skills list/tip help and side-effect-free dry-run contracts.

- [ ] **Step 1: Write failing bundle contract tests**

Use execFileSync on the vendored bundle. Assert root/help discovery and these exact dry-run payloads:

~~~js
assert.deepEqual(identity.data, {
  status: 'planned',
  publisher: 'clinkpay',
  skillName: 'pollyreach',
  amount: 2,
  currency: 'USD',
  dryRun: true,
});
assert.deepEqual(number.data, {
  status: 'planned',
  number: 2,
  amount: 2,
  currency: 'USD',
  dryRun: true,
});
~~~

- [ ] **Step 2: Run the bundle test and verify RED**

~~~bash
node --test tests/vendor-clink-cli-skills.test.mjs
~~~

Expected: current vendored root help does not list skills.

- [ ] **Step 3: Generate the verified feature bundle**

Create a temporary Git archive from clean clink-cli commit b14c787, verify its package version is 0.1.4, install its locked dependencies, run its complete test suite, and bundle the built entry. Do not switch or modify the adjacent CLI working tree. The bundle command inside the temporary archive is:

~~~bash
npx esbuild <temporary-clink-cli-archive>/dist/index.js \
  --bundle --platform=node --format=esm \
  --outfile=vendor/clink-cli/clink-cli.bundle.mjs \
  --banner:js="import{createRequire as __cr}from'module';const require=__cr(import.meta.url);"
chmod +x vendor/clink-cli/clink-cli.bundle.mjs
~~~

- [ ] **Step 4: Run bundle tests and verify GREEN**

Run the bundle test plus direct root, skills, list, and tip help and both dry-run commands.

- [ ] **Step 5: Commit**

~~~bash
git add vendor/clink-cli/clink-cli.bundle.mjs tests/vendor-clink-cli-skills.test.mjs
git commit -m "chore: vendor clink CLI skill tipping"
~~~

### Task 5: Update Skill Guidance and Version

**Files:**
- Create: references/clink-skill-tip.md
- Modify: SKILL.md
- Modify: references/clink-async-events.md
- Modify: references/clink-cli-invocation.md
- Modify: README.md
- Modify: README.zh.md
- Modify: package.json
- Modify: tests/skill-docs.test.mjs

**Interfaces:**
- Produces: discoverable triggers and a low-freedom command reference.

- [ ] **Step 1: Write failing documentation tests**

Require the new reference, SKILL_TIP_FSM marker, both list/tip commands, synchronous-success rule, optional-event rule, Number snapshot rule, no exit-6 retry, and version 1.4.0 in SKILL.md/package.json.

- [ ] **Step 2: Run documentation tests and verify RED**

~~~bash
node --test tests/skill-docs.test.mjs
~~~

- [ ] **Step 3: Add the reference and update SKILL.md**

The reference covers list/table shape, target union, explicit authorization, Number drift, commands, CLI status matrix, Visa/VIC and 3DS, parallel optional polls, correlation, timeout language, and unknown-state no-retry. SKILL.md keeps only routing/action/hard-rule essentials and points to the reference.

- [ ] **Step 4: Update auxiliary docs and version**

Add both intents to English/Chinese READMEs, account-event optional semantics to the async reference, skills help discovery to invocation guidance, and bump both versions to 1.4.0.

- [ ] **Step 5: Run documentation and full tests**

~~~bash
node --test tests/skill-docs.test.mjs
npm test
~~~

Expected: zero failures.

- [ ] **Step 6: Commit**

~~~bash
git add SKILL.md README.md README.zh.md package.json references/clink-skill-tip.md \
  references/clink-async-events.md references/clink-cli-invocation.md tests/skill-docs.test.mjs
git commit -m "docs: add skill tip execution guidance"
~~~

### Task 6: Final Verification and Inline Review

**Files:**
- Verify every file changed since design commit 35849d4.

**Interfaces:**
- Produces: fresh completion evidence against the design acceptance criteria.

- [ ] **Step 1: Run focused feature tests**

~~~bash
node --test tests/payment-intent-router-fsm.test.mjs \
  tests/skill-tip-workflow-fsm.test.mjs \
  tests/event-workflow-fsm.test.mjs \
  tests/vendor-clink-cli-skills.test.mjs \
  tests/skill-docs.test.mjs
~~~

- [ ] **Step 2: Run complete verification**

~~~bash
npm test
git diff --check
git status --short
~~~

- [ ] **Step 3: Review against the specification**

Inspect git diff 35849d4..HEAD and every acceptance criterion in docs/superpowers/specs/2026-07-15-skill-tip-intents-design.md. Fix every critical or important issue. Because unrequested subagents are prohibited in this environment, apply the requesting-code-review checklist inline.

- [ ] **Step 4: Re-run complete verification**

Repeat npm test and git diff --check after review fixes before reporting completion.
