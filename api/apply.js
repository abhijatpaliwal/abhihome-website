/**
 * api/apply.js — Vercel Serverless Function
 * Receives job application form data and creates an applicant record in Odoo HR.
 *
 * Environment variables required (set in Vercel Dashboard → Project → Settings → Environment Variables):
 *   ODOO_URL       e.g. https://abhihome.odoo.com
 *   ODOO_DB        your Odoo database name (usually the subdomain, e.g. "abhihome")
 *   ODOO_USERNAME  your Odoo login email (e.g. abhijat@abhihome.in)
 *   ODOO_API_KEY   API key from Odoo → My Profile → Account Security → New API Key
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb', // allow up to 6 MB for CV upload (base64 is ~33% larger than file)
    },
  },
};

// ─── Odoo XML-RPC helpers ──────────────────────────────────────────────────

/**
 * Build an XML-RPC methodCall string.
 * Only handles the param types we need: string, int, boolean, struct, array, base64.
 */
function buildXmlRpc(method, params) {
  function toXml(val) {
    if (val === null || val === undefined) return '<value><boolean>0</boolean></value>';
    if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`;
    if (typeof val === 'number' && Number.isInteger(val)) return `<value><int>${val}</int></value>`;
    if (typeof val === 'string') return `<value><string>${escXml(val)}</string></value>`;
    if (val && val.__base64) return `<value><base64>${val.__base64}</base64></value>`;
    if (Array.isArray(val)) {
      return '<value><array><data>' + val.map(toXml).join('') + '</data></array></value>';
    }
    if (typeof val === 'object') {
      const members = Object.entries(val)
        .map(([k, v]) => `<member><name>${escXml(k)}</name>${toXml(v)}</member>`)
        .join('');
      return `<value><struct>${members}</struct></value>`;
    }
    return `<value><string>${escXml(String(val))}</string></value>`;
  }
  function escXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  const paramTags = params.map(p => `<param>${toXml(p)}</param>`).join('');
  return `<?xml version="1.0"?><methodCall><methodName>${method}</methodName><params>${paramTags}</params></methodCall>`;
}

/**
 * Parse the integer value from an Odoo XML-RPC response.
 * Returns the int value, or throws on fault.
 */
function parseXmlRpcInt(xml) {
  const fault = xml.match(/<fault>[\s\S]*?<\/fault>/);
  if (fault) {
    const msg = xml.match(/<name>faultString<\/name>\s*<value><string>([\s\S]*?)<\/string>/);
    throw new Error('Odoo fault: ' + (msg ? msg[1] : 'unknown error'));
  }
  const intMatch = xml.match(/<value><int>(\d+)<\/int><\/value>/);
  if (intMatch) return parseInt(intMatch[1], 10);
  const i4Match = xml.match(/<value><i4>(\d+)<\/i4><\/value>/);
  if (i4Match) return parseInt(i4Match[1], 10);
  throw new Error('Could not parse int from XML-RPC response: ' + xml.slice(0, 300));
}

/**
 * Authenticate against Odoo using XML-RPC.
 * Returns the user id (uid).
 */
async function odooAuthenticate(url, db, username, apiKey) {
  const body = buildXmlRpc('authenticate', [db, username, apiKey, {}]);
  const res = await fetch(`${url}/xmlrpc/2/common`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml', 'Accept': 'text/xml' },
    body,
  });
  if (!res.ok) throw new Error(`Odoo auth HTTP error: ${res.status}`);
  const xml = await res.text();
  const uid = parseXmlRpcInt(xml);
  if (!uid) throw new Error('Odoo authentication failed — check your credentials and API key.');
  return uid;
}

/**
 * Call execute_kw on Odoo — create a record and return its ID.
 */
async function odooCreate(url, db, uid, apiKey, model, fields) {
  const body = buildXmlRpc('execute_kw', [db, uid, apiKey, model, 'create', [fields], {}]);
  const res = await fetch(`${url}/xmlrpc/2/object`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml', 'Accept': 'text/xml' },
    body,
  });
  if (!res.ok) throw new Error(`Odoo create HTTP error: ${res.status}`);
  const xml = await res.text();
  return parseXmlRpcInt(xml);
}

// ─── Main handler ──────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  // CORS — allow only your own domain
  res.setHeader('Access-Control-Allow-Origin', 'https://www.abhihome.in');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Read env vars
  const ODOO_URL      = process.env.ODOO_URL;
  const ODOO_DB       = process.env.ODOO_DB;
  const ODOO_USERNAME = process.env.ODOO_USERNAME;
  const ODOO_API_KEY  = process.env.ODOO_API_KEY;

  if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_API_KEY) {
    console.error('Missing Odoo environment variables');
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  // Parse body
  const { name, email, phone, position, coverLetter, resumeBase64, resumeName, resumeMime } = req.body || {};

  // Basic validation
  if (!name || !email || !position) {
    return res.status(400).json({ success: false, message: 'Name, email, and position are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  try {
    // 1. Authenticate with Odoo
    const uid = await odooAuthenticate(ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_API_KEY);

    // 2. Build the description
    const description = [
      `Position applied for: ${position}`,
      phone ? `Phone / WhatsApp: ${phone}` : '',
      coverLetter ? `\nCover Letter:\n${coverLetter}` : '',
      `\nSubmitted via: www.abhihome.in/jobs.html`,
    ].filter(Boolean).join('\n');

    // 3. Create hr.applicant record
    const applicantId = await odooCreate(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, 'hr.applicant', {
      partner_name:  name,
      email_from:    email,
      partner_phone: phone || '',
      description:   description,
      // Maps the position text to the applicant's "Applied Job" field (free text fallback)
      // If you have specific job positions configured in Odoo HR, replace with job_id: <id>
    });

    // 4. Attach CV / resume (if provided)
    if (resumeBase64 && resumeName) {
      await odooCreate(ODOO_URL, ODOO_DB, uid, ODOO_API_KEY, 'ir.attachment', {
        name:      resumeName,
        datas:     { __base64: resumeBase64 },
        res_model: 'hr.applicant',
        res_id:    applicantId,
        mimetype:  resumeMime || 'application/octet-stream',
        type:      'binary',
      });
    }

    console.log(`Applicant created in Odoo: ID ${applicantId} — ${name} (${email})`);
    return res.status(200).json({ success: true, applicantId });

  } catch (err) {
    console.error('Odoo integration error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'We could not process your application right now. Please email your CV to info@abhihome.in and we\'ll be in touch.',
    });
  }
}
