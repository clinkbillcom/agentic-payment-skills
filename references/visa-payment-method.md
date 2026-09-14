# `visa payment-method resolve` Failure Reference

Read this file only after `visa payment-method resolve` returns a user-action
state, error, or incomplete result.

## Selection

Use `--environment production`. With no selection arguments, resolve the persisted
default. Do not ask which card or infer a default from card count, order, or
VIC readiness. Only a proactive exact-ID user choice uses
`--payment-instrument-id <id> --selection-source explicit`. A frozen default
recheck uses its exact ID and `--selection-source default`.
The no_default outcome applies to default selection, not a ready explicit PI.
Invoke this independent command with current authentication; no recommendation
or selected product is required. For readiness-only intent, report and stop.

## Card Outcomes

The following table defines actions within an authorized purchase, not CLI
status-enum names or automatic transitions to another command.
`show_url` and `stop` both stop before Step4. `browser_open=never` applies to
the entire step, including returned VIC and card-management URLs.

| condition | output | action | browser_open | instruction_create | continuation |
| --- | --- | --- | --- | --- | --- |
| no_card | bindCardUrl (Portal root) | show_url | never | never | same_resolve |
| no_default | manageCardUrl | show_url | never | never | same_resolve |
| vic_incomplete_supported | vicUrl | show_url | never | never | same_resolve |
| vic_unsupported | manual card management | stop | never | never | same_resolve |
| vic_unknown | manual card management | stop | never | never | same_resolve |
| card_read_failed | returned error | stop | never | never | same_resolve |
| explicit_not_ready | vicUrl only if supported | show_url_or_stop | never | never | same_resolve |
| ready_default | paymentInstrumentId + selectionSource=default | step4 | never | never | frozen_pair |
| ready_explicit | paymentInstrumentId + selectionSource=explicit | step4 | never | never | frozen_pair |
| ready_explicit_without_default | paymentInstrumentId + selectionSource=explicit | step4 | never | never | frozen_pair |

Show only exact returned URLs; never invent them, call `visa browser-open`,
pass `--open`, use an OS opener, or inspect protected pages with an Agent
browser. The user returns to repeat the same command and recheck state.
Step3 does not wait for card/VIC or create an Instruction.

`GET /agent/cwallet/card/info` is authoritative.
`cardSchemeRegistrationEnabled` is VIC support; `visaRegistrationSucceeded` or
card-level `strongAuthRegistered` is completion. Do not use device-local
`strongAuthReady` as card readiness. Capability false/unknown or failed reads
must not enter VIC or Checkout.

## Frozen Selection

Ready freezes BOTH `paymentInstrumentId` and `selectionSource` through every
Step4/5 call. A default change requires reconfirmation; never silently update
the pair. An explicit alternate persists despite a default change, but must
still be owned, usable, and VIC-ready. Do not ask to make it default.
