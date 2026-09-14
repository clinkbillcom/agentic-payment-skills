# `visa browser-open` Failure Reference

Read this file only after the opener returns `manual_required` or an unexpected
result. It asks the operating system to open the exact returned URL; it does
not inspect the protected page or prove business success.

Within the five-step purchase this command is allowed only for Step2 login and
Step4 Instruction activation. Do not invoke it anywhere in Step3: bindCardUrl,
manageCardUrl, and vicUrl are all URL-only. Never pass `--open` as a workaround.

## Safe Recovery

| Signal | Next action |
| --- | --- |
| launched for login | `visa login --environment production --resume <id>` checks the same login |
| launched for Instruction | `visa instruction get` checks exact ID immediately, or `wait` with original deadline |
| manual_required | Show exact manualOpenUrl for user completion, then the same state check |
| Closed page or manual completion | Check authoritative state first; do not reopen |

Get/wait carries the same purchase/PI/source and `--instruction-id`; wait also
requires the original `--authorization-deadline <ms>`. Never reset the deadline.

Tell the user to avoid the actual host's built-in browser. If the host is
unknown, say:

```text
请在系统浏览器中完成操作，不要使用 Agent 内置浏览器。
```

Never emit {agent}, preview/unfurl the protected page, recreate an Instruction,
or retry payment. Browser state is not business success or failure.
