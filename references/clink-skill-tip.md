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

Inspect the exit code before parsing the JSON envelope. Require `data` to be an array. Every displayed row requires a positive CLI `Number`, nonempty `publisher`, `name`, and `skillId`. Preserve optional `versionNo` in context. Do not renumber rows.

Return the requested four-column table:

| 序号 | 发布者 | Skill 名称 | skill_id |
| ---: | --- | --- | --- |
| Number | publisher | name | skillId |

Escape Markdown separators and line breaks. An empty array means no tippable Skill is available. A malformed envelope, duplicate Number, malformed version, or incomplete row is an error.

After the table is actually displayed, store a structured snapshot in the workflow context:

~~~json
{
  "snapshotId": "snapshot_1",
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
{ "kind": "identity", "publisher": "clinkpay", "skillName": "PollyReach", "versionNo": "v1.2.3" }
~~~

or:

~~~json
{ "kind": "number", "number": 2 }
~~~

Identity versions are optional. Accept forms such as `clinkpay/PollyReach@v1.2.3`; omission means the CLI resolves the latest exact publisher/name match. Version syntax is 1–128 letters, digits, `.`, `_`, `+`, or `-` and version matching is case-sensitive.

Natural-language Number targets require a marker such as `序号 2`, `2号`, `#2`, or `number 2`. A bare number beside USD is an amount, not a Skill Number. Missing target, missing/non-positive amount, non-USD currency, or missing authorization stops before execution.

## Recent Number Context

A Number is a conversation index, never a `skills tip` CLI argument.

Select the newest valid displayed snapshot satisfying all of these conditions:

- it was displayed no more than two hours (2 hours) ago, including exactly two hours;
- its display time is not in the future;
- it belongs to the same user, conversation/session, and exact environment lock;
- all rows are valid and Number values are unique.

Do not fall back to an older snapshot merely because it contains the requested Number. Resolve the Number only in the newest valid displayed snapshot. If that snapshot does not contain the Number, run the list workflow again.

When a valid snapshot exists, freeze that row's `publisher`, `skillName`, optional `versionNo`, and `skillId`. Execute the identity command immediately because the imperative Number request is already authorization against the displayed mapping. Do not refresh the list and do not resolve the Number against the live marketplace.

When no valid snapshot exists, the `RUN_SKILL_TIP_LIST_WORKFLOW` result carries `confirmationRequired: true` both at the top level and inside the original `tipDraft`. The runtime must preserve that tip draft, run the list workflow, display its table, and then create one pending confirmation:

~~~json
{
  "pendingId": "pending_1",
  "status": "AWAITING_CONFIRMATION",
  "number": 2,
  "resolvedTarget": {
    "publisher": "clinkpay",
    "skillName": "PollyReach",
    "skillId": "skill_2",
    "versionNo": "v1.2.3"
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

The confirmation prompt includes Number, `publisher/name@version` when present, amount, and USD. If the fresh list still does not contain the requested Number, ask the user to select again and create no pending payment.

## Confirmation Claim

Confirmation is a two-stage state transition:

1. `CONFIRMED + AWAITING_CONFIRMATION` returns `CLAIM_PENDING_TIP` with no payment command.
2. The runtime atomically compares and swaps `AWAITING_CONFIRMATION -> EXECUTING`.
3. Only `CLAIMED + EXECUTING` returns `RUN_SKILL_TIP` and the frozen identity command.

If the atomic claim fails, or the pending state is already `EXECUTING`, `CONSUMED`, or `CANCELLED`, do not return a command. Cancellation atomically changes `AWAITING_CONFIRMATION -> CANCELLED`. Expired or cross-context pending objects require a fresh request. A new target or amount never consumes the previous pending object.

After a terminal CLI result, the runtime changes `EXECUTING` to `CONSUMED`. Never retry a consumed pending request.

## Execute a Tip

The latest CLI accepts only publisher/name identity with an optional version:

~~~bash
clink-cli skills tip \
  --publisher <publisher> \
  --name <skill_name> \
  [--version <versionNo>] \
  --amount <amount> \
  --format json
~~~

Do not pass `--number`, `--expected-skill-id`, `--currency`, or `--payment-instrument-id`. If the frozen row has no version, omit `--version`; the CLI resolves the newest exact publisher/name record. If an explicitly requested version is missing or mismatched, stop before payment and never fall back to latest.

Every `RUN_SKILL_TIP` result also returns an `expectedTip` binding. This binding is required and contains `publisher`, `skillName`, `amount`, and `currency`, plus frozen `skillId` and `versionNo` when known. Pass it unchanged to `classifySkillTipObservation`; a missing or incomplete binding leaves a synchronous result `UNKNOWN` instead of accepting an unbound payment result.

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

Synchronous `paid` plus underlying status `1` is payment success. Verify returned `publisher`, `skillName`, `skillId`, `versionNo` when frozen, amount, and currency against the authorization binding. Do not wait for an order or merchant account event before returning `PAID`.

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
    "skillName": "PollyReach",
    "versionNo": "v1.2.3"
  },
  "amount": 2,
  "currency": "USD",
  "paymentStatus": "PAID",
  "orderId": "order_1",
  "accountEventStatus": "PENDING"
}
~~~

Valid account-event statuses are `CONFIRMED_CREATED`, `CONFIRMED_RELOADED`, `PENDING`, `NOT_OBSERVED`, `POLL_ERROR`, and `NOT_STARTED`. Do not claim merchant entitlement or any business result beyond a correlated event.
