# `visa browser-open` Failure Reference

Read this file only after the system-browser opener returns `manual_required` or
an unexpected result. This command is already atomic and read-only.

## Stages

```text
validate exact operation URL
  -> ask the host system to open it
  -> return launched or manual_required
```

The command does not inspect the page and cannot prove that OAuth, card setup,
VIC, Passkey, Instruction authorization, or 3DS succeeded.

## Safe Recovery

- `status=launched`: rerun the originating aggregate with `--browser-opened`
  and let the aggregate check authoritative business state.
- `status=manual_required`: show the exact URL and tell the user to open it in
  their system browser, then rerun the originating aggregate with
  `--manual-completed` after the user finishes.
- A closed browser window is not proof of failure. Check the originating
  aggregate's continuation first.

Never open these URLs through an Agent built-in browser, preview, or link
unfurl. If the host name is unknown, use:

```text
请在系统浏览器中完成操作，不要使用 Agent 内置浏览器。
```

Do not retry payment, create another Instruction, or emit `{agent}`.
