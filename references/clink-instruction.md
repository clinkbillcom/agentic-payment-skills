# Strong-Auth Instruction Flow

Read this before using Visa or Mastercard agentic authorization, or any `clink instruction` command.

## Boundary

Strong-auth authorization prepares permission for a future purchase within mandate limits. It does not prove that a payment has completed.

Use this path only when the refreshed selected payment method has this authoritative capability pair:

```text
strongAuthReady === true
authProtocol === "VISA" || authProtocol === "MASTERCARD"
```

Do not infer this route from card brand, scheme, or legacy network-specific registration fields. Missing, malformed, conflicting, or unsupported capability data fails closed. `strongAuthReady=false` takes the ordinary no-instruction payment branch; a setup flow may offer Passkey registration only when the same card has a supported `authProtocol`.

Generate the protocol-specific Passkey registration URL from the refreshed local card snapshot:

```bash
clink card passkey-link --payment-instrument-id <payment_instrument_id> --no-open --format json
```

The CLI maps `authProtocol=VISA` to `type=visa` and `authProtocol=MASTERCARD` to `type=mastercard`. It refuses a missing, unsupported, or conflicting protocol instead of guessing from card brand. `card passkey-link` has **no built-in watch**.

It is also the page an agent browser can never complete. WebAuthn requires a platform authenticator bound to the user's own device keychain and scoped to the relying-party origin: a headless or embedded browser has none, and a CDP virtual authenticator would forge exactly the proof this page exists to collect. A credential registered in an agent browser profile also does not exist in the user's own browser, so later signing fails there regardless. Hand the URL to the user and let them approve with Face ID, Touch ID, Windows Hello, or a security key; their phone is often the right device. See `references/clink-browser-handoff.md`. The moment you send it, start a concurrent, non-blocking listener; do not wait for the user to report completion first. Readiness normally arrives as a canonical same-card `payment_method.update` carrying `strongAuthReady=true` and the expected `authProtocol`. `vic_device.binding_succeeded` remains a Visa compatibility signal only, and never proves readiness without the authoritative refresh. Use one any-of poll:

```bash
clink events poll --type payment_method.update,vic_device.binding_succeeded --no-ack --max-wait 60 --format json
```

Then confirm authoritatively by refreshing the card list and checking that exact card's `strongAuthReady === true` plus `authProtocol=VISA|MASTERCARD` before proceeding:

```bash
clink card binding-link --no-watch --no-open --format json
```

The agent page environment follows the base URL persisted by `wallet init` (see `references/clink-cli-invocation.md`); run instruction commands without environment flags and do not re-initialize into another environment during the workflow.

## Preparation Steps

1. Refresh cards with `clink card binding-link --no-watch --no-open --format json`.
2. Select the user-specified payment method, otherwise the default card, otherwise the first usable card. Brand is display data, not routing evidence.
3. If a setup flow needs registration and the card has `strongAuthReady=false` plus a supported `authProtocol`, run `card passkey-link`, immediately start the readiness listener, then refresh and confirm the authoritative capability pair before continuing. A normal pay resolver simply bypasses instruction matching while readiness is false.
4. List reusable ACTIVE instructions before creating anything.
5. Reuse an instruction only if card, amount cap, currency, service window, and merchant/category/title/description semantics cover the request. For a scheduled/recurring task, cover the whole schedule horizon instead — see the scheduled-task section below.
6. If no reusable instruction exists, screen the complete purchase context against `references/clink-restricted-categories.md` with `classifyInstructionRestriction`. Refuse a restricted purchase, fix invalid/missing gate input, and create a draft only after the classifier returns `CONTINUE_INSTRUCTION_CREATION`, the mandate scope is complete, and the user has authorized that scope.

## List And Get

List active reusable instructions:

```bash
clink instruction list \
  --valid-only \
  --payment-instrument-id <strong_auth_pi> \
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
  --payment-instrument-id <strong_auth_pi> \
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
  --payment-instrument-id <strong_auth_pi> \
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
- Services, subscriptions, hotels, tickets, bookings, reservations, or digital goods: classify as `NO_SHIPPING_REQUIRED`, do not ask the user for an address, and pass the fixed Apple Park default address to `instruction create`.
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
  --payment-instrument-id <strong_auth_pi> \
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

Run `classifyAuthorizationDraftObservation` on the draft envelope and send the returned `passkeyUrl` immediately; the watch is already listening behind it. When the second envelope arrives, pass it back through the same classifier as `watchStdout`.

The watch runs at most 15 minutes. If it times out, the runtime kills the foreground command, or only an unrelated instruction's event arrives, the classifier answers `VERIFY_AUTHORIZATION_AFTER_WATCH_GAP` — **not** a failure. The user may have completed the Passkey regardless, so ask the instruction itself before concluding anything; restart `events poll` only if it is still pending:

```bash
clink events poll --type purchase_instruction.activated --no-ack --format json
```

Either way the activation must correlate by the same `instructionId` / `purchaseInstructionId`. Then run:

```bash
clink instruction get --purchase-instruction-id <instructionId> --format json
```

Then use `classifyAuthorizationActiveVerification`. The instruction must be `ACTIVE` before it is considered reusable or before a pending pay/UCP checkout flow is resumed. If `instruction get` exits nonzero or returns an explicit error envelope, surface that error and stop. Only a successful `CREATED`, `PENDING`, or `INPROGRESS` response is still activatable and may restart the event poll. `COMPLETED`, `CANCELLED`, `EXPIRED`, `DECLINED`, missing, and unknown statuses are verification errors, not pending states.

## Quick Instruction

Quick instruction setup rides the wallet-init journey instead of the regular create-then-Passkey flow above: the instruction context travels with `clink wallet init`, the backend creates the instruction as `PENDING` when authentication completes, and a fresh Visa or Mastercard strong-auth setup ceremony activates it — one browser journey instead of two.

- Run `classifyInstructionRestriction` over the complete frozen purchase and the nested `instructionContext` before invoking `wallet init`; Quick setup creates an instruction too, so it never bypasses the restricted-category gate.
- A pending quick instruction never satisfies `clink instruction list --valid-only`; only `ACTIVE` does. Never treat a `PENDING` quick instruction as usable authorization.
- Activation is driven solely by that fresh supported strong-auth ceremony. A card without a supported protocol, or a skipped setup, leaves the instruction pending: return to the regular resolver without waiting and let supersede or expiry clean it up.
- A repeated quick `wallet init` carrying new context supersedes the older pending instruction server-side — the newest intent wins.

`payment_method.added` is only card-addition evidence; it is not authoritative strong-auth readiness and CWallet does not attempt Quick activation at that point. After the binding watch delivers it:

1. Extract its exact `paymentInstrumentId`, run `clink card binding-link --no-watch --no-open --format json`, and invoke `classifyQuickInstructionActivationGate` with the recorded nullable `pendingInstructionId`, that exact card ID, and the refreshed `paymentMethodsVoList`. Never fall back to the default or first card.
2. A missing Quick ID, an unsupported capability, or a card still not strong-auth-ready after the one bounded readiness wait returns to `classifyPaymentAuthorizationResolver`; null cannot distinguish a deliberate backend skip from swallowed creation failure and never means “list instructions unconditionally.” Invalid or contradictory capability data fails closed there.
3. For a card with a Quick ID, `strongAuthReady=false`, and `authProtocol=VISA|MASTERCARD`, run the gate's `singleAttempt` same-card any-of poll for `payment_method.update,vic_device.binding_succeeded`. A payment-method update is actionable only when it carries `strongAuthReady=true` with a supported protocol; `vic_device.binding_succeeded` is a Visa compatibility wake-up signal. Event, timeout, wrong-card/non-ready event, empty result, and poll gap all return `VERIFY_RESOURCE_STATUS`, never a resume poll: refresh once, merge `{strongAuthReadinessWaitAttempted:true}` from the returned continuation, and re-enter the gate.
4. Only `strongAuthReady=true`, `authProtocol=VISA|MASTERCARD`, and a non-empty Quick ID may run `clink instruction get --purchase-instruction-id <id> --format json`. Bind verification to both that exact instruction ID and the newly added card ID. `ACTIVE` resumes the frozen purchase; a card/instruction mismatch or a GET/auth failure stops it.
5. `CREATED`, `PENDING`, or `INPROGRESS` may use the returned `singleAttempt` bounded `purchase_instruction.activated` poll. Preserve its `activationWaitAttempted=true` waitSpec through event, timeout, wrong-resource event, empty result, or poll gap, then run one final GET. If it is still non-active, the classifier returns regular `LIST_AUTHORIZATIONS` with no poll command; do not create a parallel watcher or keep polling forever.
