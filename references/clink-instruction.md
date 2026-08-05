# VIC Instruction Flow

Read this before using Visa agentic authorization or any `clink-cli instruction` command.

## Boundary

VIC authorization prepares permission for a future purchase within mandate limits. It does not prove that a payment has completed.

Use this path only for a Visa card whose refreshed payment-method data has:

```text
visaRegistrationSucceeded === true
```

If the selected Visa card is not registered, send the Passkey registration URL:

```text
https://agent.clinkbill.com/passkey-auth/{paymentInstrumentId}?type=visa
```

This URL is hand-built, not CLI command output, so it has **no built-in watch**. The moment you send it, start a concurrent, non-blocking listener; do not wait for the user to report completion first. Registration readiness arrives as either `vic_device.binding_succeeded` or a same-card `payment_method.updated` with `visaRegistrationSucceeded=true`, so use one any-of poll:

```bash
clink-cli events poll --type vic_device.binding_succeeded,payment_method.updated --no-ack --max-wait 60 --format json
```

Then confirm authoritatively by refreshing the card and checking `visaRegistrationSucceeded === true` before proceeding:

```bash
clink-cli card get --payment-instrument-id <visa_pi> --format json
```

The agent page environment follows the base URL persisted by `wallet init` (see `references/clink-cli-invocation.md`); run instruction commands without environment flags and do not re-initialize into another environment during the workflow.

## Preparation Steps

1. Refresh cards with `clink-cli card binding-link --no-watch --format json`.
2. Select the user-specified Visa card, otherwise the default card, otherwise the first usable Visa card.
3. If registration is missing, send the registration URL and immediately start a concurrent listener for `vic_device.binding_succeeded` or a same-card `payment_method.updated` showing readiness, then confirm `visaRegistrationSucceeded === true` with `card get` before continuing.
4. List reusable ACTIVE instructions before creating anything.
5. Reuse an instruction only if card, amount cap, currency, service window, and merchant/category/title/description semantics cover the request.
6. If no reusable instruction exists, create a draft only after the mandate scope is complete and the user has authorized that scope.

## List And Get

List active reusable instructions:

```bash
clink-cli instruction list \
  --valid-only \
  --payment-instrument-id <visa_pi> \
  --format json
```

Get one instruction:

```bash
clink-cli instruction get \
  --purchase-instruction-id <instructionId> \
  --format json
```

## Create

The CLI and backend use UTC datetime strings in `yyyy-MM-dd HH:mm:ss` format for `--effective-until-time` and each mandate `effectiveUntilTime`. Do not send numeric epoch values.

Example:

```bash
clink-cli instruction create \
  --payment-instrument-id <visa_pi> \
  --title "Hotel booking" \
  --effective-until-time "2026-06-30 23:59:59" \
  --mandates '[{"title":"Hotel","description":"Hotel booking","amountLimit":1000.00,"currencyCode":"USD","merchantCategoryCode":"7011","effectiveUntilTime":"2026-06-30 23:59:59"}]' \
  --shipping-address '{"name":"Clink User","line1":"One Apple Park Way","city":"Cupertino","state":"CA","zip":"95014","countryCode":"US","deliveryContactDetails":{}}' \
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
clink-cli instruction sign-url \
  --payment-instrument-id <visa_pi> \
  --purchase-instruction-id <instructionId> \
  --format json
```

Update or cancel flows print the agent page URL for page-driven completion:

```bash
clink-cli instruction update --format json
clink-cli instruction cancel --format json
```

Never fabricate hidden Passkey payloads such as `authResult`, `appInstance`, `fidoBlob`, or `dfpSessionId`.

## Activation

`create` and `sign-url` use their built-in watch. Omit `--no-watch` and keep that same process alive: the CLI prints the draft envelope, then blocks polling `purchase_instruction.activated` filtered to this instruction's `instructionId` / `purchaseInstructionId`, and prints a second envelope when the event arrives. Do not start an `events poll` beside it — two watchers compete for the same event and ack it out from under each other.

Run `classifyAuthorizationDraftObservation` on the draft envelope and send the returned `passkeyUrl` immediately; the watch is already listening behind it. When the second envelope arrives, pass it back through the same classifier as `watchStdout`.

The watch runs at most 15 minutes. If it times out, the runtime kills the foreground command, or only an unrelated instruction's event arrives, the classifier answers `VERIFY_AUTHORIZATION_AFTER_WATCH_GAP` — **not** a failure. The user may have completed the Passkey regardless, so ask the instruction itself before concluding anything; restart `events poll` only if it is still pending:

```bash
clink-cli events poll --type purchase_instruction.activated --no-ack --format json
```

Either way the activation must correlate by the same `instructionId` / `purchaseInstructionId`. Then run:

```bash
clink-cli instruction get --purchase-instruction-id <instructionId> --format json
```

Then use `classifyAuthorizationActiveVerification`. The instruction must be `ACTIVE` before it is considered reusable or before a pending pay/UCP checkout flow is resumed. If `instruction get` exits nonzero or returns an explicit error envelope, surface that error and stop. Only a successful `CREATED`, `PENDING`, or `INPROGRESS` response is still activatable and may restart the event poll. `COMPLETED`, `CANCELLED`, `EXPIRED`, `DECLINED`, missing, and unknown statuses are verification errors, not pending states.
