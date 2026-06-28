# Async Events

Read this before waiting for card binding/change, risk-rule update, refund lifecycle, VIC registration, purchase-instruction activation, or post-3DS payment completion.

## Model

Clink async operations complete through webhook events from the Clink event hub. Completion is not proven by re-running the initiating command or by guessing from time elapsed.

The local config remains a latest wallet state cache and does not persist historical event records. Payment-method events may update the cached payment-method snapshot for the selected profile; other events are returned to the caller and acknowledged by the event path.

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

## On-Demand Poll

Use `events poll` when you need to wait for a state change without printing a new link, or when a previous watch timed out:

```bash
clink-cli events poll --type <eventType> --format json
```

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

## Required Event Checks

| Flow | Event evidence |
| --- | --- |
| First card binding | `payment_method.added` for the target customer/payment method |
| Card update/default change | `payment_method.updated` or `payment_method.default_change` |
| Risk-rule update | `risk_rule.updated` |
| VIC registration | `vic_device.binding_succeeded` or `payment_method.updated` with `visaRegistrationSucceeded=true` for the same payment method |
| Instruction activation | `purchase_instruction.activated` for the instruction |
| 3DS payment result | `agent_order.succeeded` or `agent_order.failed` for the order |
| Refund result | `agent_refund.succeeded`, `agent_refund.failed`, or `agent_refund.rejected` for the refund |

## Rules

- Do not fabricate completion.
- Do not busy-retry the initiating link command to check status.
- Do not acknowledge events with `--no-ack` unless you intentionally only want to peek.
- On timeout, return the timeout state and resume command; do not claim success.
- For refund status, direct `refund get` polling is also acceptable.
