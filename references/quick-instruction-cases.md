# Quick Instruction Cases

These cases define the minimum regression matrix for Visa Skill development.

## Quick Creation

- With an eligible selected VIC-ready Visa card, create one Quick as
  `CREATED`, bound to that card's `paymentInstrumentId`.
- With no eligible selected VIC-ready Visa card, create one Quick as
  `PENDING`.
- `pendingInstructionId` is only a legacy response field name. Determine the
  state from the actual returned Instruction `status` and exact-GET. Login
  persists the ID and returns ready for CREATED, PENDING, or ACTIVE without
  waiting for activation; commerce-run owns the waits and handoffs.
- Reuse an existing matching Quick as-is. Do not migrate a historical
  `PENDING` to `CREATED` when card readiness changes.

## Case A: No Visa Card

- Status: the original Quick is `PENDING`; no Visa card exists.
- Wait at most 10 minutes. Binding failure cannot be observed; the timeout is
  the failure. Exit through the unified recovery: `bind_in_portal` returns the
  `{agent portal}/agent-authorization` list link and names the exact
  Instruction so the user binds a card and authorizes it there.
- Preserve the original ID, create zero Instructions, and start no Checkout.
  Do not provide a VIC link, a Bind Card link, or the Portal home page.

## Case B: Visa Card, Not VIC-Ready

- Status: the original Quick is `PENDING`; a Visa card exists but is not
  VIC-ready.
- Wait at most 10 minutes. Whether the card cannot support VIC or the ceremony
  was never finished is indistinguishable; the timeout is the failure. Exit
  through the same recovery as Case A (`bind_in_portal` with the
  `/agent-authorization` link); never return the card's VIC URL, never create
  another Instruction.
- If another VIC-ready Visa card exists, recovery returns `activation_link`
  (default or unique ready card, CLI `--open`) or `card_selection_required`
  (ask the user which returned card; never choose by list order).
- Continue only after the original Quick is verified `ACTIVE` and bound to the
  same card. If the card becomes VIC-ready while it remains `PENDING`, use
  the historical PENDING path in Case C.

## Case C: VIC-Ready Card With CREATED or Historical PENDING

- Status: the original Quick is `CREATED`; it is bound to the selected
  VIC-ready card.
- Immediately use the original Quick ID and bound `paymentInstrumentId`.
  CLI `--open` opens the exact CLI-returned
  `/passkey-auth/{pi}?type=visa&instructionId={originalId}` URL.
- Do not wait for card binding or VIC, create a second Instruction, or ask for
  a chat confirmation. Portal `/sign` activates the same original ID.
- On opener failure, return the exact manual URL; an allowed pre-Checkout
  rerun uses the same ID and creates nothing.

- Historical PENDING remains PENDING until authoritative activation; do not
  relabel or replace it because the card became VIC-ready.
- Open the exact CLI-returned Passkey URL for the original Quick ID and the
  selected `paymentInstrumentId`; do not wait for binding or create another ID.
- A missing or mismatched bound card requires a stop, never substitution or
  list-order selection. Another matching ACTIVE cannot displace the Quick.

## Case D: Original Quick Is ACTIVE

- Reuse the original Quick ID directly. Do not authorize again or create
  another Instruction, including when another ACTIVE Instruction is newer.

## Case E: Recovery Without Exact Context

- Status: the user asks to finish or activate a purchase, or reports a
  binding/VIC/Passkey problem, and the Agent cannot tie the request to one
  Instruction (no saved Quick, or several waiting Instructions).
- Run `visa pending-instructions`. `select_in_portal` returns the waiting
  `pendingInstructions` and the `{agent portal}/agent-authorization` link; show
  both and let the user pick and activate in that list. Never guess, never
  create, never select a card by list order.
- With one identifiable Instruction the same command resolves to
  `activation_link`, `card_selection_required`, or `bind_in_portal` as in
  Cases A-C. `none_pending` means nothing awaits activation; exact-GET the
  original Quick before any other step.

## No Quick

- Without a Quick, normal matching ACTIVE reuse and ordinary Instruction
  creation remain unchanged.

## Acceptance Assertions

- Assert the actual response status, never a field-name-derived status.
- Assert the original Instruction ID, bound `paymentInstrumentId`, exact URL,
  and zero additional creates for every existing Quick case.
- Assert no second create, no bind-card wait for `CREATED`, no Checkout before
  exact `ACTIVE`, and no retry after an uncertain Checkout.
- Assert the 10-minute cap, the unified recovery statuses, and that only
  `/agent-authorization` (never a VIC URL, Bind Card link, or Portal home page)
  is the Portal recovery link.

These assertions describe regression requirements. Skill contract/artifact
tests validate the shipped text only, not CLI execution or backend deployment.
