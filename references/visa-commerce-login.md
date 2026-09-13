# `visa commerce-login` Failure Reference

Read this file only after `visa commerce-login` returns an error or an
incomplete state. Normal execution must not load command references.

## Aggregate Stages

```text
validate the unchanged frozen context
  -> inspect Benefit login status
  -> initialize or resume Benefit OAuth when needed
  -> persist the exact login continuation
  -> exact-GET any returned Quick Instruction
  -> return login readiness and the original continuation
```

`commerce-login` does not create a normal Instruction, open Bind Card, create
Checkout, or pay. A Quick Instruction may be created by the backend as part of
the Benefit login flow; the returned ID must remain tied to this purchase.

## Stage Mapping

| Returned `stage`/signal | Meaning | Safe atomic command |
| --- | --- | --- |
| `validation` or context error | Frozen context is incomplete, inconsistent, or unsafe | Fix the context in memory; do not call a live command |
| `login` with `authentication_required` | Benefit login is not ready | `visa status` is a read-only Benefit status check |
| `login` with `user_action_required` | OAuth/browser operation is pending | `visa browser-open --url <manualOpenUrl>` or complete manually, then rerun with the same continuation flag |
| `quick_instruction_get` | Returned Quick Instruction could not be read | `instruction get --purchase-instruction-id <instructionId>` |
| `read_only_recovery_required` | Existing continuation or instruction is uncertain | Run the exact returned read-only command; do not initialize another login |

The primary error envelope has `stage`, `status`, `reason`/`detail`, and
`browserLaunch`/`manualOpenUrl` when applicable. Use those fields to name the
failed stage in the user-facing explanation.

## Browser Recovery

The aggregate returns the exact URL before a separate opener is used:

```text
visa browser-open --url "<manualOpenUrl>" --format json
```

If it reports `launched`, rerun the original `commerce-login` with
`--browser-opened`. If the user completed the page manually, rerun with
`--manual-completed`; that path checks status first and does not reopen the
page. If the host Agent name is unknown, say:

```text
请在系统浏览器中完成操作，不要使用 Agent 内置浏览器。
```

Never output `{agent}` literally.

## Do Not Do

Do not call `instruction create` to repair a login error, create a second Quick
Instruction, or continue to `commerce-run` unless login is authoritatively
ready. A browser launch is not proof of login success.
