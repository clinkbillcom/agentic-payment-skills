# `visa checkout` Failure Reference

Read this file only after `visa checkout` returns an error, an incomplete
result, or a read-only recovery instruction.

## Required Input

Use the same selected_product flat purchase arguments, `--environment sandbox`,
`--payment-instrument-id`, `--selection-source default|explicit`,
`--purchase-instruction-id`, `--mandate-id`, and `--confirm-purchase`.
This is independently callable when those inputs and current gates are
available; it does not require replaying earlier commands. The Agent owns
orchestration and semantic purchase validation before invoking it.

The CLI requires the frozen ready PI, rechecks default-vs-explicit selection,
exact-GETs the ACTIVE Instruction and selected eligible Mandate, and revalidates
merchant/product IDs, amount, currency, and availability. Product drift requires
reconfirmation. Failed/unknown gates stop without replacement.
`purchase-context-validation.ts` checks only currency, amount, and MCC, not
title/description content or equality. Removing those semantic checks does
not remove the command's required-input, exact-ID, or authoritative state gates.

Step5 performs no implicit login, card selection, Instruction matching,
Instruction creation, or browser opening.

## Failure Boundary

| Signal | Safe action |
| --- | --- |
| PI, default, Instruction, or Mandate gate fails | Stop; preserve the selected pair and exact IDs |
| Product identity/price/currency/availability changes | Stop and reconfirm material changes |
| `phase=checkout_started` or Checkout may exist | Refuse repeat; only exact CLI-returned read-only recovery |
| Unknown payment/transport result | Read-only reconciliation, never retry create/complete/payment |
| Payment succeeded, delivery pending/failed | Preserve paid state; use the exact returned delivery read |

`--phase checkout_started` refuses repeats. Never clear that phase, start a new
five-step purchase for the same uncertain operation, or reconstruct atomic
`ucp-checkout create/complete` calls. At most one Checkout creation and one
completion are allowed.

## Backend Scope

instructionId and mandateId are client gate IDs. The UCP complete wire carries
PI only; it does not forward the chosen Instruction/Mandate IDs. The backend
resolver is unchanged, so do not claim that these exact IDs were consumed at
the backend. This contract requires no backend or production change.

Report payment and delivery separately. Include a returned orderUrl as a
clickable View order link; never construct it from Checkout or UCP order IDs.
