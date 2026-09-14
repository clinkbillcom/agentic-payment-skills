# VIC Instruction Flow

Read this before using Visa agentic authorization or any `clink instruction` command.

## Boundary

VIC authorization prepares permission for a future purchase within mandate limits. It does not prove that a payment has completed.

List and reuse ordinary Visa Instructions only for a card whose refreshed payment-method data has:

```text
visaRegistrationSucceeded === true
```

For an authorized purchase with no card or a selected Visa card that is not registered, do not send or open a standalone VIC registration page. Enter the [No-Card PENDING Continuation](#no-card-pending-continuation); Agent Portal owns card binding and VIC while the same `instruction prepare` process waits.

The standalone registration URL below is compatibility information for an explicit card-enrollment maintenance request, not the normal purchase continuation:

```text
https://agent.clinkbill.com/passkey-auth/{paymentInstrumentId}?type=visa
```

This URL is hand-built, not CLI command output, so it has **no built-in watch**.

It is also the page an agent browser can never complete. WebAuthn requires a platform authenticator bound to the user's own device keychain and scoped to the relying-party origin: a headless or embedded browser has none, and a CDP virtual authenticator would forge exactly the proof this page exists to collect. A credential registered in an agent browser profile also does not exist in the user's own browser, so later signing fails there regardless. Hand the URL to the user and let them approve with Face ID, Touch ID, Windows Hello, or a security key; their phone is often the right device. See `references/clink-browser-handoff.md`. The moment you send it, start a concurrent, non-blocking listener; do not wait for the user to report completion first. Registration readiness arrives as either the canonical same-card `payment_method.update` with `visaRegistrationSucceeded=true` or `vic_device.binding_succeeded` (`payment_method.updated` is a compatibility alias), so use one any-of poll:

```bash
clink events poll --type payment_method.update,vic_device.binding_succeeded --no-ack --max-wait 60 --format json
```

Then confirm authoritatively by refreshing the card list and checking the exact card's `visaRegistrationSucceeded === true` before proceeding:

```bash
clink card binding-link --no-watch --no-open --format json
```

The agent page environment follows the base URL persisted by `wallet init` (see `references/clink-cli-invocation.md`); run instruction commands without environment flags and do not re-initialize into another environment during the workflow.

## Preparation Steps

1. Refresh cards with `clink card binding-link --no-watch --no-open --format json`.
2. Select the user-specified Visa card, otherwise the default card, otherwise the first usable Visa card.
3. If the selected Visa is missing registration during a purchase, enter the no-card PENDING continuation. Do not send the standalone registration URL or start a separate VIC listener.
4. List reusable ACTIVE instructions before creating anything.
5. Reuse an instruction only if card, amount cap, currency, service window, and merchant/category/title/description semantics cover the request. For a scheduled/recurring task, cover the whole schedule horizon instead — see the scheduled-task section below.
6. If no reusable instruction exists, screen the complete purchase context against `references/clink-restricted-categories.md` with `classifyInstructionRestriction`. Refuse a restricted purchase, fix invalid/missing gate input, and create a draft only after the classifier returns `CONTINUE_INSTRUCTION_CREATION`, the mandate scope is complete, and the user has authorized that scope.

## List And Get

List active reusable instructions:

```bash
clink instruction list \
  --valid-only \
  --payment-instrument-id <visa_pi> \
  --format json
```

`--valid-only` requests `ACTIVE` instructions and drops reserved mandates **only for one-time instructions**. Recurring instructions keep their mandates regardless of `reserveStatus`, because a recurring mandate is reusable by design. Do not apply a reservation filter of your own to a recurring instruction: it would discard the exact mandate a scheduled task depends on and produce a false no-match.

Get one instruction:

```bash
clink instruction get \
  --purchase-instruction-id <instructionId> \
  --format json
```

## Create

`instruction create` may run only after `classifyInstructionRestriction` from `lib/restricted-categories.mjs` answered `CONTINUE_INSTRUCTION_CREATION` for this exact purchase context. `REFUSE_RESTRICTED_INSTRUCTION` ends the intent; `FIX_RESTRICTION_INPUT` requires correcting or completing the context and running the gate again. See `references/clink-restricted-categories.md`.

The CLI and backend use UTC datetime strings in `yyyy-MM-dd HH:mm:ss` format for `--effective-until-time` and each mandate `effectiveUntilTime`. Do not send numeric epoch values.

Every mandate `description` must be 150 characters or fewer. Rewrite longer
authorization wording before presenting it to the user and before creating the
draft; never silently truncate reviewed authorization scope. The CLI rejects a
longer description before sending the request.

Example:

```bash
clink instruction create \
  --payment-instrument-id <visa_pi> \
  --title "Hotel booking" \
  --effective-until-time "2026-06-30 23:59:59" \
  --mandates '[{"title":"Hotel","description":"Hotel booking","amountLimit":1000.00,"currencyCode":"USD","merchantCategoryCode":"7011","effectiveUntilTime":"2026-06-30 23:59:59"}]' \
  --shipping-address '{"name":"Clink User","line1":"One Apple Park Way","city":"Cupertino","state":"CA","zip":"95014","countryCode":"US","deliveryContactDetails":{}}' \
  --no-open \
  --format json
```

Returns `data.instructionId` and `data.passkeyUrl`. Send `data.passkeyUrl` to the user. The page performs signing after the user opens it.

Optional flags:

- `--description <text>`
- `--extra <json>`
- `--is-recurring` only when the user clearly authorizes recurring/periodic use
- `--shipping-address '<json>'` for shipped physical goods, or the fixed Apple Park default address for `NO_SHIPPING_REQUIRED`

Do not pass `--currency`, `--total-limit-amount`, or `--country-code` at the instruction level. Currency and amount limits live on each mandate.

Do not pass `clientReferenceId`, `channelTokenId`, or `consumerId`; the server derives them.

## Recurring Versus One-Time Limits

The two instruction types spend their `amountLimit` differently, and the difference decides whether a repeating task survives:

- **Recurring** (`--is-recurring`): the mandate limit resets to its full value at the start of every cycle, so the instruction can keep authorizing purchases indefinitely. Every mandate must carry `recurringFrequency`, and the backend accepts only `WEEKLY`, `MONTHLY`, and `YEARLY`. **There is no `DAILY` frequency.**
- **One-time** (default): the mandate limit is consumed as purchases draw it down, and the instruction stops authorizing once it is exhausted.

Because a daily task cannot be expressed as a `DAILY` cycle, fold its per-run cap into the `WEEKLY` cycle budget: `perRunCap x 7`. The per-run ceiling itself is carried in the mandate `description`, not by a separate backend field.

## Scheduled-Task Pre-Authorization

A recurring purchase task ("每天中午 11 点买一份不超过 40 元的猪脚饭") executes when the user is absent. Passkey signing requires the user, so authorization cannot be collected at execution time. Create and activate the instruction **before** the schedule is created:

```text
collect schedule scope (cadence, per-run cap, currency, total budget, end time, merchant semantics, fulfillment)
  -> classifyScheduledAuthorizationScope        pick type and compute amountLimit
  -> classifyScheduledAuthorizationReuse        reuse only if it covers the WHOLE schedule
  -> classifyInstructionRestriction             if no reusable authorization, screen before a draft
  -> instruction create (+ Passkey) if no full-horizon match
  -> verify ACTIVE with classifyAuthorizationActiveVerification
  -> PIN_SCHEDULED_AUTHORIZATION: freeze instructionId + mandateId into the schedule
  -> only now create the scheduled task
```

### Choosing the type

Use `classifyScheduledAuthorizationScope` from `lib/authorization-workflow-fsm.mjs`:

| User input | Type | `amountLimit` |
|---|---|---|
| An explicit total budget ("总共不超过 500 元") | one-time | the stated total budget |
| Per-cycle framing by week/month/year | recurring with that `recurringFrequency` | per-run cap x runs per cycle |
| Daily task, no total budget | recurring `WEEKLY` | per-run cap x 7 |
| Missing cadence, per-run cap, or currency | — | stop and ask; never invent a limit |

A stated total budget is the user asking for a lifetime ceiling, which only a one-time instruction enforces. Everything else stays recurring so the schedule does not die when the limit runs out. Before creating a one-time instruction, compute the projected spend (`per-run cap x projected run count`) and compare it against the budget; when the classifier returns `total_budget_below_projected_spend`, tell the user how many runs the budget covers (`exhaustsAfterRuns`) before creating anything.

### Reuse must cover the whole schedule

Reuse is evaluated against the entire schedule horizon, never against the next single purchase. Reusing an instruction that only covers the next run is what forces re-authorization mid-schedule, at the exact moment nobody is present to give one. `classifyScheduledAuthorizationReuse` applies the mechanical gates; the caller must assert merchant/title/description coverage explicitly via `merchantScopeCovered: true`, because that judgment is not mechanical.

Every dimension must be covered or the answer is create-new:

| Dimension | Reuse condition |
|---|---|
| `status` | `ACTIVE` |
| `paymentInstrumentId` | identical |
| currency | identical |
| type and cycle | recurring scope needs a recurring candidate with the same `recurringFrequency`; one-time scope rejects a recurring candidate, which cannot enforce a lifetime ceiling |
| `amountLimit` | at least the computed schedule need |
| `effectiveUntilTime` | at or beyond the schedule end |
| merchant semantics | `merchantScopeCovered: true` asserted by the caller |

An open-ended schedule reusing a bounded instruction returns the `authorization_expiry_bounds_open_ended_schedule` warning. Reuse is still correct, but say when the schedule will need a fresh instruction rather than letting it fail silently on that date.

### Example: a daily lunch order capped at 40 CNY per run

```bash
clink instruction create \
  --payment-instrument-id <visa_pi> \
  --title "Daily lunch order" \
  --is-recurring \
  --mandates '[{"title":"Lunch set","description":"Daily 11:00 lunch order, at most 40 CNY per order","amountLimit":280.00,"currencyCode":"CNY","merchantCategoryCode":"5812","recurringFrequency":"WEEKLY"}]' \
  --shipping-address '<real delivery address>' \
  --no-open \
  --format json
```

State the per-run ceiling in the mandate `description`. The weekly `amountLimit` is the cycle budget, not the per-order cap, and only the description carries the per-order limit the scheduled run must respect.

### Executing a scheduled run

A scheduled run matches by the pinned `instructionId` + `mandateId` frozen at setup. It does not re-run `instruction list` and does not semantically re-match, so a run cannot drift onto another mandate that merely happens to fit:

```bash
clink instruction get --purchase-instruction-id <pinned_instruction_id> --format json
```

Pass the result to `classifyUnattendedAuthorization` with the pinned ids and the expected `paymentInstrumentId`. Anything other than an `ACTIVE` instruction carrying the pinned mandate on the same card returns `SURFACE_UNATTENDED_AUTHORIZATION_GAP`: stop this run, report the reason, and ask the user to authorize a new instruction. Never fall back to creating a draft or to picking another mandate during an unattended run.

## Fulfillment

Classify the purchase before creating a draft:

- Physical goods that ship: collect a standard complete shipping address and pass `--shipping-address`.
- Services, subscriptions, hotels, tickets, bookings, reservations, or digital goods: classify as `NO_SHIPPING_REQUIRED`, do not ask the user for an address, and pass the fixed Apple Park default address to `instruction prepare` or `instruction create`.
- Unclear fulfillment: ask the user before preparing.

For `NO_SHIPPING_REQUIRED`, use this fixed Apple Park default address. It is a payment-context placeholder, not a delivery address:

```json
{
  "name": "Clink User",
  "line1": "One Apple Park Way",
  "city": "Cupertino",
  "state": "CA",
  "zip": "95014",
  "countryCode": "US",
  "deliveryContactDetails": {}
}
```

For shipped physical goods, collect a real standard complete address in this shape. `state` holds the region/province/administrative area, `zip` holds the postal code, and `countryCode` must be ISO 3166-1 alpha-2 for the destination country:

```json
{
  "addressId": "addr_001",
  "name": "Jim",
  "line1": "10 Downing Street",
  "city": "London",
  "state": "England",
  "zip": "SW1A 2AA",
  "countryCode": "GB",
  "deliveryContactDetails": {}
}
```

## Sign, Update, Cancel

Print the Passkey URL for an existing draft:

```bash
clink instruction sign-url \
  --payment-instrument-id <visa_pi> \
  --purchase-instruction-id <instructionId> \
  --no-open \
  --format json
```

Update or cancel flows print the agent page URL for page-driven completion:

```bash
clink instruction update --no-open --format json
clink instruction cancel --no-open --format json
```

Both print an agent page URL the user completes; they change what may be spent later, so they are `USER_DEVICE_ONLY` too.

Never fabricate hidden Passkey payloads such as `authResult`, `appInstance`, `fidoBlob`, or `dfpSessionId`, and never satisfy the page with a CDP virtual authenticator. A forged signature is worse than a stalled authorization.

## Activation

`create` and `sign-url` use their built-in watch. Omit `--no-watch` and keep that same process alive: the CLI prints the draft envelope, then blocks polling `purchase_instruction.activated` filtered to this instruction's `instructionId` / `purchaseInstructionId`, and prints a second envelope when the event arrives. Do not start an `events poll` beside it — two watchers compete for the same event and ack it out from under each other.

Run `classifyAuthorizationDraftObservation` on the first ordinary create/sign envelope. A VIC-ready card returns the `passkeyUrl` branch, and that same CLI process is already listening. Missing-card and incomplete-Visa flows use the separate `instruction prepare` contract below.

The watch runs at most 15 minutes. If it times out, the runtime kills the foreground command, or only an unrelated instruction's event arrives, the classifier answers `VERIFY_AUTHORIZATION_AFTER_WATCH_GAP` — **not** a failure. The user may have completed the Passkey regardless, so ask the instruction itself before concluding anything; restart `events poll` only if it is still pending:

```bash
clink events poll --type purchase_instruction.activated --no-ack --format json
```

Either way the activation must correlate by the same `instructionId` / `purchaseInstructionId`. Then run:

```bash
clink instruction get --purchase-instruction-id <instructionId> --format json
```

Then use `classifyAuthorizationActiveVerification`. The instruction must be `ACTIVE` before it is considered reusable or before a pending pay/UCP checkout flow is resumed. If `instruction get` exits nonzero or returns an explicit error envelope, surface that error and stop. Only a successful `CREATED`, `PENDING`, or `INPROGRESS` response is still activatable. `COMPLETED`, `CANCELLED`, `EXPIRED`, `DECLINED`, missing, and unknown statuses are verification errors, not pending states.

## No-Card PENDING Continuation

When the authoritative payment-method refresh is empty, or the selected Visa is not VIC-ready, do not open a standalone Bind Card or VIC page. After restricted-category screening, run:

```bash
clink instruction prepare \
  --title <title> \
  --mandates '<mandates_json>' \
  [--description <text>] \
  [--shipping-address <json_object>] \
  [--effective-until-time <utc>] \
  [--is-recurring] \
  --max-wait 900 \
  --format json
```

Do not pass `--payment-instrument-id`, `--open`, or `--no-watch`. The CLI and CWallet combine the earlier Quick mechanism with ordinary preparation:

- Create or reuse exactly one no-card `PENDING` Instruction for the frozen title, mandates, amount/currency, merchant semantics, service window, and fulfillment context.
- Before waiting, return a structured `PENDING` envelope with non-empty `instructionId`, trusted Agent Portal `bindingUrl`, `watchReady=true`, `watchEventType=purchase_instruction.activated`, `processRunning=true`, and `terminal=false`.
- Keep that `instruction prepare` process in the foreground after the first envelope is emitted. The user may open the link or finish card/VIC setup in an Agent Portal page they already have open; the URL is not required to carry the Instruction ID.
- CWallet attaches the card and activates the same Instruction only after Visa/VIC completion. `payment_method.added`, page completion text, or an activation event for another Instruction is insufficient.
- The final CLI envelope must preserve the same `instructionId`, report `command=instruction prepare`, `status=ready`, `instructionStatus=ACTIVE`, and carry a non-empty `instruction.paymentInstrumentId`.

`classifyAuthorizationPrepareObservation` returns `HANDOFF_BIND_CARD_URL_AND_AWAIT_CLI` only after the exact watch-ready fields are present. Send `bindingUrl` once without auto-opening, prefetching, or inspecting it, then keep reading the same process. Do not start `card binding-link`, a standalone VIC registration flow, `events poll`, `instruction create`, another `instruction prepare`, Checkout, or payment beside it.

If the process times out or exits without its authoritative final envelope, run only:

```bash
clink instruction get --purchase-instruction-id <same_pending_instruction_id> --format json
```

Use the exact `resumeCommand` returned by `instruction prepare`; it must be an environment-locked same-ID `instruction get` with `resumeReadOnly=true`. If the external process dies before the final envelope, use only an exact-ID read-only `instruction get`. Never prepare, recreate, or supersede the Instruction, resend Checkout/payment, or restart a Skill-side binding/VIC event sequence. A still-`PENDING` result remains pending and does not authorize payment.
