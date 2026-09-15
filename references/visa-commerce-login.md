# `visa commerce-login` Failure Reference

Read this file only after `visa commerce-login` returns an error or incomplete state.

Step2 uses authorized selected_product flat purchase arguments, environment
sandbox, --confirm-purchase and --no-open. It inspects login status first.
Standalone authentication without purchase context uses visa init, not this command.

| State | Action |
| --- | --- |
| Authenticated, default PI proven usable and VIC-ready | No new Instruction; continue Step3 |
| Authenticated, no default or known unusable/unsupported/incomplete default | Direct PENDING create; retain pendingInstructionId |
| Failed card query, multiple defaults, unknown default support/completion | Structured read-only error; no PENDING create |
| Unauthenticated | Send exact instructionContext through Benefit OAuth; CWallet creates the Quick when the user completes webpage authorization |
| OAuth user action required | Show manualOpenUrl, system-browser notice, separate browser-open |
| Manual completion | Repeat same purchase command with --manual-completed; check original OAuth, never reopen |
| Browser login completed, token exchange still pending | Retain the returned pendingInstructionId; do not wait for CLI login or create another Instruction |
| Original Quick ID returned | Preserve exact pendingInstructionId and authorizationDeadline; never replace |

Other cards never influence Quick. Do not repeat OAuth for an authenticated customer.
IDs, purchase facts, PI/source and original deadline are conversation-owned, never
context files. Same-command OAuth continuation retains the existing login session,
including after browser failure.

For unauthenticated purchases, CWallet makes the Quick decision during webpage authorization,
independently of POST /oauth/benefit/token. The browser login completes the Quick, so resume
returns the exact pendingInstructionId as soon as CWallet reports it, before the token
exchange finishes; do not wait for CLI login or create a replacement. Token polling still
obtains the tokens needed by later authenticated card, Instruction, and checkout operations.
A browser-open result proves neither Quick creation nor login completion.
Never switch to Device OAuth.

After Step3 freezes a VIC-ready PI/source, Step4 continues this exact Quick ID:
ACTIVE verifies the same PI and eligible Mandate, with Agent semantic matching;
PENDING uses explicit visa instruction bind-pi with the same ID, selected PI/source,
original --authorization-deadline and --confirm-purchase, then ordinary activation;
CREATED uses same-ID get/wait and activation. get/wait are read-only.
No replacement ordinary Instruction, no candidate reuse of another purchase's draft.
Unknown creation or payment requires read-only reconciliation, never resubmission.
All Step3 bind/VIC/manage URLs remain URL-only.
