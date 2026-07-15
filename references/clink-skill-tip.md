# Skill Listing and Tipping

Read this before listing tippable skills or executing a skill tip.

## Contents

- Routing
- List Public Skills
- Tip Input
- Number Snapshot Safety
- Execute a Tip
- Classify the Result
- Optional Merchant Account Events
- Return Contract

## Routing

Use lib/payment-intent-router-fsm.mjs before choosing a payment workflow.

- SKILL_TIP_LIST is read-only. It answers requests such as “目前 clink payment skill 支持打赏哪些 skill”.
- SKILL_TIP has a payment side effect. It requires an imperative tip request, one exact target, a positive amount, USD currency, and explicit authorization for the same request.
- A question such as “怎么打赏” is not authorization.
- List/query language wins over execution language so “支持打赏哪些 skill” cannot trigger payment.

Use lib/skill-tip-workflow-fsm.mjs for list parsing, Number verification, CLI result classification, and optional account-event aggregation. Emit [SKILL_TIP_FSM] state=<STATE> action=<ACTION> reason=<REASON>.

## List Public Skills

Execute through the environment-locked wrapper:

~~~bash
clink-cli skills list --all --format json
~~~

Inspect the process exit code before parsing the standard JSON envelope. Require data to be an array. Every displayed row requires:

- Number: positive integer supplied by the CLI;
- publisher: nonempty string;
- name: nonempty string;
- skillId: nonempty string.

Do not renumber the rows. Escape Markdown table separators and line breaks, then return exactly:

| 序号 | 发布者 | Skill 名称 | skill_id |
| ---: | --- | --- | --- |
| Number | publisher | name | skillId |

An empty array means no public skills are currently available. A malformed row or envelope is an error; do not invent missing fields.

Retain the normalized rows in the current workflow context as the Number list snapshot:

~~~json
{
  "rows": [
    {
      "number": 2,
      "publisher": "clinkpay",
      "skillName": "PollyReach",
      "skillId": "skill_2"
    }
  ]
}
~~~

## Tip Input

Normalize one mutually exclusive target:

~~~json
{ "kind": "identity", "publisher": "clinkpay", "skillName": "PollyReach" }
~~~

or:

~~~json
{ "kind": "number", "number": 2 }
~~~

Natural-language Number targets must have an unambiguous marker such as 序号 2, 2号, #2, or number 2. A bare number beside USD is an amount, not a skill Number.

Tips support USD only. Missing target, missing/non-positive amount, dual targets, non-USD currency, or missing explicit authorization stops before CLI execution.

A complete current request such as “打赏 clinkpay/pollyreach 2 USD” is explicit authorization for that exact target and amount. Do not reuse authorization for a changed target or amount.

## Number Snapshot Safety

Number values are positional and can change when the marketplace list changes.

For a Number target:

1. Require a Number list snapshot that was displayed to the user in the current workflow context.
2. Find the requested Number in that snapshot.
3. Immediately refresh with clink-cli skills list --all --format json.
4. Compare Number, publisher, name, and skillId.
5. If the row is missing or changed, stop before payment, show the refreshed target, and require fresh authorization.
6. If unchanged, execute the Number command.

The CLI performs another fresh lookup internally. Preserve Number mode as requested, but never skip the pre-execution comparison.

## Execute a Tip

Identity target:

~~~bash
clink-cli skills tip \
  --publisher <publisher> \
  --name <skill_name> \
  --amount <amount> \
  --format json
~~~

Number target:

~~~bash
clink-cli skills tip \
  --number <number> \
  --amount <amount> \
  --format json
~~~

Do not pass --currency; skill tips are USD. Do not pass --payment-instrument-id; the command refreshes and uses the default payment method.

Do not pass --no-watch during normal execution. For Visa + VIC readiness, skills tip lists matching ACTIVE authorization, creates a draft when needed, emits the Passkey URL, watches activation, verifies the instruction, and resumes only after a valid match. If the command returns authorization_pending, send the returned Passkey URL and preserve resumeCommand; no payment has occurred.

## Classify the Result

Use the CLI exit code first, then the first JSON result envelope. A later built-in-watch envelope is event output, not the original tip result.

| Observation | Payment status | Action |
| --- | --- | --- |
| status=paid and underlying agent pay status=1 | PAID | Start optional account-event monitoring |
| authorization_pending | NOT_PAID | Send Passkey URL and wait/resume |
| payment_failed | FAILED | Stop; do not poll account events |
| exit 7 / three_ds_required | PENDING_3DS | Send redirect and use the existing correlated order-event flow |
| exit 6 / client timeout | UNKNOWN | Verify safely; do not retry |
| exit 2–5 | NOT_PAID or error | Surface the typed CLI error |

For tips, status=paid with underlying agent pay status=1 is payment success synchronously. Do not require agent_order.succeeded, account-created, or account-reloaded before returning paymentStatus=PAID.

Never retry exit code 6 or a client timeout automatically. The payment may already have executed.

After 3DS, start optional account-event monitoring only after the correlated order result proves payment success.

## Optional Merchant Account Events

Merchant account events enrich a successful tip but are not required. A merchant may emit neither event.

After synchronous payment success, immediately start both bounded polls in parallel:

~~~bash
clink-cli events poll --type account-created --max-wait 60 --format json
~~~

~~~bash
clink-cli events poll --type account-reloaded --max-wait 60 --format json
~~~

The events are mutually exclusive for one tip:

- account-created: a new merchant account was created after payment confirmation;
- account-reloaded: an existing merchant account was reloaded after payment confirmation.

Treat them as ANY_OF. Correlate an event to the current tip using the strongest available resource:

1. matching orderId;
2. otherwise a compound identity containing at least two stable values such as customerId + merchantId or customerId + skillId.

Never accept an event-type-only match. When one correlated event arrives, return it and stop the sibling listener.

Do not report `NOT_OBSERVED` after only one listener settles. Keep waiting until either listener returns a correlated event or both listeners have settled by timeout/error.

If both polls time out, return accountEventStatus=NOT_OBSERVED. This means only that no account event was observed in the bounded window; it does not prove the merchant is unsupported.

If optional polling fails, return accountEventStatus=POLL_ERROR with a warning. Both timeout and poll error preserve paymentStatus=PAID.

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
  "accountEventStatus": "NOT_OBSERVED"
}
~~~

Valid account event statuses are:

- CONFIRMED_CREATED
- CONFIRMED_RELOADED
- NOT_OBSERVED
- POLL_ERROR
- NOT_STARTED

Do not claim merchant entitlement or any business result beyond the correlated event.
