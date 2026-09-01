# Visa Recommend Filters

Read this only when building `visa recommend --filter-sets`.

## Output

Create exactly four JSON objects. Allowed fields:

```json
{
  "type": "benefit",
  "keyword": "exact official title only",
  "limit": 50,
  "page": 1,
  "region": ["hk"],
  "category": ["shopping_supermarket"],
  "purpose": ["local"],
  "reward_type": ["coupon"],
  "attribute": ["online_only"],
  "card_level": ["all"],
  "card_issuer": ["BOC"]
}
```

Array fields must contain taxonomy codes. Omit unknown fields; never invent a
code. With `--all`, omit `limit` and `page`. Put every recommendation filter
inside these objects; never combine `--filter-sets` with an outer individual
filter flag such as `--region`.

## Selection Rules

1. Repeat every explicit user constraint in all four sets: market/region,
   merchant, brand, product, category, eligibility, card level/issuer, reward
   type, channel, and purpose.
2. Set 1 is strict: all high-confidence filters.
3. Sets 2-4 may vary only inferred soft filters. Never remove an explicit hard
   constraint. If no safe variation exists, repeat the strict set.
4. `keyword` is strict text matching. Use it only for an exact official title
   or exact merchant phrase already present in current authoritative context.
   Never put a conversational question or paraphrase in `keyword`.
5. Use `type=benefit` for card benefits/coupons. Use `type=reward` only for
   enrollment/cashback campaigns. Omit `type` when both are requested.
6. `--market` is not a recommendation filter: it selects the issuing-market
   data source and may remain outside `--filter-sets`. `region[]` selects where
   the Benefit is usable. They are not interchangeable.

## Common Codes

```text
region:       hk cn tw mo jp kr us gb global
category:     shopping shopping_supermarket shopping_department_mall
              shopping_fashion shopping_beauty shopping_electronics
              dining dining_restaurant dining_cafe_bakery
              dining_fast_casual dining_delivery_food
              lodging airfare ground_transport entertainment wellness
purpose:      local outbound inbound study haitao
reward_type:  discount cashback coupon points privilege gift other
attribute:    new_customer online_only instore_only app_exclusive
              reservation_required family_friendly couple group
              senior_friendly exclusive
card_level:   all signature infinite
```

For an unlisted or uncertain code, run `visa taxonomy` once and use only a
returned code.

## Intent Boundary

- Explicit purchase with no Visa/Benefit/coupon signal, such as
  `我想下单咖啡`, uses broad `catalog search`.
- A Benefit signal such as `有咖啡的券吗`, `Visa 咖啡优惠券`, or
  `有哪些咖啡权益` uses `visa recommend --filter-sets`.
