/* ============================================================
   ABHI HOME® — Tree Plantation Ticker
   ------------------------------------------------------------
   Deterministic, date-driven count of trees planted in
   partnership with Grow-Trees.com at the "Trees for Tribals®"
   project in Shahbad, Baran District, Rajasthan, India.

   How it works
   ------------
   - ANCHOR_DATE / ANCHOR_COUNT = the known truth on a given day
   - Every calendar month adds exactly MONTHLY_PLEDGE trees
   - Daily increments inside a month look random (15–60/day) but
     are deterministic (seeded by year+month) so every visitor on
     the same day sees the same number. Daily values always sum
     to exactly MONTHLY_PLEDGE for the month.

   Update ANCHOR_DATE / ANCHOR_COUNT once a month (or whenever
   you receive a new Grow-Trees certificate) to re-baseline.
   ============================================================ */

(function (global) {
  'use strict';

  // ---- CONFIG (edit these to re-baseline) --------------------
  var ANCHOR_DATE     = '2026-05-25'; // YYYY-MM-DD — date of known count
  var ANCHOR_COUNT    = 1236;          // trees planted on ANCHOR_DATE
  var MONTHLY_PLEDGE  = 900;           // trees added every calendar month
  var YEAR_GOAL       = 10000;         // marketing target for 2026
  var GOAL_YEAR       = 2026;
  // -----------------------------------------------------------

  // Seeded PRNG (Mulberry32). Same seed => same sequence.
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Days in a given month (month 1-12)
  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Build the integer daily-increment array for a given year+month
   * such that values look random but sum to exactly MONTHLY_PLEDGE.
   * Returns array of length daysInMonth(year, month).
   */
  function monthlyDistribution(year, month) {
    var n = daysInMonth(year, month);
    var seed = year * 100 + month;
    var rng = mulberry32(seed);

    // Step 1: raw float weights in [0.5, 3.0)
    var weights = new Array(n);
    var total = 0;
    for (var i = 0; i < n; i++) {
      weights[i] = 0.5 + rng() * 2.5;
      total += weights[i];
    }

    // Step 2: scale to MONTHLY_PLEDGE
    var scaled = new Array(n);
    for (var j = 0; j < n; j++) {
      scaled[j] = (weights[j] / total) * MONTHLY_PLEDGE;
    }

    // Step 3: floor + give remainder to largest fractional parts
    var rounded = new Array(n);
    var sumRounded = 0;
    var fracs = [];
    for (var k = 0; k < n; k++) {
      rounded[k] = Math.floor(scaled[k]);
      sumRounded += rounded[k];
      fracs.push({ i: k, f: scaled[k] - rounded[k] });
    }
    var remainder = MONTHLY_PLEDGE - sumRounded;
    fracs.sort(function (a, b) { return b.f - a.f; });
    for (var r = 0; r < remainder; r++) {
      rounded[fracs[r].i]++;
    }
    return rounded;
  }

  /** Sum of daily increments up to (and including) `day` of given month. */
  function cumulativeThroughDay(year, month, day) {
    var dist = monthlyDistribution(year, month);
    var sum = 0;
    var cap = Math.min(day, dist.length);
    for (var i = 0; i < cap; i++) sum += dist[i];
    return sum;
  }

  /** Total trees on a target date (defaults to today). */
  function treesOnDate(targetDate) {
    var t = targetDate ? new Date(targetDate) : new Date();
    var anchor = new Date(ANCHOR_DATE);

    // Baseline at start of anchor month
    var aY = anchor.getFullYear();
    var aM = anchor.getMonth() + 1;
    var aD = anchor.getDate();
    var startOfAnchorMonth = ANCHOR_COUNT - cumulativeThroughDay(aY, aM, aD);

    var tY = t.getFullYear();
    var tM = t.getMonth() + 1;
    var tD = t.getDate();

    var monthsElapsed = (tY - aY) * 12 + (tM - aM);
    var cumThroughTargetDay = cumulativeThroughDay(tY, tM, tD);
    var value = startOfAnchorMonth + monthsElapsed * MONTHLY_PLEDGE + cumThroughTargetDay;
    return Math.max(0, Math.round(value));
  }

  /** Format with thousands separator (e.g. 12,345). */
  function fmt(n) {
    return Number(n).toLocaleString('en-IN');
  }

  /** Animate a number from `from` to `to` inside element `el`. */
  function animateCount(el, from, to, durationMs) {
    if (!el) return;
    // Robustness: if animation can't run (no rAF, or user prefers reduced
    // motion), show the final number immediately so it is never left at 0
    // or stuck mid-count on a backgrounded/headless tab.
    var reduceMotion = (typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (typeof requestAnimationFrame === 'undefined' || reduceMotion) {
      el.textContent = fmt(to);
      return;
    }
    var start = null;
    var ease = function (p) { return 1 - Math.pow(1 - p, 3); }; // ease-out cubic
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / durationMs);
      var v = Math.round(from + (to - from) * ease(p));
      el.textContent = fmt(v);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /**
   * Mount a ticker into an element with given id.
   * Options: { animate: bool, durationMs: int }
   */
  function mount(elementId, options) {
    options = options || {};
    var el = document.getElementById(elementId);
    if (!el) return;
    var total = treesOnDate();
    // Always render the correct final number first (single source of truth),
    // so every page shows the same value even if the count-up never runs.
    el.textContent = fmt(total);
    if (options.animate !== false) {
      // Start from a "running" lower number so the count-up feels real
      var start = Math.max(0, total - Math.min(total, 250));
      animateCount(el, start, total, options.durationMs || 1800);
    }

    // Optional: animate when scrolled into view (uses IntersectionObserver if available)
    if (options.observe && 'IntersectionObserver' in window) {
      // observer code if needed in future
    }
  }

  // Public API
  global.AbhiTreeTicker = {
    treesOnDate:   treesOnDate,
    monthsRemainingIn2026: function () {
      var n = new Date();
      if (n.getFullYear() < GOAL_YEAR) return 12;
      if (n.getFullYear() > GOAL_YEAR) return 0;
      return 12 - (n.getMonth() + 1) + 1;
    },
    yearGoal:      YEAR_GOAL,
    monthlyPledge: MONTHLY_PLEDGE,
    anchorDate:    ANCHOR_DATE,
    anchorCount:   ANCHOR_COUNT,
    fmt:           fmt,
    mount:         mount,
    // exposed for the verification harness / Node tests
    _internal: {
      monthlyDistribution: monthlyDistribution,
      cumulativeThroughDay: cumulativeThroughDay
    }
  };

  // Auto-init: when DOM is ready, populate any element with class
  // "tree-ticker-count" using its data-animate / data-duration attrs.
  function autoInit() {
    var nodes = document.querySelectorAll('.tree-ticker-count');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var animate = el.getAttribute('data-animate') !== 'false';
      var duration = parseInt(el.getAttribute('data-duration') || '1800', 10);
      var total = treesOnDate();
      // Render the correct number immediately, then animate as enhancement.
      // Guarantees every ticker on every page shows the same value, even if
      // requestAnimationFrame is throttled (background tab) or unavailable.
      el.textContent = fmt(total);
      if (animate) {
        var start = Math.max(0, total - Math.min(total, 250));
        animateCount(el, start, total, duration);
      }
    }
    // Year goal labels
    var goalNodes = document.querySelectorAll('.tree-ticker-goal');
    for (var j = 0; j < goalNodes.length; j++) {
      goalNodes[j].textContent = fmt(YEAR_GOAL) + '+';
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      autoInit();
    }
  }

  // CommonJS export for Node-based testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.AbhiTreeTicker;
  }
})(typeof window !== 'undefined' ? window : globalThis);
