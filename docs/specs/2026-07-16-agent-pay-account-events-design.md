# Agent Pay Optional Account Event Design

## Goal

After a synchronous Agent Pay success, listen for the merchant's optional account event and, when it can be attributed to the current payment without ambiguity, tell the user that the account/order confirmation succeeded and show the event's core data.

The two supported outcomes are:

- `account.created`: tell the user “账户创建和商户订单确认成功”.
- `account.reloaded`: tell the user “商户订单确认成功”.

Agent Pay `status=1` remains definitive payment-success evidence. Optional event monitoring must never delay or downgrade that payment result.

## Scope

This design covers only the post-success behavior of direct/session Agent Pay:

- launching the two bounded account-event polls;
- accepting both CLI filter names and event-body type names;
- preventing an event from being attributed when multiple recent payments remain valid candidates;
- returning a stable account-event result and user-facing confirmation;
- documenting and testing timeout, polling-error, conflict, and ambiguity behavior.

This design does not change Skill Tip, UCP completion, 3DS order events, wallet configuration, environment selection, the CLI wrapper, or the vendored CLI bundle.

## Selected Approach

Use unique-candidate attribution.

The account event body has no `orderId` or `sessionId`, so type-only attribution can cross orders. Conversely, requiring `customerEmail` or `webSite` as a hard prerequisite can discard valid merchant events when the current payment context does not expose those fields. The selected compromise is:

1. Find recent, active Agent Pay watches in the same environment and wallet/customer scope.
2. Filter them by the event's `amount` and `currency`.
3. Use `customerEmail`, `webSite`, and `userId` as optional conflict checks and deterministic tie-breakers whenever both the payment context and event contain them.
4. Attribute the event only when exactly one candidate remains.
5. If multiple candidates remain, keep payment success but return `AMBIGUOUS`; do not claim merchant-order confirmation.

This removes mandatory email/site matching while preventing known same-window collisions from being presented as confirmed. It cannot provide a cross-process mathematical guarantee until the event contract carries an order/payment identifier; adding such an identifier remains the preferred future server-side improvement.

## Payment Success Transition

When `clink-cli pay` exits successfully and its Agent Pay response has `status=1`, the payment FSM returns:

- `paymentStatus=PAID`;
- `paymentTerminal=true`;
- `accountEventStatus=PENDING`;
- action `START_OPTIONAL_ACCOUNT_EVENT_WATCH`;
- two poll commands:

```bash
clink-cli events poll --type account-created --max-wait 60 --format json
clink-cli events poll --type account-reloaded --max-wait 60 --format json
```

The two polls start immediately and in parallel under the same environment lock used by `pay`. They have ANY-OF semantics because a merchant emits at most one of the two events for a payment. A merchant may emit neither event.

The payment result is available immediately. The overall workflow remains open only for optional enrichment.

## Watch Context

Each successful Agent Pay creates a bounded watch context containing available values only:

```json
{
  "paymentId": "local-or-upstream-payment-identity",
  "environment": "locked-environment-identity",
  "walletId": "wallet-or-customer-identity",
  "startedAtMs": 0,
  "amount": 19.99,
  "currency": "USD",
  "customerEmail": "customer@example.com",
  "webSite": "https://example.com",
  "userId": "usr_xxxxx"
}
```

`paymentId`, `customerEmail`, `webSite`, and `userId` may be absent. `amount` and `currency` come from the authorized payment context, not from newly invented values. The caller supplies all active watch contexts for the same environment and wallet/customer scope when classifying a candidate event. Watches expire after the 60-second monitoring window.

Independent runtimes cannot share an in-memory active-watch set. If concurrent Agent Pays can run across processes, the orchestrator must provide a shared pending-watch snapshot or accept that only a future event `orderId/paymentId` can fully solve cross-process attribution.

## Event Type Normalization

CLI polling continues to use the hyphenated filter names:

- `account-created`
- `account-reloaded`

Event classification accepts and canonicalizes both representations:

| CLI/event alias | Canonical body type |
| --- | --- |
| `account-created` | `account.created` |
| `account.created` | `account.created` |
| `account-reloaded` | `account.reloaded` |
| `account.reloaded` | `account.reloaded` |

The returned event body retains its original `type`; normalization is used only for routing and comparison.

## Unique-Candidate Attribution

For an observed account event:

1. Limit pending candidates to the same environment and wallet/customer scope and the active 60-second window.
2. Require amount equality after decimal normalization and currency equality after case normalization.
3. For each of `customerEmail`, `webSite`, and `userId`:
   - if either side lacks the field, do not reject the candidate;
   - if both sides contain the field and they conflict, reject the candidate;
   - each matching value adds one identity-match point to that candidate.
4. If exactly one candidate remains, the event is correlated to that payment.
5. If multiple candidates remain and exactly one has the highest positive identity-match score, correlate the event to that candidate.
6. If no candidate remains, return `NOT_CORRELATED` and do not claim confirmation.
7. If multiple candidates remain with no unique positive highest score, return `AMBIGUOUS` for all affected watches and do not claim confirmation.

An explicit mismatch never falls back to type-only matching. A previously consumed event ID must not be processed twice when the CLI envelope provides an event identifier.

## Account Event Aggregation

The payment FSM aggregates the two optional polls as follows:

| Observation | Account event status | Payment status | User-facing behavior |
| --- | --- | --- | --- |
| One uniquely correlated `account.created` | `CONFIRMED_CREATED` | `PAID` | Show account creation and merchant-order confirmation |
| One uniquely correlated `account.reloaded` | `CONFIRMED_RELOADED` | `PAID` | Show merchant-order confirmation |
| One poll settled and the sibling is still running | `PENDING` | `PAID` | Keep waiting for optional evidence |
| Both polls time out or observe no event | `NOT_OBSERVED` | `PAID` | Return payment success without an account claim |
| Polling fails | `POLL_ERROR` | `PAID` | Return payment success with an optional-monitoring warning |
| Candidate cannot be uniquely selected | `AMBIGUOUS` | `PAID` | Return payment success with an attribution warning |
| Both mutually exclusive event types correlate | `POLL_ERROR` | `PAID` | Return payment success with an inconsistency warning |

Once one event is uniquely correlated, stop or ignore the sibling poll. No optional result may change `paymentStatus=PAID`.

## User-Facing Result

For `account.created`, emit the localized equivalent of:

```text
账户创建和商户订单确认成功
```

For `account.reloaded`, emit the localized equivalent of:

```text
商户订单确认成功
```

Then show only values actually present in `event.data`, using these five fields:

```json
{
  "customerEmail": "customer@example.com",
  "webSite": "https://example.com",
  "userId": "usr_xxxxx",
  "amount": 19.99,
  "currency": "USD"
}
```

Do not synthesize missing fields, rewrite values, expose secrets, or claim merchant fulfillment beyond the explicit account/order-confirmation event. The structured FSM result contains:

- `messageKey` for localization;
- `accountEventStatus`;
- canonical `eventType`;
- `coreInfo` with the five allowlisted fields that were present;
- the original correlated event for the caller when needed.

## FSM and Component Changes

### `lib/payment-workflow-fsm.mjs`

- Change synchronous `status=1` from immediate workflow termination to `START_OPTIONAL_ACCOUNT_EVENT_WATCH` while preserving `paymentTerminal=true`.
- Return the two poll commands and the current payment watch context.
- Add an Agent Pay account-event aggregator with confirmed, waiting, not-observed, ambiguous, and poll-error outcomes.
- Add core-info extraction and stable message keys.

### `lib/event-workflow-fsm.mjs`

- Canonicalize dot and hyphen account event types.
- Add an Agent Pay account-event domain/purpose without changing the existing Skill Tip account-event contract.
- Add pure unique-candidate correlation based on active watch contexts.

### Skill documentation

Update `SKILL.md`, `references/clink-payment-refund.md`, and `references/clink-async-events.md` so Agent Pay synchronous success starts the optional dual poll and so callers distinguish payment success from account-event confirmation.

## Error Handling

- Invalid/malformed event bodies are `NOT_CORRELATED`, not success.
- Missing amount or currency prevents unique-candidate attribution because those are the minimum common payment/event fields.
- Explicit amount, currency, email, site, or user mismatch rejects that candidate.
- Timeout and CLI poll errors never trigger a payment retry.
- `AMBIGUOUS` never selects the first event or the earliest payment arbitrarily.
- 3DS, exit-code 6 unknown state, and synchronous payment failure keep their existing behavior and do not start account-event monitoring.

## Testing

Add focused tests proving:

1. `status=1` remains `PAID` and returns both poll commands.
2. Non-success, unknown, and 3DS outcomes do not start account polling.
3. Both hyphen and dot account event types canonicalize correctly.
4. A unique amount/currency candidate correlates without requiring email/site/userId.
5. Explicit optional-identity conflicts reject a candidate.
6. Optional identity selects one candidate from otherwise colliding amount/currency candidates.
7. Same-scope, same-amount/currency candidates with no discriminator return `AMBIGUOUS`.
8. Different environment, wallet/customer scope, or expired watches are excluded.
9. `account.created` returns `CONFIRMED_CREATED`, the correct message key, and the five allowlisted core fields.
10. `account.reloaded` returns `CONFIRMED_RELOADED` and the correct message key.
11. Missing core fields are omitted rather than invented.
12. One settled poll waits for its sibling; two timeouts return `NOT_OBSERVED`.
13. Poll errors and mutually exclusive double matches preserve `PAID` with a warning.
14. Existing Skill Tip, Agent Pay failure/3DS, event, documentation, and full test suites continue to pass.

## Acceptance Criteria

- Every synchronous Agent Pay `status=1` starts both optional 60-second account-event polls immediately.
- Payment success is returned independently of optional account evidence.
- The event classifier accepts both CLI hyphen names and body dot names.
- No event is claimed when multiple active payments remain valid candidates.
- `account.created` produces “账户创建和商户订单确认成功”; `account.reloaded` produces “商户订单确认成功”.
- The response exposes only the five requested core fields and only when present.
- Timeout, absent merchant support, poll errors, conflicts, and ambiguity do not downgrade or retry the successful payment.
- No unrelated workflow, wrapper, environment behavior, or vendored CLI bundle changes.
