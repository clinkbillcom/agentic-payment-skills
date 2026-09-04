# Recommend-Products Filters

Use one `visa recommend-products`; no standalone discovery calls.

## Required Shape

Every request or `--filter-sets` object requires:

- `region`: user destination, else remembered region, else `hk`.
- `category`: one or more relevant codes; prefer specific children. Multiple
  values are OR. Different axes are AND.

```json
{
  "region": ["hk"],
  "category": ["shopping_supermarket", "shopping_department_mall"]
}
```

Add `purpose`, `reward_type`, `attribute`, `card_level`, or `card_issuer` only
when explicitly stated by the current user; otherwise omit it. Generic `优惠`,
`权益`, `benefit`, or `offer` selects none. Never pass `type`, `keyword`,
`limit`, or `page`. Add `--all` only for an explicit every/all request.

Flag mapping: `region -> --region`, `category -> --category`,
`purpose -> --purpose`, `reward_type -> --reward-type`,
`attribute -> --attribute`, `card_level -> --card-level`,
`card_issuer -> --card-issuer`. Prefer one multi-category plan. Use
`--filter-sets` only for four genuinely different safe plans; each still
requires region/category and every explicit constraint.

The positional query is the only primary text and drives Visa, matched-merchant
Catalog, and the first broad search. Variants use only `--broad-queries`.

## Canonical Codes

Use only these codes. Parent region/category codes include children.

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

reward_type:
discount cashback coupon points privilege gift other

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

- `香港超市和百货优惠`: one request with `region=hk` and categories
  `shopping_supermarket shopping_department_mall`.
- `香港本地超市优惠券`: also `purpose=local`, `reward_type=coupon`.
- `我想下单咖啡`: `region=<resolved>`, `category=dining_cafe_bakery`; no
  optional taxonomy axis unless the user states one.
