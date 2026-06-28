# Payment And Refund

Read this before executing `clink-cli pay`, handling 3DS, or creating/checking refunds.

## Preconditions

- Wallet is initialized in the intended profile.
- Sandbox operations use `--sandbox --profile sandbox` and sandbox credentials.
- At least one current payment method is available. Refresh with `card binding-link --no-watch` before relying on cached methods.
- Payment parameters come from the user or an upstream merchant workflow.
- The payment is explicitly authorized for this request.

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

Optional:

- `--payment-instrument-id <id>` to select a specific method
- `--payment-method-type <type>`, default `CARD`
- `--purchase-instruction-id <id>` only when backend support for that payment contract is confirmed by the caller
- `--sandbox --profile sandbox` for sandbox

Never invent amount, currency, merchant ID, session ID, order ID, or payment method.

## Payment Result Handling

Exit 0:

- `data.status === 1`: payment succeeded. Save `data.orderId`.
- `data.status === 3`: card declined. Offer `card setup-link` and ask before retry.
- `data.status === 4`: risk rule blocked. Show `risk get`, generate `risk link`, ask before retry.
- `data.status === 6`: other failure. Show the API message.

Exit 7:

- Payment requires 3DS.
- Extract `data.channelPaymentResponse.action.redirectUrl`.
- Send the redirect URL to the user.
- Wait for `agent_order.succeeded` or `agent_order.failed` for the order before declaring success or failure.

Exit 3 or 4:

- Wallet/config/auth problem. Ask the user to run wallet setup or fix credentials; do not run `wallet init` automatically during payment.

Exit 6:

- The payment state is unknown. Do not retry until merchant-side status, operator checks, or an idempotency guarantee says retry is safe.

Exit 5:

- API error. Show `error.message`.

## Refund Create

Refunds require an explicit refund request and the original `orderId`.

```bash
clink-cli refund create --order-id <order_id> --format json
```

On success, extract `refundOrderId` or `refundId` from the response. A successful submission is not a final result.

## Refund Completion

Event-driven option:

```bash
clink-cli events poll --type agent_refund.succeeded --format json
```

Also inspect returned events for `agent_refund.failed` and `agent_refund.rejected`, filtered to the target refund.

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
