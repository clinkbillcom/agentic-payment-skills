# Visa Skill Change Log

## 2026-09-11: VIC readiness reads the card-level signal

- Vendored CLI `0.2.65`. CWallet's device strong-auth change made the card
  list's `visaRegistrationSucceeded` a mirror of `strongAuthReady`, which
  describes the device issuing the request. A CLI process is never the browser
  that ran the Passkey/VIC ceremony, so on UAT every card read as not
  VIC-registered: an ACTIVE Quick Instruction bound to a fully registered card
  failed terminally, card selection never found a ready card, and UCP checkout
  forwarded `visa_registration_succeeded=false` for a VIC Visa.
- The CLI now resolves VIC registration from the card-level, cross-device
  `strongAuthRegistered` (with `authProtocol=VISA`), falling back to
  `visaRegistrationSucceeded` on backends that predate it.
- `quick_instruction_active_card_not_vic_ready_or_mismatched` is replaced by one
  reason per condition: `quick_instruction_active_card_not_vic_ready`,
  `..._card_disabled`, `..._card_not_visa`, `..._card_missing_from_card_list`,
  `..._card_changed_by_backend`, and
  `quick_instruction_active_without_payment_instrument`. A rebound card still
  surfaces as `quick_instruction_failed_exact_context_verification`. Each
  failure carries `paymentInstrumentId`, the judged `card`, and read-only
  `recovery`. Agents must not pattern-match the retired reason.
- Skill contract, FSM, prompts, and safety rules are unchanged.

## 2026-09-10: Unified VIC boundary-case recovery

- Card binding, VIC readiness, and Passkey authorization waits are capped at
  10 minutes. Binding failure, a card without VIC support, and an unfinished
  Passkey authorization cannot be distinguished; only the timeout counts as
  failure, and every such exit goes through one recovery.
- Recovery follows the `commerce-run` `recovery` object or the new
  `visa pending-instructions` command (`GET /agent/cwallet/instructions/pending`
  plus card refresh). Statuses: `activation_ready` (CLI `--open` opens the
  original ID's exact Passkey URL with the bound/default/unique VIC-ready card,
  no Portal page in between; `manualOpenUrl` only when not launched),
  `card_selection_required` (ask the user which card in `cards[]`, rerun with
  `--payment-instrument-id`), `portal_binding_required` and `select_in_portal`
  (return `{agent portal}/agent-authorization` so the user re-binds, picks, and
  activates in the list; the frontend adds an activate button there),
  `instruction_not_activatable` (the given ID is not pending; exact-GET it,
  never pick another), and `none_pending`. Every outcome carries `context`
  (`exact`/`unknown`) and `portalUrl`; `commerce-run` not-ready exits carry the
  same object under `recovery`.
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

