# Skill Tip Intents Design

## Goal

Add two payment-skill intents: list public skills that can receive tips, and tip one skill by either `publisher/name` or the `Number` shown by the list command. Keep intent recognition separate from the side-effecting payment lifecycle, treat synchronous agent-pay success as payment success, and treat merchant account events as optional post-payment evidence.

## Scope

This change is contained in `agentic-payment-skills` and covers:

- two new routes in the payment intent router;
- public-skill list normalization and Markdown table presentation;
- a dedicated skill-tip workflow FSM;
- optional `account-created` / `account-reloaded` event classification and correlation;
- command and safety documentation;
- synchronization of the vendored CLI bundle to the verified `@clink-ai/clink-cli` `0.1.4` feature commit `b14c787`.

It does not add skill installation, search, subscriptions, recurring tips, non-USD tips, merchant entitlement confirmation, or a new top-level `clink-cli poll` command.

## Intent Router Contract

Extend `lib/payment-intent-router-fsm.mjs` with:

```text
State                       Route             Action
SKILL_TIP_LIST_SELECTED     SKILL_TIP_LIST    RUN_SKILL_TIP_LIST_WORKFLOW
SKILL_TIP_SELECTED          SKILL_TIP         RUN_SKILL_TIP_WORKFLOW
SKILL_TIP_INPUT_MISSING     INPUT_REQUIRED    ASK_FOR_SKILL_TIP_INPUT
```

The new routes run before UCP checkout and direct-pay selection. The list route has higher priority than the tip route because list questions also contain tip language.

`SKILL_TIP_LIST` recognizes structured `intent=skill_tip_list` and natural-language requests that combine a skill concept, tip concept, and list/query concept. Representative requests include “目前 clink payment skill 支持打赏哪些 skill”, “列出可以打赏的技能”, and “list tippable skills”.

`SKILL_TIP` recognizes structured `intent=skill_tip` or `打赏` / `赞赏` / `tip` language, then separates authorized imperatives from non-authorizing questions. How-to, counterfactual, and advice questions do not authorize a payment. A complete imperative request in the current user turn is explicit payment authorization for that exact target and amount.

The normalized tip input is:

```js
{
  target: { kind: 'identity', publisher, skillName }
    // or { kind: 'number', number }
  amount,
  currency: 'USD',
  explicitlyAuthorized: true,
}
```

Identity targets accept the CLI-compatible `publisher/skill-name` syntax. Number targets must use an unambiguous marker such as `序号 2`, `2号`, `#2`, or `number 2`; a bare number beside `USD` is an amount, not a skill Number. Missing target, missing amount, ambiguous dual targets, invalid/non-positive amounts, and non-USD currencies route to `ASK_FOR_SKILL_TIP_INPUT` without executing a command.

## Skill List Workflow

Execute the environment-locked command:

```bash
clink-cli skills list --all --format json
```

Inspect the exit code before parsing the standard JSON envelope. Require `data` to be an array, preserve each CLI-provided `Number`, and normalize only rows with a positive integer `Number` and nonempty `publisher`, `name`, and `skillId` strings. Return a Markdown table with exactly these columns:

| 序号 | 发布者 | Skill 名称 | skill_id |
| ---: | --- | --- | --- |
| `Number` | `publisher` | `name` | `skillId` |

Escape Markdown table delimiters and line breaks in values. An empty array returns a clear empty-list response rather than an error.

The agent retains the displayed `Number -> publisher/name/skillId` mapping in the current workflow context. Number-based tipping requires such a snapshot. Immediately before a Number tip, refresh `skills list --all` and compare the selected row with the snapshot. If the Number disappeared or its identity changed, stop and ask for fresh authorization. A malformed refresh is an operational error, not a target change. When the row is unchanged, preserve the requested CLI mode and execute `skills tip --number`.

## Skill Tip Workflow FSM

Create `lib/skill-tip-workflow-fsm.mjs` with focused classifiers for prerequisites, list output, tip output, and optional account-event outcomes. Use the marker:

```text
[SKILL_TIP_FSM] state=<STATE> action=<ACTION> reason=<REASON>
```

The principal transitions are:

```text
INPUT_REQUIRED
  -> ASK_FOR_SKILL_TIP_INPUT

NUMBER_REFRESH_REQUIRED
  -> REFRESH_SKILL_LIST
  -> NUMBER_CHANGED -> ASK_FOR_REAUTHORIZATION
  -> EXECUTION_READY

EXECUTION_READY
  -> RUN_SKILL_TIP
     -> authorization_pending -> SEND_PASSKEY_AND_WAIT
     -> three_ds_required     -> SEND_3DS_AND_WAIT_EVENT
     -> payment_failed        -> RETURN_TIP_FAILURE
     -> exit 6 / timeout      -> VERIFY_BEFORE_RETRY
     -> paid / agent pay 1    -> START_OPTIONAL_ACCOUNT_EVENT_WATCH

OPTIONAL_ACCOUNT_EVENT_WATCH
  -> account-created          -> RETURN_TIP_SUCCESS
  -> account-reloaded         -> RETURN_TIP_SUCCESS
  -> both time out            -> RETURN_TIP_SUCCESS_WITHOUT_ACCOUNT_EVENT
  -> poll error               -> RETURN_TIP_SUCCESS_WITH_WARNING
```

The CLI command forms are:

```bash
clink-cli skills tip --publisher <publisher> --name <skill_name> --amount <amount> --format json
clink-cli skills tip --number <number> --amount <amount> --format json
```

Tips always use USD and the refreshed default payment method. Do not pass `--no-watch` during normal execution: the CLI owns Visa/VIC authorization matching, draft creation, Passkey activation watch, verification, and resumption. An `authorization_pending` result is not a payment and must not start account-event polling.

## Payment Success Semantics

`skills tip` delegates to agent pay. A synchronous tip result with `status=paid` and the underlying agent-pay `status=1` is terminal payment success. Do not wait for `agent_order.succeeded` or any merchant account event before classifying the payment as paid.

`payment_failed` is a terminal payment failure. Exit code `6` or a client timeout is an unknown payment state and must never be automatically retried. Exit codes take precedence over result-body status: only exit code `7` (or `three_ds_required` on an otherwise successful result) follows the existing 3DS event flow. Optional account-event monitoring begins only after the 3DS payment is confirmed successful.

## Optional Merchant Account Events

After synchronous payment success, immediately start two bounded typed polls in parallel because CLI `0.1.4` accepts one exact `--type` per command:

```bash
clink-cli events poll --type account-created --max-wait 60 --format json
clink-cli events poll --type account-reloaded --max-wait 60 --format json
```

The event types are mutually exclusive for one tip and use `ANY_OF` semantics. A newly created merchant account emits `account-created`; a pre-existing account may emit `account-reloaded`. Merchants are not required to support either event.

Extend `lib/event-workflow-fsm.mjs` with a `SKILL_TIP_ACCOUNT` domain and terminal classifications for both event types. Carry all known `customerId`, `merchantId`, and `skillId` values into the tip classifier's `expectedResource`. Correlate with the strongest available identifiers, preferring the tip payment `orderId`, then combinations of two stable identifiers when the event omits an order ID. An explicit conflicting event `orderId` must be rejected even when compound fields match. Never treat a type-only match as evidence for the current tip.

When one correlated event arrives, return the corresponding account result and stop the sibling wait. When neither event is observed during the bounded window, or polling fails, keep `paymentStatus=PAID`. Report only that no account event was observed or that optional monitoring failed; do not claim the merchant is unsupported and do not downgrade the payment.

## Output Contract

A successful result exposes payment and optional account evidence separately:

```json
{
  "intent": "SKILL_TIP",
  "target": {
    "publisher": "clinkpay",
    "skillName": "pollyreach"
  },
  "amount": 2,
  "currency": "USD",
  "paymentStatus": "PAID",
  "orderId": "order_xxx",
  "accountEventStatus": "CONFIRMED_CREATED"
}
```

`accountEventStatus` is one of `CONFIRMED_CREATED`, `CONFIRMED_RELOADED`, `NOT_OBSERVED`, `POLL_ERROR`, or `NOT_STARTED`. A no-event user response says the tip payment succeeded and no merchant account event was observed in the listening window.

## Vendored CLI

Replace `vendor/clink-cli/clink-cli.bundle.mjs` with the single-file ESM bundle generated from the clean `clink-cli` feature commit `b14c787`, whose package version is `0.1.4` and which contains the committed `skills list/tip` implementation together with the current UCP baseline. Build from a temporary Git archive so the adjacent CLI working tree is neither switched nor modified. Keep `bin/clink-cli` as the only normal workflow entrypoint and preserve the environment selected at workflow start; the entrypoint is production by default and sandbox/UAT requires `--sandbox` in the locked logical wrapper.

Bundle acceptance checks are:

```bash
node vendor/clink-cli/clink-cli.bundle.mjs --help
node vendor/clink-cli/clink-cli.bundle.mjs skills --help
node vendor/clink-cli/clink-cli.bundle.mjs skills list --help
node vendor/clink-cli/clink-cli.bundle.mjs skills tip --help
bin/clink-cli skills tip --publisher clinkpay --name pollyreach --amount 2 --dry-run --format json
bin/clink-cli skills tip --number 2 --amount 2 --dry-run --format json
```

The dry-run commands must return `status=planned` without network access or payment side effects.

## Documentation

Add `references/clink-skill-tip.md` for the command, parsing, authorization, Number-snapshot, payment-status, and optional-event contract. Update `SKILL.md` routing, action matrix, hard rules, quick reference, and common mistakes. Update both READMEs and bump the skill version from `1.3.0` to `1.4.0`.

## Testing

Add router tests for list precedence, identity targets, Number targets, missing inputs, query-only language, non-USD rejection, and preservation of existing UCP/direct routes. Add a dedicated tip FSM test file for list parsing/formatting, Number drift, synchronous paid semantics, authorization pending, payment failure, 3DS, exit `6`, both optional event types, non-correlated events, optional timeouts, and poll errors.

Extend event tests for the new domain and correlation rules. Add bundle contract tests for root/help discovery and both dry-run target modes. Extend documentation tests to require the reference, marker, commands, synchronous-success rule, and optional-event rule.

## Acceptance Criteria

- Both new intents route ahead of existing payment routes without regressions.
- List output uses the four required columns and the CLI-provided Number.
- Publisher/name and Number tips execute only with complete, explicitly authorized USD input.
- Number drift stops before payment and requires fresh authorization.
- Synchronous agent-pay success is classified as paid immediately.
- Account events are optional, mutually exclusive, correlated enhancements; their absence never downgrades paid.
- Unknown payment state is never retried automatically.
- The vendored bundle exposes `skills list/tip` and both dry-run smoke tests pass.
- Focused and full tests pass.
