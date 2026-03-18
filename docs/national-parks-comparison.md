# National Parks: Wikipedia vs Database Comparison

All 63 official National Parks from [Wikipedia](https://en.wikipedia.org/wiki/List_of_national_parks_of_the_United_States) compared against our `park_details` table.

## Summary

- **51 parks** have designation `National Park` (exact match)
- **8 parks** have designation `National Park & Preserve`
- **1 park** has designation `National Parks` (Sequoia & Kings Canyon — combined entry)
- **1 park** has designation `National and State Parks` (Redwood)
- **1 park** has designation `` (empty) (National Park of American Samoa)
- **1 park** (Kings Canyon) is combined with Sequoia under park code `seki`

## Full Comparison Table

| # | Wikipedia Name | Park Code | DB Full Name | DB Designation | Match? |
|---|---|---|---|---|---|
| 1 | Acadia | `acad` | Acadia National Park | National Park | ✅ |
| 2 | American Samoa | `npsa` | National Park of American Samoa | *(empty)* | ❌ |
| 3 | Arches | `arch` | Arches National Park | National Park | ✅ |
| 4 | Badlands | `badl` | Badlands National Park | National Park | ✅ |
| 5 | Big Bend | `bibe` | Big Bend National Park | National Park | ✅ |
| 6 | Biscayne | `bisc` | Biscayne National Park | National Park | ✅ |
| 7 | Black Canyon of the Gunnison | `blca` | Black Canyon Of The Gunnison National Park | National Park | ✅ |
| 8 | Bryce Canyon | `brca` | Bryce Canyon National Park | National Park | ✅ |
| 9 | Canyonlands | `cany` | Canyonlands National Park | National Park | ✅ |
| 10 | Capitol Reef | `care` | Capitol Reef National Park | National Park | ✅ |
| 11 | Carlsbad Caverns | `cave` | Carlsbad Caverns National Park | National Park | ✅ |
| 12 | Channel Islands | `chis` | Channel Islands National Park | National Park | ✅ |
| 13 | Congaree | `cong` | Congaree National Park | National Park | ✅ |
| 14 | Crater Lake | `crla` | Crater Lake National Park | National Park | ✅ |
| 15 | Cuyahoga Valley | `cuva` | Cuyahoga Valley National Park | National Park | ✅ |
| 16 | Death Valley | `deva` | Death Valley National Park | National Park | ✅ |
| 17 | Denali | `dena` | Denali National Park & Preserve | National Park & Preserve | ❌ |
| 18 | Dry Tortugas | `drto` | Dry Tortugas National Park | National Park | ✅ |
| 19 | Everglades | `ever` | Everglades National Park | National Park | ✅ |
| 20 | Gates of the Arctic | `gaar` | Gates Of The Arctic National Park & Preserve | National Park & Preserve | ❌ |
| 21 | Gateway Arch | `jeff` | Gateway Arch National Park | National Park | ✅ |
| 22 | Glacier | `glac` | Glacier National Park | National Park | ✅ |
| 23 | Glacier Bay | `glba` | Glacier Bay National Park & Preserve | National Park & Preserve | ❌ |
| 24 | Grand Canyon | `grca` | Grand Canyon National Park | National Park | ✅ |
| 25 | Grand Teton | `grte` | Grand Teton National Park | National Park | ✅ |
| 26 | Great Basin | `grba` | Great Basin National Park | National Park | ✅ |
| 27 | Great Sand Dunes | `grsa` | Great Sand Dunes National Park & Preserve | National Park & Preserve | ❌ |
| 28 | Great Smoky Mountains | `grsm` | Great Smoky Mountains National Park | National Park | ✅ |
| 29 | Guadalupe Mountains | `gumo` | Guadalupe Mountains National Park | National Park | ✅ |
| 30 | Haleakalā | `hale` | Haleakalā National Park | National Park | ✅ |
| 31 | Hawaiʻi Volcanoes | `havo` | Hawaiʻi Volcanoes National Park | National Park | ✅ |
| 32 | Hot Springs | `hosp` | Hot Springs National Park | National Park | ✅ |
| 33 | Indiana Dunes | `indu` | Indiana Dunes National Park | National Park | ✅ |
| 34 | Isle Royale | `isro` | Isle Royale National Park | National Park | ✅ |
| 35 | Joshua Tree | `jotr` | Joshua Tree National Park | National Park | ✅ |
| 36 | Katmai | `katm` | Katmai National Park & Preserve | National Park & Preserve | ❌ |
| 37 | Kenai Fjords | `kefj` | Kenai Fjords National Park | National Park | ✅ |
| 38 | Kings Canyon | `seki` | Sequoia & Kings Canyon National Parks | National Parks | ❌ (combined w/ Sequoia) |
| 39 | Kobuk Valley | `kova` | Kobuk Valley National Park | National Park | ✅ |
| 40 | Lake Clark | `lacl` | Lake Clark National Park & Preserve | National Park & Preserve | ❌ |
| 41 | Lassen Volcanic | `lavo` | Lassen Volcanic National Park | National Park | ✅ |
| 42 | Mammoth Cave | `maca` | Mammoth Cave National Park | National Park | ✅ |
| 43 | Mesa Verde | `meve` | Mesa Verde National Park | National Park | ✅ |
| 44 | Mount Rainier | `mora` | Mount Rainier National Park | National Park | ✅ |
| 45 | New River Gorge | `neri` | New River Gorge National Park & Preserve | National Park & Preserve | ❌ |
| 46 | North Cascades | `noca` | North Cascades National Park | National Park | ✅ |
| 47 | Olympic | `olym` | Olympic National Park | National Park | ✅ |
| 48 | Petrified Forest | `pefo` | Petrified Forest National Park | National Park | ✅ |
| 49 | Pinnacles | `pinn` | Pinnacles National Park | National Park | ✅ |
| 50 | Redwood | `redw` | Redwood National and State Parks | National and State Parks | ❌ |
| 51 | Rocky Mountain | `romo` | Rocky Mountain National Park | National Park | ✅ |
| 52 | Saguaro | `sagu` | Saguaro National Park | National Park | ✅ |
| 53 | Sequoia | `seki` | Sequoia & Kings Canyon National Parks | National Parks | ❌ (combined w/ Kings Canyon) |
| 54 | Shenandoah | `shen` | Shenandoah National Park | National Park | ✅ |
| 55 | Theodore Roosevelt | `thro` | Theodore Roosevelt National Park | National Park | ✅ |
| 56 | Virgin Islands | `viis` | Virgin Islands National Park | National Park | ✅ |
| 57 | Voyageurs | `voya` | Voyageurs National Park | National Park | ✅ |
| 58 | White Sands | `whsa` | White Sands National Park | National Park | ✅ |
| 59 | Wind Cave | `wica` | Wind Cave National Park | National Park | ✅ |
| 60 | Wrangell–St. Elias | `wrst` | Wrangell - St Elias National Park & Preserve | National Park & Preserve | ❌ |
| 61 | Yellowstone | `yell` | Yellowstone National Park | National Park | ✅ |
| 62 | Yosemite | `yose` | Yosemite National Park | National Park | ✅ |
| 63 | Zion | `zion` | Zion National Park | National Park | ✅ |

## Parks Needing Designation Cleanup (12 total)

All 63 parks **exist** in the database. The issue is that 12 have designations other than `National Park`:

| Park Code | Current Designation | Proposed Designation |
|---|---|---|
| `npsa` | *(empty)* | National Park |
| `dena` | National Park & Preserve | National Park |
| `gaar` | National Park & Preserve | National Park |
| `glba` | National Park & Preserve | National Park |
| `grsa` | National Park & Preserve | National Park |
| `katm` | National Park & Preserve | National Park |
| `lacl` | National Park & Preserve | National Park |
| `neri` | National Park & Preserve | National Park |
| `wrst` | National Park & Preserve | National Park |
| `redw` | National and State Parks | National Park |
| `seki` | National Parks | National Park |

> **Note:** Changing `seki` to `National Park` loses the fact that it covers both Sequoia and Kings Canyon. The NPS treats them as a single administrative unit with one park code. Wikipedia counts them as 2 separate parks (Sequoia + Kings Canyon = parks #38 and #53).
