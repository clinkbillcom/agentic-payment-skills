# Batch Skill Tipping Design

## Goal

Allow one authorized request to tip multiple public Skills while preserving the existing single-tip payment safety contract. The payment skill presents and confirms one frozen batch, then invokes `clink-cli skills tip` once per distinct Skill and returns both per-item and aggregate results.

## Scope

This change is contained in `agentic-payment-skills` and covers:

- recognition and normalization of multi-Skill tip requests;
- one shared amount or one amount per Skill;
- first-occurrence de-duplication by canonical `publisher/name`;
- one atomic confirmation for the complete frozen batch;
- sequential execution through multiple existing CLI tip calls;
- continuation after individual failures or unknown payment states;
- per-item and aggregate result reporting;
- documentation and focused regression tests.

It does not add a batch API or batch command to `clink-cli`, change pricing or currency rules, introduce automatic retries, support concurrent payment submission, or change Skill installation.

## Selected Approach

Add a batch orchestration FSM around the existing single-tip FSM. The batch layer owns list-level concerns only: normalization, de-duplication, confirmation, execution order, progress, and aggregation. Each CLI observation continues to be classified by the existing single-tip functions with its own `expectedTip` binding.

This keeps the existing single-payment states, exit-code precedence, result binding, optional event handling, and unknown-payment protections unchanged.

## Request Contract

A batch request may use either a shared amount:

```json
{
  "intent": "skill_tip_batch",
  "targets": [
    { "publisher": "clinkpay", "skillName": "PollyReach" },
    { "publisher": "clinkpay", "skillName": "ModelMax" }
  ],
  "amount": "2",
  "currency": "USD",
  "explicitlyAuthorized": true
}
```

or per-item amounts:

```json
{
  "intent": "skill_tip_batch",
  "tips": [
    { "publisher": "clinkpay", "skillName": "PollyReach", "amount": "2" },
    { "publisher": "clinkpay", "skillName": "ModelMax", "amount": "5" }
  ],
  "currency": "USD",
  "explicitlyAuthorized": true
}
```

Natural-language routing may produce the same normalized structure. As with a single tip, a question, tutorial request, hypothetical, or incomplete statement is not payment authorization.

Every item requires a nonempty publisher, nonempty Skill name, positive amount, and USD currency. A shared amount applies only to items that do not carry an item-specific amount. An item-specific amount takes precedence when both are present. Missing or invalid input stops before confirmation and returns an input-required classification.

A request with one distinct valid target may continue through the existing single-tip workflow. A request with two or more distinct valid targets uses the batch workflow.

## Canonical Identity and De-duplication

Canonical identity is the case-insensitive pair `publisher/skillName` after trimming surrounding whitespace. The first occurrence determines:

- display order;
- execution order;
- preserved publisher and Skill-name spelling;
- amount.

Later occurrences of the same canonical identity are ignored. Their amounts are not added and do not replace the first amount, even when different. The confirmation view records ignored duplicates so the user can see that they will not create additional payments.

Number-based targets retain the existing two-hour structured snapshot safety contract. Every Number must resolve to a frozen publisher/name before the batch confirmation is created. If any Number cannot be resolved safely, the batch stops before confirmation; it must not partially confirm or execute the resolvable subset.

## Confirmation Contract

Every multi-Skill batch requires one confirmation, including a fully specified imperative request. The confirmation displays:

- each distinct `publisher/name` and its amount in USD;
- the number of payment calls;
- the total authorized amount;
- any ignored duplicate occurrences;
- that individual failures or unknown states will not stop later items.

The pending confirmation freezes the ordered item list, amounts, USD currency, environment lock, context identity, creation/expiry timestamps, and one `batchId`. Changing a target, amount, order, currency, or environment requires a new pending confirmation.

Confirmation follows the existing atomic pattern:

```text
AWAITING_CONFIRMATION
  -> CONFIRMED
  -> CLAIM_PENDING_TIP_BATCH
  -> EXECUTING
```

Only a successful atomic `AWAITING_CONFIRMATION -> EXECUTING` claim may produce commands. A cancelled, consumed, expired, context-mismatched, or already-executing pending batch produces no command.

## Execution Contract

Payments are submitted sequentially in frozen order. For each item, the batch layer obtains the existing single-tip execution plan and runs exactly one identity command:

```bash
clink-cli skills tip \
  --publisher <publisher> \
  --name <skill_name> \
  --amount <amount> \
  --format json
```

The batch layer never passes a version, Number, combined target list, or aggregate amount to the CLI. It never invokes a new CLI batch endpoint.

Each item receives its own immutable `expectedTip` binding and stable item ID. The existing single-tip observation classifier determines `PAID`, `FAILED`, `UNKNOWN`, authorization continuation, 3DS continuation, or other supported states. A terminal `FAILED` or `UNKNOWN` result is recorded and execution advances to the next item. Unknown payments are never retried automatically.

An item requiring an interactive continuation such as 3DS or a legacy authorization flow remains the active item until that existing single-tip workflow reaches a terminal payment classification. Later payment submissions do not overtake it. This preserves deterministic ordering and avoids overlapping user authorization flows.

Synchronous `PAID` remains payment success. Optional `account-created` and `account-reloaded` monitoring may run while later batch items execute, but it never delays or downgrades a paid result. Event ambiguity or polling failure is recorded as an item-level warning. The existing active-watch correlation rules remain authoritative.

## Batch State and Actions

Add batch-specific states and actions without changing the meaning of existing single-tip constants:

```text
BATCH_INPUT_REQUIRED
  -> ASK_FOR_SKILL_TIP_BATCH_INPUT

BATCH_CONFIRMATION_REQUIRED
  -> ASK_FOR_TIP_BATCH_CONFIRMATION
  -> CLAIM_PENDING_TIP_BATCH

BATCH_EXECUTING
  -> RUN_NEXT_SKILL_TIP
  -> RECORD_ITEM_RESULT
  -> CONTINUE_SKILL_TIP_BATCH

BATCH_COMPLETED
  -> RETURN_SKILL_TIP_BATCH_RESULT
```

Use a dedicated marker:

```text
[SKILL_TIP_BATCH_FSM] state=<STATE> action=<ACTION> reason=<REASON>
```

The batch progress object contains the frozen batch, current item index, item results, and terminal aggregate counts. Resuming progress must validate the same batch ID, environment, context identity, and frozen item binding before emitting the next command.

## Result Contract

The terminal result separates batch completion from individual payment outcomes:

```json
{
  "intent": "SKILL_TIP_BATCH",
  "batchId": "tip_batch_xxx",
  "status": "COMPLETED",
  "currency": "USD",
  "authorizedTotal": "7",
  "counts": {
    "total": 2,
    "paid": 1,
    "failed": 0,
    "unknown": 1
  },
  "items": [
    {
      "publisher": "clinkpay",
      "skillName": "PollyReach",
      "amount": "2",
      "paymentStatus": "PAID"
    },
    {
      "publisher": "clinkpay",
      "skillName": "ModelMax",
      "amount": "5",
      "paymentStatus": "UNKNOWN"
    }
  ]
}
```

`status=COMPLETED` means all distinct items were attempted or resolved through their allowed continuation; it does not mean all payments succeeded. The user-facing response reports every item and never collapses a mixed batch into an unqualified success.

Aggregate outcome is derived from item results:

- `ALL_PAID`: every item is paid;
- `PARTIAL`: at least one item is paid and at least one item is failed or unknown;
- `NONE_PAID`: every item is terminal and none is paid;
- `IN_PROGRESS`: at least one item has not reached its terminal payment classification.

Optional account-event statuses are reported independently and do not affect these payment aggregates.

## Error Handling and Safety

- Validate and resolve the complete batch before asking for confirmation.
- Do not execute a valid subset when another requested item is invalid or unresolved.
- Do not submit payments before the batch pending object is atomically claimed.
- Do not run payment calls concurrently.
- Continue after terminal per-item failures and unknown states.
- Do not automatically retry failed or unknown items.
- Do not treat an authorization continuation or 3DS requirement as terminal failure.
- Preserve the environment lock for the entire batch and every optional event poll.
- Keep secrets out of pending objects, markers, commands shown to users, and aggregate results.

## Expected Implementation Boundaries

Expected touchpoints are:

- create `lib/skill-tip-batch-workflow-fsm.mjs` for batch normalization, confirmation, progress, and aggregation;
- modify `lib/payment-intent-router-fsm.mjs` only for batch intent recognition and normalized routing;
- reuse `lib/skill-tip-workflow-fsm.mjs` for each item, making only narrowly required reusable exports if necessary;
- update `SKILL.md` and `references/clink-skill-tip.md` with the batch contract;
- add focused batch FSM, router, and documentation tests.

Do not modify:

- the `clink-cli` command contract or add a CLI batch command;
- the vendored CLI bundle, because repeated calls use the existing command;
- Skill installation behavior;
- wallet, refund, UCP, instruction, or direct-payment behavior;
- single-tip payment success or optional event semantics.

## Testing

Add tests proving:

1. Shared amount expands to every target.
2. Per-item amounts are preserved.
3. Item-specific amount overrides a shared fallback.
4. Invalid or unresolved input prevents the entire batch from reaching confirmation.
5. Case-insensitive duplicate identities keep the first spelling and first amount.
6. Ignored duplicates appear in confirmation metadata and do not produce commands.
7. The confirmation lists every distinct item, authorized total, and continuation policy.
8. Confirmation atomically claims one frozen batch and cannot be replayed.
9. Each distinct item produces one versionless publisher/name CLI command in frozen order.
10. Payment commands are never emitted concurrently.
11. A failed item is recorded and the next item still runs.
12. An unknown item is recorded, is not retried, and the next item still runs.
13. An interactive item blocks later submissions until it reaches a terminal payment result.
14. Mixed results produce `PARTIAL` with correct counts and item details.
15. All-paid and none-paid batches produce the correct aggregate outcomes.
16. Optional account-event warnings do not downgrade paid items or batch payment aggregates.
17. Existing single-tip, router, event, install, and documentation tests continue to pass.

## Acceptance Criteria

- A user may authorize multiple Skills with one shared amount or per-Skill amounts.
- The complete batch requires one frozen, atomic confirmation.
- Duplicate publisher/name targets are ignored after their first occurrence; the first amount wins.
- Every distinct Skill is tipped through a separate existing `clink-cli skills tip` invocation.
- Payment submissions run sequentially in frozen order.
- A failed or unknown payment never stops later batch items and is never retried automatically.
- Every item preserves the existing single-tip authorization, result-binding, and optional-event safety rules.
- Final output clearly distinguishes batch completion from per-item payment success.
- No CLI bundle update is required.
- Focused and full test suites pass.
