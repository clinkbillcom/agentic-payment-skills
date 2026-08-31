# Skill Listing and Tipping

Read this before listing tippable skills or executing a skill tip.

## Routing

Use `lib/payment-intent-router-fsm.mjs` before choosing a payment workflow.

- `SKILL_TIP_LIST` is read-only.
- `SKILL_TIP` requires one imperative request, one exact target, one positive USD amount, and authorization bound to that request.
- `SKILL_TIP_BATCH` accepts multiple targets with one shared amount or per-item amounts and requires one confirmation for the complete frozen batch.
- How-to, counterfactual, advice, negated, cancelled, questioned, historical, and conditional language is not authorization. Ambiguous batch amount wording stops for clarification.
- List/query language wins over execution language. A combined list-and-tip request displays the list and then requires confirmation before payment.
- Bare confirmation or cancellation is meaningful only when the same context contains one unambiguous `AWAITING_CONFIRMATION` single-tip or batch pending object.

Use `lib/skill-tip-workflow-fsm.mjs` for list parsing, recent-context selection, Number-to-identity resolution, confirmation claiming, CLI result classification, and optional account-event aggregation.

Use `lib/skill-tip-batch-workflow-fsm.mjs` for batch normalization, de-duplication, atomic confirmation, sequential progress, and aggregate results.

## List Public Skills

Execute through the environment-locked wrapper:

~~~bash
clink skills list --all --tippable --format json
~~~

Inspect the exit code before parsing the JSON envelope. Require `data` to be an array. Every normalized row requires a positive CLI `Number`, nonempty `publisher`, `name`, and `skillId`. Preserve optional `versionNo` and `skillId` only as hidden snapshot metadata. Do not renumber rows.

Return exactly three columns. Render all three headers in the same language as the user's current request; if that is ambiguous, use the conversation's dominant language, then English as the final fallback. Do not mix languages within one header row. Do not translate publisher or Skill-name values.

Chinese:

| 编号 | 发布者 | 技能名称 |
| ---: | --- | --- |
| 1 | clinkpay | PollyReach |

English:

| Number | Publisher | Skill Name |
| ---: | --- | --- |
| 1 | clinkpay | PollyReach |

Call `classifySkillListObservation(observation, { language })` for Chinese or English. For another language, pass one complete localized `headers` object containing `number`, `publisher`, and `skillName`; never mix a custom label with fallback labels.

Escape Markdown separators and line breaks. An empty array means no tippable Skill is available. A malformed envelope, duplicate Number, malformed version, or incomplete row is an error.

After the table is actually displayed, store a structured snapshot in the workflow context:

~~~json
{
  "snapshotId": "snapshot_1",
  "scope": "tippable",
  "userId": "user_1",
  "conversationId": "conversation_1",
  "environment": "test:https://api.clinkbill.dev",
  "listedAt": "2026-07-15T10:00:00.000Z",
  "displayedAt": "2026-07-15T10:00:00.000Z",
  "rows": [
    {
      "number": 2,
      "publisher": "clinkpay",
      "skillName": "PollyReach",
      "skillId": "skill_2",
      "versionNo": "v1.2.3"
    }
  ]
}
~~~

Do not reconstruct this snapshot by scraping a historical Markdown table.

## Tip Input

Normalize one target:

~~~json
{ "kind": "identity", "publisher": "clinkpay", "skillName": "PollyReach" }
~~~

or:

~~~json
{ "kind": "number", "number": 2 }
~~~

Skill Tip execution is versionless. Normalize the target to publisher/name. If an upstream parser includes version information, discard it before confirmation and command construction; the CLI applies its default publisher/name version selection. Never claim that a tip targeted an exact version.

Natural-language Number targets require a marker such as `序号 2`, `2号`, `#2`, or `number 2`. A bare number beside USD is an amount, not a Skill Number. Missing target, missing/non-positive amount, non-USD currency, or missing authorization stops before execution.

## Batch Tip Input and Confirmation

A batch may use one shared amount:

~~~json
{
  "targets": [
    { "kind": "identity", "publisher": "clinkpay", "skillName": "PollyReach" },
    { "kind": "identity", "publisher": "clinkpay", "skillName": "ModelMax" }
  ],
  "amount": "2",
  "currency": "USD",
  "explicitlyAuthorized": true
}
~~~

or per-item amounts:

~~~json
{
  "tips": [
    {
      "target": { "kind": "identity", "publisher": "clinkpay", "skillName": "PollyReach" },
      "amount": "2"
    },
    {
      "target": { "kind": "identity", "publisher": "clinkpay", "skillName": "ModelMax" },
      "amount": "5"
    }
  ],
  "currency": "USD",
  "explicitlyAuthorized": true
}
~~~

Natural language must state either one shared amount with `每个` / `each`, or place one amount after every target. If the amount assignment is ambiguous, ask for clarification. Never guess whether a trailing amount applies to the last Skill or the whole batch.

Resolve every Number target through the same newest valid `tippable` snapshot before creating a pending batch. If any target or amount is invalid or unresolved, stop the complete batch; do not confirm or execute the valid subset.

De-duplicate by trimmed case-insensitive publisher/name. The first occurrence wins and preserves its original spelling and amount. Ignore every later duplicate without adding or replacing its amount, and include each ignored occurrence in confirmation metadata.

Every batch requires one confirmation showing:

- every distinct publisher/name and USD amount in frozen execution order;
- the authorized total and number of payment calls;
- ignored duplicate occurrences;
- that failed or unknown items do not stop later items.

Freeze this information with `batchId`, user, conversation, exact environment lock, and expiry. `CONFIRMED + AWAITING_CONFIRMATION` returns `CLAIM_PENDING_TIP_BATCH` without a payment command. Only a successful atomic transition to `EXECUTING` may return the first payment command. A replayed, cancelled, expired, consumed, or cross-context batch returns no payment command.

## Sequential Batch Execution

Run one `clink skills tip` call per distinct Skill. Payment calls are sequential in frozen order and every item retains its own `expectedTip` binding:

~~~bash
clink skills tip --publisher <publisher> --name <skill_name> --amount <amount> --format json
~~~

Never add a combined target list, aggregate amount, version, Number, or batch flag to the CLI. An interactive authorization or 3DS continuation remains the active item and blocks later payment submission until the single-tip workflow reaches a terminal payment classification.

A terminal failed or unknown item does not stop later items: record it and continue with the next frozen Skill. Never automatically retry a failed or unknown item. A synchronously paid item may start its optional account-event watches without delaying the next payment; polling errors or ambiguity remain warnings and never downgrade `PAID`.

The final ordered result uses these aggregate outcomes:

- `ALL_PAID`: every distinct item is `PAID`;
- `PARTIAL`: at least one item is `PAID` and at least one is `FAILED` or `UNKNOWN`;
- `NONE_PAID`: no item is `PAID` after every item is terminal.

Batch `COMPLETED` does not mean all items were paid. It means all distinct items were attempted or resolved through an allowed continuation. Always return per-item payment status and counts with the aggregate outcome.

## Recent Number Context

A Number is a conversation index, never a `skills tip` CLI argument.

Select the newest valid displayed snapshot satisfying all of these conditions:

- it was displayed no more than two hours (2 hours) ago, including exactly two hours;
- its display time is not in the future;
- it belongs to the same user, conversation/session, and exact environment lock;
- it has the explicit `tippable` scope; an `all` or unscoped list uses a different Number namespace and is invalid for tipping;
- all rows are valid and Number values are unique.

Select the newest same-context, in-window, `tippable` snapshot before validating its rows. Do not fall back to an older snapshot when that selected snapshot is malformed, has duplicate Number values, or lacks the requested Number. Run the list workflow again instead.

When a valid snapshot exists, freeze that row's `publisher`, `skillName`, and internal `skillId` for the tip. Ignore snapshot `versionNo` when constructing the target. Execute the identity command immediately because the imperative Number request is already authorization against the displayed mapping. Do not refresh the list and do not resolve the Number against the live marketplace.

When no valid snapshot exists, the `RUN_SKILL_TIP_LIST_WORKFLOW` result carries `confirmationRequired: true` both at the top level and inside the original `tipDraft`. The runtime must preserve that tip draft, run the list workflow, display its table, and then create one pending confirmation:

~~~json
{
  "pendingId": "pending_1",
  "status": "AWAITING_CONFIRMATION",
  "number": 2,
  "resolvedTarget": {
    "publisher": "clinkpay",
    "skillName": "PollyReach",
    "skillId": "skill_2"
  },
  "amount": "2",
  "currency": "USD",
  "snapshotId": "snapshot_1",
  "userId": "user_1",
  "conversationId": "conversation_1",
  "environment": "test:https://api.clinkbill.dev",
  "createdAt": "2026-07-15T10:00:00.000Z",
  "expiresAt": "2026-07-15T12:00:00.000Z"
}
~~~

The confirmation prompt includes Number, `publisher/name`, amount, and USD without a version. If the fresh list still does not contain the requested Number, ask the user to select again and create no pending payment.

## Confirmation Claim

Confirmation is a two-stage state transition:

1. `CONFIRMED + AWAITING_CONFIRMATION` returns `CLAIM_PENDING_TIP` with no payment command.
2. The runtime atomically compares and swaps `AWAITING_CONFIRMATION -> EXECUTING`.
3. Only `CLAIMED + EXECUTING` returns `RUN_SKILL_TIP` and the frozen identity command.

If the atomic claim fails, or the pending state is already `EXECUTING`, `CONSUMED`, or `CANCELLED`, do not return a command. Cancellation atomically changes `AWAITING_CONFIRMATION -> CANCELLED`. Expired or cross-context pending objects require a fresh request. A new target or amount never consumes the previous pending object.

After a terminal CLI result, the runtime changes `EXECUTING` to `CONSUMED`. Never retry a consumed pending request.

## Execute a Tip

Execute Skill Tip by publisher/name without a version:

~~~bash
clink skills tip \
  --publisher <publisher> \
  --name <skill_name> \
  --amount <amount> \
  --format json
~~~

Do not pass a version, `--number`, `--expected-skill-id`, `--currency`, or `--payment-instrument-id`. The CLI resolves the publisher/name target using its default version behavior.

Every `RUN_SKILL_TIP` result also returns an `expectedTip` binding. This binding is required and contains `publisher`, `skillName`, `amount`, and `currency`, plus frozen `skillId` when known. It never contains version as an authorization constraint. Pass it unchanged to `classifySkillTipObservation`; a missing or incomplete binding leaves a synchronous result `UNKNOWN` instead of accepting an unbound payment result.

The latest CLI refreshes and uses the explicit default payment method. A default `CARD` is charged directly without a Credit-balance check. A default `BALANCE` must have enough finite `availableBalance` to cover the complete tip. It does not use mixed Credit/card payment, strong-auth instructions, or mandates for normal Skill Tip execution. The FSM may continue classifying legacy `authorization_pending` and 3DS payloads defensively, but they are not the current normal path.

If the explicit default is `BALANCE` and its balance is insufficient or invalid, the CLI stops before payment and returns code `402` with the exact error `Credit 余额不足，请先绑定银行卡`. Classify this as terminal `TIP_CARD_BINDING_REQUIRED / SURFACE_ERROR`, return exactly that stable user message, and stop the current Tip. Do not run `card binding-link`, start a binding/payment listener, or retry the Tip. Start card binding only after a separate explicit user request. This branch means the user must bind a bank card; never tell the user to recharge, top up, reload, or add funds to Credit/Balance.

## Classify the Result

Use the CLI exit code first, then the first JSON result envelope.

| Observation | Payment status | Action |
| --- | --- | --- |
| `status=paid` and agent pay `status=1` | `PAID` | Start optional account-event monitoring |
| legacy `authorization_pending` | `NOT_PAID` | Preserve its continuation without claiming payment |
| code `402` with exact error `Credit 余额不足，请先绑定银行卡` | `NOT_PAID` | Return the same message and stop; do not bind, listen, or retry |
| exit 5 with `payment_failed` | `FAILED` | Stop |
| exit 6 or `payment_unknown` | `UNKNOWN` | Verify safely; never retry automatically |
| exit 7 / `three_ds_required` | `PENDING_3DS` | Use the correlated order-event flow |
| other exit 2–5 | `NOT_PAID` or error | Surface the typed error |

Synchronous `paid` plus underlying status `1` is payment success. Verify returned `publisher`, `skillName`, `skillId` when frozen, amount, and currency against the authorization binding. Accept the version resolved by the CLI as result metadata; do not compare it as user authorization. Do not wait for an order or merchant account event before returning `PAID`.

After paid status, the CLI reports the tip metric with the verified `skillId`, resolved `versionNo`, and order ID as a best-effort side effect. Metric failure never changes `PAID` and never triggers another charge.

Never retry exit code 6 or a client timeout automatically; payment may already have executed.

## Optional Merchant Account Events

Merchant account events enrich a successful tip but are not required. A merchant may emit neither event. After synchronous success, keep payment terminal `PAID` and immediately start one bounded any-of poll:

~~~bash
clink events poll --type account-created,account-reloaded --max-wait 60 --format json
~~~

The events are mutually exclusive for one tip and use ANY_OF semantics. Feed the same poll result through the `account-created` and `account-reloaded` wait specs. Correlate by matching order ID, otherwise by a compound identity with at least two stable values such as `customerId + merchantId` or `customerId + skillId`. Pass known `expectedResource` values including `customerId`, `merchantId`, and `skillId`.

An explicit conflicting orderId must be rejected even when compound fields match. Never accept an event-type-only match. Return `NOT_OBSERVED` only after the single any-of poll settles; timeout or poll error never downgrades `PAID`.

If both `account-created` and `account-reloaded` are reported as correlated for the same tip, preserve `PAID` but return a warning with `accountEventStatus=POLL_ERROR`; the mutually exclusive evidence is inconsistent.

## Return Contract

Keep payment outcome separate from optional merchant evidence:

~~~json
{
  "intent": "SKILL_TIP",
  "target": {
    "publisher": "clinkpay",
    "skillName": "PollyReach"
  },
  "amount": 2,
  "currency": "USD",
  "paymentStatus": "PAID",
  "orderId": "order_1",
  "accountEventStatus": "PENDING"
}
~~~

Valid account-event statuses are `CONFIRMED_CREATED`, `CONFIRMED_RELOADED`, `PENDING`, `NOT_OBSERVED`, `POLL_ERROR`, and `NOT_STARTED`. Do not claim merchant entitlement or any business result beyond a correlated event.
