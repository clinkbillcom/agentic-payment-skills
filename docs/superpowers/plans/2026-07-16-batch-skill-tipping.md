# Batch Skill Tipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-confirmation multi-Skill tipping that invokes the existing `clink-cli skills tip` command once per distinct target, continues after failed or unknown items, and returns itemized and aggregate results.

**Architecture:** Create a batch orchestration FSM beside the existing single-tip FSM. The batch FSM resolves and freezes all targets, de-duplicates by case-insensitive publisher/name with first occurrence winning, atomically claims one confirmation, and advances a sequential progress object by classifying every CLI observation through the existing single-tip classifier. Extend the intent router only to normalize multi-target requests and pending batch confirmations.

**Tech Stack:** Node.js 20+, ECMAScript modules, `node:test`, existing pure FSM modules, Markdown Skill documentation.

## Global Constraints

- Support both one shared positive USD amount and positive per-Skill USD amounts.
- Canonical duplicate identity is trimmed, case-insensitive `publisher/name`; preserve the first spelling and first amount, and ignore later occurrences.
- Validate and resolve the complete batch before confirmation; never execute a valid subset.
- Require one frozen atomic confirmation for every multi-target request.
- Invoke the existing versionless publisher/name CLI command once per distinct target.
- Submit payment calls sequentially in frozen order; interactive continuations block later payment submissions.
- Record terminal failed or unknown items and continue; never automatically retry either state.
- Preserve existing single-tip result binding, exit-code precedence, synchronous-paid, and optional-account-event semantics.
- Do not modify or rebuild `clink-cli` or its vendored bundle.
- Bump the payment Skill package version from `1.6.0` to `1.7.0`.

---

## File Structure

- Create `lib/skill-tip-batch-workflow-fsm.mjs`: batch input normalization, Number resolution, de-duplication, confirmation lifecycle, sequential advancement, and aggregate result construction.
- Create `tests/skill-tip-batch-workflow-fsm.test.mjs`: focused batch contract tests.
- Modify `lib/payment-intent-router-fsm.mjs`: batch route constants, structured/text multi-target normalization, and batch pending confirmation routing.
- Modify `tests/payment-intent-router-fsm.test.mjs`: batch intent, amount, authorization, and pending confirmation tests.
- Modify `SKILL.md`: batch routing, actions, safety rules, and quick reference.
- Modify `references/clink-skill-tip.md`: batch request, confirmation, execution, continuation, and result contracts.
- Modify `tests/skill-docs.test.mjs`: enforce the documented batch safety rules.
- Modify `package.json`: bump version to `1.7.0`.

---

### Task 1: Batch Normalization and Atomic Confirmation

**Files:**
- Create: `lib/skill-tip-batch-workflow-fsm.mjs`
- Create: `tests/skill-tip-batch-workflow-fsm.test.mjs`

**Interfaces:**
- Consumes: `recentDisplayedSkillListSnapshot`, `resolvedSkillIdentity`, `sameSkillContextIdentity`, `skillContextIdentity`, `skillContextTimestampMs`, and `SKILL_LIST_CONTEXT_TTL_MS` from `lib/skill-list-context.mjs`.
- Consumes: `classifySkillTipPrerequisites` from `lib/skill-tip-workflow-fsm.mjs` to create each frozen identity command and `expectedTip` binding.
- Produces: `SkillTipBatchState`, `SkillTipBatchAction`, `classifySkillTipBatchPrerequisites(input)`, and `formatSkillTipBatchFsmMarker(workflow)`.

- [ ] **Step 1: Write failing normalization and confirmation tests**

Create tests covering shared amounts, per-item amounts, per-item override of a shared fallback, exact decimal totals, complete-batch rejection, Number resolution, and first-occurrence de-duplication. Use the public API below:

```js
const result = classifySkillTipBatchPrerequisites({
  batch: {
    targets: [
      { kind: 'identity', publisher: 'clinkpay', skillName: 'PollyReach' },
      { kind: 'identity', publisher: 'clinkpay', skillName: 'ModelMax' },
    ],
    amount: '2.25',
    currency: 'USD',
    explicitlyAuthorized: true,
  },
  batchId: 'batch_1',
  context: workflowContext(),
});

assert.equal(result.state, SkillTipBatchState.BATCH_CONFIRMATION_REQUIRED);
assert.equal(result.action, SkillTipBatchAction.ASK_FOR_TIP_BATCH_CONFIRMATION);
assert.equal(result.pendingTipBatchConfirmation.authorizedTotal, '4.5');
assert.deepEqual(
  result.pendingTipBatchConfirmation.items.map(({ publisher, skillName, amount }) => (
    { publisher, skillName, amount }
  )),
  [
    { publisher: 'clinkpay', skillName: 'PollyReach', amount: '2.25' },
    { publisher: 'clinkpay', skillName: 'ModelMax', amount: '2.25' },
  ],
);
```

Add a duplicate test where `ClinkPay/PollyReach` at `2` precedes `clinkpay/pollyreach` at `9`; assert one frozen item at `2` plus one `ignoredDuplicates` record. Add a malformed second item test and assert no pending object and no command.

- [ ] **Step 2: Run the new test file and verify RED**

Run:

```bash
node --test tests/skill-tip-batch-workflow-fsm.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/skill-tip-batch-workflow-fsm.mjs`.

- [ ] **Step 3: Implement batch input normalization**

Create these constants and entry point:

```js
export const SkillTipBatchState = Object.freeze({
  BATCH_INPUT_REQUIRED: 'BATCH_INPUT_REQUIRED',
  BATCH_CONFIRMATION_REQUIRED: 'BATCH_CONFIRMATION_REQUIRED',
  BATCH_CONFIRMATION_ACCEPTED: 'BATCH_CONFIRMATION_ACCEPTED',
  BATCH_CONFIRMATION_REJECTED: 'BATCH_CONFIRMATION_REJECTED',
  BATCH_CONFIRMATION_ALREADY_HANDLED: 'BATCH_CONFIRMATION_ALREADY_HANDLED',
  BATCH_EXECUTION_READY: 'BATCH_EXECUTION_READY',
  BATCH_ITEM_CONTINUATION_REQUIRED: 'BATCH_ITEM_CONTINUATION_REQUIRED',
  BATCH_IN_PROGRESS: 'BATCH_IN_PROGRESS',
  BATCH_COMPLETED: 'BATCH_COMPLETED',
});

export const SkillTipBatchAction = Object.freeze({
  ASK_FOR_SKILL_TIP_BATCH_INPUT: 'ASK_FOR_SKILL_TIP_BATCH_INPUT',
  ASK_FOR_TIP_BATCH_CONFIRMATION: 'ASK_FOR_TIP_BATCH_CONFIRMATION',
  CLAIM_PENDING_TIP_BATCH: 'CLAIM_PENDING_TIP_BATCH',
  CANCEL_PENDING_TIP_BATCH: 'CANCEL_PENDING_TIP_BATCH',
  RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED: 'RETURN_PENDING_TIP_BATCH_ALREADY_HANDLED',
  RUN_NEXT_SKILL_TIP: 'RUN_NEXT_SKILL_TIP',
  WAIT_FOR_SKILL_TIP_ITEM: 'WAIT_FOR_SKILL_TIP_ITEM',
  CONTINUE_SKILL_TIP_BATCH: 'CONTINUE_SKILL_TIP_BATCH',
  RETURN_SKILL_TIP_BATCH_RESULT: 'RETURN_SKILL_TIP_BATCH_RESULT',
});

export function classifySkillTipBatchPrerequisites(input = {}) {
  // First classify a pending confirmation transition when input.confirmation exists.
  // Otherwise normalize input.batch, resolve every Number against one current
  // tippable snapshot, de-duplicate identities, and create the frozen pending object.
}
```

Normalize `batch.tips` item amounts first; normalize `batch.targets` using `batch.amount` as fallback. Reject non-USD, missing authorization, missing/invalid items, and unresolved Numbers as `BATCH_INPUT_REQUIRED`. Use exact decimal-string addition implemented with `BigInt` scaling rather than floating-point addition.

For Number items, select one `recentDisplayedSkillListSnapshot(context, { allowedScopes: ['tippable'] })`, resolve every Number from that same snapshot, discard version from the execution target, retain `skillId`, and cap pending expiry at the snapshot's two-hour expiry. Identity-only batches expire at `now + SKILL_LIST_CONTEXT_TTL_MS`.

- [ ] **Step 4: Implement atomic confirmation classification**

Create `pendingTipBatchConfirmation` with this stable shape:

```js
{
  batchId,
  status: 'AWAITING_CONFIRMATION',
  items: [{ itemId: `${batchId}:1`, publisher, skillName, optionalSkillId, amount, currency: 'USD' }],
  ignoredDuplicates: [{ duplicateIndex, keptIndex, publisher, skillName, ignoredAmount }],
  authorizedTotal,
  currency: 'USD',
  userId,
  conversationId,
  environment,
  createdAt,
  expiresAt,
}
```

On `CONFIRMED`, return only:

```js
{
  state: SkillTipBatchState.BATCH_CONFIRMATION_ACCEPTED,
  action: SkillTipBatchAction.CLAIM_PENDING_TIP_BATCH,
  terminal: false,
  reason: 'skill_tip_batch_confirmation_claim_required',
  pendingTransition: { batchId, from: 'AWAITING_CONFIRMATION', to: 'EXECUTING' },
}
```

On `CLAIMED`, require the same current context and `status='EXECUTING'`, build the immutable execution plan by calling `classifySkillTipPrerequisites` for each identity item, and return the first command with a progress object. Cancelled, expired, mismatched, consumed, or replayed pending objects must never return a command.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/skill-tip-batch-workflow-fsm.test.mjs
```

Expected: all Task 1 tests pass with zero failures.

- [ ] **Step 6: Commit the atomic batch foundation**

```bash
git add lib/skill-tip-batch-workflow-fsm.mjs tests/skill-tip-batch-workflow-fsm.test.mjs
git commit -m "feat: add atomic skill tip batches"
```

---

### Task 2: Sequential Advancement and Aggregate Results

**Files:**
- Modify: `lib/skill-tip-batch-workflow-fsm.mjs`
- Modify: `tests/skill-tip-batch-workflow-fsm.test.mjs`

**Interfaces:**
- Consumes: `classifySkillTipObservation(observation)` from `lib/skill-tip-workflow-fsm.mjs`.
- Produces: `classifySkillTipBatchObservation(input)` returning either an item continuation, the next sequential command, or the terminal batch result.

- [ ] **Step 1: Write failing sequential execution tests**

Add tests that start from a claimed two-item progress object and pass real CLI envelopes through the batch classifier. The first failure test must assert that the next item runs:

```js
const advanced = classifySkillTipBatchObservation({
  progress,
  observation: {
    exitCode: 5,
    stdout: JSON.stringify({
      ok: true,
      data: { status: 'payment_failed', payment: { status: 3 } },
    }),
  },
});

assert.equal(advanced.state, SkillTipBatchState.BATCH_IN_PROGRESS);
assert.equal(advanced.action, SkillTipBatchAction.RUN_NEXT_SKILL_TIP);
assert.equal(advanced.progress.currentIndex, 1);
assert.equal(advanced.progress.results[0].paymentStatus, 'FAILED');
assert.match(advanced.command, /--name ModelMax --amount 5/u);
```

Add equivalent exit-code-6 unknown continuation, synchronous paid continuation, 3DS/authorization blocking, all-paid terminal, partial terminal, none-paid terminal, no-retry, order preservation, and optional-watch-warning tests.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test tests/skill-tip-batch-workflow-fsm.test.mjs
```

Expected: FAIL because `classifySkillTipBatchObservation` is not exported.

- [ ] **Step 3: Implement sequential observation advancement**

Add:

```js
export function classifySkillTipBatchObservation(input = {}) {
  const progress = validateBatchProgress(input.progress);
  const currentItem = progress.executionItems[progress.currentIndex];
  const itemWorkflow = classifySkillTipObservation({
    ...input.observation,
    expectedTip: currentItem.expectedTip,
    expectedResource: currentItem.expectedResource,
  });

  if (!itemWorkflow.paymentTerminal && !['FAILED', 'UNKNOWN'].includes(itemWorkflow.paymentStatus)) {
    return {
      state: SkillTipBatchState.BATCH_ITEM_CONTINUATION_REQUIRED,
      action: SkillTipBatchAction.WAIT_FOR_SKILL_TIP_ITEM,
      terminal: false,
      reason: 'skill_tip_batch_item_continuation_required',
      progress,
      itemWorkflow,
    };
  }

  // Record a sanitized terminal payment result, increment currentIndex, and
  // either return the next frozen command or aggregate the completed batch.
}
```

Treat `paymentTerminal=true` paid results as eligible to advance even though optional account monitoring remains nonterminal. Return their `pollCommands` and stable `expectedResource` as `optionalAccountWatch` metadata without blocking the next payment. Treat failed and unknown as terminal batch items. Never emit more than one payment command from one classifier call.

- [ ] **Step 4: Implement aggregate classification**

Return `status='COMPLETED'` and derive:

```js
function aggregateOutcome(counts) {
  if (counts.paid === counts.total) return 'ALL_PAID';
  if (counts.paid > 0) return 'PARTIAL';
  return 'NONE_PAID';
}
```

The terminal object must include `batchId`, `currency`, `authorizedTotal`, `counts`, and ordered sanitized `items`. `COMPLETED` means every item reached a terminal payment classification; it must not be presented as payment success by itself.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/skill-tip-batch-workflow-fsm.test.mjs
```

Expected: all batch tests pass with zero failures.

- [ ] **Step 6: Commit sequential execution**

```bash
git add lib/skill-tip-batch-workflow-fsm.mjs tests/skill-tip-batch-workflow-fsm.test.mjs
git commit -m "feat: continue skill tip batches after item errors"
```

---

### Task 3: Multi-Target Intent Routing

**Files:**
- Modify: `lib/payment-intent-router-fsm.mjs`
- Modify: `tests/payment-intent-router-fsm.test.mjs`

**Interfaces:**
- Produces route `SKILL_TIP_BATCH` and normalized `{ batch: { tips, amount?, currency, explicitlyAuthorized } }` input for `classifySkillTipBatchPrerequisites`.
- Preserves existing `SKILL_TIP` output for exactly one requested target.

- [ ] **Step 1: Write failing structured batch router tests**

Add tests for:

```js
classifyPaymentIntent({
  intent: 'skill_tip_batch',
  targets: [
    { publisher: 'clinkpay', skillName: 'PollyReach' },
    { publisher: 'clinkpay', skillName: 'ModelMax' },
  ],
  amount: '2',
  currency: 'USD',
  tipAuthorized: true,
});
```

and:

```js
classifyPaymentIntent({
  intent: 'skill_tip_batch',
  tips: [
    { publisher: 'clinkpay', skillName: 'PollyReach', amount: '2' },
    { publisher: 'clinkpay', skillName: 'ModelMax', amount: '5' },
  ],
  currency: 'USD',
  tipAuthorized: true,
});
```

Assert `SKILL_TIP_BATCH_SELECTED`, route `SKILL_TIP_BATCH`, action `RUN_SKILL_TIP_BATCH_WORKFLOW`, and the normalized batch payload. Add invalid item, non-USD, missing authorization, and structured/text conflict cases.

- [ ] **Step 2: Write failing natural-language and pending tests**

Cover canonical text forms:

```text
打赏 clinkpay/PollyReach 和 clinkpay/ModelMax，每个 2 USD
打赏 clinkpay/PollyReach 2 USD，clinkpay/ModelMax 5 USD
```

Add `pendingTipBatchConfirmation` tests proving generic `确认`, explicit `确认打赏`, and cancellation route only to the batch domain. When single-tip, batch-tip, or install confirmations coexist, generic confirmation must return the existing ambiguous-confirmation error unless the user names the domain.

- [ ] **Step 3: Run router tests and verify RED**

Run:

```bash
node --test tests/payment-intent-router-fsm.test.mjs
```

Expected: new assertions fail because batch constants and routing do not exist.

- [ ] **Step 4: Implement batch constants and structured normalization**

Add:

```js
PaymentIntentState.SKILL_TIP_BATCH_SELECTED
PaymentIntentState.SKILL_TIP_BATCH_CONFIRMATION_SELECTED
PaymentIntentState.SKILL_TIP_BATCH_CONFIRMATION_REJECTED
PaymentIntentState.SKILL_TIP_BATCH_INPUT_MISSING
PaymentIntentRoute.SKILL_TIP_BATCH
PaymentIntentAction.RUN_SKILL_TIP_BATCH_WORKFLOW
PaymentIntentAction.RESUME_SKILL_TIP_BATCH_WORKFLOW
PaymentIntentAction.CANCEL_PENDING_SKILL_TIP_BATCH
PaymentIntentAction.ASK_FOR_SKILL_TIP_BATCH_INPUT
```

Normalize structured `tips` and `targets` without de-duplicating them; the batch FSM must see duplicates so it can report ignored occurrences. Strip version from tip execution targets. Route the original multi-entry request to the batch even when de-duplication will later leave one distinct target.

- [ ] **Step 5: Implement bounded natural-language normalization**

Parse identity occurrences in source order. For `每个`, `各`, or `each`, require exactly one text amount and use it as the shared amount. Otherwise require exactly one amount in the segment after each identity and before the next identity. Ambiguous prose returns `ASK_FOR_SKILL_TIP_BATCH_INPUT` instead of guessing. Preserve the existing single-target parser unchanged for one target.

Extend pending confirmation routing with an active batch pending object and explicit batch confirmation/cancellation phrases. Generic confirmation is accepted only when exactly one of tip batch, single tip, and install is awaiting confirmation.

- [ ] **Step 6: Run router and existing single-tip tests**

Run:

```bash
node --test tests/payment-intent-router-fsm.test.mjs tests/skill-tip-workflow-fsm.test.mjs
```

Expected: all tests pass with zero failures, including existing single-tip and install routing assertions.

- [ ] **Step 7: Commit router support**

```bash
git add lib/payment-intent-router-fsm.mjs tests/payment-intent-router-fsm.test.mjs
git commit -m "feat: route multi-skill tip requests"
```

---

### Task 4: Skill Contract, Version, and Full Verification

**Files:**
- Modify: `SKILL.md`
- Modify: `references/clink-skill-tip.md`
- Modify: `tests/skill-docs.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Documents the public batch workflow marker, actions, confirmation rule, sequential command rule, de-duplication rule, continuation rule, and result semantics.
- Publishes Skill version `1.7.0` consistently in `SKILL.md` and `package.json`.

- [ ] **Step 1: Write failing documentation contract tests**

Require both Skill documents to mention:

```text
[SKILL_TIP_BATCH_FSM]
one confirmation / 一次确认
first occurrence / 首次出现
sequential / 串行
one clink-cli skills tip call per distinct Skill
failed or unknown items do not stop later items
no automatic retry
COMPLETED does not mean all paid
```

Add a version assertion that both metadata files equal `1.7.0`.

- [ ] **Step 2: Run documentation tests and verify RED**

Run:

```bash
node --test tests/skill-docs.test.mjs
```

Expected: new batch contract and version assertions fail.

- [ ] **Step 3: Update `SKILL.md`**

Change the description and `When to Use` language from one Skill to one or multiple Skills. Add `SKILL_TIP_BATCH` routing and `[SKILL_TIP_BATCH_FSM]`, action rows for confirmation/claim/next/return, matrix rows for shared and per-item amounts, and hard rules for first-occurrence de-duplication, sequential execution, continuation after failed/unknown, and no retries. Keep the existing single-tip and Number-snapshot rules intact.

- [ ] **Step 4: Update `references/clink-skill-tip.md`**

Replace the statement that multiple targets/amounts always require clarification with the exact accepted batch forms. Document the frozen confirmation table, authorized total, ignored duplicate display, one command per distinct Skill, active interactive-item blocking, optional watch independence, and terminal aggregate outcomes. Include shared-amount and per-item examples.

- [ ] **Step 5: Bump package version and verify focused tests**

Set both versions to `1.7.0`, then run:

```bash
node --test tests/skill-docs.test.mjs tests/skill-tip-batch-workflow-fsm.test.mjs tests/payment-intent-router-fsm.test.mjs
```

Expected: all focused tests pass with zero failures.

- [ ] **Step 6: Run full verification**

Run:

```bash
npm test
git diff --check
node vendor/clink-cli/clink-cli.bundle.mjs skills tip --help
```

Expected: full test suite passes, diff check has no output, and existing CLI tip help succeeds without any bundle change.

- [ ] **Step 7: Verify change scope**

Run:

```bash
git status --short
git diff --stat HEAD~3..HEAD
git diff --exit-code HEAD~3..HEAD -- vendor/clink-cli/clink-cli.bundle.mjs
```

Expected: only planned source, test, documentation, version, spec, and plan files differ; the vendored CLI bundle has no diff.

- [ ] **Step 8: Commit documentation and version**

```bash
git add SKILL.md references/clink-skill-tip.md tests/skill-docs.test.mjs package.json
git commit -m "docs: define batch skill tip workflow"
```

---

## Plan Self-Review

- Spec coverage: normalization, shared/per-item amounts, first-win de-duplication, atomic confirmation, Number safety, sequential calls, interactive blocking, continue-on-error, no retry, optional events, aggregate results, documentation, and versioning each map to an explicit task.
- Placeholder scan: the plan contains no deferred implementation markers; every code-facing step names the exact API, command, expected failure, and expected passing evidence.
- Type consistency: router output `batch` feeds `classifySkillTipBatchPrerequisites`; claimed prerequisites produce `progress`; `classifySkillTipBatchObservation` consumes that same progress and returns either the next command or the terminal aggregate.
