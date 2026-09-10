# Visa Skill Change Log

## 2026-09-10: Unified VIC boundary-case recovery

- Card binding, VIC readiness, and Passkey authorization waits are capped at
  10 minutes. Binding failure, a card without VIC support, and an unfinished
  Passkey authorization cannot be distinguished; only the timeout counts as
  failure, and every such exit goes through one recovery.
- Recovery follows the `commerce-run` `recovery` object or the new
  `visa pending-instructions` command (`GET /agent/cwallet/instructions/pending`
  plus card refresh). Statuses: `activation_link` (CLI `--open` opens the
  original ID's exact Passkey URL with the default/unique VIC-ready card, no
  Portal page in between), `card_selection_required` (ask the user which card,
  rerun with `--payment-instrument-id`), `bind_in_portal` and `select_in_portal`
  (return `{agent portal}/agent-authorization` so the user binds, picks, and
  activates in the list; the frontend adds an activate button there), and
  `none_pending`.
- Supersedes the 2026-09-09 Case A exit (15 minutes, then a binding link only)
  and Case B exit (the card's exact VIC URL). Case C direct `--open` for CREATED
  or historical PENDING with a VIC-ready card is unchanged, as are zero creates,
  no list-order card selection, no constructed URLs, and CLI-only browser
  opening. The Portal home page is still not an activation link; the
  `/agent-authorization` list page is the only sanctioned Portal recovery link.
- Skill `0.1.85`. Vendor refresh to the matching CLI feature commit is separate
  work; this entry records the requested contract, not runtime acceptance.

## 2026-09-09: Quick creation follows card readiness

- A new Quick with an eligible selected VIC-ready Visa card is `CREATED` and
  bound to that card's `paymentInstrumentId`; without one it is `PENDING`.
- Preserve and reuse an existing matching Quick. Do not relabel or replace a
  historical `PENDING` Quick when card readiness changes.
- `pendingInstructionId` is a legacy field name only. Read the returned
  Instruction's actual `status`; `CREATED`, `PENDING`, and `ACTIVE` are valid
  states.
- `CREATED` continues immediately with the original ID and bound
  `paymentInstrumentId`; open the exact CLI-returned Passkey URL without
  waiting for binding/VIC. Existing Portal `/sign` activates that same ID.
- A no-card `PENDING` waits up to 15 minutes; after timeout only request card
  binding. A card-present but non-VIC `PENDING` returns the exact VIC URL.
  Once that card is VIC-ready, open the original ID. `ACTIVE` reuses the
  original ID.
- Existing Quick flows create zero additional Instructions. Without a Quick,
  normal ACTIVE reuse and ordinary creation remain unchanged.

