# Abhi Home — GSC & Bing Submission Checklist

**Goal:** Get the newly-published 132 geo landing pages (+ updated core pages) crawled, indexed, and ranking in Google and Bing as fast as possible.

**Current state (2026-04-21):**
- Sitemap live at `https://www.abhihome.in/sitemap.xml` — 145 URLs (13 core + 132 geo).
- `robots.txt` correctly references the sitemap.
- Vercel auto-deploys on `git push origin main` — give ~60 seconds after push for deploy.

---

## Step 0 — Pre-flight (5 min)

Before doing anything in Google or Bing, confirm the site is actually serving the new pages.

- [ ] Open `https://www.abhihome.in/sitemap.xml` in a browser — should show 145 `<url>` entries.
- [ ] Open 3 random new URLs to confirm they render:
  - `https://www.abhihome.in/bedding-manufacturer-de.html`
  - `https://www.abhihome.in/cushion-manufacturer-fr.html`
  - `https://www.abhihome.in/bath-textile-manufacturer-jp.html`
- [ ] Open homepage — scroll to bottom, confirm "Country Programmes for Retail Buyers" section is visible with 12 country tiles.
- [ ] **Fix `robots.txt`:** the current `robots.txt` references `https://www.abhihome.in/sitemap-images.xml` which returns 404. Either delete that line from `robots.txt` OR generate an image sitemap. Leaving the stale reference creates crawl-budget waste — small, but worth cleaning up.

---

## Step 1 — Google Search Console (20 min)

### 1.1 Re-submit the sitemap

1. Go to `https://search.google.com/search-console` and select the `www.abhihome.in` property.
2. Left sidebar → **Sitemaps**.
3. If `sitemap.xml` is already submitted: click it, then click **Resubmit**. Otherwise, in the "Add a new sitemap" box type `sitemap.xml` and click **Submit**.
4. Wait 2-3 minutes, then refresh. Status should show **Success** with "145 URLs discovered" (or close).

### 1.2 Request indexing for priority URLs

GSC allows ~10-15 URL inspection requests per day before it throttles. Spend them on the highest-value pages. For each URL below:

1. Paste URL into the search bar at the top of GSC.
2. Click **Test live URL** → wait for the test to complete.
3. If the page is crawlable: click **Request indexing**.
4. Repeat for the next URL.

**Priority URL list (top 15 — submit these first):**

| # | URL | Why it matters |
|---|---|---|
| 1 | `https://www.abhihome.in/` | Homepage carries the new Country Programmes block — Google needs to see it to discover the 12 new internal links |
| 2 | `https://www.abhihome.in/bedding.html` | Largest product category, now links to 6 geo pages |
| 3 | `https://www.abhihome.in/cushions.html` | Flagship UK pilot product, now links to 6 geo pages |
| 4 | `https://www.abhihome.in/bath.html` | Links to 6 geo pages including JP and AE hospitality markets |
| 5 | `https://www.abhihome.in/bedding-manufacturer-us.html` | Largest home textile market globally |
| 6 | `https://www.abhihome.in/bedding-manufacturer-uk.html` | English-speaking + high PPC CPC = high organic value |
| 7 | `https://www.abhihome.in/bedding-manufacturer-de.html` | Largest EU home textile market |
| 8 | `https://www.abhihome.in/bedding-manufacturer-au.html` | Strong AUD buying power |
| 9 | `https://www.abhihome.in/cushion-manufacturer-us.html` | US cushion import market |
| 10 | `https://www.abhihome.in/cushion-manufacturer-de.html` | German retail cushion buyers |
| 11 | `https://www.abhihome.in/cushion-manufacturer-fr.html` | French fashion-led buyers |
| 12 | `https://www.abhihome.in/bath-textile-manufacturer-jp.html` | Japanese hospitality/ryokan |
| 13 | `https://www.abhihome.in/bath-textile-manufacturer-ae.html` | UAE hotel and villa market |
| 14 | `https://www.abhihome.in/kitchen-linen-manufacturer-us.html` | US retailer kitchen programmes |
| 15 | `https://www.abhihome.in/throws-manufacturer-us.html` | US throws category |

**Day 2 — second batch (15 more):**

- `cushion-manufacturer-uk.html` (already live, but the Country Programmes update on homepage changes link signals)
- `bedding-manufacturer-fr.html`, `bedding-manufacturer-ca.html`, `bedding-manufacturer-br.html`, `bedding-manufacturer-es.html`, `bedding-manufacturer-it.html`, `bedding-manufacturer-nl.html`
- `cushion-manufacturer-it.html`, `cushion-manufacturer-au.html`, `cushion-manufacturer-ae.html`, `cushion-manufacturer-ca.html`
- `bath-textile-manufacturer-us.html`, `bath-textile-manufacturer-uk.html`, `bath-textile-manufacturer-de.html`, `bath-textile-manufacturer-fr.html`

**Day 3-10 — spread the remaining 100+ geo URLs across 10-15 per day.** Don't burn through the quota on one day. Priority order: markets with highest import volume and most active buyers (English-speaking + Western Europe first, then Gulf + APAC, then Eastern Europe, then LATAM).

### 1.3 Monitor indexation progress

- Left sidebar → **Pages** (under Indexing).
- Track the "Not indexed" count — it should decrease week over week.
- Common reasons a page shows "Crawled — currently not indexed":
  - Google deems the content too similar to other pages (programmatic SEO risk).
  - Page has thin content.
  - Low internal link equity.
  - **Fix:** if more than 30% of geo pages are stuck in "Crawled not indexed" after 30 days, increase uniqueness per country (expand country-specific copy, add unique testimonials/case studies per region).

---

## Step 2 — Bing Webmaster Tools (15 min)

Bing = Microsoft search engine + powers ChatGPT Search, DuckDuckGo, Yahoo. Often overlooked but represents 10-15% of global search share and has much more generous indexing quotas than Google.

### 2.1 Submit sitemap

1. `https://www.bing.com/webmasters` → select `www.abhihome.in`.
2. Left sidebar → **Sitemaps**.
3. "Submit Sitemap" → enter `https://www.abhihome.in/sitemap.xml` → **Submit**.

### 2.2 URL Submission (Bing's best feature)

Bing lets you push up to **10,000 URLs per day** for immediate crawl. Use it.

1. Left sidebar → **URL Submission**.
2. Paste the list below (one URL per line) into the "Submit URLs" box.
3. Click **Submit**.

**Copy-paste list (all 132 geo URLs + 7 core pages = 139 URLs — well under daily quota):**

Run this in your terminal to generate the full list:

```bash
cd /path/to/abhihome-website
(echo "https://www.abhihome.in/"
 echo "https://www.abhihome.in/bedding.html"
 echo "https://www.abhihome.in/cushions.html"
 echo "https://www.abhihome.in/kitchen.html"
 echo "https://www.abhihome.in/bath.html"
 echo "https://www.abhihome.in/throws.html"
 echo "https://www.abhihome.in/pouffe.html"
 ls *-manufacturer-*.html | sed 's|^|https://www.abhihome.in/|') > /tmp/bing-urls.txt
cat /tmp/bing-urls.txt | pbcopy   # macOS — copies to clipboard
```

Then paste into Bing's URL Submission box.

### 2.3 Site Scan (Bing bonus)

Bing Webmaster has a built-in technical SEO scan.

1. Left sidebar → **Site Scan**.
2. "New Scan" → enter `https://www.abhihome.in` → **Start Scan**.
3. Wait ~10 min. Review any errors (broken links, meta tag issues, etc.).

---

## Step 3 — IndexNow (optional but fast)

IndexNow is an open protocol backed by Bing, Yandex, Naver, and Seznam. One ping updates all four.

### 3.1 Set up your IndexNow key (one-time, 5 min)

1. Generate a random 32-character hex key:
   ```bash
   openssl rand -hex 16
   ```
2. Suppose the output is `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`.
3. Create a file at the site root named `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.txt` containing exactly that same key as its only content.
4. Commit and push. Verify by visiting `https://www.abhihome.in/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.txt`.

### 3.2 Ping IndexNow with all new URLs

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "www.abhihome.in",
    "key": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    "keyLocation": "https://www.abhihome.in/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6.txt",
    "urlList": [
      "https://www.abhihome.in/",
      "https://www.abhihome.in/bedding.html",
      ... (up to 10,000 URLs)
    ]
  }'
```

Expected response: `200 OK` (no body).

A successful ping triggers Bing, Yandex, Naver, and Seznam to fetch those URLs within hours.

---

## Step 4 — Monitoring Cadence

Put these in your calendar.

### Day 7 (2026-04-28)

- [ ] GSC → Pages → count of indexed pages (baseline before push was ~20; after submission expect 30-60 indexed).
- [ ] GSC → Sitemaps → sitemap.xml "Discovered" should say 145, "Indexed" should be 30-80.
- [ ] Bing Webmaster → Site Explorer → look for any crawl errors.
- [ ] Quick health check in browser: `site:abhihome.in` on Google — should show 30-60 results (up from ~15).

### Day 14 (2026-05-05)

- [ ] GSC → Performance → set date range "Last 7 days". Track impressions and clicks.
- [ ] GSC → Pages → target ≥80 indexed. If under 50, audit thin-content candidates.
- [ ] Bing Webmaster → Search Performance → track impressions.
- [ ] Expected first ranking movement: geo pages ranking for "{product} manufacturer {country}" queries on positions 30-80 (not yet top 10).

### Day 30 (2026-05-21)

- [ ] GSC → Performance → Month-over-month: impressions should grow 2-5× baseline (programmatic SEO's hallmark pattern).
- [ ] GSC → Pages → target ≥120 of 145 indexed.
- [ ] Identify top 5 geo pages by impressions — these are the "breakout winners." Consider adding case studies, testimonials, or unique photo content to push them from page 2 to page 1.
- [ ] Identify any pages stuck at "Crawled — currently not indexed." If >15%: time to iterate on content uniqueness (expand per-country sections, add unique country-specific photography, etc.).

### Day 60 (2026-06-20)

- [ ] Expected state: 50-80% of geo pages indexed, top pages ranking for at least 1 qualified keyword. First direct organic lead enquiries start appearing.
- [ ] Decision point: push to round-2 of programmatic SEO (city-level pages for top markets — e.g., `cushion-manufacturer-london.html`)? OR iterate on existing geo page depth (add testimonials, ship photos, certifications per shipment)?

---

## Step 5 — Troubleshooting

### "My pages aren't being indexed"

Check these in order:

1. **Robots.txt blocking** — visit `https://www.abhihome.in/robots.txt`. Must not have `Disallow: /`.
2. **Noindex tag** — view page source, search for `noindex`. Should NOT be present.
3. **Canonical pointing wrong** — view page source, check `<link rel="canonical" ...>`. Must point to the page's own URL, not a different URL.
4. **Sitemap submission status** — GSC → Sitemaps → status must be "Success," not "Couldn't fetch."
5. **Core Web Vitals failing** — GSC → Core Web Vitals → if "Poor" on mobile, Google deprioritizes crawl.
6. **Thin content flag** — if pages are <300 unique words after stripping boilerplate, Google ignores them. Our geo pages are ~2,000+ words each, so unlikely, but spot-check.

### "Pages indexed but no traffic"

Normal for weeks 1-4. Programmatic SEO typically takes 6-12 weeks to reach stable organic traffic. Signals that indicate progress:

- **Impressions trending up** = Google is surfacing your page in search results (even if ranked page 3-5).
- **Average position improving** = moving from rank 60 → rank 40 → rank 20.
- **First clicks from long-tail queries** = "duvet cover wholesale supplier india UK retailers" → your bedding-manufacturer-uk page.

### "My sitemap shows 'Couldn't fetch'"

1. Visit `https://www.abhihome.in/sitemap.xml` in an incognito browser — must return XML, not HTML 404 page.
2. Validate XML syntax at `https://www.xml-sitemaps.com/validate-xml-sitemap.html`.
3. Check file size — must be <50 MB and <50,000 URLs (ours is well under both).

### "Coverage report shows 'Discovered — currently not indexed'"

Google has seen the URL but hasn't crawled it yet. Usually resolves in 2-4 weeks as crawl budget allocation increases. To speed up: more internal links pointing to those URLs (we've already added 48 internal links — that's strong), or request indexing manually for 5-10 pages.

---

## Priority shortlist for Day 1 actions (30 min total)

If you only do the minimum today, do these 5 things:

1. **Resubmit sitemap in GSC** (2 min) → `sitemap.xml`.
2. **Resubmit sitemap in Bing Webmaster** (2 min).
3. **Manually inspect + request indexing for 10 URLs in GSC** (15 min) — rows 1-10 from the priority table above.
4. **Paste all 139 URLs into Bing URL Submission** (5 min).
5. **Fix `robots.txt` sitemap-images.xml stale reference** (2 min) — delete the line or generate the missing file.

Everything else can wait for day 2-7.

---

## Notes

- This checklist assumes GSC and Bing Webmaster are already verified for `www.abhihome.in`. If not, verify the property first (GSC supports DNS verification via Cloudflare/Route53 or the HTML meta-tag method on the homepage — the meta tag is already in `index.html`).
- Google's indexation is not a guarantee of ranking. Indexation = "Google knows your page exists." Ranking = "Google thinks your page is the best answer for a query." The geo page copy + internal links are already solid; now we wait, measure, and iterate.
- If you're using Search Console Insights (the friendlier view for non-SEO folks), check `https://search.google.com/search-console/insights` every 2-3 weeks for a snapshot of what content is winning.
