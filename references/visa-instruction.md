# `visa instruction` Failure Reference

Read this file only after `visa instruction candidates`, `create`, `bind-pi`, `get`, or
`wait` returns incomplete, ambiguous, or failed results.

All subcommands require the same selected_product flat purchase arguments,
`--environment sandbox`, `--payment-instrument-id`, and `--selection-source
default|explicit`. Never build a context file or substitute another PI.
Each subcommand is independently invoked with its required inputs and current
state, not proof that earlier commands ran. Exact-ID get/wait does not invoke
candidates/create; a ready result does not itself invoke Checkout.

## Quick Continuation

An exact pendingInstructionId from commerce-login takes priority over candidate
selection. With Step3's ready PI, `get` checks that ID: ACTIVE verifies the PI
and eligible Mandates; CREATED continues activation; PENDING returns
binding_required without a write.

For PENDING, explicitly use `visa instruction bind-pi` with the same purchase
arguments, PI/source, `--instruction-id <id> --authorization-deadline <ms>
--confirm-purchase`. It binds the same ID and returns its ordinary activation
URL. Preserve the original deadline. Unknown binding results need exact read-only
reconciliation, not another binding or replacement creation. If VIC activated a
different concurrent purchase, continue this purchase's original ID.

## Technical Eligibility

`candidates` is read-only and returns all eligible Instructions with PI and
`eligibleMandates`: mandateId, title, description, amount/currency/MCC.
The CLI filters these gates before Agent semantic selection:

| gate | requirement |
| --- | --- |
| status | ACTIVE only; never reuse PENDING/CREATED |
| paymentInstrumentId | exact frozen PI |
| currency | exact purchase currency |
| amount | limit >= purchase amount |
| MCC | purchase covered |
| expiry | future validity |
| usage/reserve | usable and not consumed or reserved |
| recurring | cadence, limits, and horizon cover the purchase |

The shared `purchase-context-validation.ts` checks only currency, amount, and
MCC. It does not validate title/description content or equality. PI, status,
expiry, usage/reserve, and recurring checks belong to the Instruction command.

## Semantic Selection

The Agent evaluates only eligibleMandates. Require the same merchant, SKU,
denomination, region, and quantity using title, description, and authoritative
product facts. Equivalent translated titles need not be string-equal.
Amount equality or a familiar brand alone is not sufficient.
The Agent owns semantic purchase validation, including restricted-category
meaning, and decides whether to invoke another command. Technical eligibility
must not be presented as semantic approval.

These outcomes assume technical eligibility unless stated otherwise:

| evidence | decision |
| --- | --- |
| Same merchant/SKU/denomination/region/quantity with equivalent translated titles | reuse_exact_pair |
| Same product facts with a paraphrased description | reuse_exact_pair |
| Matching price only, product evidence missing | stop_ambiguous |
| Unresolved multiple plausible Mandates | stop_ambiguous |
| Verified different merchant | no_match |
| Verified different SKU | no_match |
| Verified different denomination | no_match |
| Verified different region | no_match |
| Verified different quantity | no_match |
| Identical title/description but verified different SKU | no_match |
| Candidate read failed or coverage unknown | stop_read_only |
| Complete eligible set empty | create_ordinary |

Without a Quick ID, `no_match` permits creation only after the complete eligible set has no semantic
match. Ambiguous evidence never permits a guess or automatic creation.
A match freezes both instructionId and mandateId for Step5.

## Create And Continue

`create` additionally requires `--confirm-purchase` and ready PI. It creates
ONLY an ordinary PI-bound CREATED Instruction, never PENDING or bind-pi.
Return manualOpenUrl, instructionId, authorizationDeadline (epoch milliseconds).
An unknown create result is not permission to create again.

Tell the user to use the system browser, avoiding the actual host's built-in
browser (or generic Agent built-in browser when unknown), then
`visa browser-open --url "<manualOpenUrl>"` with the exact returned URL.

`get` requires `--instruction-id <id>` and checks immediately without reopening.
`wait` requires that ID and `--authorization-deadline <ms>`, checks exact state
first, and waits at most 600 seconds (10 minutes), bounded by the original
deadline. Both carry the unchanged purchase/PI/source and are read-only.
Never reset the deadline, reopen on manual completion, recreate, or substitute
an Instruction from another session.

Only an exact ACTIVE result and selected eligible Mandate can advance to Step5.
CREATED, timeout, mismatched PI, and unknown results stop. A changed default
stops default-based selection, not an owned, usable, VIC-ready explicit PI.
Retain exact IDs and use bound read-only recovery; a failed gate is not a
reason to switch authorizations.
