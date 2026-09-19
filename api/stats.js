// GET /api/stats — estatísticas do monitor + auditoria de emails (Cloudflare D1)
// Serverless function Vercel (Node.js).

const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_DB = process.env.CLOUDFLARE_D1_DATABASE_ID || 'f456cdc8-5b4a-4491-bdcc-2bb12e4dc246';
const CF_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${CF_DB}/query`;

async function d1Query(sql, params) {
  const r = await fetch(CF_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params ? { sql, params } : { sql }),
  });
  const data = await r.json();
  if (!r.ok || !data.success) {
    const msg = (data.errors && data.errors[0] && data.errors[0].message) || `CF HTTP ${r.status}`;
    throw new Error(msg);
  }
  const rows = [];
  for (const stmt of data.result || []) rows.push(...(stmt.results || []));
  return rows;
}

export default async function handler(req, res) {
  try {
    const [t, s, u, arch, eok, enok, lastDigest, recentEmails] = await Promise.all([
      d1Query('SELECT COUNT(*) AS c FROM announcements'),
      d1Query("SELECT COUNT(*) AS c FROM announcements WHERE digest_date IS NOT NULL"),
      d1Query("SELECT COUNT(*) AS c FROM announcements WHERE digest_date IS NULL AND COALESCE(status,'Active')='Active'"),
      d1Query("SELECT COUNT(*) AS c FROM announcements WHERE status='Archived'"),
      d1Query("SELECT COUNT(*) AS c FROM email_log WHERE status='OK'"),
      d1Query("SELECT COUNT(*) AS c FROM email_log WHERE status='NOT_OK'"),
      d1Query('SELECT * FROM digest_log ORDER BY date DESC LIMIT 1'),
      d1Query(
        'SELECT id, digest_date, status, reason, announcements, created_at FROM email_log ORDER BY id DESC LIMIT 10'
      ),
    ]);
    res.status(200).json({
      total: t[0].c,
      sent: s[0].c,
      unsent: u[0].c,
      archived: arch[0].c,
      emails_ok: eok[0].c,
      emails_not_ok: enok[0].c,
      last_digest: lastDigest[0] || null,
      recent_emails: recentEmails,
    });
  } catch (err) {
    res.status(502).json({ error: 'D1 query failed', detail: String(err.message || err) });
  }
}
