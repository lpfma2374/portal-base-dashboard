const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ANNOUNCEMENTS = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures/announcements.json'), 'utf8')
);

const STATS = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures/stats.json'), 'utf8')
);

// Mock das APIs /api/announcements e /api/stats
async function mockApi(page, { status = 200, announcementsData, statsData } = {}) {
  await page.route('**/api/announcements', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/api/announcements')) {
      return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(announcementsData !== undefined ? announcementsData : ANNOUNCEMENTS),
      });
    }
    return route.continue();
  });

  await page.route('**/api/stats', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/api/stats')) {
      return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(statsData !== undefined ? statsData : STATS),
      });
    }
    return route.continue();
  });
}

module.exports = { ANNOUNCEMENTS, STATS, mockApi };
