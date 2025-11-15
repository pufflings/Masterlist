# Sheet Column Reference

Quick reference for GVIZ queries based on CSV examples.

## Pufflings (Masterlist)
**~400 rows × 25 columns**

| Column | Header | Type | Example Values |
|--------|--------|------|----------------|
| A | ID | number | 1, 2, 3... |
| B | Hide | boolean | TRUE, FALSE |
| C | Prefix | string | "", "PUF" |
| D | Design | string | "Pebble", "PUF-0001" |
| E | Name (NPC only) | string | "Pebble", "Peridot" |
| F | Image URL | url | https://... |
| G | Image | url | https://... |
| H | Preview | url | |
| I | Humanoid image URL | url | https://... |
| J | Humanoid Image | url | https://... |
| K | Preview | url | |
| L | Type | dropdown | "NPC", "Official Design", "MYO" |
| M | Species | dropdown | "Dragon", "Behemoth", "Leviathan", "Wyvern", "Puff Colony" |
| N | Owner | string | "Limatrix", "kkurozu" |
| O | Seeker | string | |
| P | Relationship | number | 25, 40 |
| Q | Heartbound Crystal | boolean | TRUE, FALSE |
| R | Artist | string | "Ninovel" |
| S | Designer | string | "Ninovel" |
| T | Value | number | 0 |
| U | Status | dropdown | "Soulbound", "Trade only", "Voided" |
| V | Rarity | dropdown | "Common", "Uncommon", "Rare", "Super Rare", "Ultra Rare", "Exclusive" |
| W | Main Story Clear | boolean | |
| X | Notes | url | https://toyhou.se/... |
| Y | Traits | string | "Gold, Astral Ring" |

**Common queries:**
```sql
-- Paginated masterlist:
SELECT A, D, E, F, G, L, M, N, U, V WHERE B = FALSE ORDER BY A DESC LIMIT 50 OFFSET 0

-- Filter by status:
WHERE B = FALSE AND U = 'Soulbound'

-- Filter by species:
WHERE B = FALSE AND M = 'Dragon'

-- Filter by owner:
WHERE B = FALSE AND N = 'Limatrix'
```

## Items
**~118 rows × 16 columns**

| Column | Header | Type | Example Values |
|--------|--------|------|----------------|
| A | ID | number | 1, 2, 3... |
| B | Item | string | "Coins", "Lucky Potion" |
| C | AUX | string | "1 Coins", "2 Lucky Potion" |
| D | Hide | boolean | TRUE, FALSE |
| E | Stocked in shop | boolean | TRUE, FALSE |
| F | Tradeable | boolean | TRUE, FALSE |
| G | Limited | boolean | TRUE, FALSE |
| H | Image URL | url | https://... |
| I | Image | url | https://... |
| J | Preview | url | |
| K | Trait | string | |
| L | Type | dropdown | "Currency", "MYO Slot", "Misc", "Trait" |
| M | Rarity | dropdown | "Common", "Exclusive" |
| N | Price | number | 15, 40, 80 |
| O | Description | string | "The currency used..." |
| P | Stock quantity | number | -1 (unlimited) |

**Common queries:**
```sql
-- Shop items only (stocked):
SELECT A, B, I, N, O WHERE D = FALSE AND E = TRUE

-- Tradeable items:
WHERE D = FALSE AND F = TRUE

-- Items by type:
WHERE D = FALSE AND L = 'MYO Slot'
```

## Inventory
**Varies by player × 82 columns** (mostly item quantities)

| Column | Header | Type |
|--------|--------|------|
| A | ID | number |
| B | Username | string |
| C | Weekly Quest (Reset Monday) | boolean |
| D | Gacha Ticket From Casual | boolean |
| E | Gacha Ticket From Adventure | boolean |
| F | Bought Discounted MYO slot | boolean |
| G | Gacha Cooldown | date |
| H | Hide | boolean |
| I-CD | Item quantities | number |

**Common queries:**
```sql
-- Get user inventory:
WHERE B = 'username'

-- Users with specific item:
WHERE I > 0  -- (column I = Coins, for example)
```

## Seekers
**~301 rows × 14 columns**

| Column | Header | Type |
|--------|--------|------|
| A | ID | number |
| B | Hide | boolean |
| C | Prefix | string |
| D | Design | string |
| E | Type | dropdown |
| F | Name | string |
| G | AUX | string |
| H | Image URL | url |
| I | Image | url |
| J | Preview | url |
| K | Owner | string |
| L | Artist | string |
| M | Designer | string |
| N | Notes | url |

**Common queries:**
```sql
-- Paginated seekers:
SELECT A, D, F, I, K WHERE B = FALSE ORDER BY A DESC LIMIT 50 OFFSET 0

-- Filter by owner:
WHERE B = FALSE AND K = 'username'

-- Filter by type:
WHERE B = FALSE AND E = 'NPC'
```

## Traits
**74 rows × 12 columns** (CSV export was corrupted with 46,750 rows, actual sheet is 74)

| Column | Header | Type |
|--------|--------|------|
| A | ID | number |
| B | Trait | string |
| C | AUX | string |
| D | Hide | boolean |
| E | Image URL | url |
| F | Image | url |
| G | Preview | url |
| H | Type | dropdown |
| I | Rarity | dropdown |
| J | Price | number |
| K | Description | string |
| L | Item | string |

**Common queries:**
```sql
-- Paginated traits:
SELECT A, B, F, H, I, K WHERE D = FALSE ORDER BY B ASC LIMIT 50 OFFSET 0

-- Filter by rarity:
WHERE D = FALSE AND I = 'Common'

-- Filter by type:
WHERE D = FALSE AND H = 'Elemental'
```

## Inventory Log
**~296 rows × 9 columns**

| Column | Header | Type |
|--------|--------|------|
| A | Username | string |
| B | Hide | boolean |
| C | Timestamp | date |
| D | Mod Username | string |
| E | Reason | string |
| F | Item | string |
| G | Quantity | number |
| H | Soulbound | boolean |
| I | Gacha | boolean |

**Common queries:**
```sql
-- Recent logs:
SELECT * WHERE B = FALSE ORDER BY C DESC LIMIT 50

-- Logs for user:
WHERE B = FALSE AND A = 'username' ORDER BY C DESC

-- Logs by mod:
WHERE B = FALSE AND D = 'modname' ORDER BY C DESC

-- Gacha logs only:
WHERE B = FALSE AND I = TRUE ORDER BY C DESC
```

## Masterlist Log
**~87 rows × 6 columns**

| Column | Header | Type |
|--------|--------|------|
| A | ID | number |
| B | Hide | boolean |
| C | Timestamp | date |
| D | Mod | string |
| E | Target | string |
| F | Reason | string |

**Common queries:**
```sql
-- Recent logs:
SELECT * WHERE B = FALSE ORDER BY C DESC LIMIT 50

-- Logs by mod:
WHERE B = FALSE AND D = 'modname' ORDER BY C DESC

-- Logs for specific target:
WHERE B = FALSE AND E = 'target' ORDER BY C DESC
```

## Options
**Configuration sheet** - typically fetch entire sheet (small)

---

## Notes on Dropdown Values

Based on the Options sheet, dropdown values are:

**Species:**
- Dragon
- Behemoth
- Leviathan
- Wyvern
- Puff Colony

**Status:**
- Soulbound
- Voided
- Trade only

**Rarity:**
- Common
- Uncommon
- Rare
- Super Rare
- Ultra Rare
- Exclusive

**Item Types:**
- Currency
- MYO Slot
- Misc
- Trait

**Trait Types:**
- Material
- Elemental
- Theme
- Mystic
- Special limbs
- Exclusive
- Wing type
- Tail related Trait
- Lost Species

**Character Types:**
- Official Design
- Guest Design
- MYO Design
- MYO Slot
- NPC

**Important:** These are dropdown values, so they're consistent (no "Approved" vs "approved" variations).

---

## Column Selection Recommendations

For each page, only select columns you actually display:

**Masterlist page:** Probably just A, D, E, G, I, L, M, N, U, V (10 cols instead of 25)

**Shop page:** A, B, I, N, O (5 cols instead of 16)

**Seekers page:** A, D, F, I, K (5 cols instead of 14)

**Traits page:** A, B, F, H, I, K (6 cols instead of 12)

**Inventory page:** Depends on what you display, but likely A, B, and specific item columns

This will give you 50-80% payload reduction for most pages.
