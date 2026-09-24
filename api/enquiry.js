/**
 * api/enquiry.js - Vercel Serverless Function
 * Website trade enquiry -> Sutra Customer Desk case. NO Odoo lead.
 *
 * SUTRA-FIRST (founder direction, 24-Sep-2026). The enquiry is recorded in
 * Sutra, where the team answers it from hello@ in the Customer Desk. Odoo is
 * not called at all: no crm.lead, no alert email through Odoo. Odoo hears about
 * a customer only when an order is confirmed, through Sutra's own boundary.
 *
 * Env:
 *   SUTRA_INTAKE_URL     https://api.sutra.abhihome.in/webhooks/website-enquiry
 *   SUTRA_INTAKE_SECRET  the dedicated website secret (Sutra's WEBSITE_INTAKE_SECRET);
 *                        never the browser app key, never printed.
 * Set for PRODUCTION only. A Preview deployment without them answers
 * "configuration error" and records nothing — a preview can never write to
 * the live Desk by accident.
 *
 * ONE SUBMISSION, ONE ENQUIRY. The page sends a submission_id it keeps until
 * the enquiry is confirmed, so a second click, a retry after a slow answer or
 * a lost response all carry the SAME id. Sutra records each id once, in one
 * database transaction (its ledger's unique submission_id): a repeat with the
 * same details answers with the same case and creates nothing.
 *
 * NO ID, NO RECORD (independent review, 24-Sep-2026, finding 3). A request
 * without a valid id — a page served from a cache before this release — is
 * refused BEFORE anything is written, and the visitor is asked to refresh. An
 * identity guessed from a clock bucket changed across the bucket boundary, so
 * a one-second retry after a lost answer could have become a second enquiry.
 *
 * CHANGED DETAILS UNDER A USED ID (finding 4). If the first send was recorded
 * but its answer was lost, and the visitor edits the form and sends again,
 * Sutra refuses the changed details (409 submission_changed) and records
 * nothing. This handler says so (conflict:true); the page keeps the edited
 * form on screen and offers an explicit "Send these details as a new enquiry".
 *
 * WHEN SUTRA CANNOT ANSWER, nothing is recorded anywhere else: the visitor is
 * told to try again (their page keeps the same id) or to email hello@. There
 * is no fallback to Odoo — a second writer is exactly what this change removes.
 */
module.exports.config = { api: { bodyParser: { sizeLimit: '64kb' } } };

// Sutra refuses an over-long field rather than clipping it (a clipped
// requirement is a buyer's words rewritten); the same caps here let the
// visitor fix the form instead of meeting a server error.
var CAPS = { name: 300, company: 300, email: 320, phone: 60, country: 100, product: 200, message: 20000 };
var SUBMISSION_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/;
var TIMEOUT_MS = 8000;

function clean(v){ return (v == null ? '' : String(v)).trim(); }

// Where the form was sent from, as a path only — never a query string.
function pageSource(req){
  try {
    var ref = req.headers && (req.headers.referer || req.headers.referrer);
    if (!ref) return null;
    var u = new URL(String(ref));
    if (!/(^|\.)abhihome\.in$/i.test(u.hostname)) return null;
    return u.pathname.slice(0, 500) || null;
  } catch (e) { return null; }
}

// https only — except a loopback address, which the local proofs use.
function intakeUrlOk(u){
  try {
    var x = new URL(u);
    if (x.protocol === 'https:') return true;
    return x.protocol === 'http:' && (x.hostname === '127.0.0.1' || x.hostname === 'localhost');
  } catch (e) { return false; }
}

var RETRY_MESSAGE = 'We could not submit your enquiry just now. Please try again in a moment, or email hello@abhihome.in and we will reply within 12 working hours.';

module.exports = async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','https://www.abhihome.in');
  res.setHeader('Access-Control-Allow-Methods','POST'); res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success:false, message:'Method not allowed.' });

  var URL_ = process.env.SUTRA_INTAKE_URL, SECRET = process.env.SUTRA_INTAKE_SECRET;
  if (!URL_ || !SECRET || !intakeUrlOk(URL_)) {
    // Names only; never the values.
    console.error('Enquiry intake is not configured (SUTRA_INTAKE_URL / SUTRA_INTAKE_SECRET)');
    return res.status(500).json({ success:false, message:'Server configuration error. Please email hello@abhihome.in.' });
  }

  var b = req.body || {};
  if (b.company_website) return res.status(200).json({ success:true }); // honeypot

  var f = { name: clean(b.name), email: clean(b.email), company: clean(b.company), phone: clean(b.phone),
            country: clean(b.country), product: clean(b.product), message: clean(b.message) };
  var consent = clean(b.consent) !== '';
  if (!f.name || !f.email) return res.status(400).json({ success:false, message:'Name and email are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return res.status(400).json({ success:false, message:'Please enter a valid email.' });
  for (var k in CAPS) {
    if (f[k].length > CAPS[k]) return res.status(400).json({ success:false, message:'Please shorten the ' + (k === 'message' ? 'message' : k) + ' and send again.' });
  }

  var sid = clean(b.submission_id);
  if (!SUBMISSION_ID.test(sid)) {
    // Refused before anything is written: the page is older than this release.
    return res.status(400).json({ success:false, refresh:true,
      message:'This page is out of date. Please refresh the page and send your enquiry again. Nothing has been sent yet.' });
  }

  var payload = {
    submission_id: sid,
    contact_name: f.name,
    email: f.email,
    company: f.company || null,
    phone: f.phone || null,
    country: f.country || null,
    product: f.product || null,
    requirement: f.message || null,
    page_source: pageSource(req),
    consent: consent,
  };

  var ctl = typeof AbortController === 'function' ? new AbortController() : null;
  var timer = ctl ? setTimeout(function(){ ctl.abort(); }, TIMEOUT_MS) : null;
  var r, out;
  try {
    r = await fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sutra-Intake-Secret': SECRET },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined,
    });
    out = await r.json().catch(function(){ return null; });
  } catch (err) {
    // Timed out or unreachable. Sutra may or may not have recorded it; either
    // way a retry with the SAME id and the same details is safe.
    console.error('Sutra intake unreachable:', err && err.name === 'AbortError' ? 'timeout' : 'network');
    return res.status(503).json({ success:false, retryable:true, message: RETRY_MESSAGE });
  } finally { if (timer) clearTimeout(timer); }

  if (r.ok && out && out.ok === true && out.case_id) {
    console.log('Sutra case ' + out.case_id + (out.replayed ? ' (repeat of submission ' + sid + ')' : ''));
    return res.status(200).json({ success:true, caseId: out.case_id, duplicate: out.replayed === true });
  }
  if (r.status === 409 && out && out.code === 'submission_changed') {
    // An earlier version under this id was recorded; these details were not.
    console.error('Sutra refused changed details under a used submission id');
    return res.status(409).json({ success:false, conflict:true,
      message:'We already received an earlier version of this enquiry, so your changes have not been sent yet.' });
  }
  if (r.status === 422) {
    console.error('Sutra refused the fields:', out && Array.isArray(out.fields) ? out.fields.join('; ') : 'unknown');
    return res.status(400).json({ success:false, message:'Some details were not accepted. Please check the form and send again.' });
  }
  if (r.status === 401) {
    console.error('Sutra refused the intake secret — check SUTRA_INTAKE_SECRET');
    return res.status(500).json({ success:false, message:'Server configuration error. Please email hello@abhihome.in.' });
  }
  // 429, 5xx, or an answer without a case: nothing is known to be recorded
  // except by the same id, so the visitor retries it.
  console.error('Sutra intake failed: HTTP ' + r.status);
  return res.status(503).json({ success:false, retryable:true, message: RETRY_MESSAGE });
};
