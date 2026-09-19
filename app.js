(function () {
  let allAnnouncements = [];
  let filtered = [];

  const grid = document.getElementById('annGrid');
  const emptyState = document.getElementById('emptyState');
  const listCount = document.getElementById('listCount');
  const searchInput = document.getElementById('searchInput');
  const filterEstado = document.getElementById('filterEstado');
  const filterTipo = document.getElementById('filterTipo');
  const sortBy = document.getElementById('sortBy');
  const refreshBtn = document.getElementById('refreshBtn');
  const updatedAt = document.getElementById('updatedAt');

  // ---------- Helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // "1.234,56 €" -> 1234.56
  function parsePrice(s) {
    if (!s) return 0;
    const m = String(s).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    const v = parseFloat(m);
    return isNaN(v) ? 0 : v;
  }

  // "18-09-2026" -> Date
  function parsePubDate(s) {
    if (!s) return new Date(0);
    const m = String(s).match(/(\d{2})-(\d{2})-(\d{4})/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(0);
  }

  function reasonTags(a) {
    let reasons = a.relevance_reasons;
    if (!reasons) return [];
    try { reasons = JSON.parse(reasons); } catch (e) { /* already an array */ }
    if (!Array.isArray(reasons)) return [];
    return reasons.slice(0, 4);
  }

  function relTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ---------- Data ----------
  async function loadData() {
    refreshBtn.classList.add('loading');
    try {
      const [annRes, statsRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/stats'),
      ]);
      const ann = await annRes.json();
      const stats = await statsRes.json();

      allAnnouncements = ann.announcements || [];
      document.getElementById('statTotal').textContent = stats.total ?? '—';
      document.getElementById('statPendentes').textContent = stats.unsent ?? '—';
      document.getElementById('statEmailsOk').textContent = stats.emails_ok ?? '—';
      document.getElementById('statEmailsFail').textContent = stats.emails_not_ok ?? '—';

      const last = stats.last_digest;
      updatedAt.textContent = last
        ? 'Última atualização da D1: ' + (last.date || '') +
          (last.email_sent === 'yes' ? ' · digest enviado' : ' · sem envio')
        : 'Dados via Cloudflare D1';

      buildTipoFilter();
      applyFilters();
    } catch (err) {
      updatedAt.textContent = 'Erro ao carregar dados — a D1 está inacessível?';
      allAnnouncements = [];
      applyFilters();
    } finally {
      refreshBtn.classList.remove('loading');
    }
  }

  function buildTipoFilter() {
    const tipos = [...new Set(allAnnouncements.map((a) => a.type).filter(Boolean))].sort();
    const current = filterTipo.value;
    filterTipo.innerHTML = '<option value="todos">Todos os tipos</option>' +
      tipos.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    if ([...filterTipo.options].some((o) => o.value === current)) filterTipo.value = current;
  }

  // ---------- Filtering ----------
  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const estado = filterEstado.value;
    const tipo = filterTipo.value;
    const sort = sortBy.value;

    filtered = allAnnouncements.filter((a) => {
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

    render();
  }

  // ---------- Render ----------
  function card(a) {
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
          <span class="status-pill ${sent ? 'status-enviado' : 'status-pendente'}">
            ${sent ? 'Enviado ' + esc(a.digest_date) : 'Pendente'}
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

  function render() {
    grid.innerHTML = filtered.map(card).join('');
    grid.hidden = filtered.length === 0;
    emptyState.hidden = filtered.length > 0;
    listCount.textContent = filtered.length === 1
      ? '1 anúncio'
      : filtered.length + ' anúncios';
  }

  // ---------- Events ----------
  [searchInput, filterEstado, filterTipo, sortBy].forEach((el) => {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  });
  refreshBtn.addEventListener('click', loadData);

  loadData();
})();
