# `visa recommend-products` Failure Reference

Read this file only after the aggregate returns an error, partial coverage, or
an unexpected empty product collection. Normal product discovery must not load
command references.

## Aggregate Stages

```text
validate region/category and other explicit filters
  -> fetch Visa recommendations and current taxonomy
  -> match each Program.code to the locked merchant ext.visa_program_id
  -> search the matched merchant Catalog with the original query
  -> verify orderable product, price, currency, and merchant route
  -> return products, visaBenefits, and productMatching coverage
```

The command is still discovery-only. It does not log in, bind a card, create
an Instruction, create Checkout, or pay.

## Atomic Equivalents

| Aggregate stage | Command or evidence | Read this when |
| --- | --- | --- |
| Visa recommendation | `visa recommend --region <code> ...` | `recommendation` or filter validation failed |
| Current enum | `visa taxonomy --lang <language>` | A filter code is invalid or another axis is needed |
| Merchant/product matching | `productMatching.failures[]` | One Program failed while others succeeded |
| Product search | `visa product-search --merchant-url <returned merchantUrl> --query <original query> --language <language>` | A specific matched merchant needs isolated diagnosis |

`productMatching.failures[]` is per Program. Use its `index`, `programCode`,
and `message` to identify the failed match. `coverage=partial` means some
results may still be valid; it is not equivalent to zero results.

## Safe Recovery

- If a filter-combination error returns `retryFilters`, retry only that exact
  CLI-provided filter set once.
- If a matched merchant failed, run `visa product-search` only with the exact
  `product.merchantUrl` returned by the successful routing result and the
  unchanged user query. Do not use the Visa Offer URL.
- If a row is ambiguous, return the product candidates and ask the user to
  choose; resume with the exact selected product ID.
- If no orderable product is returned, keep relevant `visaBenefits` as
  discovery results and do not start purchase.

## Do Not Do

Do not replace the original query with an Offer title, guess a merchant from
the URL, run broad Catalog fallback, or turn a partial matching result into a
purchase context. Purchase starts only from one exact `PRODUCT_VERIFIED` row.
