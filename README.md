# Portal Base Monitor — Dashboard

Dashboard web do monitor de contratos públicos de TI em Portugal (Portal BASE).
Frontend HTML/CSS/JS puro (sem framework), serverless functions Vercel,
dados em **Cloudflare D1** (a fonte da verdade do agente de monitorização).

## Arquitetura

```
[Agente Base44 · workflow diário 08h dias úteis]
        │ scan Portal BASE + cascade scraper v5
        ▼
[Cloudflare D1 · portal-base-monitor]  ← fonte da verdade
   announcements / digest_log / email_log
        ▲                    ▲
        │ HTTP API           │ HTTP API
[GET /api/announcements] [GET /api/stats]   ← Vercel serverless (Node 20)
        │                    │
        └────────┬───────────┘
                 ▼
   [index.html + app.js + style.css]  ← dashboard Apple-inspired
```

- **Frontend**: `index.html`, `style.css` (design system inspirado em apple.com),
  `app.js` (filtros em tempo real: pesquisa, estado, tipo, ordenação).
- **API**: `api/announcements.js` e `api/stats.js` — query à D1 via
  Cloudflare REST API.
- **CI/CD**: `.github/workflows/deploy.yml` — deploy de produção no Vercel a
  cada push para `main` (template oficial Vercel + GitHub Actions).

## Variáveis de ambiente (Vercel)

| Nome | Descrição |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Account ID Cloudflare |
| `CLOUDFLARE_API_TOKEN` | Token com permissão D1 |
| `CLOUDFLARE_D1_DATABASE_ID` | ID da base `portal-base-monitor` (opcional; tem default) |

## Secrets GitHub Actions

`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Fonte de dados

A D1 é atualizada automaticamente todos os dias úteis às 08h pelo agente
(monitor do Portal BASE). O dashboard lê a D1 em tempo real — a lista de
anúncios, o estado (pendente / enviado no digest) e a auditoria de emails
(OK / NOT OK com razão) refletem sempre o estado atual do monitor.
