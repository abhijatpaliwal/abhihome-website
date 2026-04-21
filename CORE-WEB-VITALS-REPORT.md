# Core Web Vitals Audit — abhihome.in

**Date:** 2026-04-21
**Scope:** Static audit of 139-URL site (7 core product pages + homepage + 132 programmatic geo pages + about/contact/etc.)
**Method:** Direct source inspection + image payload analysis. Google PageSpeed Insights API was rate-limited (429) during attempts; findings below are based on static evidence that is sufficient to identify the dominant issues.

---

## TL;DR

The **132 geo programmatic pages are clean** — they contain zero `<img>` tags and use CSS patterns only, so LCP/CLS there should be good out of the gate. The **7 core product pages are the problem**, with `cushions.html` being catastrophic.

Three findings matter:

1. **Cushions page ships 155 MB of images eagerly.** 59 `<img>` tags, all un-lazy, no WebP. On mobile 4G this is a 30–60 second load. Guaranteed LCP failure.
2. **Zero lazy-loading across the entire site.** Every page with images fetches them all on initial load.
3. **Zero WebP adoption.** 137 raster files totaling 261 MB in `/images/`, every one of them JPG/PNG at 2–9 MB each.

None of these are Vercel/CDN problems — the CDN is correctly serving what the HTML asks for. The fix is in the source.

---

## Finding 1 — Image payload (CRITICAL)

| Page           | Images | Total eager bytes | Largest single |
|----------------|-------:|------------------:|---------------:|
| cushions.html  |     59 |         **155 MB** |         7.3 MB |
| kitchen.html   |     28 |          35 MB    |         8.4 MB |
| bedding.html   |     15 |          32 MB    |         9.1 MB |
| pouffe.html    |      9 |           7.8 MB  |         ~2 MB  |
| throws.html    |      7 |           6.6 MB  |         ~2 MB  |
| bath.html      |      9 |           5.5 MB  |         ~1 MB  |
| about.html     |      1 |           1.9 MB  |         1.9 MB |
| index.html     |      0 | 0 (CSS patterns)  |       —        |
| geo pages (×132)|     0 | 0 (CSS patterns)  |       —        |

20+ images exceed 4 MB. The worst offender is `images/Bedding/Coverlet-Bedspread/AH-DC-24-1214.png` at 9.1 MB — a PNG where WebP or JPEG would drop that to ~200 KB.

**Impact:** On a typical mobile connection (~1.6 MB/s downlink, Moto G4 profile used by Lighthouse), 155 MB is ~95 seconds of network transfer. LCP will score 0 on cushions.html.

**Fix (in priority order):**

1. **Add `loading="lazy"` to every non-hero `<img>`.** The first 1–2 images above the fold stay eager; everything else lazy. This alone cuts initial payload on cushions.html from 155 MB to ~4 MB.
2. **Convert all 137 images to WebP at quality 80.** Expected ~85% size reduction. 261 MB → ~40 MB total library.
3. **Re-export originals at max 1600px long-edge, quality 80.** Products currently include phone-camera originals at 4000×3000. No product tile needs more than 1200px wide.
4. **Add `width` and `height` attributes** to every `<img>` to prevent CLS during load.

---

## Finding 2 — Zero lazy-loading (HIGH)

Grep across every HTML file in the site:

```
loading="lazy"  →  0 occurrences
```

Every `<img>` on every page is eager-loaded. Modern browsers support `loading="lazy"` natively — it's a one-attribute fix with no JavaScript required.

**Fix:** Bulk-edit all `<img>` tags. Keep the first image per page eager (it's almost certainly LCP); mark everything below the fold as `loading="lazy"`.

---

## Finding 3 — Zero WebP (HIGH)

```
/images/ total:   261 MB across 137 files
WebP files:       0
JPG/PNG files:    137
```

WebP gives ~25–35% smaller files than JPEG at visually equivalent quality, and ~50–80% smaller than PNG. Chrome/Edge/Safari/Firefox have all supported WebP for 2+ years.

**Fix:** Batch-convert with `cwebp -q 80` or a Node script using `sharp`. Update `<img>` `src` attributes (or use `<picture>` with a JPEG fallback if you want to be cautious — though honestly, WebP support is universal now).

---

## Finding 4 — Font loading (LOW)

`index.html` preconnects to `fonts.googleapis.com` but **not** to `fonts.gstatic.com`, which is where the actual font files live. The CSS stylesheet loads from `.googleapis.com`, then the browser has to resolve a second domain to fetch the WOFF2 files.

**Fix:** Add one line to `<head>`:

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

Saves ~100–200ms of font FCP on cold visits.

---

## Finding 5 — Inline CSS size (LOW)

`index.html` has 704 lines of inline `<style>` plus an external `css/style.css` at 22 KB. Most core pages inline ~600–800 lines of CSS. This is fine for first paint (saves a round trip) but bloats HTML. Only worth addressing if you're already touching the templates.

**Recommendation:** Defer. Worth revisiting after images are fixed, not before.

---

## Finding 6 — What's NOT a problem

To be clear about what you don't need to worry about:

- **Geo pages (132 URLs).** Zero images, CSS-patterned hero blocks. Expected CWV: all green.
- **Homepage.** Zero `<img>` tags. Expected CWV: all green.
- **Service worker / JS bundles.** Site is nearly zero-JS. INP should be excellent.
- **Server response time.** Vercel edge serves static HTML in <50ms globally. TTFB is not the bottleneck.
- **Render-blocking CSS.** External CSS is 22 KB — small enough that blocking is fine.

---

## Recommended execution order

This matters because you've asked about round-2 programmatic SEO (90 city-level pages) next. **If you template-duplicate the current image patterns, you multiply the problem.** The geo pages dodged this because they have no images. City pages would too, if we follow the same pattern.

**My recommendation:**

1. **Now — 30 min work:** Bulk-add `loading="lazy"` to every non-LCP `<img>` across all core product pages. One-line Python regex pass. Zero risk, massive win.
2. **Now — 15 min work:** Add `fonts.gstatic.com` preconnect to every page. One-line sed pass.
3. **This week — 2 hr work:** Batch-resize + convert all 137 images to WebP at max 1600px / q80. Requires `cwebp` or `sharp`. Keeps filenames, just changes extensions. Update `<img src>` references.
4. **Then:** Round-2 city pages (using the same image-free pattern as geo pages — problem doesn't recur).
5. **Later — when you want to validate:** Run PSI from your own machine with an API key (curl from sandbox is rate-limited). Target: LCP <2.5s on cushions.html mobile.

Steps 1–3 will take cushions.html from a probable Lighthouse score of ~15 (mobile) to ~85+, without changing a single visual.

---

## Ready-to-run fix commands

These are proposed but not yet executed. Tell me which to run.

**Step 1 — Add lazy-loading (safe, idempotent):**
```bash
python3 /sessions/funny-wonderful-maxwell/add_lazy_loading.py
```
(Script would: for each HTML file, find all `<img>` tags beyond the first, inject `loading="lazy"` if not already present.)

**Step 2 — Add font preconnect:**
```bash
python3 /sessions/funny-wonderful-maxwell/add_font_preconnect.py
```

**Step 3 — Convert to WebP (requires `cwebp`):**
```bash
brew install webp  # one-time
python3 /sessions/funny-wonderful-maxwell/convert_images_webp.py
```
(Script would: recursively find JPG/PNG, resize to 1600px max, convert to WebP q80, update HTML refs.)

None of these scripts exist yet — I'll write them once you confirm the plan.
