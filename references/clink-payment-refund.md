# Payment And Refund

Read this before executing `clink-cli pay`, handling 3DS, or creating/checking refunds.

## Preconditions

- Wallet is initialized with credentials matching the selected environment.
- The environment persisted by `wallet init` is reused unchanged for the whole workflow, with no environment flags on later commands.
- At least one current payment method is available. Refresh with `card binding-link --no-watch` before relying on cached methods.
- Payment parameters come from the user or an upstream merchant workflow.
- The payment is explicitly authorized for this request.
- Fulfillment is classified before old pay: `PHYSICAL_GOODS_REQUIRES_SHIPPING`, `NO_SHIPPING_REQUIRED`, or `UNKNOWN`.
- Before direct or session payment, run the authorization resolver. `instruction_id` and `mandate_id` are mandatory only when the selected/default card is Visa + VIC ready and a matching ACTIVE instruction+mandate is found.

## Payment Modes

Direct mode:

```bash
clink-cli pay \
  --merchant-id <id> \
  --amount <amount> \
  --currency <currency> \
  --format json
```

Session mode:

```bash
clink-cli pay --session-id <id> --format json
```

Common options:

- `--payment-instrument-id <id>` to select a specific method
- `--payment-method-type <type>`, default `CARD`
- `--instruction-id <id>` and `--mandate-id <id>` for VIC-routed charge context; `--purchase-instruction-id <id>` remains only a backward-compatible alias for `--instruction-id` and must not conflict with `--instruction-id`
- `--shipping-address '<json>'` for old pay context; use the UCP Postal Address shape (`street_address`, `address_locality`, `address_region`, `address_country`, `postal_code`, optional `extended_address`, `first_name`, `last_name`, `phone_number`)
- `--products '<json-array>'` for product-level VIC credential context; each item uses `productId`, `productName`, optional `productUrl`, `quantity`, `unitPrice` as a major-unit decimal, `currencyCode`, and optional `extra`
- Old agent pay must send `aiAgentInstructionBo.merchantInfo.merchantCategoryCode` fixed to `5999`; do not ask the user or merchant skill for this value.
- Environment targeting comes from the locked logical `clink-cli` wrapper, not from changing flags between commands.

## Fulfillment Shipping Gate Before Old Pay

Before old `clink-cli pay`, classify the actual product/order:

- `NO_SHIPPING_REQUIRED`: recharge, credits, top-up, virtual goods, services, subscriptions, hotels, tickets, bookings, and reservations. Do not ask the user for an address. Always pass this fixed default US shipping address as a no-shipping payment-context placeholder:

```json
{
  "street_address": "One Apple Park Way",
  "address_locality": "Cupertino",
  "address_region": "CA",
  "address_country": "US",
  "postal_code": "95014",
  "first_name": "Clink",
  "last_name": "User",
  "phone_number": "+14089961010"
}
```

- `PHYSICAL_GOODS_REQUIRES_SHIPPING`: shipped physical goods. Ask the user for a real standard US shipping address before pay. Required fields are `street_address`, `address_locality`, `address_region`, `address_country`, and `postal_code`. `address_country` must be ISO 3166-1 alpha-2 `US`; `address_region` must be a USPS state abbreviation such as `CA`; `postal_code` must be US ZIP or ZIP+4.
- `UNKNOWN`: ask whether the product ships as physical goods or is no-shipping-required. Do not run `clink-cli pay`, instruction list, or instruction creation while fulfillment is unknown.

The fixed default address is not a delivery address and must not be used for shipped physical goods.

## Direct/Session Pay Authorization Resolver

Before any direct/session `clink-cli pay`, refresh payment methods and resolve the selected/default `payment_instrument_id`:

```bash
clink-cli card binding-link --no-watch --format json
```

Then classify the refreshed card state with `lib/authorization-workflow-fsm.mjs` `classifyPaymentAuthorizationResolver`.

Resolver branches:

- `AUTHORIZATION_BYPASSED`: the selected/default card is non-Visa, or it is Visa but VIC is not enabled. In this branch, bypass instruction matching and run `clink-cli pay` without `--instruction-id` or `--mandate-id`.
- `AUTHORIZATION_LIST_REQUIRED`: the selected/default card is Visa + VIC ready. List ACTIVE instructions before pay.
- `AUTHORIZATION_MATCHED`: pass the matched `instruction_id` and `mandate_id` to `clink-cli pay`.
- `AUTHORIZATION_DRAFT_REQUIRED`: no matching instruction+mandate exists after listing, or the selected authorization is incomplete. Start the instruction creation workflow and stop the current pay attempt until activation.

For the Visa + VIC ready branch, run:

```bash
clink-cli instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json
```

Filter defensively for ACTIVE instructions on the same payment instrument and ACTIVE/non-reserved mandates. Select a matching instruction+mandate using:

- description semantic match across instruction/mandate `title`, `description`, merchant name, merchant URL/domain, category, and product text
- amount hard match: same currency, and the payment amount must be covered by the mandate amount limit; use exact amount when the mandate or product scope is exact
- current/default `payment_instrument_id`

If a matching instruction+mandate is found, pass both IDs to pay:

```bash
clink-cli pay \
  --session-id <session_id> \
  --payment-instrument-id <payment_instrument_id> \
  --instruction-id <instruction_id> \
  --mandate-id <mandate_id> \
  --shipping-address '{"street_address":"123 Market St","address_locality":"San Francisco","address_region":"CA","address_country":"US","postal_code":"94105","first_name":"Buyer","last_name":"Example","phone_number":"+14155550100"}' \
  --products '[{"productId":"sku_1","productName":"Demo","quantity":1,"unitPrice":12.99,"currencyCode":"USD"}]' \
  --format json
```

If no matching instruction+mandate exists, start the instruction creation workflow with the same mandate scope (`clink-cli instruction create`, then the Passkey authorization URL / activation wait) and stop. Run `classifyAuthorizationDraftObservation` on the create/sign-url draft envelope and send the Passkey URL at once; that command's own built-in watch is the listener, so do not start a separate `events poll`. Feed its second envelope back through the same classifier as `watchStdout`. For `NO_SHIPPING_REQUIRED`, the instruction create command must pass the fixed Apple Park default address in CWallet instruction shape; for shipped physical goods, pass the real collected address. Persist or return the pending payment intent:

```text
Payment Intent ID: payint_xxx
Instruction ID: ins_xxx
Next command after activation: resume_pending_payment_intent {"paymentIntentId":"payint_xxx"}
```

When `purchase_instruction.activated` is observed, use `classifyEventPollObservation` to resume only the pending payment intent whose stored draftInstructionId / draft instruction matches the activated instruction. A different activation on the same card must not resume this payment intent; paymentInstrumentId-only matching is only a legacy fallback for pending intents that did not store a draft instruction. After a correlated activation, run `clink-cli instruction get --purchase-instruction-id <instruction_id> --format json` and `classifyAuthorizationActiveVerification`; the resume path must re-run `clink-cli instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json`, re-match the ACTIVE instruction+mandate, and then call pay. Do not let the merchant skill manually call `clink-cli pay`, invent `instruction_id`/`mandate_id`, or branch into its own payment FSM after user authorization.

Never invent amount, currency, merchant ID, session ID, order ID, payment method, mandate scope, `instruction_id`, or `mandate_id`.

## Payment Result Handling

Exit 0:

- `data.status === 1`: payment succeeded. Save `data.orderId` when present, return `paymentStatus=PAID` immediately, and start the optional account-event flow below.
- `data.status === 3`: card declined. Offer `card setup-link` and ask before retry.
- `data.status === 4`: risk rule blocked. Show `risk get`, generate `risk link`, ask before retry.
- `data.status === 6`: other failure. Show the API message.

Exit 7:

- Payment requires 3DS.
- Extract `data.channelPaymentResponse.action.redirectUrl`.
- Send the redirect URL to the user.
- Wait for `agent_order.succeeded` or `agent_order.failed` for the order before declaring success or failure.

Exit 3 or 4:

- Wallet/config/auth problem. Stop the payment attempt, start the wallet initialization or configuration workflow yourself, and collect only the missing user input or credential source. Do not run `wallet init` as a hidden recovery inside the payment attempt.

Exit 6:

- The payment state is unknown. Do not retry until merchant-side status, operator checks, or an idempotency guarantee says retry is safe.

Exit 5:

- API error. Show `error.message`.

### Optional Account Confirmation After Agent Pay Success

Agent Pay `status=1` is synchronous payment success. Do not wait for a merchant account event before returning `PAID`. Immediately start one bounded any-of poll under the same environment lock used by `pay`:

```bash
clink-cli events poll --type account-created,account-reloaded --max-wait 60 --format json
```

The CLI filter uses `account-created` and `account-reloaded`; event bodies may contain `account.created` and `account.reloaded`. Treat each pair as the same semantic type. The events are mutually exclusive for one payment, and a merchant may emit neither.

Build one wait spec per account type with `purpose=AGENT_PAY_ACCOUNT`, but execute the any-of command only once. Pass the same poll result, the current payment watch, and all active watches in the same environment/wallet scope through `classifyEventPollObservation` for each wait spec; it invokes `classifyAgentPayAccountEventCandidate`. Then pass both classified observations to `classifyPaymentAccountEventObservation`.

Every watch must have a stable `accountWatchId`. Reuse the upstream payment identity when one exists; when `paymentId` is absent, the Payment FSM generates a local UUID `accountWatchId`. Preserve that identifier in the active-watch snapshot and both wait specs so serialization does not duplicate the current payment or collapse two distinct payments.

Because the event has no `orderId/sessionId`, attribute it only to a unique candidate:

1. Keep active watches from the same environment and wallet/customer scope within the 60-second window.
2. Require matching `amount` and case-normalized `currency`.
3. Reject a candidate when both sides provide and disagree on `customerEmail`, `webSite`, or `userId`.
4. When multiple candidates remain, use matching optional identity fields only if they produce one unique positive highest score.
5. If multiple candidates still remain, return `AMBIGUOUS`; never choose the first event or payment.

A uniquely attributed `account.created` returns `CONFIRMED_CREATED`. For a Chinese user, say:

```text
账户创建和商户订单确认成功
```

A uniquely attributed `account.reloaded` returns `CONFIRMED_RELOADED`. For a Chinese user, say:

```text
商户订单确认成功
```

Use the equivalent message in the user's language. Then show only core values actually present in `event.data`:

```json
{
  "customerEmail": "customer@example.com",
  "webSite": "https://example.com",
  "userId": "usr_xxxxx",
  "amount": 19.99,
  "currency": "USD"
}
```

Do not invent missing fields or copy fallback values from the payment context into the event output. Do not expose any other event-body field as core information.

Account monitoring outcomes remain separate from payment outcome:

- `CONFIRMED_CREATED` or `CONFIRMED_RELOADED`: show the matching confirmation and core information.
- `NOT_OBSERVED`: the any-of poll settled without a uniquely attributed event; keep `PAID`.
- `POLL_ERROR`: polling failed or both mutually exclusive event types appeared; keep `PAID` with a warning.
- `AMBIGUOUS`: more than one active payment remains a valid candidate; keep `PAID` and do not claim merchant-order confirmation.
- `PENDING`: only one poll has settled; keep waiting for the sibling optional poll.

Missing merchant support, timeout, poll error, and ambiguity never trigger payment retry and never downgrade the synchronous Agent Pay success.

## Refund Create

Refunds require an explicit refund request and the original `orderId`.

```bash
clink-cli refund create --order-id <order_id> --format json
```

On success, extract `refundOrderId` or `refundId` from the response. A successful submission is not a final result.

## Refund Completion

Event-driven option:

```bash
clink-cli events poll --type agent_refund.succeeded,agent_refund.failed,agent_refund.rejected --format json
```

Correlate the returned terminal event to the target refund before classifying success, failure, or rejection.

Direct status option:

```bash
clink-cli refund get --refund-id <refund_id> --format json
```

Terminal states:

- `success`
- `failed`
- `review_rejected`

Non-terminal states include `pending_review` and `refunding`.

Do not tell the user a refund completed until an event or `refund get` proves a terminal result.
