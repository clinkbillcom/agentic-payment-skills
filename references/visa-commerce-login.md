# `visa commerce-login` Compatibility Reference

Read this file only after an existing `visa commerce-login` caller returns an
error or incomplete state. This command/export remains compatibility-only.
New Skill purchases use `visa login`, never this legacy aggregate.

Use returned stage, status, reason, error, exact login/Instruction IDs, and
read-only recovery to diagnose the existing operation. `quick_instruction_get`
identifies an existing Quick read failure, not permission to create one.
Do not copy a legacy login-created Instruction into a new five-step purchase.

For an unresolved legacy login, preserve its returned continuation. Only an
exact returned login URL may use browser-open after a system-browser notice.
Do not open card/VIC URLs or infer that a browser launch proves readiness.
After manual completion, check authoritative state without reopening.

Never call wallet init, create a replacement Instruction, or start another
purchase to repair an unknown result. If the existing continuation is missing,
stop with read-only diagnosis rather than inventing it.
