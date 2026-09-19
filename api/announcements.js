// GET /api/announcements — lista de anúncios do Portal Base Monitor (Cloudflare D1)
// Serverless function Vercel (Node.js). A D1 é a fonte da verdade,
// atualizada diariamente às 08h (dias úteis) pelo agente de monitorização.

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
    const limit = Math.min(parseInt(req.query.limit || '300', 10) || 300, 1000);
    const rows = await d1Query(
      `SELECT id, title, entity, type, base_price, cpv, deadline, pub_date,
              announcement_number, detail_url, pecas_url, relevance_reasons,
              first_seen, last_seen, digest_date
       FROM announcements
       ORDER BY last_seen DESC
       LIMIT ?`,
      [limit]
    );
    res.status(200).json({ announcements: rows, count: rows.length });
  } catch (err) {
    res.status(502).json({ error: 'D1 query failed', detail: String(err.message || err) });
  }
}
