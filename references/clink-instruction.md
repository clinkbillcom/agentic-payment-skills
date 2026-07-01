# VIC Instruction Flow

Read this before using Visa agentic authorization or any `clink-cli instruction` command.

## Boundary

VIC authorization prepares permission for a future purchase within mandate limits. It does not prove that a payment has completed.

Use this path only for a Visa card whose refreshed payment-method data has:

```text
visaRegistrationSucceeded === true
```

If the selected Visa card is not registered, send the Passkey registration URL and wait for the readiness event:

```text
https://agent.clinkbill.com/passkey-auth/{paymentInstrumentId}?type=visa
```

The agent page environment (sandbox or production) follows the `clink-cli` prefix defined for the workflow (see `references/clink-cli-invocation.md`); no per-command flag is needed here.

## Preparation Steps

1. Refresh cards with `clink-cli card binding-link --no-watch --format json`.
2. Select the user-specified Visa card, otherwise the default card, otherwise the first usable Visa card.
3. If registration is missing, send the registration URL and wait for `vic_device.binding_succeeded` or a same-card `payment_method.updated` event showing readiness.
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
  --format json
```

Returns `data.instructionId` and `data.passkeyUrl`. Send `data.passkeyUrl` to the user. The page performs signing after the user opens it.

Optional flags:

- `--description <text>`
- `--extra <json>`
- `--is-recurring` only when the user clearly authorizes recurring/periodic use
- `--shipping-address '<json>'` only for shipped physical goods

Do not pass `--currency`, `--total-limit-amount`, or `--country-code` at the instruction level. Currency and amount limits live on each mandate.

Do not pass `clientReferenceId`, `channelTokenId`, or `consumerId`; the server derives them.

## Fulfillment

Classify the purchase before creating a draft:

- Physical goods that ship: collect a US shipping address and pass `--shipping-address`.
- Services, subscriptions, hotels, tickets, bookings, reservations, or digital goods: do not pass `--shipping-address`.
- Unclear fulfillment: ask the user before preparing.

Shipping address shape:

```json
{
  "addressId": "addr_001",
  "name": "Jim",
  "line1": "123 Market St",
  "line2": "Apt 201",
  "city": "San Francisco",
  "state": "CA",
  "zip": "94105",
  "countryCode": "US",
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

After `create`, `sign-url`, `update`, or `cancel`, wait for the matching instruction event through the built-in watch or:

```bash
clink-cli events poll --type purchase_instruction.activated --format json
```

The instruction must be ACTIVE before it is considered reusable.
