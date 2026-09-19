const { test, expect } = require('@playwright/test');
const { ANNOUNCEMENTS, STATS, mockApi } = require('./helpers');

test.describe('Portal Base Monitor (index.html) — leitura', () => {
  test('página carrega o título e os dados da marca', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/Portal Base Monitor/);
    await expect(page.locator('.brand-name')).toHaveText('Portal Base Monitor');
    await expect(page.locator('h1')).toHaveText('Radar de oportunidades de TI');
  });

  test('estatísticas do topo são renderizadas com base na API de stats', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('#statTotal')).toHaveText(String(STATS.total));
    await expect(page.locator('#statPendentes')).toHaveText(String(STATS.unsent));
    await expect(page.locator('#statEmailsOk')).toHaveText(String(STATS.emails_ok));
    await expect(page.locator('#statEmailsFail')).toHaveText(String(STATS.emails_not_ok));
  });

  test('lista de anúncios renderiza todos os itens da fixture', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    const expectedCount = ANNOUNCEMENTS.announcements.length;
    await expect(page.locator('.ann-card')).toHaveCount(expectedCount);
    await expect(page.locator('#listCount')).toHaveText(`${expectedCount} anúncios`);
  });

  test('pesquisa por palavra-chave filtra a lista de anúncios', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.locator('#searchInput').fill('Balcão Digital');
    await expect(page.locator('.ann-card')).toHaveCount(1);
    await expect(page.locator('#listCount')).toHaveText('1 anúncio');
    await expect(page.locator('.ann-card .ann-title')).toContainText('Balcão Digital');
  });

  test('filtro por tipo de procedimento atualiza a grelha', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.locator('#filterTipo').selectOption({ label: 'Concurso público' });
    const count = await page.locator('.ann-card').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(ANNOUNCEMENTS.announcements.length);
  });

  test('estado vazio é exibido quando a API não retorna anúncios', async ({ page }) => {
    await mockApi(page, { announcementsData: { announcements: [], count: 0 } });
    await page.goto('/');
    await expect(page.locator('.ann-card')).toHaveCount(0);
    await expect(page.locator('#emptyState')).toBeVisible();
    await expect(page.locator('#listCount')).toHaveText('0 anúncios');
  });

  test('ordenação por valor base reorganiza os anúncios', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.locator('#sortBy').selectOption('valor');
    const prices = await page.locator('.ann-card .ann-price').allTextContents();
    expect(prices.length).toBeGreaterThan(1);
    // O primeiro item deve ser o de maior valor (ex: 1.500.000,00 €)
    expect(prices[0]).toContain('1.500.000,00');
  });

  test('XSS: título malicioso é escapado sem injetar HTML', async ({ page }) => {
    const maliciousItem = {
      ...ANNOUNCEMENTS.announcements[0],
      title: '<script>alert("xss")</script> Teste XSS',
    };
    await mockApi(page, {
      announcementsData: { announcements: [maliciousItem], count: 1 },
    });
    await page.goto('/');
    await expect(page.locator('.ann-card .ann-title')).toContainText('<script>alert("xss")</script>');
    const html = await page.locator('#annGrid').innerHTML();
    expect(html).toContain('&lt;script&gt;');
  });
});
