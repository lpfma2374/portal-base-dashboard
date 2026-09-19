import { describe, it, expect } from 'vitest';
import S from '../../js/shared.js';

const SAMPLE = [
  {
    id: '1',
    title: 'Desenvolvimento de Software',
    entity: 'Câmara Municipal do Porto',
    type: 'Concurso público',
    base_price: '100.000,00 €',
    cpv: '72200000-0',
    deadline: '10 dias.',
    pub_date: '18-09-2026',
    announcement_number: '123/2026',
    detail_url: 'https://base.gov.pt/1',
    pecas_url: 'https://acingov.pt/1',
    relevance_reasons: '["CPV: 72200000-0", "Keyword: \'desenvolvimento\'"]',
    digest_date: null
  },
  {
    id: '2',
    title: 'Manutenção de Servidores Lenovo',
    entity: 'Universidade do Minho',
    type: 'Ajuste direto',
    base_price: '15.000,00 €',
    cpv: '50312600-1',
    deadline: '5 dias.',
    pub_date: '10-09-2026',
    announcement_number: '124/2026',
    detail_url: 'https://base.gov.pt/2',
    pecas_url: null,
    relevance_reasons: '["Keyword: \'manutenç\'"]',
    digest_date: '15-09-2026'
  },
];

describe('esc — HTML escaping', () => {
  it('escapes tags and attributes', () => {
    expect(S.esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(S.esc('a"b')).toBe('a&quot;b');
    expect(S.esc("o'brien")).toBe('o&#39;brien');
  });
  it('handles null, undefined, and numbers', () => {
    expect(S.esc(null)).toBe('');
    expect(S.esc(undefined)).toBe('');
    expect(S.esc(123)).toBe('123');
  });
});

describe('parsePrice — price parsing', () => {
  it('parses formatted PT price strings to floats', () => {
    expect(S.parsePrice('180.000,00 €')).toBe(180000.00);
    expect(S.parsePrice('4.680,00 €')).toBe(4680.00);
    expect(S.parsePrice('')).toBe(0);
    expect(S.parsePrice(null)).toBe(0);
  });
});

describe('parsePubDate — date parsing', () => {
  it('parses DD-MM-YYYY dates to Date objects', () => {
    const d = S.parsePubDate('18-09-2026');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // 0-indexed September
    expect(d.getDate()).toBe(18);
  });
  it('returns Epoch Date(0) on invalid input', () => {
    expect(S.parsePubDate(null).getTime()).toBe(0);
    expect(S.parsePubDate('').getTime()).toBe(0);
  });
});

describe('reasonTags — parse JSON relevance reasons', () => {
  it('parses valid JSON string array', () => {
    const res = S.reasonTags({ relevance_reasons: '["tag1", "tag2"]' });
    expect(res).toEqual(['tag1', 'tag2']);
  });
  it('handles already parsed array or invalid input', () => {
    expect(S.reasonTags({ relevance_reasons: ['t1'] })).toEqual(['t1']);
    expect(S.reasonTags({ relevance_reasons: 'invalid json' })).toEqual([]);
    expect(S.reasonTags(null)).toEqual([]);
  });
});

describe('relTime — format ISO string to pt-PT date', () => {
  it('formats ISO timestamp to pt-PT date', () => {
    expect(S.relTime('2026-09-19T12:07:19Z')).toMatch(/19\/09\/2026/);
  });
  it('returns empty string for null/invalid input', () => {
    expect(S.relTime(null)).toBe('');
    expect(S.relTime('invalid')).toBe('');
  });
});

describe('filterAnnouncements — filtering & sorting', () => {
  it('returns all when filters are empty', () => {
    expect(S.filterAnnouncements(SAMPLE)).toHaveLength(2);
  });
  it('filters by pendente / enviado', () => {
    expect(S.filterAnnouncements(SAMPLE, { estado: 'pendente' })).toHaveLength(1);
    expect(S.filterAnnouncements(SAMPLE, { estado: 'enviado' })).toHaveLength(1);
  });
  it('filters by tipo', () => {
    expect(S.filterAnnouncements(SAMPLE, { tipo: 'Concurso público' })).toHaveLength(1);
  });
  it('filters by search query', () => {
    expect(S.filterAnnouncements(SAMPLE, { search: 'Lenovo' })).toHaveLength(1);
    expect(S.filterAnnouncements(SAMPLE, { search: 'Porto' })).toHaveLength(1);
    expect(S.filterAnnouncements(SAMPLE, { search: 'incomuns' })).toHaveLength(0);
  });
  it('sorts by price and date', () => {
    const sortedVal = S.filterAnnouncements(SAMPLE, { sort: 'valor' });
    expect(sortedVal[0].id).toBe('1');
    const sortedDate = S.filterAnnouncements(SAMPLE, { sort: 'data' });
    expect(sortedDate[0].id).toBe('1');
  });
});

describe('cardHTML — announcement card rendering', () => {
  it('renders announcement details and status pill', () => {
    const html = S.cardHTML(SAMPLE[0]);
    expect(html).toContain('Desenvolvimento de Software');
    expect(html).toContain('Câmara Municipal do Porto');
    expect(html).toContain('status-pendente');
    expect(html).toContain('100.000,00 €');
  });
  it('renders sent status pill when digest_date exists', () => {
    const html = S.cardHTML(SAMPLE[1]);
    expect(html).toContain('status-enviado');
    expect(html).toContain('Enviado 15-09-2026');
  });
  it('escapes malicious HTML content', () => {
    const evil = {
      title: '<script>alert(1)</script>',
      entity: '<img src=x onerror=alert(1)>',
      base_price: '10 €',
      relevance_reasons: '[]'
    };
    const html = S.cardHTML(evil);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
