# `visa init` Failure Reference

Read this file only after `visa init` returns an error or an incomplete state.
Normal successful execution does not load references.

## Contract

`visa init --sandbox --start --no-open` authenticates only. Resume with
`visa init --sandbox --resume <resumeId> --no-open` using the exact returned ID. It
receives no purchase arguments, PI, or instructionContext; no Quick/PENDING
Instruction or card setup is created. Never call wallet init or repair a
login failure with Instruction creation.
Login is independently callable before recommend; no product or purchase
authorization is required. The Agent owns orchestration. Login does not invoke
recommendation, payment-method resolve, Instruction, or Checkout.

| Signal | Safe action |
| --- | --- |
| `ready` | Report and stop for login-only intent; otherwise the Agent chooses the requested next capability |
| `manualOpenUrl` plus login resume ID | Show system-browser notice, open that exact URL with `visa browser-open`, resume that ID |
| Manual completion or closed page | Resume the same login to check state first; do not reopen |
| Unknown/error result | Preserve the login ID and use returned read-only recovery; do not start another login |

Use `stage`, `status`, `reason`, and `error` as returned. Do not invent a more
specific cause. Login readiness proves neither card readiness nor purchase
authorization. The system browser is user-operated, never the Agent's built-in
browser. A launch is not proof of login success.
