# Async Events

Read this before waiting for card binding/change, risk-rule update, refund lifecycle, VIC registration, purchase-instruction activation, post-3DS payment completion, or optional skill-tip merchant account evidence.

## Model

Clink async operations complete through webhook events from the Clink event hub. Completion is not proven by re-running the initiating command or by guessing from time elapsed.

The local config remains a latest wallet state cache and does not persist historical event records. Payment-method events may update the cached payment-method snapshot; `risk_rule.updated` upserts local risk-rule state. Other events are returned to the caller and acknowledged by the event path.

## Built-In Link Watch

When a command prints a URL for user action, the CLI normally keeps running and polls the event queue until the first event batch arrives or the bounded wait expires. This applies to:

- `card binding-link`
- `card setup-link`
- `card modify-link`
- `risk link`
- `instruction create`
- `instruction sign-url`
- `instruction update`
- `instruction cancel`
- `pay` when it returns a 3DS redirect

The first JSON envelope contains the URL or immediate command result. If the watch observes events, the CLI emits a second JSON envelope on stdout with the processed events.

Use `--no-watch` only when you want the URL or cache refresh without waiting. `--dry-run` also skips the watch.

## Start Monitoring At Emit Time

Start the event listener the moment a browser-action URL is emitted, concurrently with sending that URL to the user. Do not wait for the user to report "done" before you begin listening; the completion event can arrive before, during, or after the user's message. Start a non-blocking watch through the available runtime and keep working while it listens, then correlate the event when it arrives.

This applies to every browser-action URL, including hand-built URLs that are not CLI command output. In particular, the **Visa Passkey registration URL** (`https://agent.clinkbill.com/passkey-auth/{paymentInstrumentId}?type=visa`) is not one of the built-in-watch commands above, so it has **no built-in watch**. Cover it with a concurrently-started `events poll` beginning when you send the URL.

Prefer a non-blocking/background watch over a single blocking foreground call. A blocking built-in watch can run longer than a runtime's foreground command limit and be killed before the event arrives. If a watch process exits non-zero from a runtime timeout (for example a killed foreground command), the event may still be pending: resume with a fresh `events poll` and confirm through authoritative status. Never treat a killed watch as a failed operation.

## On-Demand Poll

Use `events poll` when you need to wait for a state change without printing a new link, or when a previous watch timed out:

```bash
clink-cli events poll --type <eventType> --format json
```

Pass the process exit code into `classifyEventPollObservation`. A nonzero CLI exit becomes `EVENT_INVALID` with `SURFACE_EVENT_ERROR`; optional skill-tip aggregation converts that monitoring failure to `POLL_ERROR` without changing `PAID`.

Options:

| Flag | Default | Description |
| --- | --- | --- |
| `--type <eventType>` | none | Return early when an event of this type is present. |
| `--max-wait <seconds>` | 60 | Bounded wait window. |
| `--limit <n>` | 20 | Page size per poll. |
| `--no-ack` | false | Peek without consuming events. |

The result shape is:

```json
{ "ready": true, "timedOut": false, "events": [], "ackedEventIds": [] }
```

Always filter returned events by `type` and `resourceId` to find the specific change you triggered. The `--type` flag controls readiness, not business correctness.

When a flow has more than one valid readiness event, do not gate on a single restrictive `--type`. Poll without `--type` (or poll each valid type in turn) so you cannot miss the alternate event, and re-check authoritative status with a `get`/status command (`card binding-link --no-watch`, `card get`, or `refund get`) rather than trusting one event type. VIC registration readiness is the common case: it can arrive as `vic_device.binding_succeeded` or as a same-card `payment_method.updated` with `visaRegistrationSucceeded=true`.

While a concurrent watch is still running for the same flow, poll with `--no-ack` so a readiness event is not consumed before it can be correlated. Acknowledge only once you own the event and have correlated it to the resource.

## FSM Wait Specs

For code-driven workflows, build an explicit waitSpec before launching the poll. Use `lib/event-workflow-fsm.mjs` `classifyEventWaitRequest` to turn the waitSpec into the next command, and use `classifyEventPollObservation` on the poll result before resuming the business workflow.

Instruction activation waitSpec:

```json
{
  "eventType": "purchase_instruction.activated",
  "expectedResource": {
    "instructionId": "ins_xxx",
    "purchaseInstructionId": "ins_xxx"
  },
  "pollCommand": "clink-cli events poll --type purchase_instruction.activated --no-ack --format json",
  "verifyCommand": "clink-cli instruction get --purchase-instruction-id ins_xxx --format json"
}
```

Start that poll immediately after the Passkey URL is emitted. If the poll returns the right event type for a different `instructionId` or `purchaseInstructionId`, keep waiting or return a resumable pending state; do not resume the payment or checkout.

## Resource Correlation

An event type alone is not proof that the current workflow completed. After any built-in watch or `events poll`, match the returned event to the resource that this workflow is waiting on:

| Flow | Required correlation |
| --- | --- |
| Card binding/update/default change | same customer and, when known, same `paymentInstrumentId` |
| 3DS order result | same `orderId` or `sessionId` returned by the payment attempt |
| UCP checkout payment success | same `checkoutId`, `orderId`, or `sessionId` returned by checkout create/complete |
| Refund result | same `refundOrderId` or `refundId` returned by `refund create` |
| Instruction activation | same `purchaseInstructionId` or `instructionId` returned by `instruction create` / `sign-url` |
| VIC registration | same `paymentInstrumentId` and `visaRegistrationSucceeded=true` evidence |
| Optional skill-tip account event | same `orderId`; when unavailable, require a compound identity with at least two stable fields such as `customerId + merchantId` or `customerId + skillId` |

If the right event type appears for a different resource, keep the current workflow pending or use a status/get command to verify. Do not mark the workflow complete from a type-only match.

## Required Event Checks

| Flow | Event evidence |
| --- | --- |
| First card binding | `payment_method.added` for the target customer/payment method |
| Card update/default change | `payment_method.updated` or `payment_method.default_change` |
| Risk-rule update | `risk_rule.updated` |
| VIC registration | `vic_device.binding_succeeded` or `payment_method.updated` with `visaRegistrationSucceeded=true` for the same payment method |
| Instruction activation | `purchase_instruction.activated` for the instruction |
| 3DS payment result | `agent_order.succeeded` or `agent_order.failed` for the order |
| UCP checkout payment success | `agent_order.succeeded` for the checkout/order; poll with `clink-cli events poll --type agent_order.succeeded --format json` after checkout complete returns `completed` |
| Refund result | `agent_refund.succeeded`, `agent_refund.failed`, or `agent_refund.rejected` for the refund |
| Optional skill-tip account evidence | `account-created` or `account-reloaded` for the correlated tip; these events are mutually exclusive and merchants may emit neither |

## Rules

- Do not fabricate completion.
- Start listening at URL-emit time; do not wait for the user to report completion before you begin.
- Do not busy-retry the initiating link command to check status.
- Do not acknowledge events with `--no-ack` unless you intentionally only want to peek.
- A synchronous successful skill tip is already paid. Missing or failed optional `account-created` / `account-reloaded` monitoring must not downgrade that payment.
- On timeout, return the timeout state and resume command; do not claim success.
- A watch killed by a runtime timeout is not a failure; resume with `events poll` and confirm via authoritative status.
- For refund status, direct `refund get` polling is also acceptable.
