# `visa commerce-run` Failure Reference

Read this file only after `visa commerce-run` returns an error, a pending
user-action state, or a non-terminal checkout result. Normal execution must
not load command references.

## Aggregate Stages

```text
validate restriction and frozen purchase context
  -> inspect Benefit login
  -> resolve and revalidate exact product
  -> refresh/select one frozen PI
  -> resolve saved Quick Instruction or list selected PI's ACTIVE Instructions
  -> create/authorize/activate one Instruction when no ACTIVE match exists
  -> verify exact ACTIVE Instruction and PI/VIC binding
  -> create and complete Checkout once
  -> optionally wait for digital delivery
  -> return payment/order evidence or one read-only continuation
```

## Stage Mapping

| Returned `stage` | Underlying atomic command | Safe interpretation |
| --- | --- | --- |
| `restriction` | `instruction` restriction check | Refused or incomplete purchase facts; fix input, do not create an Instruction |
| `login_status` / `login` | `visa status` or `visa commerce-login` | Login is unavailable or failed before purchase |
| `product_resolution` / `product_revalidation` | `visa product-search` or the exact internal product read | Product route, identity, price, currency, or availability drifted |
| `card_refresh` / `card_selection` / `card_verification` | `card binding-link --no-watch --no-open` | Refresh cards and verify one explicit/default PI; never choose by list order |
| `pending_instruction_prepare` | pending-instruction preparation | A PENDING operation was not prepared; do not create a second one from the error alone |
| `instruction_list` / `instruction_selection` / `instruction_active_verify` | `instruction list --valid-only --payment-instrument-id <selectedPI>` then exact `instruction get` | Only the selected PI's complete usable ACTIVE matches can be reused |
| `instruction_create` | `instruction create --payment-instrument-id <selectedPI> ...` | Creation failed or did not return a trustworthy ID; do not repeat blindly |
| `instruction_authorization` | `instruction sign-url --payment-instrument-id <selectedPI> --purchase-instruction-id <id> --no-open` | User Passkey operation is incomplete or failed |
| `instruction_activation` / `instruction_activation_wait` | `visa pending-instructions --instruction-id <id> --payment-instrument-id <pi>` or exact returned activation continuation | Preserve the same Instruction ID; no replacement |
| `checkout` | `ucp-checkout get --checkout-id <id> ...` only if the aggregate returns an exact read-only continuation | Checkout may already have been created; never rerun `commerce-run` |
| `delivery` | exact returned delivery wait/read-only continuation | Payment evidence and delivery evidence remain separate |

The aggregate error envelope is expected to expose `stage`, `status`, and
`error.message`; pending or recoverable results may also expose `reason`,
`instructionId`, `paymentInstrumentId`, `resumeCommand`, `resumeReadOnly`, and
`recovery`. Preserve these fields when explaining the failure.

## Instruction And PI Rules

- Match only the selected PI's exact usable `ACTIVE` Instructions.
- Never reuse another purchase's `PENDING` or `CREATED` Instruction.
- If the selected PI has completed VIC and no ACTIVE match exists, the normal
  atomic path creates one ordinary PI-bound Instruction.
- If VIC/card setup is required, keep the one returned PENDING Instruction ID
  through the browser operation and final status check.
- If the default PI changed after freeze, stop and ask for reconfirmation.

## Browser And Timeout Recovery

For a returned operation URL, use `visa browser-open` once. After automatic
opening rerun the original command with `--browser-opened`; after manual
completion rerun with `--manual-completed`. The latter checks authoritative
state first and does not reopen the browser. A closed page or opener failure is
not proof of business failure.

Binding, VIC, Passkey, and PENDING activation share the ten-minute Agent wait
boundary. After timeout, use `visa pending-instructions` with the exact ID when
known. Without exact context, return its instruction list and Portal URL for
user selection.

## Checkout Safety

If Checkout may have been created, execute only the exact CLI-returned
read-only `resumeCommand` once. Do not call `ucp-checkout create`, complete,
events, or payment manually to reconstruct an uncertain aggregate. Never retry
payment or create a replacement Instruction after an unknown result.
