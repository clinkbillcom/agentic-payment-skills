# `visa product-search` Failure Reference

Read this file only after `visa product-search` returns an error, an
ambiguous selection, or an unavailable product. Normal execution must not load
command references.

## Aggregate Stages

```text
validate merchant URL and original query
  -> resolve internal UCP merchant route
  -> search the internal Catalog
  -> only on an explicit internal-list miss, parse an external product page
  -> remove unavailable candidates
  -> select one exact/unique product or return candidates
  -> freeze product ID, title, price, currency, availability, and merchant route
```

## Atomic Equivalents

| Stage | Command or evidence | Important interpretation |
| --- | --- | --- |
| Route resolution | `tool internal-ucp get-endpoint --product-url <merchantUrl>` | Internal route failure is not permission to guess an endpoint |
| Internal Catalog | `ucp-catalog search` with the exact resolved merchant route and original query | Use only the command's returned candidates |
| External fallback | `tool parse-item --url <merchantUrl>` | Allowed only when the aggregate explicitly reports `NOT_IN_INTERNAL_UCP_LIST` |
| Ambiguity recovery | `visa product-search ... --selected-product-id <id>` | Re-run only after the user selects an exact candidate |

The aggregate's `state`, `action`, `reason`, `productId`, and `products` fields
identify whether the failure is routing, availability, parsing, or selection.

## Safe Recovery

- `PRODUCT_SELECTION_REQUIRED` is not a failure: show the returned candidates
  and ask the user to select one.
- `PRODUCT_UNAVAILABLE` stops purchase for that product; do not substitute a
  similarly named product.
- For an internal route or Catalog error, repeat the matching read-only atomic
  command once with the same merchant URL and query to isolate the stage.
- Only a successful `PRODUCT_VERIFIED` result may produce the frozen purchase
  context for `commerce-login` and `commerce-run`.

## Do Not Do

Do not parse a Visa/VSRP campaign URL, modify the price or currency, invent a
merchant route, or continue to login after a non-verified result.
