# Payment And Refund

Read this before executing `clink pay`, handling 3DS, or creating/checking refunds.

Enter payment execution only after `references/clink-payment-intent-contract.md` returns `walletGate=REQUIRE_STATUS`. Its v2 `payment.mode` is authoritative: `DIRECT` and `SESSION` are mutually exclusive, and raw text or ambient fields cannot choose either mode.

## Preconditions

- Wallet is initialized with credentials matching the selected environment.
- The environment persisted by `wallet init` is reused unchanged for the whole workflow, with no environment flags on later commands.
- At least one current payment method is available. Refresh with `card binding-link --no-watch --no-open` before relying on cached methods.
- Payment parameters come from the user or an upstream merchant workflow.
- The payment is explicitly authorized for this request.
- Fulfillment is classified before old pay: `PHYSICAL_GOODS_REQUIRES_SHIPPING`, `NO_SHIPPING_REQUIRED`, or `UNKNOWN`.
- Before direct or session payment, run the authorization resolver. `instruction_id` and `mandate_id` are mandatory only when the selected/default card is Visa + VIC ready and a matching ACTIVE instruction+mandate is found.

## Payment Modes

Direct mode:

```bash
clink pay \
  --merchant-id <id> \
  --amount <amount> \
  --currency <currency> \
  --format json
```

Session mode:

```bash
clink pay --session-id <id> --format json
```

The v2 router requires `payment.mode=DIRECT` with merchant/amount/currency or `payment.mode=SESSION` with session ID. Never combine the CLI execution fields from both modes. Direct amount is a positive canonical decimal string and currency is canonicalized to three uppercase letters before this workflow starts.

Common options:

- `--payment-instrument-id <id>` to select a specific method
- `--payment-method-type <type>`, default `CARD`
- `--terminal-qr` for an explicitly selected `ALIPAY` payment; it renders a UTF-8 QR on stderr while stdout remains one JSON envelope
- `--instruction-id <id>` and `--mandate-id <id>` for VIC-routed charge context; `--purchase-instruction-id <id>` remains only a backward-compatible alias for `--instruction-id` and must not conflict with `--instruction-id`
- `--shipping-address '<json>'` for old pay context; use the UCP Postal Address shape (`street_address`, `address_locality`, `address_region`, `address_country`, `postal_code`, optional `extended_address`, `first_name`, `last_name`, `phone_number`)
- `--products '<json-array>'` for product-level VIC credential context; each item uses `productId`, `productName`, optional `productUrl`, `quantity`, `unitPrice` as a major-unit decimal, `currencyCode`, and optional `extra`
- Old agent pay must send `aiAgentInstructionBo.merchantInfo.merchantCategoryCode` fixed to `5999`; do not ask the user or merchant skill for this value.
- Environment targeting comes from the locked logical `clink` wrapper, not from changing flags between commands.

## Fulfillment Shipping Gate Before Old Pay

Before old `clink pay`, classify the actual product/order:

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
- `UNKNOWN`: ask whether the product ships as physical goods or is no-shipping-required. Do not run `clink pay`, instruction list, or instruction creation while fulfillment is unknown.

The fixed default address is not a delivery address and must not be used for shipped physical goods.

## Direct/Session Pay Authorization Resolver

Before any direct/session `clink pay`, refresh payment methods and resolve the selected/default `payment_instrument_id`:

```bash
clink card binding-link --no-watch --no-open --format json
```

Then classify the refreshed card state with `lib/authorization-workflow-fsm.mjs` `classifyPaymentAuthorizationResolver`.

Resolver branches:

- `AUTHORIZATION_BYPASSED`: the selected/default card is non-Visa, or it is Visa but VIC is not enabled. In this branch, bypass instruction matching and run `clink pay` without `--instruction-id` or `--mandate-id`.
- `AUTHORIZATION_LIST_REQUIRED`: the selected/default card is Visa + VIC ready. List ACTIVE instructions before pay.
- `AUTHORIZATION_MATCHED`: pass the matched `instruction_id` and `mandate_id` to `clink pay`.
- `AUTHORIZATION_DRAFT_REQUIRED`: no matching instruction+mandate exists after listing, or the selected authorization is incomplete. Run the restricted-category gate described below; only a clean result may start the instruction creation workflow. Stop the current pay attempt until activation.

For the Visa + VIC ready branch, run:

```bash
clink instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json
```

Filter defensively for ACTIVE instructions on the same payment instrument and ACTIVE/non-reserved mandates. Select a matching instruction+mandate using:

- description semantic match across instruction/mandate `title`, `description`, merchant name, merchant URL/domain, category, and product text
- amount hard match: same currency, and the payment amount must be covered by the mandate amount limit; use exact amount when the mandate or product scope is exact
- current/default `payment_instrument_id`

If a matching instruction+mandate is found, pass both IDs to pay:

```bash
clink pay \
  --session-id <session_id> \
  --payment-instrument-id <payment_instrument_id> \
  --instruction-id <instruction_id> \
  --mandate-id <mandate_id> \
  --shipping-address '{"street_address":"123 Market St","address_locality":"San Francisco","address_region":"CA","address_country":"US","postal_code":"94105","first_name":"Buyer","last_name":"Example","phone_number":"+14155550100"}' \
  --products '[{"productId":"sku_1","productName":"Demo","quantity":1,"unitPrice":12.99,"currencyCode":"USD"}]' \
  --format json
```

If no matching instruction+mandate exists, read `references/clink-restricted-categories.md` and run `classifyInstructionRestriction` from `lib/restricted-categories.mjs` over the complete purchase context. `REFUSE_RESTRICTED_INSTRUCTION` ends this payment intent without creating a draft; `FIX_RESTRICTION_INPUT` requires correcting or completing the context before retrying the gate. Only `CONTINUE_INSTRUCTION_CREATION` may start the instruction creation workflow with the same mandate scope (`clink instruction create`, then the Passkey authorization URL / activation wait) and stop. Run `classifyAuthorizationDraftObservation` on the create/sign-url draft envelope and send the Passkey URL at once; that command's own built-in watch is the listener, so do not start a separate `events poll`. Feed its second envelope back through the same classifier as `watchStdout`. For `NO_SHIPPING_REQUIRED`, the instruction create command must pass the fixed Apple Park default address in CWallet instruction shape; for shipped physical goods, pass the real collected address. Persist or return the pending payment intent:

```text
Payment Intent ID: payint_xxx
Instruction ID: ins_xxx
Next command after activation: resume_pending_payment_intent {"paymentIntentId":"payint_xxx"}
```

When `purchase_instruction.activated` is observed, use `classifyEventPollObservation` to resume only the pending payment intent whose stored draftInstructionId / draft instruction matches the activated instruction. A different activation on the same card must not resume this payment intent; paymentInstrumentId-only matching is only a legacy fallback for pending intents that did not store a draft instruction. After a correlated activation, run `clink instruction get --purchase-instruction-id <instruction_id> --format json` and `classifyAuthorizationActiveVerification`; the resume path must re-run `clink instruction list --valid-only --payment-instrument-id <payment_instrument_id> --format json`, re-match the ACTIVE instruction+mandate, and then call pay. Do not let the merchant skill manually call `clink pay`, invent `instruction_id`/`mandate_id`, or branch into its own payment FSM after user authorization.

Never invent amount, currency, merchant ID, session ID, order ID, payment method, mandate scope, `instruction_id`, or `mandate_id`.

## Payment Result Handling

Exit 0:

- `data.status === 1`: payment succeeded. Save `data.orderId` when present, return `paymentStatus=PAID` immediately, and start the optional account-event flow below.
- `data.channelPaymentResponse.status === 5` plus `data.customerAction.type === "QR_CODE_REQUIRED"`: surface the CLI-generated terminal QR, or use the private PNG fallback, and enter the Agent Alipay QR flow below.
- `data.status === 3`: card declined. Offer `card setup-link --no-open` and ask before retry.
- `data.status === 4`: risk rule blocked. Show `risk get`, generate `risk link --no-open`, ask before retry.
- `data.status === 6`: other failure. Show the API message.

Exit 7:

- Payment requires 3DS.
- Extract `data.channelPaymentResponse.action.redirectUrl`.
- Send the redirect URL to the user, exactly once, for their own browser.
- Wait for `agent_order.succeeded` or `agent_order.failed` for the order before declaring success or failure.

The challenge page is `USER_DEVICE_ONLY`. The issuer ACS fingerprints the device and scores automation, and the one-time code reaches the user's phone, not the agent — so an agent browser is soft-declined or stepped up rather than helped. Do not open, navigate, preview, screenshot, or fill it from the Agent runtime by any channel, and do not re-send the URL as a nudge: it is a single-load page. Completion is proven only by the order event. See `references/clink-browser-handoff.md`.

Exit 3 or 4:

- Wallet/config/auth problem. Stop the payment attempt, start the wallet initialization or configuration workflow yourself, and collect only the missing user input or credential source. Do not run `wallet init` as a hidden recovery inside the payment attempt.

Exit 6:

- The payment state is unknown. Do not retry until merchant-side status, operator checks, or an idempotency guarantee says retry is safe.

Exit 5:

- Ordinary API error: show `error.message`.
- `error.type=payment_state_unknown`: the charge was already submitted but the QR could not be
  materialized locally. Return `PAY_UNKNOWN / VERIFY_BEFORE_RETRY`, preserve safe
  `error.details.orderId` and `error.details.paymentExecutionDetailId`, keep
  `retryAllowed=false`, and verify the existing payment before any resubmission.

### Agent Alipay QR Customer Action

For an explicitly selected Alipay payment, invoke:

```bash
clink pay \
  ... \
  --payment-method-type ALIPAY \
  --terminal-qr \
  --format json
```

Do not inject a default Card `--payment-instrument-id`. With `--terminal-qr`, the CLI writes a UTF-8 QR to stderr and keeps stdout as one JSON envelope. Preserve the rendered block characters, line breaks, and spaces exactly. In Codex, repeat only those QR lines inside a fenced `text` block because the command transcript is collapsed/hidden from the user. Do not print or expose the underlying `qrCodeContent`.

The CLI also converts the channel's PNG Data URL into a private local file before stdout is produced. This file is the fallback when the runtime cannot preserve terminal formatting or the CLI prints:

```text
Warning: terminal QR could not be displayed; use customerAction.imagePath instead.
```

The Skill must consume the fixed customer action rather than the redacted channel field:

```json
{
  "type": "QR_CODE_REQUIRED",
  "imagePath": "/tmp/clink-cli-payment-qr-.../payment-qr.png",
  "mediaType": "image/png",
  "temporary": true,
  "cleanupRequired": true,
  "orderId": "order_xxx",
  "paymentExecutionDetailId": "ped_xxx",
  "expiresAt": 1800000000,
  "expiresSecond": 120,
  "cleanupPath": "/tmp/clink-cli-payment-qr-..."
}
```

`orderId`, `paymentExecutionDetailId`, `expiresAt`, and `expiresSecond` are nullable. `expiresAt` is numeric epoch seconds, never an ISO string. Prefer a positive `expiresSecond` for the event wait; otherwise derive the remaining seconds from `expiresAt`. Cap either result at 900 seconds. A zero duration or elapsed epoch is already expired.

`imageUrlPng` in the sanitized channel payload is normally `[redacted:png-data-url]`. That marker is expected and must not be treated as a leaked image. If an actual `data:image/png...` string reaches stdout, fail closed without printing or decoding it.

On `SHOW_QR_AND_WAIT_EVENT`:

1. When stderr contains QR block characters and no warning, extract only the contiguous QR lines and repeat them exactly in a user-visible fenced `text` block. A collapsed tool transcript does not count, and concern about chat alignment is not a reason to switch to PNG. If and only if the CLI printed the warning above or produced no block characters, attach `customerAction.imagePath` through the host's native image or file-attachment capability. Do not generate another QR, expose `qrCodeContent`, or open the PNG with Agent Browser, browser MCP, computer-use, a webview, or generated HTML.
2. Immediately run the one any-of poll returned by the FSM:

   ```bash
   clink events poll --type agent_order.succeeded,agent_order.failed --max-wait <seconds> --format json
   ```

3. Pass the poll output to `classifyPaymentQrEventObservation`. Correlate the event with `orderId`, `paymentExecutionDetailId`, or the frozen pay session. A type-only event for another payment stays non-terminal.
4. A correlated `agent_order.succeeded` returns `PAID`; a correlated `agent_order.failed` returns `FAILED`. Timeout, QR expiry, and poll errors return terminal `UNKNOWN`.
5. Never automatically rerun `clink pay` for any QR terminal result.
6. After any terminal result, recursively remove `customerAction.cleanupPath` with force semantics. Delete the directory, not only `imagePath`.

For a real UAT Agent QR E2E, verify that the terminal displays a scannable character QR without exposing the raw content. If terminal rendering is unavailable, verify that the host visibly attaches the PNG fallback. In either case, one correlated order event ends the wait, no browser page is opened, the payment command is not resubmitted, and the cleanup directory no longer exists after the terminal result.

### Optional Account Confirmation After Agent Pay Success

Agent Pay `status=1` is synchronous payment success. Do not wait for a merchant account event before returning `PAID`. Immediately start one bounded any-of poll under the same environment lock used by `pay`:

```bash
clink events poll --type account-created,account-reloaded --max-wait 60 --format json
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
clink refund create --order-id <order_id> --format json
```

On success, extract `refundOrderId` or `refundId` from the response. A successful submission is not a final result.

If `refund create` exits 6 or times out, submission state is unknown. Never resubmit automatically. Only when a trusted source provides the exact `refundId` / `refundOrderId` may you verify with `refund get` or an event carrying that same ID. Otherwise, do not consume or accept a type-only refund event as evidence for this attempt; use the original `orderId` for an operator/merchant-side authoritative lookup before deciding whether any new create is safe.

## Refund Completion

Event-driven option:

```bash
clink events poll --type agent_refund.succeeded,agent_refund.failed,agent_refund.rejected --format json
```

Correlate the returned terminal event to the target refund before classifying success, failure, or rejection.

Direct status option:

```bash
clink refund get --refund-id <refund_id> --format json
```

Terminal states:

- `success`
- `failed`
- `review_rejected`

Non-terminal states include `pending_review` and `refunding`.

Do not tell the user a refund completed until an event or `refund get` proves a terminal result.
