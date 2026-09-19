(function () {
  let allAnnouncements = [];   // active dataset (default)
  let archivedAnnouncements = null; // lazy-loaded when filter = arquivados
  let filtered = [];

  const S = (typeof window !== 'undefined' && window.PortalBaseShared) ? window.PortalBaseShared : {};
  const esc = S.esc || ((s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  const grid = document.getElementById('annGrid');
  const emptyState = document.getElementById('emptyState');
  const listCount = document.getElementById('listCount');
  const searchInput = document.getElementById('searchInput');
  const filterEstado = document.getElementById('filterEstado');
  const filterTipo = document.getElementById('filterTipo');
  const sortBy = document.getElementById('sortBy');
  const refreshBtn = document.getElementById('refreshBtn');
  const updatedAt = document.getElementById('updatedAt');

  // ---------- Data ----------
  async function loadData() {
    refreshBtn.classList.add('loading');
    try {
      const [annRes, statsRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/stats'),
      ]);
      archivedAnnouncements = null; // force refetch of archived if selected later
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

    if (estado === 'arquivados') {
      if (archivedAnnouncements) renderArchived(q, tipo, sort);
      else fetch('/api/announcements?status=archived')
        .then((r) => r.json())
        .then((d) => { archivedAnnouncements = d.announcements || []; renderArchived(q, tipo, sort); });
      return;
    }

    const opts = { search: searchInput.value, estado, tipo, sort };
    if (S.filterAnnouncements) {
      filtered = S.filterAnnouncements(allAnnouncements, opts);
    } else {
      const q = opts.search.trim().toLowerCase();
      filtered = allAnnouncements.filter((a) => {
        if (opts.estado === 'pendente' && a.digest_date) return false;
        if (opts.estado === 'enviado' && !a.digest_date) return false;
        if (opts.tipo !== 'todos' && a.type !== opts.tipo) return false;
        if (q) {
          const hay = [a.title, a.entity, a.cpv, a.announcement_number].filter(Boolean).join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    render();
  }

  function renderArchived(q, tipo, sort) {
    let rows = archivedAnnouncements.filter((a) => {
      if (tipo !== 'todos' && a.type !== tipo) return false;
      if (q) {
        const hay = [a.title, a.entity, a.cpv, a.announcement_number]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'valor') rows.sort((x, y) => parsePrice(y.base_price) - parsePrice(x.base_price));
    else if (sort === 'entidade') rows.sort((x, y) => String(x.entity || '').localeCompare(String(y.entity || ''), 'pt'));
    else rows.sort((x, y) => parsePubDate(y.pub_date) - parsePubDate(x.pub_date));
    filtered = rows;
    render();
  }

  // ---------- Render ----------
  function render() {
    grid.innerHTML = filtered.map((a) => S.cardHTML ? S.cardHTML(a) : '').join('');
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
