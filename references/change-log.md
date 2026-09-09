# Visa Skill Change Log

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

