# Async Events

Read this before waiting for card binding/change, risk-rule update, refund lifecycle, VIC registration, purchase-instruction activation, Agent Alipay QR or post-3DS payment completion, optional Agent Pay account confirmation, or optional skill-tip merchant account evidence.

## Model

Clink async operations complete through webhook events from the Clink event hub. Completion is not proven by re-running the initiating command or by guessing from time elapsed.

The local config remains a latest wallet state cache and does not persist historical event records. Payment-method events may update the cached payment-method snapshot; `risk_rule.updated` upserts local risk-rule state. A typed poll returns only selected event types. In ordinary typed polling, every record it reads is processed and non-selected records are acknowledged and skipped; checkout-selector polling follows the stricter rule below.

## Built-In Link Watch

When a command prints a URL for user action, the CLI normally keeps running and polls the event queue until its readiness condition is met or the bounded wait expires. Without `eventType` or `expectedResource`, an unscoped watcher returns after the first non-stale event batch. A targeted watcher normally acknowledges unrelated events and continues polling. Scoped card binding and instruction create/sign-url watches are exceptions: they set `ackUnmatchedEvents=false`, ask Event Hub for the target event type, preserve unmatched records, and acknowledge only a matched event. This applies to:

- `card binding-link`
- `card setup-link`
- `card modify-link`
- `risk link`
- `instruction create`
- `instruction sign-url`
- `instruction update`
- `instruction cancel`
- `pay` when it returns a 3DS redirect

For most commands, the first JSON envelope contains the URL or immediate command result. Watched `card binding-link` is the deliberate exception: it waits for the first successful Event Hub poll, then emits the URL with `watchReady=true`. If a built-in watch observes its matching event, the CLI emits a second JSON envelope on stdout with the processed event.

Agent Alipay QR is another deliberate exception, but it is not a link watch. An explicitly selected Alipay `pay --terminal-qr` renders a UTF-8 QR on stderr and returns a local `QR_CODE_REQUIRED` file action with `mediaType=image/png` as fallback. The Skill must start one explicit `agent_order.succeeded,agent_order.failed` any-of poll immediately after the terminal QR is visible or the fallback image is attached.

`wallet init` is deliberately different. Before OAuth completes, its original process polls the OAuth device-token endpoint; it does not poll the Event Hub and needs no completion event. Consider that poll active only after the current attempt prints the complete `Waiting for authorization...` marker. After OAuth completes, init performs an internal payment-method refresh with watching disabled and may return `data.bindingUrl`; never emit that unprotected init copy. If the refresh proves `paymentMethodCount=0`, start `card binding-link --no-open --format json` without `--no-watch`. The command scopes its watch to `payment_method.added`, waits for its first Event Hub poll to succeed, then emits a sanitized origin-only URL with `data.watchReady=true` and `data.watchEventType=payment_method.added`. You must return that watched URL to the user while the same process remains alive, and keep it running for the matching second envelope; do not stop at OAuth-ready or add an `events poll` beside it. A positive count needs no first-card watch, while a refresh error leaves OAuth ready but card readiness unknown.

Quick instruction setup has three distinct stages. First, the built-in binding watch yields `payment_method.added`; this proves only that the card exists, not that VIC is ready. Extract that event's exact `paymentInstrumentId`, refresh with `clink card binding-link --no-watch --no-open --format json`, and feed the nullable recorded `pendingInstructionId`, exact card ID, and refreshed list through `classifyQuickInstructionActivationGate`. Second, only a Visa card with a Quick ID and `visaRegistrationSucceeded !== true` enters one `singleAttempt` same-card any-of poll for canonical `payment_method.update` (requiring `visaRegistrationSucceeded=true`) or `vic_device.binding_succeeded`; every completed outcome routes to one refresh with the returned `vicReadinessWaitAttempted=true` continuation and never exposes a resume poll. Third, only Visa + VIC-ready + a non-null Quick ID reaches exact-ID `instruction get` and, while still activatable, one `singleAttempt` bounded `purchase_instruction.activated` wait plus final GET. Preserve the returned `activationWaitAttempted=true` waitSpec; final PENDING returns to the regular authorization list with no second Quick poll. A null ID or a non-Visa/non-VIC fallback returns to the regular authorization resolver rather than listing instructions unconditionally. Never start any Quick wait without a fresh binding ceremony: a wallet that was already ready produces no binding-driven activation.

Use `--no-watch` only when you want the URL or cache refresh without waiting. `--dry-run` also skips the watch. `--no-open` is unrelated and does not affect the watch: pass it on all of these commands so the CLI never launches a browser on its own host.

`instruction create` and `instruction sign-url` are no exception: they use their built-in watch too. The draft envelope carries the Passkey URL, and the same process then blocks watching for `purchase_instruction.activated` correlated to that instruction. Send the URL as soon as the first envelope lands — the listener is already running behind it — and do not start an `events poll` alongside, which would put two watchers on one event.

If either command is invoked with `--no-watch` anyway, the CLI prints the handoff on stderr rather than leaving the gap silent:

```
Watch not started (--no-watch). This link needs a listener before the user acts on it.
Run now: clink events poll --type purchase_instruction.activated --no-ack --format json
```

That line means the Passkey URL is about to go out with nothing listening. Run the printed command before sending the URL. The bundled CLI still spells that suggestion with its former name (`clink-cli events poll ...`); run it under this skill's `clink` entrypoint, which is the same binary.

## Start Monitoring At Emit Time

Start the event listener the moment a browser-action URL is emitted, concurrently with sending that URL to the user. Who may open that URL is a separate question with its own contract in `references/clink-browser-handoff.md`: the event is the proof of completion, so never verify a page by loading it from the Agent runtime. Do not wait for the user to report "done" before you begin listening; the completion event can arrive before, during, or after the user's message. Start a non-blocking watch through the available runtime and keep working while it listens, then correlate the event when it arrives.

For Agent Alipay QR, "emit time" means the moment the CLI's terminal QR becomes visible, or the moment the host attaches `customerAction.imagePath` after terminal fallback. This is a QR display action, not a URL handoff. Start the returned order-event poll immediately; do not wait for the user to say they scanned it.

This applies to every browser-action URL, including hand-built URLs that are not CLI command output. In particular, the **Visa Passkey registration URL** (`https://agent.clinkbill.com/passkey-auth/{paymentInstrumentId}?type=visa`) is not one of the built-in-watch commands above, so it has **no built-in watch**. Cover it with a concurrently-started `events poll` beginning when you send the URL.

Prefer a non-blocking/background watch over a single blocking foreground call. A blocking built-in watch can run longer than a runtime's foreground command limit and be killed before the event arrives. If a watch process exits non-zero from a runtime timeout (for example a killed foreground command), the event may still be pending: resume with a fresh `events poll` and confirm through authoritative status. Never treat a killed watch as a failed operation.

## On-Demand Poll

Use `events poll` when you need to wait for a state change without printing a new link, or when a previous watch timed out:

```bash
clink events poll --type <eventType> --format json
```

Pass the process exit code into `classifyEventPollObservation`. A nonzero CLI exit becomes `EVENT_INVALID` with `SURFACE_EVENT_ERROR`; optional Agent Pay and Skill Tip aggregation convert that monitoring failure to `POLL_ERROR` without changing `PAID`.

The CLI refreshes an expiring OAuth token before polling. If an event poll or ACK receives HTTP `401`, it forces one token refresh and retries that request once. Do not add a Skill-side refresh loop. A remaining `401` is an authentication failure; `403` is a permission/scope failure and must not trigger refresh.

Each poll batch is bound to the customer/device/session identity that requested it. Before writing wallet caches or acknowledging records, the CLI reloads the current login and checks every available webhook customer identifier. If the login changed or an event belongs to another customer, it fails the stale operation without caching or acknowledging that batch. Re-run `wallet status` under the same environment lock; do not carry the stale event into a new login or automatically retry a state-changing business action.

Options:

| Flag | Default | Description |
| --- | --- | --- |
| `--type <type[,type...]>` | none | Return when any listed exact type is present; ordinarily process, acknowledge, and skip other types. This draining behavior does not apply with `--checkout-id`. |
| `--max-wait <seconds>` | 60 | Bounded wait window. |
| `--limit <n>` | 20 | Page size per poll. |
| `--no-ack` | false | Keep selected typed events queued. Without `--type`, peek the whole batch without acknowledging it. |
| `--checkout-id <id>` | none | With exactly one supported `agent_order.*` type, select before pagination and preserve every event that is not an exact local checkout match. |

The result shape is:

```json
{ "ready": true, "timedOut": false, "events": [], "ackedEventIds": [] }
```

With `--type`, `events` contains only listed types. In ordinary typed polling, the default mode acknowledges selected and skipped records; typed `--no-ack` acknowledges skipped records and keeps selected records queued. A `--checkout-id` poll is stricter: the CLI sends `eventTypes` plus `selectors.checkoutId` before pagination, locally revalidates nested `data.checkoutId` / `data.checkout_id`, and acknowledges only locally verified exact matches. With both `--checkout-id` and `--no-ack`, it acknowledges nothing. Therefore `ackedEventIds` may contain IDs absent from `events` only outside checkout-selector mode.

Always correlate returned events by the flow-specific identifiers below. Use `resourceId` only where that flow declares it valid; for UCP it is a payment order ID, not the checkout correlation key. Type selection controls queue progress, not business correctness.

When a flow has more than one valid readiness event, use one any-of poll such as `--type type-a,type-b`; never start separate typed polls, because either poll can acknowledge the other type as unrelated. If existing FSMs use one wait spec per type, feed the same any-of result through each wait spec. Re-check authoritative status with a `get`/status command (`card binding-link --no-watch --no-open`, `card get`, or `refund get`) rather than trusting one event type. VIC registration readiness is the common case: it can arrive as `vic_device.binding_succeeded` or as a same-card canonical `payment_method.update` with `visaRegistrationSucceeded=true`; accept `payment_method.updated` only as a compatibility alias.

Do not start an on-demand poll beside a built-in watch for the same flow. Ordinary typed `--no-ack` preserves only selected types and still consumes other types, so it is not a passive observer. Checkout-selector `--no-ack` is the narrow ACK-free exception, but it still must not race the built-in watch for the same workflow.

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
  "pollCommand": "clink events poll --type purchase_instruction.activated --no-ack --format json",
  "verifyCommand": "clink instruction get --purchase-instruction-id ins_xxx --format json"
}
```

Start that poll immediately after the Passkey URL is emitted. If it returns the right type for a different `instructionId` or `purchaseInstructionId`, do not resume the payment or checkout. A type-only `--no-ack` poll cannot skip that same-type wrong-resource record; verify the intended instruction with `instruction get` before deciding whether another event wait is useful.

## Resource Correlation

An event type alone is not proof that the current workflow completed. After any built-in watch or `events poll`, match the returned event to the resource that this workflow is waiting on:

| Flow | Required correlation |
| --- | --- |
| Card binding/update/default change | same customer and, when known, same `paymentInstrumentId` |
| 3DS order result | same `orderId` or `sessionId` returned by the payment attempt |
| Agent Alipay QR order result | same `orderId`, `paymentExecutionDetailId`, or frozen pay `sessionId` returned with the QR attempt |
| UCP checkout payment success | exact non-empty string `checkoutId` carried by the checkout and the event payload's nested `data.checkoutId` / `data.checkout_id`. Event top-level fields and `resourceId` are never checkout correlation keys. Event `orderId`/`resourceId` is the Clink Payment `paymentOrderId`, not the UCP order ID, and cannot substitute for checkout correlation or order lookup. |
| Refund result | same `refundOrderId` or `refundId` returned by `refund create` |
| Instruction activation | same `purchaseInstructionId` or `instructionId` returned by `instruction create` / `sign-url` |
| VIC registration | same `paymentInstrumentId` and `visaRegistrationSucceeded=true` evidence |
| Optional Agent Pay account event | one unique candidate among active watches in the same environment and wallet/customer scope within 60 seconds: matching `amount + currency`, no explicit `customerEmail` / `webSite` / `userId` conflict, and optional identities used only as a unique positive tie-breaker |
| Optional skill-tip account event | same `orderId`; when unavailable, require a compound identity with at least two stable fields such as `customerId + merchantId` or `customerId + skillId` |

If the right event type appears for a different resource, keep the current workflow pending or use a status/get command to verify. Do not mark the workflow complete from a type-only match.

## Required Event Checks

| Flow | Event evidence |
| --- | --- |
| First card binding | `payment_method.added` for the target customer/payment method |
| Card update/default change | `payment_method.update` (`payment_method.updated` compatibility alias) or `payment_method.default_change` |
| Risk-rule update | `risk_rule.updated` |
| VIC registration | `vic_device.binding_succeeded` or canonical `payment_method.update` with `visaRegistrationSucceeded=true` for the same payment method |
| Instruction activation | `purchase_instruction.activated` for the instruction |
| 3DS payment result | `agent_order.succeeded` or `agent_order.failed` for the order |
| Agent Alipay QR result | one any-of poll for `agent_order.succeeded,agent_order.failed`, correlated by `orderId`, `paymentExecutionDetailId`, or frozen session |
| UCP checkout payment success | `agent_order.succeeded` with exact matching `checkoutId`; poll with `clink events poll --type agent_order.succeeded --checkout-id <checkoutId> --max-wait 900 --format json` after checkout complete returns `completed` |
| Refund result | `agent_refund.succeeded`, `agent_refund.failed`, or `agent_refund.rejected` for the refund |
| Optional Agent Pay account evidence | CLI filters `account-created` or `account-reloaded`; body types `account.created` or `account.reloaded`; the two are mutually exclusive and merchants may emit neither |
| Optional skill-tip account evidence | `account-created` or `account-reloaded` for the correlated tip; these events are mutually exclusive and merchants may emit neither |

## Rules

- Do not fabricate completion.
- Do not cache, acknowledge, or correlate an event after the CLI reports a changed login or customer mismatch; preserve the newer wallet and re-observe status first.
- Start listening at URL-emit time; do not wait for the user to report completion before you begin.
- Do not busy-retry the initiating link command to check status.
- Agent Alipay QR timeout, expiry, failure, success, and poll error are terminal for that attempt. Never rerun `pay`; recursively remove the CLI-owned `customerAction.cleanupPath` instead of returning a resume command.
- A QR `expiresAt` value is epoch seconds. Prefer `expiresSecond` for the wait and cap it at 900 seconds; never parse the epoch with `Date.parse`.
- `[redacted:png-data-url]` and `[redacted:qr-code-content]` are safe markers, not QR payloads. Display only the CLI-emitted UTF-8 QR or the private `imagePath` fallback, never Agent Browser, Base64, or raw QR content.
- Remember that typed `--no-ack` still acknowledges types outside its selected set; only an untyped `--no-ack` poll is a full peek.
- A synchronous successful skill tip is already paid. Missing or failed optional `account-created` / `account-reloaded` monitoring must not downgrade that payment.
- A synchronous successful Agent Pay is already `PAID`. Run one `account-created,account-reloaded` any-of poll immediately, then classify the same result for both wait specs with `classifyAgentPayAccountEventCandidate`; only a unique candidate may produce an account/order-confirmation claim.
- For Agent Pay, timeout, poll error, and `AMBIGUOUS` attribution all preserve `PAID`; do not retry payment or claim merchant-order confirmation. Amount/currency are mandatory correlation fields, while `customerEmail`, `webSite`, and `userId` are optional conflict checks and tie-breakers.
- For UCP, keep `paymentOrderId` from `agent_order.succeeded.data.orderId/resourceId` separate from `ucpOrderId` from checkout create/update/complete/get `data.ucp.ucp_order_id` (or matching completed-checkout `data.order.id`). Prefixes may look identical. Only `ucpOrderId` may be passed to `ucp-order get`.
- Use `--checkout-id <checkoutId>` for the UCP success poll so filtering happens before ACK. Same-type events for other checkouts remain queued; never use a generic type-only UCP success poll.
- After a correlated UCP success event, a missing `ucpOrderId` is resolved by bounded, read-only `ucp-checkout get` against the original endpoint. Do not poll the acknowledged event again, retry complete/payment, or downgrade confirmed payment when order projection/fetch is unavailable.
- On timeout, return the timeout state and resume command; do not claim success.
- A watch killed by a runtime timeout is not a failure; resume with `events poll` and confirm via authoritative status.
- For refund status, direct `refund get` polling is also acceptable.
