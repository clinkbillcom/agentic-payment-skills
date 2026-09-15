# `visa pending-instructions` Compatibility Reference

Read this file only after explicitly requested legacy pending recovery returns
an incomplete or unexpected status. It is not Step3 or Step4 of the new path.

`GET /agent/cwallet/instructions/activatable` is a read-only list of current
activatable PENDING/CREATED Instructions, not a creator, selection, binding, or
activation operation. Preserve `--instruction-id <id>` when known; never infer
the newest or only row belongs to this purchase.

`/agent-authorization` is the legacy Instruction-list recovery route, not a
bind-card entry. No-card binding guidance uses the UAT Agent Portal root
`https://uat-agent.clinkbill.com/`, never `/payment-method-setup`.

| Status | Safe action |
| --- | --- |
| activation_ready | Preserve exact ID; show the returned authorization URL for user action and exact-read afterward |
| card_selection_required | Return the card-management URL; do not choose a card implicitly |
| portal_binding_required | Show the returned Portal URL, never browser-open it |
| instruction_not_activatable | Stop; do not substitute another ID |
| select_in_portal | Unknown context; let the user identify the original operation |
| none_pending | No activatable result; never create or retry from this alone |

Do not pass `--open` for card-management or VIC setup. A list, browser state, or
automatic activation of another Instruction proves nothing about this purchase.
Only a bound exact read can verify the original Instruction. Never use legacy
pending recovery to create a new five-step Checkout for an unresolved payment.
