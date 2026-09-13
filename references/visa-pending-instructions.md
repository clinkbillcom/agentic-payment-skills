# `visa pending-instructions` Failure Reference

Read this file only after pending recovery returns an incomplete or unexpected
status. Normal execution must not load command references.

## Aggregate Stages

```text
GET /agent/cwallet/instructions/activatable
  -> list current PENDING/CREATED Instructions
  -> refresh current cards
  -> resolve exact Instruction context
  -> resolve its bound or explicitly selected VIC-ready Visa card
  -> return/open the exact Passkey activation URL or Portal list
```

## Status Mapping

| Status | Meaning | Next action |
| --- | --- | --- |
| `activation_ready` | Exact Instruction and VIC-ready card are known | Use the returned `activationUrl`; if the user completed it, rerun the original purchase flow |
| `card_selection_required` | Several eligible cards and no explicit choice | Show masked card suffixes and ask the user; rerun with `--payment-instrument-id` |
| `portal_binding_required` | No usable bound/VIC-ready card | Give `portalUrl`; the user binds/updates/selects a card |
| `instruction_not_activatable` | Requested ID is not in the current pending list | Do not replace it; show the returned list/Portal URL |
| `select_in_portal` | Exact context is missing or ambiguous | Return `pendingInstructions[]` and let the user choose in Portal |
| `none_pending` | Nothing remains activatable | Do not create or retry from this command alone |

The command is read-only except for the user's browser operation. It never
creates, cancels, replaces, or silently selects an Instruction.

## Safe Atomic Checks

- Use `instruction get --purchase-instruction-id <id>` to verify one exact
  Instruction after the browser operation.
- Use `card binding-link --no-watch --no-open` to refresh authoritative card
  and VIC data.
- Use the exact returned `activationUrl` only in the user's system browser.

Do not infer a default from the first card or from VIC readiness. If the
context is unknown, a list is a user-choice surface, not Agent permission to
select.
