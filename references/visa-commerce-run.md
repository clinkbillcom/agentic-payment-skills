# `visa commerce-run` Compatibility Reference

Read this file only after an existing `visa commerce-run` caller returns an
error, user-action state, or uncertain Checkout result. The command/export
remains compatibility-only, not the new Skill path.

## Safe Diagnosis

| Existing signal | Action |
| --- | --- |
| login/card/VIC stage | Preserve context and explain returned state; show card/VIC URLs only |
| instruction_list / instruction_selection | Read-only inspection of the exact frozen PI |
| instruction_create / instruction_activation | Preserve original instructionId; no replacement or guessed latest ID |
| checkout / checkout_started | Only exact CLI-returned read-only recovery; never rerun commerce-run |
| delivery | Preserve payment evidence and use the exact returned delivery read |

Use the actual stage, status, reason, error, resumeCommand, and recovery fields.
Do not reconstruct the legacy Quick/PENDING state machine or carry an
unresolved legacy purchase into `visa checkout`.

Bind Card is URL-only in every flow. All card-management and VIC URLs are
manual-only here too. An existing login/Instruction activation URL may use the
system browser only when the exact continuation is known; manual completion
first checks state without reopening.

Never replace the original Instruction, select a card by list order, reset a
returned deadline, clear checkout_started, or retry an uncertain payment.
The UCP complete wire remains PI-only; a legacy selected ID is not proof of
exact backend consumption.
