# Recommend-Products Filters

## Required Shape

- `region`: every request and `--filter-sets` object. User destination, else
  remembered region, else `hk`.
- `category`: required when the ask names a category, merchant, brand, or
  product; prefer children. Multiple values are OR. Different axes are AND.
  Natural language never replaces `category` (超市 -> `shopping_supermarket`,
  百货 -> `shopping_department_mall`).
- Omit `category` for a generic regional ask (`日本有什么优惠`, `any offers`)
  naming none; region-only returns page 1.
- Never guess a category. If nothing satisfies every filter the CLI fails with
  `reason=no_offer_for_filter_combination` (axes too narrow together): rerun once
  with `retryFilters` from `error.details`.

```json
{ "region": ["hk"], "category": ["shopping_supermarket", "shopping_department_mall"] }
```

Add `purpose`, `attribute`, `card_level`, or `card_issuer` only when
explicitly stated; otherwise omit. Generic `优惠`, `权益`, `benefit`, or
`offer` selects none. Never pass `type`, `keyword`, `limit`, or `page`.
Add `--all` only for an explicit all ask.
Never fill `reward_type` or pass `--reward-type`. Omit `--market`: a search
never switches the HK/CN source; only an explicit user request runs
`visa region set <hk|cn>`.

Flags: each axis maps to `--<axis>` with `_` written as `-`
(`card_level -> --card-level`). Prefer one multi-category plan. Use
`--filter-sets` only for four genuinely different safe plans; each keeps region
and the same category rule.

## Canonical Codes

Use only these codes; parents include children.

```text
purpose:
outbound study local inbound haitao

region groups:
cn hmt kj sea anz eu na mideast sasia africa global
region countries:
cn hk mo tw jp kr th my sg vn ph id kh la bn mv au nz gb fr de it es ch nl
be at pt gr ie us ca mx ae qa sa in np bd pk ma za eg

category:
dining
  dining_restaurant dining_cafe_bakery dining_bar dining_fast_casual
  dining_fine dining_delivery_food dining_other
shopping
  shopping_department_mall shopping_supermarket shopping_fashion
  shopping_luxury shopping_beauty shopping_jewelry_watches
  shopping_electronics shopping_duty_free shopping_specialty shopping_other
lodging
  lodging_hotel lodging_resort lodging_apartment lodging_budget lodging_other
airfare
  airfare_ticket airfare_upgrade airfare_lounge airfare_baggage airfare_other
ground_transport
  transport_car_rental transport_ride_taxi transport_airport_transfer
  transport_transit_rail transport_fuel_parking transport_other
travel_service
  travel_visa travel_insurance travel_medical travel_tour_activity
  travel_tax_refund travel_concierge travel_other
entertainment
  ent_attraction ent_cinema_show ent_culture ent_sports
  ent_nightlife_gaming ent_other
wellness
  wellness_spa_massage wellness_beauty_salon wellness_fitness
  wellness_medical wellness_onsen wellness_other
telecom
  telecom_roaming telecom_sim_esim telecom_wifi telecom_mobile telecom_other
financial_service
  fin_fx fin_installment fin_insurance fin_other
education
  edu_study_abroad edu_course edu_tuition edu_student_living edu_other
other
  other_uncategorized

attribute:
new_customer limited_time limited_quantity no_threshold stackable online_only
instore_only app_exclusive applepay reservation_required free_cancellation
family_friendly couple group pet_friendly senior_friendly premium exclusive

card_level:
classic gold platinum signature infinite business business_gold
business_platinum business_signature corporate all

card_issuer:
BOC BOCOM CCB ICBC ABC CITIC CGB CMB PAB SPDB CIB HXB CMBC BOB BOS CEB CITI
BEA SCB NCB HKB BOJ BOD HSB BODG JXB BOZ CQRCB BONB BOG BOX ZJTLB HRB BRCB
GRCB BOH CZB BOSZ NYRCB BOGY BOCS BOJL SJB BOCD XIB PSBC SRCB FUBON CITICDB
CCBDB BOCDB CMBDB ABCDB CIBPLATINUM BOCAPP
```

Examples:

- `香港超市和百货优惠`: `shopping_supermarket shopping_department_mall`.
- `香港本地超市`: `region=hk`, `category=shopping_supermarket`, `purpose=local`.
- `我想下单咖啡`: `category=dining_cafe_bakery`.
- `日本有什么优惠`: `region=jp` only.
