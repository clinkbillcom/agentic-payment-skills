# Visa Recommend Filters

Read this only when building Agent-selected filters for `visa recommend`.

## Source Region

- A unique `region[]=hk|cn` selects that endpoint and persists it.
- With no HK/CN region, saved config/default HK is used.
- Cross-source search: explicit `--market` wins over destination `region[]`.
- Never call `visa region get/set` before a search; those are standalone only.
- Other or multi-value destinations do not update the saved source.

## Output

Build one strict JSON object first. Allowed fields:

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
code. With `--all`, omit `limit` and `page`.

## Call Shape

- One safe plan is the default. Map it to individual CLI flags, for example
  `type -> --type`, `region -> --region`, `reward_type -> --reward-type`,
  `card_level -> --card-level`, and `card_issuer -> --card-issuer`.
- Use `--filter-sets` only when exactly four genuinely different safe plans
  improve recall. Put all recommendation filters inside those objects and
  never combine them with outer individual filter flags.
- Never issue multiple Agent-managed `visa recommend` commands.

## Selection Rules

1. Preserve every explicit user constraint in every chosen plan: market/region,
   merchant, brand, product, category, eligibility, card level/issuer, reward
   type, channel, and purpose.
2. Prefer one strict plan containing all high-confidence filters.
3. Four-set mode may vary only inferred soft filters. Never remove an explicit
   hard constraint. If fewer than four safe variants exist, use one strict
   plan; never repeat or pad filters to reach four.
4. `keyword` is strict text matching. Use it only for an exact official title
   or exact merchant phrase already present in current authoritative context.
   Never put a conversational question or paraphrase in `keyword`.
5. Use `type=benefit` for card benefits/coupons. Use `type=reward` only for
   enrollment/cashback campaigns. Omit `type` when both are requested.
6. Set `reward_type` only when the user explicitly names one. Generic
   `优惠`, `benefit`, `offer`, or `礼遇` selects no reward type. Never fan
   out `discount`, `coupon`, `cashback`, or `privilege` merely to create four
   sets; use the single strict plan instead.
7. `--market` is not a recommendation filter: it selects the issuing-market
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

- Purchase and Benefit wording both use `visa recommend-products`; initial
  discovery never calls `catalog search`.
- `我想下单咖啡`: use `type=benefit`, `category=dining_cafe_bakery`, and no
  `reward_type`.
- Benefit wording uses the same aggregate with explicit constraints preserved.
