# Skill Listing and Tipping

Read this before listing tippable skills or executing a skill tip.

## Routing

Use `lib/payment-intent-router-fsm.mjs` before choosing a payment workflow.

- `SKILL_TIP_LIST` is read-only.
- `SKILL_TIP` requires one imperative request, one exact target, one positive USD amount, and authorization bound to that request.
- How-to, counterfactual, advice, negated, cancelled, questioned, historical, and conditional language is not authorization. Multiple targets or amounts stop for clarification.
- List/query language wins over execution language. A combined list-and-tip request displays the list and then requires confirmation before payment.
- Bare confirmation or cancellation is meaningful only when the same context contains one `AWAITING_CONFIRMATION` Skill Tip pending object.

Use `lib/skill-tip-workflow-fsm.mjs` for list parsing, recent-context selection, Number-to-identity resolution, confirmation claiming, CLI result classification, and optional account-event aggregation. Emit `[SKILL_TIP_FSM] state=<STATE> action=<ACTION> reason=<REASON>`.

## List Public Skills

Execute through the environment-locked wrapper:

~~~bash
clink-cli skills list --all --tippable --format json
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
  "environment": "sandbox:https://api.clinkbill.dev",
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
  "environment": "sandbox:https://api.clinkbill.dev",
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
clink-cli skills tip \
  --publisher <publisher> \
  --name <skill_name> \
  --amount <amount> \
  --format json
~~~

Do not pass a version, `--number`, `--expected-skill-id`, `--currency`, or `--payment-instrument-id`. The CLI resolves the publisher/name target using its default version behavior.

Every `RUN_SKILL_TIP` result also returns an `expectedTip` binding. This binding is required and contains `publisher`, `skillName`, `amount`, and `currency`, plus frozen `skillId` when known. It never contains version as an authorization constraint. Pass it unchanged to `classifySkillTipObservation`; a missing or incomplete binding leaves a synchronous result `UNKNOWN` instead of accepting an unbound payment result.

The latest CLI refreshes and requires a sufficient explicitly default USD Credit balance. It does not use cards, mixed Credit/card payment, VIC instructions, or mandates for normal Skill Tip execution. The FSM may continue classifying legacy `authorization_pending` and 3DS payloads defensively, but they are not the current normal path.

## Classify the Result

Use the CLI exit code first, then the first JSON result envelope.

| Observation | Payment status | Action |
| --- | --- | --- |
| `status=paid` and agent pay `status=1` | `PAID` | Start optional account-event monitoring |
| legacy `authorization_pending` | `NOT_PAID` | Preserve its continuation without claiming payment |
| exit 5 with `payment_failed` | `FAILED` | Stop |
| exit 6 or `payment_unknown` | `UNKNOWN` | Verify safely; never retry automatically |
| exit 7 / `three_ds_required` | `PENDING_3DS` | Use the correlated order-event flow |
| other exit 2–5 | `NOT_PAID` or error | Surface the typed error |

Synchronous `paid` plus underlying status `1` is payment success. Verify returned `publisher`, `skillName`, `skillId` when frozen, amount, and currency against the authorization binding. Accept the version resolved by the CLI as result metadata; do not compare it as user authorization. Do not wait for an order or merchant account event before returning `PAID`.

After paid status, the CLI reports the tip metric with the verified `skillId`, resolved `versionNo`, and order ID as a best-effort side effect. Metric failure never changes `PAID` and never triggers another charge.

Never retry exit code 6 or a client timeout automatically; payment may already have executed.

## Optional Merchant Account Events

Merchant account events enrich a successful tip but are not required. A merchant may emit neither event. After synchronous success, keep payment terminal `PAID` and immediately start both bounded polls in parallel:

~~~bash
clink-cli events poll --type account-created --max-wait 60 --format json
~~~

~~~bash
clink-cli events poll --type account-reloaded --max-wait 60 --format json
~~~

The events are mutually exclusive for one tip and use ANY_OF semantics. Correlate by matching order ID, otherwise by a compound identity with at least two stable values such as `customerId + merchantId` or `customerId + skillId`. Pass known `expectedResource` values including `customerId`, `merchantId`, and `skillId`.

An explicit conflicting orderId must be rejected even when compound fields match. Never accept an event-type-only match. Stop the sibling listener after one correlated event. Wait for both listeners to settle before returning `NOT_OBSERVED`; timeout or poll error never downgrades `PAID`.

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
