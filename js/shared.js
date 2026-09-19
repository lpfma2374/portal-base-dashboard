// ============================================================
// Portal Base Dashboard — funções puras (testáveis)
// Em produção usa window.PortalBaseShared; em teste importa por CommonJS/ESM.
// ============================================================

const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function parsePrice(s) {
  if (!s) return 0;
  const m = String(s).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(m);
  return isNaN(v) ? 0 : v;
}

function parsePubDate(s) {
  if (!s) return new Date(0);
  const m = String(s).match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(0);
}

function reasonTags(a) {
  if (!a) return [];
  let reasons = a.relevance_reasons;
  if (!reasons) return [];
  if (typeof reasons === 'string') {
    try { reasons = JSON.parse(reasons); } catch (e) { return []; }
  }
  if (!Array.isArray(reasons)) return [];
  return reasons.slice(0, 4);
}

function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function filterAnnouncements(list, { search = '', estado = 'todos', tipo = 'todos', sort = 'data' } = {}) {
  const q = search.trim().toLowerCase();
  let filtered = list.filter((a) => {
    if (estado === 'pendente' && a.digest_date) return false;
    if (estado === 'enviado' && !a.digest_date) return false;
    if (tipo !== 'todos' && a.type !== tipo) return false;
    if (q) {
      const hay = [a.title, a.entity, a.cpv, a.announcement_number]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (sort === 'valor') {
    filtered.sort((x, y) => parsePrice(y.base_price) - parsePrice(x.base_price));
  } else if (sort === 'entidade') {
    filtered.sort((x, y) => String(x.entity || '').localeCompare(String(y.entity || ''), 'pt'));
  } else {
    filtered.sort((x, y) => parsePubDate(y.pub_date) - parsePubDate(x.pub_date));
  }
  return filtered;
}

function cardHTML(a) {
  const archived = a.status === 'Archived';
  const sent = !!a.digest_date;
  const reasons = reasonTags(a);
  const price = a.base_price && String(a.base_price).trim()
    ? `<div class="ann-price">${esc(a.base_price)}</div>`
    : '<div class="ann-price empty">Valor base não disponível</div>';
  const detailUrl = a.detail_url
    ? `<a href="${esc(a.detail_url)}" target="_blank" rel="noopener">Detalhe ↗</a>`
    : '<span class="disabled">Detalhe —</span>';
  const pecasUrl = a.pecas_url
    ? `<a href="${esc(a.pecas_url)}" target="_blank" rel="noopener">Peças do procedimento ↗</a>`
    : '<span class="disabled">Peças —</span>';

  return `
      <article class="ann-card">
        <div class="ann-top">
          <div>
            <h3 class="ann-title">${esc(a.title)}</h3>
            <div class="ann-entity">${esc(a.entity || '—')}</div>
          </div>
          <span class="status-pill ${archived ? 'status-arquivado' : sent ? 'status-enviado' : 'status-pendente'}">
            ${archived ? 'Arquivado' : sent ? 'Enviado ' + esc(a.digest_date) : 'Pendente'}
          </span>
        </div>
        ${price}
        <dl class="ann-meta">
          <dt>Tipo</dt><dd>${esc(a.type || '—')}</dd>
          <dt>CPV</dt><dd>${esc(a.cpv || '—')}</dd>
          <dt>Prazo</dt><dd>${esc(a.deadline || '—')}</dd>
          <dt>Publicado</dt><dd>${esc(a.pub_date || '—')}</dd>
        </dl>
        ${reasons.length ? `<div class="ann-tags">${reasons.map((r) => `<span class="tag">${esc(r)}</span>`).join('')}</div>` : ''}
        <div class="ann-links">${detailUrl}${pecasUrl}</div>
      </article>`;
}

if (typeof window !== 'undefined') {
  window.PortalBaseShared = { esc, parsePrice, parsePubDate, reasonTags, relTime, filterAnnouncements, cardHTML };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { esc, parsePrice, parsePubDate, reasonTags, relTime, filterAnnouncements, cardHTML };
}
