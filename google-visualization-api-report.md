# Google Visualization API Optimization Guide

**Project:** Pufflings Masterlist - RPG Character Visualization
**Context:** Solo dev, ~400 rows × 50 cols, thousands of requests/month
**Date:** November 14, 2025

---

## TL;DR

**You're already using Google Visualization API (GVIZ)** - you just need to use it better.

**Your Real Problems:**
1. Loading 400 rows × 50 columns = ~20,000 cells at once (SLOW)
2. No pagination yet, but you need it as sheet grows
3. Fetching all 50 columns when you only display ~5-10

**Solution:** Use GVIZ's query language (SELECT, LIMIT, OFFSET) - it's perfect for this.

**Should you migrate to Sheets API v4?** No. More work, no real benefits for your use case.

---

## Current Implementation

**File:** `styles/js/utilities.js:657`

```javascript
https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&headers=1&tq=WHERE A IS NOT NULL&sheet=${sheetPage}
```

**Current query:** `WHERE A IS NOT NULL` (just filters empty rows)

**What you're missing:**
- `SELECT A, B, C` (column selection)
- `LIMIT 50` (pagination)
- `ORDER BY A DESC` (server-side sorting)
- `OFFSET 0` (pagination offset)

---

## Why NOT Migrate to Sheets API v4

You mentioned rate limits aren't a concern - you're right, they aren't at your traffic level. But here's why I still recommend staying with GVIZ:

### API v4 Disadvantages for Your Use Case

❌ **No query language**
- Can't do `WHERE status = 'active'` or `LIMIT 50`
- Have to fetch cell ranges like `A1:AX400` then filter client-side
- Actually transfers MORE data than GVIZ with queries

❌ **Pagination is harder**
```javascript
// GVIZ pagination (easy):
LIMIT 50 OFFSET 0

// API v4 pagination (manual):
range: `A1:AX50` then `A51:AX100` then calculate row numbers...
```

❌ **OAuth complexity**
- Service account setup
- Token management
- More code to maintain
- No benefit for public data

❌ **More code to write**
- Complete rewrite of importSheet()
- All pages need updates
- ~20-30 hours of work

### GVIZ Advantages

✅ **Already working** - just needs enhancement
✅ **SQL-like queries** - perfect for filtering/pagination
✅ **No auth needed** - public sheets, simple
✅ **2-hour fix** vs 20-hour rewrite

### When You SHOULD Use API v4

- Need to write data back to sheets (you don't)
- Need private sheets with auth (you don't)
- Need batch write operations (you don't)
- Need advanced batch reads from multiple sheets in one call (you don't)

**Bottom line:** API v4 solves problems you don't have, while making your actual problem (pagination) harder to solve.

---

## GVIZ Query Language Capabilities

### What You Can Do (But Aren't)

#### 1. SELECT - Column Filtering
```sql
-- Instead of all 50 columns:
SELECT *

-- Just the 5-10 you display:
SELECT A, B, C, D, E

-- Payload reduction: 80-90% for your 50-column sheet
```

#### 2. LIMIT/OFFSET - Pagination
```sql
-- Page 1 (first 50):
SELECT * WHERE A IS NOT NULL LIMIT 50 OFFSET 0

-- Page 2 (next 50):
SELECT * WHERE A IS NOT NULL LIMIT 50 OFFSET 50

-- 400 rows → 50 rows = 8x faster initial load
```

#### 3. ORDER BY - Server-Side Sorting
```sql
-- Sort before sending:
SELECT * WHERE A IS NOT NULL ORDER BY A DESC LIMIT 50

-- No client-side sorting needed
```

#### 4. WHERE - Filtering
```sql
-- Active items only:
WHERE A IS NOT NULL AND status = 'active'

-- Pattern matching:
WHERE name MATCHES '.*dragon.*'

-- Multiple conditions:
WHERE A IS NOT NULL AND type = 'weapon' AND cost < 100
```

#### 5. Aggregations (bonus)
```sql
-- For stats/dashboards:
SELECT category, COUNT(*) GROUP BY category
SELECT owner, SUM(value) GROUP BY owner
```

### What You CAN'T Do

❌ No JOINs (one sheet per query)
❌ No subqueries
❌ No HAVING clause
❌ Limited string functions
❌ No writes (read-only)

**But:** You don't need these. Your current architecture already handles multi-sheet relations client-side.

---

## Your Specific Use Case Analysis

### Current Sheets

From `styles/js/config.js:37-50`:

| Sheet | Likely Rows | Likely Columns | Needs Pagination? | Cache Time |
|-------|-------------|----------------|------------------|------------|
| Pufflings (masterlist) | ~400 | ~50 | **YES** | 30 min |
| Seekers | ~50? | ~30? | Maybe | 30 min |
| Inventory | Varies | ~20? | If >100 | 5 min |
| Items | ~100? | ~15? | Maybe | 30 min |
| Traits | ~50? | ~10? | No | 30 min |
| Prompts | ~20? | ~10? | No | 30 min |
| News | ~10 | ~5 | No | 10 min |

### Priority Fix: Pufflings Masterlist

**Current:** 400 rows × 50 cols = 20,000 cells loaded at once

**Impact:**
- Large payload (500KB - 2MB depending on content)
- Slow parsing/rendering
- Poor mobile experience
- Will get worse as you add more characters

**Quick Fix (30 minutes):**

```javascript
// For masterlist page display:
await charadex.importSheet('Pufflings', {
  columns: 'A, B, C, D, E, F, G, H, I, J',  // Only displayed columns
  limit: 50,
  offset: currentPage * 50,
  orderBy: 'A DESC'  // Newest first
});

// Payload: 50 rows × 10 cols = 500 cells
// Reduction: 20,000 → 500 = 97.5% smaller!
```

---

## Practical Implementation Plan

### Phase 1: Critical Fix (1-2 hours) ⭐ DO THIS FIRST

**Goal:** Fix the 400-row masterlist performance issue

**1. Add Pagination to Masterlist (30 min)**

Modify `styles/js/utilities.js` - add options parameter:

```javascript
charadex.importSheet = async (sheetPage, options = {}) => {
  const {
    columns = '*',
    where = 'A IS NOT NULL',
    orderBy = null,
    limit = null,
    offset = 0,
    sheetId = charadex.config.data.id
  } = options;

  let query = `SELECT ${columns} WHERE ${where}`;
  if (orderBy) query += ` ORDER BY ${orderBy}`;
  if (limit) query += ` LIMIT ${limit}`;
  if (offset > 0) query += ` OFFSET ${offset}`;

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
  const params = new URLSearchParams({
    tqx: 'out:json',
    headers: '1',
    tq: query,
    sheet: sheetPage
  });

  // Rest of existing code...
  const response = await fetch(`${url}?${params}`);
  // ... etc
};
```

**2. Update Masterlist Page (30 min)**

In `styles/js/pages/masterlist.js`:

```javascript
let currentPage = 0;
const pageSize = 50;

async function loadMasterlistPage(page = 0) {
  const data = await charadex.importSheet('Pufflings', {
    columns: 'A, B, C, D, E, F, G, H, I, J',  // Adjust to your displayed columns
    limit: pageSize,
    offset: page * pageSize,
    orderBy: 'A DESC'
  });

  currentPage = page;
  renderMasterlist(data);
  updatePaginationUI(page, data.length < pageSize); // hasMore = false if less than pageSize
}

// Add pagination buttons
function updatePaginationUI(page, isLastPage) {
  // Show/hide prev/next buttons
  // Update page number display
}
```

**3. Simple Pagination UI (30 min)**

Add to your HTML:

```html
<div id="pagination">
  <button id="prev-page" onclick="loadPreviousPage()">← Previous</button>
  <span id="page-info">Page <span id="current-page">1</span></span>
  <button id="next-page" onclick="loadNextPage()">Next →</button>
</div>
```

**Expected Result:**
- 97% smaller payload for masterlist
- ~10x faster page load
- Instant pagination

### Phase 2: Column Optimization (1 hour)

**Goal:** Reduce payload for other large sheets

**Check which columns each page actually uses:**

```javascript
// Example: If items page only displays name, cost, description, image:
const items = await charadex.importSheet('items', {
  columns: 'A, B, D, F, H'  // id, name, cost, description, image
});

// Instead of all columns including internal tracking fields
```

**How to find displayed columns:**
1. Open each page
2. Inspect what data is shown in the UI
3. Map to sheet columns
4. Only request those columns

**Estimated savings:** 30-60% per sheet depending on column count

### Phase 3: Smart Caching (30 min)

**Goal:** Adjust cache times based on update frequency

**Current:** 5 minutes for everything (`utilities.js:638`)

**Better:**

```javascript
const CACHE_EXPIRY = {
  // Updated frequently by players:
  'inventory': 5 * 60 * 1000,         // 5 min
  'inventory log': 5 * 60 * 1000,     // 5 min
  'news': 10 * 60 * 1000,             // 10 min

  // Updated occasionally by you:
  'Pufflings': 30 * 60 * 1000,        // 30 min
  'seekers': 30 * 60 * 1000,          // 30 min
  'items': 30 * 60 * 1000,            // 30 min
  'prompts': 30 * 60 * 1000,          // 30 min

  // Rarely changes:
  'OptionsSheet': 60 * 60 * 1000,     // 1 hour
  'traits': 60 * 60 * 1000,           // 1 hour
  'faq': 60 * 60 * 1000,              // 1 hour

  'default': 30 * 60 * 1000           // 30 min
};

function getCacheExpiry(sheetPage) {
  return CACHE_EXPIRY[sheetPage] || CACHE_EXPIRY.default;
}
```

Update cache check:

```javascript
// utilities.js - checkCache function
const { data, timestamp } = JSON.parse(cached);
const expiry = getCacheExpiry(sheetPage);

if (Date.now() - timestamp < expiry) {
  return data;
}
```

**Expected result:** 80-90% fewer API requests (due to longer cache on static data)

### Phase 4: Optional Enhancements

**4A. Server-Side Filtering (if needed)**

Example: Shop page showing only in-stock items

```javascript
// Instead of fetching all items then filtering:
const shopItems = await charadex.importSheet('items', {
  where: 'A IS NOT NULL AND inStock = TRUE',  // Adjust column name
  columns: 'A, B, C, D'
});
```

**4B. Request Deduplication**

If multiple components request same sheet simultaneously:

```javascript
const pendingRequests = new Map();

// In importSheet():
const cacheKey = `${sheetId}_${sheetPage}_${query}`;

if (pendingRequests.has(cacheKey)) {
  return await pendingRequests.get(cacheKey);
}

const promise = fetchSheet(...);
pendingRequests.set(cacheKey, promise);

try {
  return await promise;
} finally {
  pendingRequests.delete(cacheKey);
}
```

**4C. "Load More" Instead of Pages**

```javascript
let loadedData = [];
let currentOffset = 0;

async function loadMore() {
  const moreData = await charadex.importSheet('Pufflings', {
    limit: 50,
    offset: currentOffset
  });

  loadedData = [...loadedData, ...moreData];
  currentOffset += 50;

  appendToUI(moreData);

  if (moreData.length < 50) {
    hideLoadMoreButton(); // No more data
  }
}
```

---

## Code Examples

### Full Enhanced importSheet() Function

```javascript
/**
 * Enhanced import with GVIZ query support
 */
charadex.importSheet = async (sheetPage, options = {}) => {
  const {
    columns = '*',
    where = 'A IS NOT NULL',
    orderBy = null,
    limit = null,
    offset = 0,
    sheetId = charadex.config.data.id,
    forceRefresh = false
  } = options;

  // Build query
  let query = `SELECT ${columns} WHERE ${where}`;
  if (orderBy) query += ` ORDER BY ${orderBy}`;
  if (limit) query += ` LIMIT ${limit}`;
  if (offset > 0) query += ` OFFSET ${offset}`;

  // Create cache key (include query in key)
  const cacheKey = `charadex_${sheetId}_${sheetPage}_${btoa(query).substring(0, 20)}`;

  // Check cache
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const expiry = getCacheExpiry(sheetPage);

        if (Date.now() - timestamp < expiry) {
          console.log(`Cache hit: ${sheetPage}`);
          return data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
  }

  // Fetch with query
  try {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
    const params = new URLSearchParams({
      tqx: 'out:json',
      headers: '1',
      tq: query,
      sheet: sheetPage
    });

    const response = await fetch(`${url}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));

    // Your existing processing code...
    const cols = [];
    const data = [];

    // Extract column headers
    if (json.table.cols) {
      for (let col of json.table.cols) {
        cols.push(col.label || col.id);
      }
    }

    // Process rows
    if (json.table.rows) {
      for (let row of json.table.rows) {
        const rowData = {};
        for (let i = 0; i < cols.length; i++) {
          const cell = row.c[i];
          rowData[cols[i]] = cell ? (cell.v ?? cell.f ?? '') : '';
        }

        // Skip hidden rows (your existing logic)
        if (rowData.hide !== 'hide') {
          data.push(rowData);
        }
      }
    }

    // Cache result
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      console.log(`Cached: ${sheetPage} (${data.length} rows)`);
    } catch (e) {
      console.warn('Cache storage failed:', e);
    }

    return data;

  } catch (error) {
    console.error(`Failed to fetch ${sheetPage}:`, error);
    throw error;
  }
};
```

### Pagination Component (Reusable)

```javascript
class SheetPagination {
  constructor(sheetPage, options = {}) {
    this.sheetPage = sheetPage;
    this.pageSize = options.pageSize || 50;
    this.queryOptions = options; // columns, where, orderBy, etc.
    this.currentPage = 0;
    this.hasMore = true;
  }

  async loadPage(page) {
    this.currentPage = page;

    const data = await charadex.importSheet(this.sheetPage, {
      ...this.queryOptions,
      limit: this.pageSize,
      offset: page * this.pageSize
    });

    this.hasMore = data.length === this.pageSize;
    return data;
  }

  async next() {
    if (!this.hasMore) return [];
    return await this.loadPage(this.currentPage + 1);
  }

  async prev() {
    if (this.currentPage === 0) return await this.loadPage(0);
    return await this.loadPage(this.currentPage - 1);
  }

  async first() {
    return await this.loadPage(0);
  }
}

// Usage:
const pagination = new SheetPagination('Pufflings', {
  columns: 'A, B, C, D, E',
  orderBy: 'A DESC',
  pageSize: 50
});

const page1 = await pagination.first();
const page2 = await pagination.next();
const page1Again = await pagination.prev();
```

### Load More Pattern

```javascript
class LoadMoreSheet {
  constructor(sheetPage, options = {}) {
    this.sheetPage = sheetPage;
    this.pageSize = options.pageSize || 50;
    this.queryOptions = options;
    this.loadedData = [];
    this.offset = 0;
    this.hasMore = true;
  }

  async loadInitial() {
    this.loadedData = [];
    this.offset = 0;
    return await this.loadMore();
  }

  async loadMore() {
    if (!this.hasMore) return [];

    const newData = await charadex.importSheet(this.sheetPage, {
      ...this.queryOptions,
      limit: this.pageSize,
      offset: this.offset
    });

    this.loadedData = [...this.loadedData, ...newData];
    this.offset += this.pageSize;
    this.hasMore = newData.length === this.pageSize;

    return newData; // Return just the new data for appending
  }

  getAllLoaded() {
    return this.loadedData;
  }
}

// Usage:
const loader = new LoadMoreSheet('Pufflings', {
  columns: 'A, B, C, D, E',
  orderBy: 'A DESC',
  pageSize: 50
});

// Initial load
const initialData = await loader.loadInitial();
renderData(initialData);

// User clicks "Load More"
const moreData = await loader.loadMore();
appendData(moreData);

// Check if "Load More" button should be shown
if (!loader.hasMore) {
  hideLoadMoreButton();
}
```

---

## Testing Plan

### 1. Test Pagination

**Before (for comparison):**
- Open DevTools Network tab
- Load masterlist page
- Note: Transfer size, number of cells loaded

**After:**
- Clear cache
- Load masterlist page
- Check: Only 50 rows loaded, much smaller transfer
- Click "Next"
- Check: Loads next 50 rows correctly
- Click "Previous"
- Check: Shows previous page (should be cached, instant)

### 2. Test Column Selection

**For each optimized page:**
- Inspect Network request
- Check the `tq` parameter contains `SELECT A, B, C...`
- Verify all displayed data still shows correctly
- Check transfer size is smaller

### 3. Test Caching

**Static sheets (30+ min cache):**
- Load page with traits/items
- Reload page within 30 minutes
- Check: No new network request (cache hit)
- Force refresh (Ctrl+Shift+R)
- Check: New request made

**Dynamic sheets (5 min cache):**
- Load inventory page
- Reload within 5 minutes → cache hit
- Wait 6 minutes, reload → new request

### 4. Edge Cases

- Empty sheet (0 rows)
- Single page (less than 50 rows)
- Exactly 50 rows (pagination boundary)
- Very long text in cells
- Special characters in data
- Offline (cache still works)

---

## Performance Expectations

### Before Optimization

**Pufflings Masterlist (400 rows × 50 cols):**
- Payload: ~1.5 MB
- Parse time: ~500ms
- Render time: ~300ms
- **Total: ~2-3 seconds**

### After Phase 1 (Pagination + Column Selection)

**Pufflings Masterlist (50 rows × 10 cols):**
- Payload: ~50 KB (97% reduction)
- Parse time: ~50ms (90% reduction)
- Render time: ~50ms (83% reduction)
- **Total: ~200-300ms (10x faster)**

### After Phase 2+3 (Column Optimization + Caching)

**Subsequent page loads:**
- **Cached: ~10ms (300x faster than original)**
- Same page within cache window: instant
- Next/previous page: ~200ms (from cache or server)

### Mobile Impact

**Before:** Painful on 3G, very slow on 4G
**After:** Usable on 3G, fast on 4G

---

## Maintenance

### When to Update Queries

**Sheet structure changes:**
- Added/removed columns → Update `columns` parameter
- Changed column order → Update column letters in SELECT
- Added new sheet → Add to cache expiry config

**Example:** If you add a new "thumbnail" column Z to Pufflings:

```javascript
// Old:
columns: 'A, B, C, D, E'

// New:
columns: 'A, B, C, D, E, Z'  // Added thumbnail
```

### Monitoring

**Things to watch:**
- Page load times (Chrome DevTools)
- Cache hit rates (console.log already in code)
- Payload sizes (Network tab)

**Red flags:**
- Cache hit rate <70% → Cache expiry too short or users bypassing cache
- Payload suddenly larger → Check if query is correct
- Errors in console → Check GVIZ query syntax

---

## Alternatives Considered

### 1. Google Sheets API v4

**Verdict:** More work, no benefits

- ❌ No query language (have to calculate ranges manually)
- ❌ OAuth setup overhead
- ❌ More complex code
- ✅ Rate limits fine for your traffic (but still not worth it)

### 2. Server-Side Proxy (Node.js/Python)

**Verdict:** Overkill for solo project

- ✅ Could add server-side caching
- ✅ Could aggregate data from multiple sheets
- ❌ Requires hosting ($5-10/month)
- ❌ Deployment complexity
- ❌ More maintenance
- ❌ Latency from extra hop

**When to consider:** If you get 100k+ users or need private data

### 3. Pre-build Static JSON (CI/CD)

**Verdict:** You already do this for story content

- ✅ You use `sync_prompts.py` for static content
- ✅ Great for truly static data
- ❌ Not suitable for inventory (changes frequently)
- ❌ Requires rebuild for every masterlist update

**Current approach is good:** Static content via CI, dynamic via GVIZ

### 4. Move to Database (Firebase/Supabase)

**Verdict:** Way overkill

- ✅ Real-time updates, better queries, scalability
- ❌ Have to migrate all data
- ❌ Lose Google Sheets as CMS (easy for you to edit)
- ❌ Monthly costs
- ❌ Weeks of migration work

**When to consider:** If you need real-time updates or hit 10k+ users

---

## FAQ

### Q: Will this break existing functionality?

**A:** No, backward compatible. Default behavior (no options) works exactly like before.

```javascript
// Old way still works:
await charadex.importSheet('items');

// New way is optional:
await charadex.importSheet('items', { limit: 50 });
```

### Q: What if I need all 400 rows for a feature?

**A:** Either:
1. Load all pages and combine them
2. Use the old way for that specific call: `importSheet('Pufflings')` (no limit)
3. Use a high limit: `{ limit: 500 }`

### Q: Will users notice the pagination?

**A:** They'll notice it's faster. Add smooth scrolling/transitions for better UX.

### Q: How do I know which columns to select?

**A:** Check your render code. If you display `character.name` and `character.image`, find those columns in the sheet, select only those.

### Q: Can I search across all pages?

**A:** Two options:
1. Server-side: Use `WHERE name MATCHES '.*searchterm.*'`
2. Load all data: `{ limit: 500 }` or load all pages

### Q: What about sorting by different columns?

**A:** Change the `orderBy` parameter:

```javascript
// Sort by name:
{ orderBy: 'B ASC' }

// Sort by date:
{ orderBy: 'A DESC' }

// Sort by multiple columns:
{ orderBy: 'B ASC, A DESC' }
```

### Q: Is GVIZ going away?

**A:** Not officially deprecated, widely used. If Google ever announces deprecation (unlikely), you have years to migrate and the enhanced structure will make migration easier.

---

## Decision Matrix

|  | GVIZ Enhanced | Sheets API v4 | Status Quo |
|---|---------------|---------------|------------|
| **Implementation Time** | 2-4 hours | 20-30 hours | 0 hours |
| **Pagination Support** | ✅ Built-in (LIMIT/OFFSET) | ⚠️ Manual (range calc) | ❌ None |
| **Column Filtering** | ✅ SELECT clause | ⚠️ Fetch range, discard | ❌ Fetches all |
| **Server-Side Filtering** | ✅ WHERE clause | ❌ Client-side only | ❌ Client-side only |
| **Auth Complexity** | ✅ None | ❌ OAuth/Service Account | ✅ None |
| **Ongoing Maintenance** | ✅ Low | ⚠️ Medium | ✅ None |
| **Performance (400 rows)** | ✅ Excellent (50 row chunks) | ⚠️ OK (need manual chunking) | ❌ Slow (all at once) |
| **Code Simplicity** | ✅ Simple queries | ❌ Complex range logic | ✅ Simple |
| **Future-Proof** | ⚠️ Undocumented but stable | ✅ Official API | ⚠️ Will get worse |
| **Your Use Case Fit** | ✅✅✅ Perfect | ⚠️ Overkill | ❌ Doesn't scale |

**Winner:** GVIZ Enhanced

---

## Conclusion

**Recommendation: Enhance GVIZ with pagination and column selection**

**Why:**
- 2-4 hours work vs 20-30 hours for API v4
- Solves your actual problem (400-row sheet performance)
- Built-in query language perfect for pagination
- No auth complexity
- Backward compatible

**Don't overthink it.** Your current setup is 90% there, just needs:
1. Pagination for the big sheet (30 min)
2. Column selection (30 min)
3. Better caching (30 min)

**Total time: 1.5-2 hours for 10x performance improvement**

---

## Next Steps

1. **Measure baseline** (5 min)
   - Open masterlist page with DevTools Network tab
   - Note current payload size and load time

2. **Implement Phase 1** (1-2 hours)
   - Add options to importSheet()
   - Add pagination to masterlist page
   - Test

3. **Measure improvement** (5 min)
   - Check new payload size
   - Check new load time
   - Should see ~90-95% reduction

4. **Decide on Phase 2+3**
   - If Phase 1 solves your issue, you can stop
   - If you want more optimization, continue with column selection and caching

5. **Iterate**
   - Add pagination to other large sheets as needed
   - Optimize column selection for bandwidth-heavy pages
   - Adjust cache times based on actual usage

---

## Reference: GVIZ Query Language Quick Guide

```sql
-- Basic syntax:
SELECT columns WHERE condition ORDER BY column LIMIT n OFFSET m

-- Column selection:
SELECT *                    -- All columns
SELECT A, B, C              -- Specific columns
SELECT A, B, C, D, E, F    -- Multiple columns

-- Filtering:
WHERE A IS NOT NULL                          -- Required
WHERE A IS NOT NULL AND B = 'value'          -- Equality
WHERE A IS NOT NULL AND C > 100              -- Comparison
WHERE A IS NOT NULL AND B IN ('a', 'b')      -- Multiple values
WHERE B MATCHES '.*pattern.*'                -- Regex (case-sensitive)

-- Sorting:
ORDER BY A                  -- Ascending
ORDER BY A DESC            -- Descending
ORDER BY B ASC, A DESC     -- Multiple columns

-- Pagination:
LIMIT 50                   -- First 50 rows
LIMIT 50 OFFSET 0          -- First page (rows 1-50)
LIMIT 50 OFFSET 50         -- Second page (rows 51-100)
LIMIT 50 OFFSET 100        -- Third page (rows 101-150)

-- Aggregation (bonus):
SELECT A, COUNT(B) GROUP BY A
SELECT A, SUM(C), AVG(D) GROUP BY A
SELECT A, MIN(B), MAX(B) GROUP BY A

-- Column naming:
SELECT A, B LABEL A 'ID', B 'Name'

-- Formatting:
SELECT A, B FORMAT A 'MMM dd, yyyy', B '#,##0.00'
```

**Full reference:** https://developers.google.com/chart/interactive/docs/querylanguage

---

**Report by:** Claude
**For:** Solo dev optimization (not enterprise analysis)
**Version:** 2.0 (Practical Edition)
