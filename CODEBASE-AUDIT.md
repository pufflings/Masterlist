# Pufflings Masterlist — Codebase Audit

**Date:** 2026-07-01
**Scope:** Full repository audit — bugs, exploits, UX, code quality, documentation.
**Method:** Six parallel reviews (core JS framework, page scripts, security, HTML/UX, Python tooling & data, documentation), with the highest-impact findings re-verified by hand against the source.
**Lens:** The project explicitly values *ease of understanding and use over optimization*. Findings and recommendations are prioritized accordingly — clarity and correctness first, performance last.

---

## What this project is

A static [Charadex](https://github.com/cheeriko/charadex)-based character masterlist site for the Pufflings ARPG art community, hosted on GitHub Pages. There is no traditional backend: every page fetches data from a **public Google Sheet** at load time and renders it client-side (jQuery + List.js). A small Python toolchain (`tools/`) syncs story "prompt" pages from Google Docs via a manually-triggered GitHub Action. "Login" is a self-described *faux* identity stored in `localStorage` — it gates nothing sensitive.

Roughly 7,300 lines of JS/Python across 52 HTML pages. Understanding this threat model matters for severity: the "database" is a spreadsheet editable only by staff, so most injection risks require staff write access (or staff pasting unsanitized user text into a cell).

---

## Executive summary

The framework is clean and readable at a high level — a "convention over configuration" system where declarative page configs drive a shared list/gallery/profile engine. The most valuable fixes are not big rewrites; they are a handful of small, concrete corrections plus some missing documentation.

**Top priorities (do these first):**

1. **Site-wide sort is silently broken** — a config/code field-name mismatch means most galleries display in raw sheet order, not the intended order. *(High, one-line-per-page fix.)*
2. **`robot.txt` is misnamed** — it should be `robots.txt`; as-is the site's own "don't index me" intent silently fails. *(Trivial fix, rename the file.)*
3. **Prompt-sync workflow can silently delete live story chapters** — it wipes `prompts/` before regenerating and never fails the job on a partial error. *(Operational data-loss risk.)*
4. **Stored-XSS pattern throughout** — Google Sheet values are written into the page via `innerHTML`/`.html()` without escaping. Staff-only threat model keeps this out of "Critical," but it's real and recurring. *(High.)*
5. **No README / onboarding docs at all** — a new volunteer maintainer would have to reverse-engineer the whole system. *(High for a hobbyist-maintained project.)*

**Cross-cutting themes:** (a) copy-paste drift between near-identical files that has already produced divergent behavior; (b) unescaped sheet data flowing into HTML; (c) several code paths that silently diverge from what their config/comments claim; (d) a total absence of onboarding documentation.

---

## Cross-cutting themes

### Theme 1 — Copy-paste drift between near-identical files
`shop.js`, `poki-shop.js`, and `exchange-shop.js` are three ~170-line near-duplicates (a 4-line diff between the first two), and the many `masterlist-*.html` / `seekers-*.html` / `prompts-*.html` shells are near-identical templates. This pattern is the *root cause* of several individual bugs below (the "Limited" badge inconsistency, the MYO-slot title mixup, divergent HTML-vs-JSON story parsing). Every fix or feature must currently be applied in up to three places by hand to stay consistent. Given the ease-of-understanding goal, consolidating the shop scripts into one shared module (config-driven, like the rest of the site) is the single highest-leverage refactor available.

### Theme 2 — Unescaped Google Sheet data → HTML (stored XSS)
The core list renderer (List.js) and many hand-written page scripts interpolate raw sheet strings into `innerHTML`/jQuery `.html()`. Any HTML that lands in a sheet cell — via a malicious/compromised staff editor, or (more realistically) staff pasting a user-supplied character name / trade note / Discord username verbatim — becomes persistent, sitewide script execution for every visitor. It's rated High rather than Critical only because it requires sheet write access. There's already an `escapeHtml()` helper in `quest-rewards.js:186` that the other scripts should reuse.

### Theme 3 — Code silently diverges from its config/comments
Several core paths don't do what the config or comments say: the sort-property mismatch (below), a "load related data in parallel" optimization whose results are discarded and re-fetched (`charadex.js:66-77`), a comment describing field-name fallbacks that don't exist (`masterlist.js:162`), and dead config flags (`caseSensitive: false`, a no-op `performance.log()` stub). These mislead a maintainer more than they break the site today.

### Theme 4 — No onboarding documentation
No README, no CONTRIBUTING, no architecture notes. The undocumented "magic" (sheet column headers → JS keys, the shell-page/`includes/` mechanism, the prompt pipeline, what `SQL/` is for) all lives only in maintainers' heads. Details in the Documentation section.

---

## Bugs & correctness

### High

- **Site-wide sort is a no-op (config/code field mismatch).** `charadex.js:92,244` sort by `config.sort.sortProperty`, but nearly every page config defines the key as `key: "id"` (or `"enddate"`, `"timestamp"`) instead of `sortProperty` (`config.js:158,226,294,341,435,485,564,…`). Only the inventory/items/collectibles configs use `sortProperty` (`config.js:635,737,770`). Because `sort.toggle` is `true` on these pages (verified, e.g. `config.js:157`) but `config.sort.sortProperty` is `undefined`, the comparator compares `a[undefined]` for every row — all equal — so `.sort()` does nothing; `desc` pages then `.reverse()` raw sheet order. **Effect:** masterlist, seekers, traits, items, news, and prompts display in sheet-insertion order, not the intended order, the moment a row is inserted anywhere but the bottom. **Fix:** rename `key:` → `sortProperty:` in the affected config blocks (or make the code read `config.sort.key`).

- **`importSheet` crashes with a misleading error on any fetch failure.** `utilities.js:697` — `fetch(...).then(i => i.text()).catch(err => { return console.error(...); })`; `console.error` returns `undefined`, so the next line `JSON.parse(sheetJSON.substring(47)…)` throws `Cannot read properties of undefined (reading 'substring')`. A single flaky Google Sheets request (rate limit, renamed sheet, offline) crashes page init with a confusing error instead of a clean "sheet unavailable" message. **Fix:** on fetch failure, show a user-facing error and abort cleanly.

- **CYOA story engine throws on any load failure instead of showing its error message.** `cyoa-story.js:44-53` calls `displayScene(this.currentScene)` even when `loadStoryData()` failed, but `this.storyData` is still `null`, so `displayScene` throws `Cannot read properties of null (reading 'scenes')`. A story-JSON 404/parse error, or a page missing `#dialogue-stage`, kills the script instead of rendering the `showErrorMessage()` that exists for exactly this case. **Fix:** guard `displayScene` on `this.storyData` and call `showErrorMessage()` on failure.

- **Prompt-sync workflow can permanently delete live chapters.** `.github/workflows/manual.yml:28` runs `find prompts -mindepth 1 -not -name 'example.html' -delete` *before* regenerating, and `tools/sync_prompts.py` catches per-document errors and continues without ever `sys.exit(1)`. If one Google Doc fails to parse while others succeed, the job still exits 0 and the commit step removes that chapter's HTML/JSON from the live site, with no signal beyond a log line in a green run. **Fix:** regenerate into a temp dir and swap only on full success, or `sys.exit(1)` if any document was skipped.

- **`slimeHunt.json` dice scenes dead-end 35% of rolls.** Several scenes map only 1–1, 7–12, 13–18, 20–20 of a d20, leaving 2–6 and 19 unmapped (scene3, scene4, scene14, scene15, scene25, scene26). `cyoa-story.js:439` then shows `Roll {n} not mapped. Try again.` and the player is stuck re-rolling. `AdventureQuest.json`/`SideQuestCasual1.json` have full coverage, so this is a data-authoring defect the generators never validate. **Fix:** correct the JSON ranges; add a coverage check to the generator.

- **HTML and JSON story generators parse `[Name | X]` incompatibly.** `storyJsonGenerator.py:218` treats the second column as a *display-name override*; `storyHtmlGenerator.py:215` treats it as a *modifier* (e.g. `right`/`hidden`). Since `sync_prompts.py` runs both over the same doc, `[Selene | right]` renders correctly in HTML but shows the name literally as "right" in JSON, and `[Selene | Selene of the North]` works in JSON but is dropped in HTML. **Fix:** extract one shared parser used by both generators.

### Medium

- **Items list-view stock/exchange callouts are templated but never populated.** `items.js:125` gates the callout logic on `if (listData.type !== 'profile') return;`, but `items.html:199-200` puts `.stockcallout`/`.exchangecallout` divs in the *gallery* card template. The "Currently in stock!" / "Available in the Exchange Shop!" badges only ever appear on an item's profile page, silently missing from the grid. (`styles/js/pages/items.js:116-156`)

- **"Limited" badge diverges across the three shop pages.** `poki-shop.js:55` reads `item.limited` (Items sheet); `exchange-shop.js:61` reads `shopEntry.limited` (Exchange sheet); `shop.js` has no Limited rendering at all. Same conceptual badge, three behaviors, no comment explaining it — a direct symptom of Theme 1.

- **`base.js` races the async header on every page.** `base.js:28-103` waits a blind `setTimeout(…, 500)` for `#clear-cache-btn` / `#user-section` / `#login-section`, which live in the asynchronously-injected `includes/header.html`. Other pages correctly listen for the `charadex:includeLoaded` event (`masterlist.js:37`, `seekers.js:25`, `prompts.js:8`). On a slow load the login/logout and clear-cache buttons silently fail site-wide with only a `console.warn`. **Fix:** listen for `charadex:includeLoaded` instead of the timeout.

- **List.js multi-value filter only checks the first value.** `list.js:160-168` — `for (let val of values) return selection.includes(val);` returns on the first iteration, so a design tagged `["MYO Slot", "Guest Design"]` filtered by "Guest Design" wrongly disappears. **Fix:** `return values.some(v => selection.includes(v));`

- **`filterArray` mutates the source data.** `utilities.js:494-523` does `item[key] = item[key].map(scrub)` inside the filter callback, permanently lowercasing/stripping array-valued fields on the real objects; if that field is later rendered as badges, the display text is corrupted (`"Guest Design"` → `"guestdesign"`) for the rest of the page's life whenever a URL filter targets it.

- **List.js columns inferred from only the first 5 rows.** `utilities.js:275` — `sheetArray.slice(0, 5).flatMap(Object.keys)`. Conditionally-set fields (`raritybadge`, `profileid`) that are absent in the first 5 rows never get bound for *any* row. **Fix:** scan all rows (or a config-declared field list).

- **Hardcoded sheet name bypasses the config constant.** `masterlist.js:150` hardcodes `relatedData['masterlist log']` instead of `…[charadex.sheet.pages.masterlistLog]` (`config.js:39`). Rename that tab via config and the masterlist log silently vanishes from profiles while everything else keeps working.

- **`example.html` lists itself as a story chapter.** `update_prompt_index.py:23` globs `*.html` with no exclusion, so `prompt-index.json` includes `example.html` — the template page the workflow deliberately preserves — and it renders as a clickable "chapter." **Fix:** exclude `example.html` from the glob.

- **Custom sort order yields `NaN` for unmatched values.** `sortArray` (`utilities.js:473`) does `orderMap.get(a[key]) - orderMap.get(b[key])`; a typo/whitespace/absent option returns `undefined`, so the comparator returns `NaN` → unpredictable ordering for those rows.

- **Invalid `Type:` silently degrades a dice story to a flat page.** Both generators coerce an unknown `Type:` (e.g. `Dyce`) to `'simple'` with no warning (`storyJsonGenerator.py:44`, `storyHtmlGenerator.py:65`), dropping the CYOA script/attributes with no error surfaced.

- **Missing `data-start-scene` → blank dialogue with no on-page error.** `storyHtmlGenerator.py:289` emits `data-start-scene=""` if no section is tagged `start` (or two are); `cyoa-story.js` then renders an empty stage with only a console message. **Fix:** validate exactly one start scene at generation time.

### Low (selected)

- **Dead/broken duplicate function:** `charadex.manageData.addProfileLinks` (`utilities.js:641`) references `charadex.manage.url`, a namespace that doesn't exist — it throws if ever called, and duplicates the working `charadex.tools.addProfileLinks`.
- **CYOA "Skip" button leaves the first line hidden** (`cyoa-story.js:677`): `startIndex` subtraction ignores the injected `<hr>` and choices elements, so the separator and first dialogue line stay hidden after Skip.
- **`retryChoice()` never resets `currentSceneDialogueIndex`** (`cyoa-story.js:563`), corrupting click-to-reveal if a user retries an earlier scene after advancing.
- **`getBasePath()` hardcodes the repo name** `['Masterlist_v2', 'Masterlist']` (`utilities.js:114`); rename the repo and every relative link/image breaks silently.
- **`id === 0` treated as missing** across shop/items ID maps (`if (item.id)`), silently excluding a legitimately-zero id from matching.
- **`hide` column expects a real checkbox:** a cell containing the literal text `"FALSE"` is truthy, so the row is wrongly hidden (`utilities.js:727`) — no comment warns of this.
- **`gen_puffling_id()` reuses deleted IDs** (`SQL/createDb.sql:122`) by counting rows instead of tracking a max — latent, since the SQL is unused (see below).
- **Duplicate `id="entryPrev"`/`id="entryNext"`** across three tab panes in `inventories.html:139,406,516` — prev/next can only ever address the first tab.
- **Unfiltered empty tag tokens** (`faqs.js:20`): a trailing comma in a tags cell renders a blank `#` pill.
- **`scrollToTopButton` unguarded** (`prompt.js:225`): latent throw on any prompt page missing `#scroll-to-top` (all current pages include it).

---

## Security & exploits

Threat model: static site, public Google Sheet editable only by staff, faux login that gates nothing. No hardcoded secrets, API keys, or credentials anywhere in the JS/SQL/workflow. The Action handles its `GOOGLE_SERVICE_ACCOUNT`/`GOOGLE_DRIVE_FOLDER_ID` secrets correctly (env-var passing, no untrusted `workflow_dispatch` inputs, read-only Drive scope). No Critical issues.

### High

- **Stored XSS via unescaped sheet data (site-wide).** See Theme 2. Concrete sinks: the List.js templater renders every non-image/link field via `.innerHTML` (`list.js`, `utilities.js:273-287`); `shop.js:75,83` and its two clones interpolate raw item `name`/`description`; `traits.js:107` (`$(…).html(longDesc)`), `traits.js:91` and `items.js:220` build `<img>`/`<a>` from sheet fields; `masterlist.js:231,235,242` interpolate `data.image` into `src="${…}"` with no quote-escaping (a `"` in a URL breaks out of the attribute); `charadex.js:46` builds `raritybadge` from the raw `rarity` cell. **Fix:** reuse `escapeHtml()` from `quest-rewards.js:186` before interpolation, or patch/replace the List.js templater to default to `textContent`.

### Medium

- **Login username dropdown built from sheet usernames via raw `innerHTML`** (`login.js:153-159`) — a username cell containing HTML executes for anyone typing 3+ matching characters. **Fix:** escape, or build anchors with `textContent`.
- **Quest-reward "codes" have no integrity check** (`quest-rewards.js`): the page is public and unauthenticated, and base64-encodes client-computed rewards into a code presumably applied by a mod/bot. Anyone can call `encodeUrlSafeBase64({items:{Coins:99999}})` in devtools. Real risk depends entirely on the out-of-band review process. **Fix:** have the downstream bot recompute rewards from the original submission rather than trusting the client blob.
- **No Subresource Integrity on List.js** (`list.js:5`, `import … from "https://esm.sh/gh/javve/list.js@v2.3.0"`) — unlike the jQuery/Bootstrap `<script>` tags which pin `integrity`. An esm.sh compromise or a moved upstream tag injects JS into every page. **Fix:** vendor list.js into `styles/js/vendor/` and import locally.
- **`robot.txt` misnamed** (should be `robots.txt`) — crawlers never read `/robot.txt`, so the intended `Disallow: /` (reinforced by `noai` meta tags) silently fails and the whole site — including inventories with real usernames — is fully crawlable. **Fix:** rename the file.

### Low

- **Faux auth is by-design, not a flaw** (`auth.js:1-9`, disclosed in `login.html`) — impersonating any username is trivial, but nothing privileged is gated on it. Flagged only so nothing sensitive is ever gated on `auth.isLoggedIn()` later.
- **Self-XSS via unescaped `localStorage` username** in the coin-balance widgets (`shop.js:157`, clones) — only exploitable against oneself.
- **Workflow `contents: write` is repo-wide** though the job only touches `prompts/` — tighten if convenient (low risk, no injection vector present).

---

## UX & accessibility

### Critical (user-visible breakage / wrong intent)

- **`masterlist-myo-slot.html:14-17`** — `<title>`, meta title, and OG url are copy-pasted from `masterlist-myo.html` and identify the page as "MYO Design" instead of "MYO Slots" (the in-page `data-masterlist-title` on line 71 is correct). Tab title and link previews mislabel the page.
- **`terms.html:70`** — the Terms of Service still contains the unfilled Charadex placeholder `All owners of [species] are covered under the following Terms of Service`, and the page is orphaned (the nav "TOS" link points to an external toyhou.se page), so template boilerplate is live as actual legal text.
- **`prompts/Prologue-Chapter3.html:585`** — dead link `<a href="peridot">` (bare, non-existent target) where siblings use the full `masterlist-npc.html?profile=peridot` URL.

### High

- **Entire site is unusable with JS disabled — no `<noscript>` anywhere.** All header/footer/content is injected via `class="load-html"` fetches (`utilities.js`); jQuery/Bootstrap/Font Awesome all load from third-party CDNs with no local fallback. Any script failure yields a blank page with no nav, footer, or message. **Fix:** add a `<noscript>` explaining the site needs JavaScript.
- **Missing `alt` text on essentially all content images** (character/item/trait/staff), set in exactly one place (`seekers.js:172`). `masterlist.js:231` builds `<img … src="${data.image}">` with no alt; the hidden templates in `index.html`, `inventories.html`, `items.html`, `traits.html`, `staff.html`, and the `includes/*-base.html` all ship `src=""` with no alt for JS to fill. For an image-gallery site this is a significant screen-reader gap.
- **No real Open Graph / Twitter Card tags** — pages use non-standard `<meta name="title|url|image|type">` instead of `property="og:*"` / `name="twitter:*"` (zero `og:`/`twitter:` matches repo-wide). Link shares in the community's own Discord won't render rich previews despite the fields clearly being intended for it.
- **Orphaned pages reachable only by direct URL:** `quest-rewards.html`, `world.html`, `species.html` are linked from nowhere (nav items commented out in `includes/header.html:26-27,37`), and `world.html:74`/`species.html:74` still contain Charadex placeholder copy ("This is where you can write about your world and stuff!!").
- **Bare relative links inside `/prompts/`** (e.g. `prompts/Prologue-Chapter5.html:946`, `<a href="masterlist.html?profile=clover">`) are only correct at site root; sibling NPC links use absolute URLs. Runtime `applyBasePath()` mitigates this *only if JS runs*, with a wrong-link window before it fires.

### Medium

- Most pages leave `<meta name="url">` at the homepage default instead of their own URL (only a handful self-reference correctly).
- No `<h1>` on any page — content starts at `<h2>`/`<h3>`, losing the main-heading landmark.
- Search inputs (`includes/*-base.html`) have only a `placeholder`, no `<label>` — repeats across every listing page.
- Duplicate `content="noai"` / `noimageai` `<meta name="robots">` tags on every page; combine into one `content="noai, noimageai"`.
- Commented-out nav items leave `world.html`/`species.html`/`masterlist.html`/`faq.html` unreachable from the menu while still live.

### Low

- Low-contrast footer copyright (`opacity:.5; font-size:.8rem`, `includes/footer.html:6`).
- Inconsistent `id="header"/"footer"` on the load-html wrappers (some pages omit it).
- `href="#"` nav items (Clear Cache, profile/logout) are dead links with JS disabled.
- No `sitemap.xml` or `rel="canonical"`.

---

## Code quality & maintainability

- **Consolidate the three shop scripts** (`shop.js`/`poki-shop.js`/`exchange-shop.js`) — near-duplicates that have already drifted (the "Limited" badge). This is the highest-leverage cleanup and directly serves the ease-of-understanding goal. Ideally fold shops into the same config-driven `charadex.page.*` pattern the rest of the site uses; today they bypass it entirely with no `charadex.page.shop` entry.
- **Reuse `charadex.tools.scrub()` for profile-link slugs.** `masterlist.js:133,138`, `index.js:132`, `seekers.js:117,122,151`, `traits.js:51,56` hand-roll `x.toLowerCase().replace(/\s+/g,'')` — a strictly weaker duplicate of the existing helper (which also strips punctuation), used for the same purpose elsewhere *in the same files*.
- **Share one parser between the two story generators** (`storyJsonGenerator.py` / `storyHtmlGenerator.py`) — BOM handling, character-line parsing, `[header|…]` splitting, and markdown conversion are each implemented twice, and that duplication *is* the divergent-parsing bug above.
- **Remove dead code that implies working features:** the discarded parallel-preload in `charadex.js:66-77`, the broken `manageData.addProfileLinks`, `caseSensitive: false`, the no-op `performance.log()` stub, and the unreachable `design['Design Type']` fallback (`index.js:119`, since headers are normalized to `designtype`).
- **Fix misleading comments:** `masterlist.js:162` ("try different possible field names" above code that reads one field), the broken `/ Frequently updated…` comment at `utilities.js:670`, and gate the unconditional `console.log` in `cyoa-story.js:9` behind the hostname check used elsewhere.
- **Document `scrub()`'s dual return type** (`utilities.js:24`) — numeric-looking strings become `Number`s, everything else stays `String`; relied on implicitly by filter/search with no comment.
- **Generators write output next to the script**, not into `prompts/` (`storyJsonGenerator.py:294`), so a maintainer following the printed `Usage:` finds output in `tools/` — undocumented footgun for manual runs.
- **`.gitignore`** covers only Python bytecode; add `.cache/`, `.venv/`, `.DS_Store`.

---

## Documentation & onboarding

The project's stated priority is ease of understanding, and this is where it falls shortest — there is **no README, no CONTRIBUTING, and no architecture notes**. Everything a new maintainer needs is currently reverse-engineered from code.

**Top 5 documentation additions (prioritized):**

1. **Root `README.md`** — what the site is; local dev (Live Server on port 5501, per `.vscode/settings.json` and the `isLocalhost` check in `config.js:24`); where the Google Sheet lives and how `charadex.sheet.id`/`pages` map to its tabs; the page types; and how deployment actually works (GitHub Pages branch settings — `manual.yml` is *only* prompt-sync, not deployment).
2. **`CONTRIBUTING.md` for non-programmer staff** — step-by-step for the real recurring tasks: adding a shop item, a masterlist/seeker entry, and a prompt (Google Doc → sync workflow → `prompts/`, including when to re-run `update_prompt_index.py`), referencing the exact sheet tab names from `config.js:37-54`.
3. **Document the sheet-column → JS-key convention** near `charadex.importSheet` (`utilities.js:659`): headers are lowercased with whitespace stripped ("Design Type" → `designtype`), and any row with a truthy `hide` column is dropped. This single undocumented rule underlies every config; renaming a column silently breaks the site.
4. **Explain the shell-page + `includes/` pattern** — how `masterlist.html` vs `masterlist-myo.html` vs `includes/masterlist-base.html` relate, and the `data-*` attribute contract each base include expects — so new filtered variants can be added without guesswork.
5. **Resolve or annotate orphaned subsystems** — mark `SQL/` as unused/experimental or delete it (confirmed: nothing in the repo references it; the live backend is the sheet), and add top-of-file notes distinguishing `personalityTest.html` (standalone quiz) from `cyoa-story.js` + `prompts/CYOA/` (sheet-driven dialogue) so neither is mistaken for the other or for dead code.

Also: the Charadex template comments (e.g. "This is where the real magic happens", `charadex.js:10`) are left unmarked, so nothing distinguishes Pufflings-custom code (auth, caching, shops, prompt pipeline) from upstream template — consider `// PUFFLINGS CUSTOM:` markers or a short `CUSTOMIZATIONS.md`.

---

## Suggested order of work

**Quick wins (minutes each, high value):**
- Rename `robot.txt` → `robots.txt`.
- Fix `masterlist-myo-slot.html` title/meta; fix the `href="peridot"` dead link; fill in or remove the `terms.html`/`world.html`/`species.html` placeholder copy.
- Fix the sort config (`key:` → `sortProperty:`), the List.js multi-value filter, and exclude `example.html` from the prompt index.
- Correct the `slimeHunt.json` dice ranges.

**Short projects (an afternoon):**
- Add `escapeHtml()` to the sheet-data sinks (Theme 2); add a `<noscript>` and image `alt` text; add real `og:`/`twitter:` tags.
- Make the prompt-sync workflow fail-safe (temp dir + swap, or `sys.exit(1)` on skips).
- Switch `base.js` to the `charadex:includeLoaded` event.
- Write the README + CONTRIBUTING.

**Larger refactors (optional, for long-term maintainability):**
- Consolidate the three shop scripts (and ideally fold them into the config system).
- Extract a shared story parser for the two Python generators.
- Vendor List.js locally with SRI.

---

*Full per-area findings with line-level detail were produced by six focused review passes; the items above consolidate and de-duplicate them, with the headline bugs (sort mismatch, `robot.txt`, workflow deletion) re-verified by hand against the source.*
