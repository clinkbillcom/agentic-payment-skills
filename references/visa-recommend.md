# `visa recommend` Failure Reference

Read this file only after `visa recommend` returns an error or an incomplete
result. Normal discovery must not load command references.

## Aggregate Stages

```text
parse explicit filters
  -> resolve Benefit source market
  -> fetch current Visa taxonomy when needed
  -> request Visa recommendations
  -> paginate/deduplicate when --all is explicit
  -> return Programs and coverage metadata
```

The command is discovery-only. It does not log in, read wallet cards, create
an Instruction, create Checkout, or pay.

## Atomic Equivalents

| Stage | Command or evidence | Failure meaning |
| --- | --- | --- |
| Source market | `visa region get` | Read-only check of the saved Benefit source |
| Taxonomy | `visa taxonomy --lang <language>` | Current enum request failed or a filter code is invalid |
| One recommendation request | `visa recommend ... --region <code>` | The exact filter combination failed or returned no match |

Use the failed result's `reason`, `details`, `retryFilters`, `strictMatchFailure`,
`sourceRegion`, and `sourceEndpoint` when present. Do not invent a taxonomy code
or silently switch `--market`.

## Safe Recovery

- If the error says `no_offer_for_filter_combination`, retry once with the
  exact returned `retryFilters`; do not broaden filters yourself.
- If a taxonomy axis is missing or uncertain, run `visa taxonomy` and use only
  the current returned enum.
- If the output is partial, present successful rows and disclose the failed
  coverage; do not treat partial discovery as a payment failure.
- Do not call `visa detail` for every failed row. Use it only when the user
  selects one returned Program and asks for its details.

## Do Not Do

Do not use recommendation output to invent a product URL, merchant route,
price, currency, payment instrument, Instruction, or Checkout context. A
recommendation error never authorizes Catalog fallback or payment retry.
