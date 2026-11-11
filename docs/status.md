# Project status & roadmap

_Last updated: 2026-11-10, after the entry validation fix (PR #31) and the login burst fix (PR #32). Before them: Phase 6 (PRs #20, #21, #22), the `parseMoney` fix (PR #23), the quote status on Patrimônio (PR #25), the closing's quote copy (PR #26), the MIT license (PR #27), the phone layout (PR #28) and the split of `CLAUDE.md` (PR #30). All planned phases are built and merged, and the roadmap has no open phase. See [What comes next](#what-comes-next)._

## Summary

| Phase | Scope | Status |
|---|---|---|
| 0 — Bootstrap | Repo, CLAUDE.md, tooling (Bun workspaces, TS strict, ESLint, Prettier) | ✅ Done (commit `13b93f3`) |
| 1 — Core ledger | US-01 Sign in, US-02 Sign out & shell, US-03 Month list, US-04 "Todos" list, US-05 Create/edit | ✅ Done (PRs #1, #2, #3) |
| 1.5 — Hardening | CI, Docker verification, small follow-ups from phase 1 | ✅ Done (PRs #6–#12) |
| 2 — Configurações | US-11 Categories and partner split settings | ✅ Done (PR #13) |
| 3 — Acerto & recorrentes | US-06 Gerar acerto, US-07 Gerar recorrentes | ✅ Done (PRs #14, #15) |
| 4 — Resumo mensal | US-08 | ✅ Done (PR #17) |
| 5 — Visão geral | US-09 (the landing page) | ✅ Done (PR #19) |
| 6 — Patrimônio | US-10 Net worth and monthly closing | ✅ Done (PRs #20, #21, #22) |

## What comes next

Nothing is in progress and no PR is open. No phase is planned. What is left:

1. **Small cleanups left from the review of PR #25**, none of them a bug:
   - the footer's "edite o ativo" also shows during a temporary provider failure
   - `dayAndMonth` could be shared with the closing's date label
   - `Date.now()` is read during render on Patrimônio and in the closing dialog
   - one web test uses a made-up fixture value
   - requests that join a refresh already running wait for it even when it started before their own read
2. **Keep typed values when leaving the closing to edit an asset.** The dialog restarts from stored values on each open, so following its advice loses what was typed. Editing the price inside the dialog would solve both.
3. **Found in the review of 2026-11-10 and not started**, most useful first:
   - backup and export: there is no way to get the data out or restore it
   - a closing cannot be corrected or undone
   - pages show nothing when a query fails
   - the password can only be changed from the CLI
   - security headers (CSP, `frame-ancestors`, `nosniff`, HSTS) and a boot warning when cookies are not secure
   - no handler for `SIGTERM` closes the server and the database

Phases are ordered by dependency. Configurações comes first because acerto, recorrentes and the dashboard need editable categories and partner settings. US-09 links into US-06, US-07 and US-08, so it comes after them.

## What is built (Phases 1 to 6)

| PR | Branch | Delivered |
|---|---|---|
| [#1](https://github.com/matheus-ferreira1/livro-caixa/pull/1) | `feat/auth-login` | Session auth, login throttling, admin CLI, login page, app shell, Docker image |
| [#2](https://github.com/matheus-ferreira1/livro-caixa/pull/2) | `feat/transactions-list` | Money, date, settlement and list rules; ledger schema; read, toggle and delete endpoints; Lançamentos page in both modes; demo seed |
| [#3](https://github.com/matheus-ferreira1/livro-caixa/pull/3) | `feat/transaction-form` | Form rules; create/replace endpoints; Novo/Editar lançamento sheet; Playwright e2e; SPA path fix |
| [#6](https://github.com/matheus-ferreira1/livro-caixa/pull/6) | `chore/ci` | GitHub Actions CI (lint, typecheck, test, build, e2e); fixed a timing race in the web form test |
| [#7](https://github.com/matheus-ferreira1/livro-caixa/pull/7) | `chore/purge-expired-sessions` | Expired sessions purged on boot and every hour |
| [#8](https://github.com/matheus-ferreira1/livro-caixa/pull/8) | `feat/session-expiry-redirect` | A 401 on any data request sends the user to `/entrar` and back after sign-in |
| [#9](https://github.com/matheus-ferreira1/livro-caixa/pull/9) | `feat/login-ip-rate-limit` | Per-IP login limit on top of the per-account lock |
| [#10](https://github.com/matheus-ferreira1/livro-caixa/pull/10) | `chore/bundle-size` | Lazy routes and a long-cached `framework` chunk |
| [#13](https://github.com/matheus-ferreira1/livro-caixa/pull/13) | `feat/settings` | Category and partner split rules; category CRUD and settings endpoints; Configurações page; restored nav item, user-menu item and "Gerenciar categorias" |
| [#14](https://github.com/matheus-ferreira1/livro-caixa/pull/14) | `feat/settlement` | `buildShareText` and `settlementEntry`; themed shadcn `Dialog`; Acerto de contas dialog; restored "Gerar acerto" on Lançamentos |
| [#15](https://github.com/matheus-ferreira1/livro-caixa/pull/15) | `feat/recurring` | Recurring candidate rules; candidates and generate endpoints (one SQLite transaction); Gerar recorrentes dialog; recurring banner with "Agora não"; restored "Gerar recorrentes" |
| [#17](https://github.com/matheus-ferreira1/livro-caixa/pull/17) | `feat/monthly-summary` | `monthSummary`, `summaryStatus` and `yearSummary`; summary endpoint; Resumo mensal page with tiles, balance chart and table; restored nav item |
| [#19](https://github.com/matheus-ferreira1/livro-caixa/pull/19) | `feat/dashboard` | `buildDashboard` and its KPI, donut, open-item and acerto rules; dashboard endpoint; Visão geral page with tiles, bars chart, donut, "Em aberto" and acerto card; Visão geral as the landing page |
| [#20](https://github.com/matheus-ferreira1/livro-caixa/pull/20) | `feat/wealth-assets` | Migration `003_wealth`; asset, quantity, KPI, evolution and allocation rules; asset CRUD and `GET /api/wealth`; Patrimônio page with tiles, chart, allocation, table and asset sheet; demo portfolio |
| [#21](https://github.com/matheus-ferreira1/livro-caixa/pull/21) | `feat/wealth-closing` | Closing availability and math; `POST /api/wealth/closings`, atomic across the snapshot and its assets; closing dialog and banners; e2e flow |
| [#22](https://github.com/matheus-ferreira1/livro-caixa/pull/22) | `feat/wealth-quotes` | `QuoteProvider` port, brapi adapter, `RefreshQuotes` on `GET /api/wealth`, optional `BRAPI_TOKEN` |
| [#23](https://github.com/matheus-ferreira1/livro-caixa/pull/23) | `fix/parse-money-thousands` | `parseMoney` reads a dot before three digits as a thousands separator |
| [#25](https://github.com/matheus-ferreira1/livro-caixa/pull/25) | `feat/quote-status` | Migration `004_quote_status`; `quoteStatus` and `elapsedLabel`; the brapi quote time; "Atualizada há…" and "Cotação indisponível" on the assets table |
| [#26](https://github.com/matheus-ferreira1/livro-caixa/pull/26) | `fix/closing-quote-copy` | The closing's copy and rows use the quote status; the sheet points cripto and câmbio to manual; quotes are requested one at a time |
| [#27](https://github.com/matheus-ferreira1/livro-caixa/pull/27) | `chore/add-license` | MIT license, which makes the login page's "Código aberto" true |
| [#28](https://github.com/matheus-ferreira1/livro-caixa/pull/28) | `feat/mobile-layout` | Phone layout: bottom nav bar, stacked rows in place of sideways-scrolling tables, charts that fit the screen, a shorter login panel; e2e spec at 375px |
| [#30](https://github.com/matheus-ferreira1/livro-caixa/pull/30) | `chore/slim-claude-md` | `CLAUDE.md` keeps the rules every task needs; the status moved to `docs/status.md`, the user stories to `docs/user-stories.md` and the design system to `apps/web/CLAUDE.md` |
| [#31](https://github.com/matheus-ferreira1/livro-caixa/pull/31) | `fix/entry-validation` | `isIsoDate` accepts only real calendar days from 1900 on; an entry's amount is capped at `MAX_ENTRY_CENTS` |
| [#32](https://github.com/matheus-ferreira1/livro-caixa/pull/32) | `fix/login-throttle-burst` | `Login` handles one attempt per client IP at a time (`KeyedQueue`), so a burst cannot outrun the lock |
| [#34](https://github.com/matheus-ferreira1/livro-caixa/pull/34) | `fix/sticky-navbar` | The header sticks to the top from 768px; `scroll-padding-top` keeps focus and anchors clear of it; only on screens at least 480px tall; e2e spec at 1440px, 768px, 844×390 and 375px |
| [#35](https://github.com/matheus-ferreira1/livro-caixa/pull/35) | `fix/sticky-header-height` | The header takes its minimum height from `--sticky-header-height`, the variable `scroll-padding-top` reads, so the two cannot drift; e2e guard at 1440px and 768px |
| [#36](https://github.com/matheus-ferreira1/livro-caixa/pull/36) | `chore/e2e-shared-helpers` | The e2e specs share one `signIn` in `e2e/helpers.ts`; the sticky header spec seeds its entries once and checks every response |

### Web routes

| Route | Screen | Notes |
|---|---|---|
| `/entrar` | Login (US-01) | Redirects to `/visao-geral` (or the page you came from) when already signed in. Shows the `notice` passed in router state after sign-out. |
| `/` | — | Redirects to `/visao-geral` |
| `/visao-geral` | Visão geral (US-09) | The landing page. State lives in the URL: `mes` and `modo` (`proj`). Defaults (the current month, `real`) are left out of the URL. |
| `/lancamentos` | Lançamentos (US-03 to US-07) | State lives in the URL: `modo` (`all`), `mes`, `tipo`, `status`, `busca`, `periodo`, `de`, `ate`, `categoria`, `ordem`, `direcao`, `pagina`, `itens`. Defaults are left out of the URL. |
| `/patrimonio` | Patrimônio (US-10) | Grouping and "Modo tranquilo" are local state, and calm mode starts on at each visit. |
| `/resumo` | Resumo mensal (US-08) | State lives in the URL: `ano` and `modo` (`proj`). Defaults (the current year, `real`) are left out of the URL. |
| `/configuracoes` | Configurações (US-11) | Categories (create, inline edit, delete) and Divisão de contas. Reached from the nav, the user menu and the form's "Gerenciar categorias" link. |
| any other path | — | Redirects to `/visao-geral`; every route except `/entrar` requires a session |

### API

All routes except `/api/health` and `/api/auth/login` require the `lc_session` cookie. Errors look like `{ error: { code, message } }`; the codes are `validation_error` (400), `invalid_credentials` / `unauthenticated` (401), `not_found` (404), `conflict` (409) and `too_many_attempts` (429). Validation messages are the pt-BR copy from the design.

| Method & path | Use case | Notes |
|---|---|---|
| `GET /api/health` | — | `{ ok: true }`; used by the Docker healthcheck |
| `POST /api/auth/login` | `Login` | Body `{ email, password, remember }`. Locks e-mail + IP for 60 s after 5 failures. A cookie that lasts 30 days with `remember`, a browser-session cookie otherwise (the server still expires it after 12 h). |
| `POST /api/auth/logout` | `Logout` | 204; deletes the session |
| `GET /api/auth/me` | `Authenticate` | `{ user: { id, email, name } }` |
| `GET /api/categories` | `ListCategories` | `{ categories, usage }`; `usage` maps a category id to its number of entries |
| `POST /api/categories` | `CreateCategory` | 201; body `{ name, type: receita\|despesa, color }`, color from the palette. 400 "Dê um nome para a categoria.", 409 "Já existe uma categoria com esse nome nesse tipo." (case-insensitive, per type) |
| `PATCH /api/categories/:id` | `UpdateCategory` | Body `{ name, color }` only; the type cannot change. Same 400/409 rules. |
| `DELETE /api/categories/:id` | `DeleteCategory` | 204; 409 "{nome} está em uso e não pode ser excluída" while any entry uses it |
| `GET /api/settings` | — | `{ settings: { partnerName, partnerShare } }` |
| `PUT /api/settings` | `UpdateSettings` | Body `{ partnerName, partnerShare }`; the name is trimmed, the share is an integer 0–100 in steps of 5 |
| `GET /api/transactions?month=YYYY-MM` | `ListMonthTransactions` | The month's entries; the client filters and sorts them |
| `GET /api/transactions/search` | `SearchTransactions` | Query params `type, status, category ('all' \| id \| 'none'), q, from, to, sort, dir, page, pageSize (25\|50\|100)`. Returns `{ items, page, totalPages, start, end, total, totals, groups[{ monthKey, count, netCents, ids }] }`. Filters run in the domain over all rows. |
| `POST /api/transactions` | `SaveTransaction` | 201; body is `TransactionInput` (`valueCents` as an integer). "Registrar acerto" posts `settlementEntry(...)` here. |
| `PUT /api/transactions/:id` | `SaveTransaction` | Full replace; keeps `seriesId` |
| `PATCH /api/transactions/:id` | `ToggleTransactionFlags` | `{ confirmed?, split? }`; only expenses can be split |
| `DELETE /api/transactions/:id` | `DeleteTransaction` | 204 |
| `GET /api/recurring/candidates?month=YYYY-MM` | `ListRecurringCandidates` | `{ candidates: [{ seriesId, date, valueCents, source }] }`; `source` is the latest earlier occurrence |
| `POST /api/recurring/generate` | `GenerateRecurring` | 201 `{ transactions }`; body `{ month, items: [{ seriesId, date, valueCents }] }`. Candidates are recomputed on the server: 400 with "Selecione ao menos um lançamento." or "Revise “{descrição}”: …", 409 when a series is no longer a candidate. All entries are inserted in one transaction. |
| `GET /api/summary?year=YYYY&mode=real\|proj` | `GetYearSummary` | `{ year, mode, months[12], totals }` in cents; `mode` defaults to `real`. "Atual" and the default year come from the client. |
| `GET /api/dashboard?month=YYYY-MM&mode=real\|proj` | `GetDashboard` | `{ month, mode, partnerName, kpis, series[12], categories, open, settlement }` in cents; `mode` defaults to `real`. `open` and `settlement` ignore the mode. Relative due labels come from the client, from `relativeDue` and its own "today". |
| `GET /api/wealth?today=YYYY-MM-DD` | `GetWealth` | `{ totalCents, investedCents, dayChangeCents, openMonth, closingAvailable, assets, kpis, evolution }` in cents. `today` comes from the client. Grouping happens on the client, from `groupAssets`. Automatic assets carry `quotedAt` (epoch ms, null when never quoted) and `quoteFailed`. With a `BRAPI_TOKEN`, it first refreshes quotes older than 30 minutes (`RefreshQuotes`), one at a time, waiting at most 3 s; a failure never fails the read, and assets not reached stay due for the next read. |
| `POST /api/wealth/closings` | `RegisterClosing` | 201 `{ snapshot }`; body `{ month, today, items: [{ assetId, flowCents, currentCents }] }`, one item per manual asset. The server recomputes the open month and total. 409 when the month is not open or the items do not match the manual assets, 400 "Revise os valores de “{nome}” ({instituição})." for a negative value. The snapshot and the assets are written in one transaction. |
| `POST /api/assets` | `CreateAsset` | 201 `{ asset }`; body is `AssetInput` (amounts in cents, `quantityE8` scaled by 1e8, `today`). 400 with the design's messages. |
| `PUT /api/assets/:id` | `UpdateAsset` | Full replace; may switch the pricing mode, which drops the old mode's fields |
| `DELETE /api/assets/:id` | `DeleteAsset` | 204 |

### Database (SQLite, `apps/api/src/infrastructure/db/migrations.ts`)

Migrations are append-only and tracked in `schema_migrations`.

- `001_users_and_sessions`:
  - `users(id, email UNIQUE, name, password_hash, created_at)`
  - `sessions(token_hash PK, user_id, expires_at, persistent)`; only the SHA-256 of the token is stored
- `002_ledger`:
  - `categories(id, name, type receita|despesa, color, UNIQUE(type, name NOCASE))`, seeded with the 12 default categories from the design
  - `transactions(id, date YYYY-MM-DD, description, note, type, category_id, value_cents > 0, split, confirmed, recurring, series_id, created_at, updated_at)`
  - `settings(id = 1, partner_name, partner_share 0–100)`, seeded with `('Companheira', 50)`
- `003_wealth`:
  - `assets(id, institution, name, asset_class, pricing auto|manual, quantity_e8, avg_price_cents, price_cents, invested_cents, current_cents, day_change_bps, quote_checked_at, updated_at, created_at)`; a CHECK requires quantity and price for `auto` and the current value for `manual`
  - `snapshots(month PK, total_cents, contributions_cents, created_at)`
- `004_quote_status`:
  - `assets` gains `quoted_at` (epoch ms) and `quote_failed`; `quote_checked_at` and `day_change_bps` are reset so the next read checks every quote again

### Domain (`packages/domain`)

- `auth/`: login validation and messages, `nameFromEmail`, `initialsOf`
- `money/`: `parseMoney` (pt-BR input → cents), `parseSignedMoney`, `formatMoney`, `formatSignedMoney`, `formatCompactAmount`, `formatPercent`, `toMoneyInput`, `percentOf`
- `dates/`: `monthLabel`, `monthName`, `monthShortName`, `shiftMonth`, `lastDayOfMonth`, `dateParts`, `todayIso`, `daysBetween`, `defaultDateForMonth`, `elapsedLabel`
- `transactions/transaction.ts`: the `Transaction`, `Category` and `Settings` types, `signedCents`, `displayPartnerName`
- `transactions/month-summary.ts`: `computeSettlement` (the acerto calculation) and `monthTiles`
- `transactions/recurring.ts`: `recurringCandidates`, `validateRecurringSelection`, `RECURRING_MESSAGES`, `recurringEntry`; `recurring-request.ts` holds `recurringGenerateSchema`
- `transactions/settlement-share.ts`: `buildShareText` (the WhatsApp message, worded as the prototype) and `settlementEntry` (the pending acerto that "Registrar acerto" creates)
- `transactions/year-summary.ts`: `monthSummary`, `summaryStatus`, `yearSummary` (the Resumo mensal, with the running total and year totals)
- `transactions/list-query.ts`: filters, `periodRange`, sorting (pt-BR collation, `compareByDate`), `paginate`, `pageList`, `groupByMonth`, `totalsOf`
- `dashboard/kpis.ts`: `compareToAverage` and `dashboardKpis`
- `dashboard/category-breakdown.ts`: `categoryBreakdown` (top 6 plus "Outras (n)", compared with the history)
- `dashboard/open-items.ts`: `openItems`, `relativeDue`
- `dashboard/dashboard.ts`: `buildDashboard`, `niceAxis`, `settlementCard`
- `categories/`: `CATEGORY_PALETTE`, `CATEGORY_MESSAGES`, `validateCategoryName`, `categoryInputSchema`, `categoryPatchSchema`, `categoryUsageCounts`, `categoriesOfType`, `toPaletteColor`
- `settings/`: `settingsInputSchema`, `PARTNER_SHARE_STEP`, `splitExample`
- `wealth/asset.ts`: the `Asset` and `Snapshot` types, `ASSET_CLASSES`, `assetValue`, `assetCost`, `valueAssets`, `institutionsOf`
- `wealth/quote-status.ts`: `quoteStatus` (updated, or unavailable with the last quote's time), `unavailableQuoteCount`
- `wealth/quantity.ts`: `QUANTITY_SCALE`, `parseQuantity`, `formatQuantity`, `toQuantityInput`
- `wealth/asset-input.ts`: the sheet draft, `ASSET_MESSAGES`, `validateAssetFields`, `draftToAssetInput`, `assetInputSchema`, `toAsset`
- `wealth/closing.ts`: `openMonth`, `closingAvailable`, `closingDraft`, `closingRequestFrom`, `applyClosing`, `closingRequestSchema`, `CLOSING_MESSAGES`
- `wealth/kpis.ts`, `wealth/evolution.ts`, `wealth/allocation.ts`, `wealth/wealth.ts`: `wealthKpis`, `evolutionSeries`, `groupAssets`, `allocationSegments`, `buildWealth`
- `transactions/transaction-input.ts`: the form draft, `applyTypeChange`, `validateInput`, `draftToInput`, `toTransaction` (the entry rules), `transactionInputSchema`

### Tests (all green on `main` and in CI)

| Suite | Count | Command |
|---|---|---|
| Domain unit | 317 | `bun run --filter '@livro-caixa/domain' test` |
| API integration | 222 | `bun run --filter '@livro-caixa/api' test` |
| Web component | 188 | `bun run --filter '@livro-caixa/web' test` |
| E2E | 15 tests: the top navigation while scrolling (sticky at 1440px and 768px, the header as tall as its scroll padding at both, scrolling away at 844×390 and at 375px with the bottom bar kept) and the phone layout (every screen and the two table dialogs at 375px, with nothing scrolling sideways or cut off and the nav on one line) and a chart tooltip staying on the screen for every month and a toast staying above the nav bar at 700px and the entry form scrolling to its last option on a short screen and the portfolio (add an asset → first closing → waiting banner → remove the asset) and the ledger (login error → login → create → confirm → edit → Todos → register and delete an acerto → delete → logout) and recorrentes (create a recurring entry → next month's banner → review → generate) and the summary (create a pending split bill → Resumo in both modes → open the month) and the dashboard (land after sign-in → pending split bill in both modes → "Confirmar") | `bun run test:e2e` |

CI (`.github/workflows/ci.yml`) runs all of these, plus `lint`, `typecheck` and `build`, on every PR and on every push to `main`. Its two jobs are "Lint, typecheck, test, build" and "E2E (Playwright, Chromium)". Both are required status checks on `main`, for admins too.

### Decisions taken in Phase 1

- After sign-in the user landed on **Lançamentos** until US-09 existed. Since Phase 5 the landing page is Visão geral.
- The money parser accepts `1.234,56`, `1.234`, `1234,56`, `180`, `10.5` and `R$ 10,5`, and rejects anything else.
- A dot before exactly three digits is a thousands separator, so `10.012` is R$ 10.012,00 and never R$ 10,12. A dot before one or two digits is the decimal mark (`10.5`, `10.50`). Thousands groups must be well formed: `1234.567` and `0.123` are rejected, because guessing could silently store the wrong amount.
- Currency formatting keeps Intl's no-break space after `R$`, and negatives use U+2212 (`−R$ 50,00`).
- The "Todos" filters run in the domain over all rows instead of in SQL, which is fine at household scale. Revisit only if the data grows past ~50k entries.
- The month view loads the whole month and filters on the client, because the tiles need the full month anyway.
- The login lockout counters live in memory, so a restart clears them. This is acceptable for a single container.
- Login throttling has two in-memory limits: 5 failures per e-mail + IP lock that pair for 60 s, and 20 failures per IP within 15 min lock that IP for 15 min. Only failures count, and a success does not clear the IP counter. Both answer 429 "Muitas tentativas. Tente de novo em {N} s.". Attempts of one IP are handled one at a time, so the limits also hold for attempts sent together (PR #32). `req.ip` honors `X-Forwarded-For` only from the proxies that `TRUST_PROXY` allows (default `loopback`).
- Expired sessions are purged on boot and then every hour (`startSessionPurge` in `apps/api/src/session-purge.ts`, use case `PurgeExpiredSessions`). `Authenticate` still drops an expired session as soon as its cookie comes back.
- The fonts ship as `@fontsource` Latin subsets instead of a CDN, so the "data stays on your instance" promise holds.
- Single-choice segmented controls are shadcn `ToggleGroup`s, which render as `radiogroup`/`radio`. Category chips and row toggles are buttons with `aria-pressed`.
- Demo data (`seed:demo`) is for development only and never loads into a part of the database that already has data (see Phase 6).
- **The app is individual (decided 2026-10-29).** One person uses each instance. The partner is only a name and a split share in `settings` and never gets a login. Do not add per-user data, partner accounts or sharing features. The CLI can still create more accounts, which all see the same ledger; keep that for admin and recovery only.

### Decisions taken in Phase 2

- Divisão de contas saves on its own, as in the design: there is no save button, and edits are sent 500 ms after the last change, so a slider drag makes one request. The settings query is updated from the response, so Lançamentos picks up the new share at once.
- Category usage counts come from the domain over all entries (`categoryUsageCounts`), like the "Todos" filters. The delete check uses the same data.
- New and edited categories take a color from the 8-color palette; the API rejects any other color. The type is fixed after creation.
- Deleting an unused category needs no confirmation, as in the prototype.
- `useCategories` and `useSettings` now live in `features/settings/api.ts`; `useCategoryCatalog` adds the usage counts for Configurações.

### Decisions taken in Phase 3

- "Registrar acerto" uses the existing `POST /api/transactions`; there is no acerto endpoint. The balance and the entry come from the domain (`computeSettlement`, `settlementEntry`) on the client, from the month already loaded for the tiles.
- The Acerto dialog follows the prototype where the story is silent: the share text says "Já combinado" for scheduled acertos, the copy-failure note is a `role="status"` in amber, and "Incluir contas previstas" resets to on each time the dialog opens.
- "Gerar acerto" shows in month mode only, as in the prototype.
- On phones the dialog's money columns shrink to 88px so bill names stay readable.
- "Agora não" on the recurring banner is stored in `localStorage` (`livro-caixa:recurring-dismissed:{YYYY-MM}`), per month and per browser. When storage is unavailable, the banner stays hidden until the page reloads.
- `POST /api/recurring/generate` recomputes the candidates and refuses any series that is no longer one (409), so a second tab or a double click cannot duplicate entries. The 409 message "Esses lançamentos já foram gerados. Atualize a página e revise de novo." is not in the design; it was written for this case.
- The recurring candidates query lives under the `transactions` query key, so any change to the ledger refreshes the banner.
- On phones the Gerar recorrentes table scrolled sideways, like the prototype's 880px table, until PR #28 stacked its rows.

### Decisions taken in Phase 4

- The current `partnerShare` applies to past months in "Com previstos", as in the prototype, because `settings` holds one share. Changing it restates the expected acerto of earlier months.
- The chart is CSS bars with no chart library, as in the prototype, so route chunks stay small.
- The Resumo table is a real `<table>`, unlike the prototype's grid. Its columns are slightly narrower than the design's, with a 1140px minimum width, because the design's own minimums overflow the 1232px page and would scroll sideways on a desktop.
- The month link is a 44px `Link`, not the prototype's 40px button: it navigates, and the touch-target rule applies.
- Bar labels use U+2212 for negatives, where the prototype keeps Intl's hyphen.
- The summary query lives under the `transactions` key, so any change to the ledger refreshes it. A share change needs no invalidation: it happens on another route, and the summary refetches when `/resumo` mounts.
- `SummaryTiles` moved to `shared/` now that two screens use it.
- Like the other screens, Resumo shows no page-level message when its query fails, and the design has no copy for one.

### Decisions taken in Phase 5

- The averages use the 12 months before the viewed month, while the bars use the 12 months ending at it, as in the prototype. Averages skip months with no data, and the donut's history divides by the months that had a counted expense.
- "Abrir acerto" and "Revisar e gerar" open their dialogs in place on Visão geral, so closing returns to the dashboard. The prototype goes to Lançamentos instead; this departure was approved for Phase 5.
- The banner in "Em aberto no mês" is the prototype's compact one, not `RecurringBanner`. It has no "Agora não" and ignores a dismissal made on Lançamentos.
- Unknown paths redirect to Visão geral, the same home as `/` and the login.
- "Confirmar", "Ver tabela" and "Revisar e gerar" are 44px, not the prototype's 36px, and "Abrir acerto" is 44px, not 40px, because of the touch-target rule.
- "{n} contas divididas" reads "1 conta dividida" for one bill, where the prototype always uses the plural.
- A negative net-spend average divides by its absolute value, so "acima" and "abaixo" stay correct where the prototype would invert them.
- On phones "Confirmar" takes its own line in each row, or the description would have no room. The date column is 64px, not 56px, so "Em 10 dias" stays on one line.
- The axis scale starts at R$ 4, not the prototype's R$ 1, so an empty chart shows whole reais instead of rounded quarters.
- The bars take keyboard focus and show the tooltip, and their aria label adds acertos and balanço, which the prototype leaves to the mouse.
- The acerto badge keeps the prototype's rule: a 0% share with split bills reads "Sem contas divididas".
- While another month loads, the cards keep the last data and name that data's month. The heading already shows the new month.
- `SummaryTiles` gained `hint` and `delta`; tiles with a hint use the design's ink label and 28px value.

### Decisions taken in Phase 6

- Quantities are integers scaled by 1e8 (`quantity_e8`), so `0,0038961` needs no float math. In a quantity with no comma, a dot is the decimal separator (`4.89`), because many decimals are common and thousands are not.
- Amounts stay in integer cents, so a quote below R$ 0,01 cannot be represented. Nothing in the prototype's classes needs one today.
- The app can start with no closings, which the prototype cannot. The open month is then the previous calendar month. Tiles show "—" with "Primeiro fechamento", the labels drop the month ("Desde o fechamento", "Último fechamento"), the hint reads "Nenhum fechamento registrado", and the chart shows only the open month. None of this copy is in the design.
- An empty portfolio reads "Nenhum ativo na carteira.", which is not in the design either.
- "Modo tranquilo" is not saved, as in the prototype: it starts on at each visit.
- Row buttons and the grouping control are 44px, not the prototype's 40px and 36px, because of the touch-target rule. The actions column grew from 84px to 92px to fit.
- `SummaryTiles` gained `valueTone` for colored values. On a dark tile, its hint and delta now use the on-dark color, because the muted gray was too low in contrast. No earlier dark tile has a hint or a delta, so Lançamentos and Resumo look the same.
- Grouping and the "Hoje" column are computed on the client from the asset list, like the month view's filters.
- Institution colors follow the order assets were added, so removing an institution's first asset can recolor the others, as in the prototype.
- The first closing opens at once for the previous calendar month, and only once there is an asset, so an empty portfolio shows no banner and a disabled "Fechamento em dia". The first closing's dialog reads "Primeiro fechamento", with "—" for Variação and Rendimento.
- `today` in a closing comes from the client, like every "today" here, so the 25th rule follows the user's calendar. The server's check is against double submits, not against a client that lies about the date.
- The 409 message "Esse fechamento não está mais em aberto ou a carteira mudou. Atualize a página e revise de novo." is not in the design; it was written for this case.
- Buying more of an automatic asset by editing it raises the total but is not a contribution, so it counts as rendimento in the next closing, as in the prototype. Only manual assets have an "Aporte / resgate" field.
- A skipped month closes in sequence, with today's values, as in the prototype.
- A withdrawal larger than the invested amount stops it at zero, where the prototype lets it go negative. What is left is all gain, and a negative cost would break the row's result and the sheet's validation. The full flow still counts in the closing's Aportes.
- The "Aporte / resgate" input is plain text with no decimal keypad hint, because phone decimal keypads often have no minus key.
- Quotes come from brapi and only with `BRAPI_TOKEN` (decided 2026-11-03). With no token nothing leaves the instance, so "sem conta em serviço de terceiros" stays true. Only the `etf` and `fii` classes are quoted, which is what the free token covers; `cripto` and `cambio` keep a typed price.
- Quotes refresh when Patrimônio is read, not on a timer: at one request per asset, a 30-minute timer costs 1,440 requests per asset per month against the free plan's 15,000. A failed lookup still stamps `quote_checked_at`, so a bad ticker is not retried on every page load, and it clears the daily change, which would be an old one. Editing an asset clears the stamp, since its ticker may have changed, so a found quote replaces a price typed by hand.
- The ticker is the asset's name, upper-cased, as the sheet's placeholder suggests.
- The closing uses the stored quotes and does not refresh them: the page has already done so when it loaded.
- `seed:demo` checks the ledger and the portfolio separately, so a dev database from before this phase can still get its demo portfolio.

### Decisions taken for the quote status (PR #25)

- The asset tag replaces the design's "Cotação automática" with the quote's real state. None of this copy is in the design: "Atualizada agora", "Atualizada há {n} min", "Atualizada há {n} h", "Atualizada há {n} dia(s)", "Cotação indisponível", and the footer's extra line "Sem cotação, o ativo usa o último preço salvo. Para atualizar, edite o ativo.". The sheet keeps "Cotação automática" as the name of the pricing mode.
- "Há…" measures brapi's `regularMarketTime`, not our check, because the page checks on load: our own time would almost always read "agora", and a Friday close would look fresh on a Saturday. Without a usable time from the source, it falls back on the time of the check.
- One tag covers every reason for no quote: a class that is never quoted, no `BRAPI_TOKEN`, an unknown ticker, a provider failure. On an instance with no token, every automatic asset shows it, and that is intended: no one is fetching that price.
- The tag uses the "Previsto" amber, since the price asks for attention but nothing is wrong, and takes its own line under the institution, so every such row breaks the same way.
- An unavailable price is aged under it in the Cotação column: "em dd/mm" for a price only ever typed, "há…" for the last quote found.
- An edit that changes the ticker, the class or the price forgets the quote and dates the price today, because the price may now be typed. Other edits, such as the institution or the quantity, keep the quote and the price's date, so renaming a broker does not make an old price look recent. Either way, the next read checks again.
- A daily change exists only alongside a quote. A failed check, a forgotten quote and a missing provider all clear it, so "Hoje" never shows a change next to "Cotação indisponível". The demo seed loses its sample changes for this reason.
- With no `BRAPI_TOKEN`, each read marks earlier quotes unavailable (`markQuotesUnavailable`), so removing the token does not leave them green. The time of the last quote stays under the price.
- The label is computed at render and does not tick while the page stays open.
- `seed:demo` stores no quote, so the demo portfolio's automatic assets read "Cotação indisponível" without a token.

### Decisions taken for the closing's quote copy (PR #26)

- **Quotes come only from brapi's free plan (decided 2026-11-03).** No paid plan and no second provider. What it does not cover, `cripto` and `cambio` included, is kept by hand.
- The design's "As cotações automáticas já estão em dia" and "Já atualizadas, nada a fazer" show only when every automatic asset has a current quote. Otherwise the banner reads "{n} ativos sem cotação usam o último preço salvo." and the dialog adds "Para atualizar o preço, edite o ativo antes de fechar.". The status stays after that edit, because the price is still typed. This copy is not in the design. A missing quote warns and never blocks the closing, so a provider outage cannot stop one.
- Each row of "2. Cotações automáticas" shows the same tag as the assets table.
- The sheet's hints differ from the design because its promise was false: "Cotação automática" reads "FIIs e ETFs", and "Manual, no fechamento" adds "cripto e câmbio", since the closing asks for a manual asset's value each month. An automatic asset in a class with no quote is still allowed, and its price field reads "Esta classe não tem cotação automática. Mantenha o preço atualizado aqui ou use o modo manual.".
- Quotes are requested one at a time, because brapi's free plan allows one simultaneous request. A real token took about 1.3 s for 6 lookups, so the 3 s limit covers around 14 assets per read. Assets not reached stay due and are not marked, and so does a lookup cut short after an earlier one used the time, or a large portfolio would flag a healthy ticker on every round. The first lookup of a round had all 3 s, so it counts as failed; a hung provider costs one slow page load per asset and not one per read forever.

### Decisions taken for the phone layout (PR #28)

The design has no phone drawing beyond stacking, so everything here was decided in code. Breakpoints: stacked tables and the nav bar below 768px (`md`), fitted charts and the short login panel below 640px (`sm`).

- **One DOM, restyled with CSS.** Nothing is rendered twice for phones, because happy-dom ignores media queries and duplicated controls would break role queries. A stacked row is the same grid with other placements (`[grid-area:…]`), and labels that only phones need come from `data-label` through `STACKED_CELL_LABEL` (`shared/stacked.ts`).
- Below 768px the nav is a fixed bar at the bottom with an icon over each label: Visão geral, Lançamentos, Patrimônio, Resumo mensal. Configurações does not fit a fifth slot at 320px, so on phones it is reached from the account menu. `main` and the toasts leave room for the bar through `--phone-nav-clearance` (`index.css`), which is zero from 768px. Both of Sonner's offsets use it, because Sonner's own phone layout stops at 600px. From 768px to 1023px the nav has its own header row, and from 1024px it is inline.
- Lançamentos stacks each entry in three lines: description and value, date and category, then the toggles and actions. The "Tipo" pill and the "—" of "Dividido" are hidden there, since the value's sign and color tell the type. The header keeps only the three sort buttons.
- Resumo mensal stays a `<table>` whose rows become grids, and every element states its ARIA role, because browsers drop table semantics once `display` changes. A month with no entries keeps only its first line.
- Patrimônio stacks each asset on a grid of 6: name beside the current value and result, then Qtd., Preço médio and Cotação, then Aplicado, % carteira and the actions. A manual asset has no unit line.
- The dialogs of Gerar recorrentes and Fechamento stack their rows the same way, with each input under its label.
- Below 640px the three charts shrink to the screen instead of scrolling. The first axis label wraps ("Dez" over "’25"), and Balanço por mês hides the value over each bar, which the table below repeats.
- Below 640px a chart tooltip is placed against the whole plot, not its month's column, which is narrower than the tooltip.
- The nav stays second in the DOM at every width, so keyboard focus matches the screen from 1024px. Below that, focus reaches the nav before the account button although the nav is drawn after it. Any other order would move the mismatch to the desktop, where a keyboard is most likely.
- Tailwind only sees class names written out in full, so the `[grid-area:…] md:[grid-area:auto]` pairs are literals in each file and cannot come from a helper.
- Stacked, the 36px pills get a 44px touch area from a pseudo-element, and row buttons, pager buttons and "Abrir mês" are 44px.
- On phones the login panel keeps only the logo and the headline, so the form is on the first screen.
- From 768px to about 1200px the tables still scroll sideways inside their card, as before.

### Decisions taken for entry validation (PR #31)

- `isIsoDate` accepts only a day that exists on the calendar, from 1900 on. It was a shape check, so the API stored `2026-02-31` or `2026-99-99`, which no month view would ever list. Every date the API reads goes through it: entries, the search range, recurring items and each `today`. The lower bound is there because no ledger goes back further and `Date.UTC` reads the years 0 to 99 as 1900 to 1999.
- An entry's amount, typed or generated from a recurring series, is at most `MAX_ENTRY_CENTS`, R$ 1 bilhão. A cap on each entry is what keeps totals exact: a safe-integer check alone would still let two huge entries add up past `Number.MAX_SAFE_INTEGER`. The answer above it is the generic 400 "Dados inválidos.", since the design has no copy for it.
- Entries stored before this fix with an impossible date are left as they are; nothing looks for them. Such an entry shows only in "Todos", and saving it asks for the date ("Informe a data."), which is how it gets corrected.

### Decisions taken for the login burst (PR #32)

- `Login` handles one attempt per client IP at a time (`KeyedQueue`). The lock was checked before the password and the failure counted after it, so attempts sent together were all checked before the first one counted: 30 at once meant 30 guesses, and the right password among them signed in. Now the sixth waits for the fifth, finds the lock and answers 429.
- The queue is per IP, which covers the e-mail + IP lock too. Other clients do not wait, and a locked client's queued attempts end at once, without a password check.
- Clients that share an IP share the queue, as they already share the per-IP lock: behind a reverse proxy in another container with `TRUST_PROXY` left at `loopback`, every sign-in waits its turn. At most 20 password checks stand ahead before the IP lock ends the rest. The answer is the same as for the lock: set `TRUST_PROXY`.
- The queue has no length limit. A flood from one IP keeps its requests waiting until the 20th failure locks the IP, and then they end at once. A limit would need a new answer for "too many at once", and the per-IP lock already bounds the password checks.
- `createContainer` takes an optional `hasher`, so the HTTP test counts the passwords checked with a fake one (`CountingHasher` in `test/harness.ts`).

### Decisions taken for the sticky header (PR #34)

- From 768px the header is `position: sticky; top: 0` with `z-40`, below the `z-50` dialogs, sheets and menus. On phones it scrolls away as before and the nav stays a fixed bottom bar.
- The header sticks only on screens at least 480px tall (the `tall` variant in `index.css`). A phone held sideways is 768px wide or more but under 450px tall, and the two-row header would keep over a quarter of it.
- `html` gets `scroll-padding-top: var(--sticky-header-height)` from 768px on those tall screens, so a focused field or a scroll target is not hidden under the header. The variable is 6.75rem (108px, the two-row tablet header) and 4rem (64px, the single row) from 1024px. The header's inner container takes its `min-height` from the same variable, and an e2e guard fails if the header's content ever grows taller than it.

## Roadmap

Every item below gets its own branch and PR, following the Git workflow in `CLAUDE.md`.

### Phase 1.5 — Hardening (done)

- [x] **CI** (PR #6): `.github/workflows/ci.yml` runs on every PR and on pushes to `main`, pinned to Bun 1.3.4. Job "Lint, typecheck, test, build" runs `bun install --frozen-lockfile`, `lint`, `typecheck`, `test` and `build`; job "E2E (Playwright, Chromium)" runs `test:e2e` with cached browsers and uploads `test-results/` on failure.
  - [x] Both jobs are required status checks on `main`, for admins too (2026-11-03). GitHub only offers this on a private repository with a paid plan, so the repository was made public.
- [x] **Verify the Docker image** (2026-10-29, Docker 28.4, image 283 MB): `docker compose up --build` with `ADMIN_PASSWORD` set creates the admin on first boot only; the healthcheck reports healthy; the SPA and `/api` are served from one port; login works and sets the session cookie; an entry and its session survive both `restart` and `down`/`up` (`/data` volume); `cli reset-password` (with `NEW_PASSWORD`) changes the password and signs out existing sessions; `cli create-user` works.
- [x] **Clean up expired sessions** (PR #7): `PurgeExpiredSessions` deletes rows past `expires_at` on boot and every hour.
- [x] **Rate limit by IP** (PR #9): `POST /api/auth/login` also locks a client IP for 15 min after 20 failures within 15 min, across any e-mails (`IP_THROTTLE_POLICY` in `LoginThrottle.ts`).
- [x] **Session expiry in the UI** (PR #8): `createQueryClient` (`shared/api/query-client.ts`) clears the user query on any 401 from a query or mutation (except login and logout), so `RequireAuth` redirects to `/entrar` and back after sign-in; 401s are not retried and show no error toast.
- [x] **Bundle size** (PR #10): routes load lazily (React Router `lazy`), and react, react-dom and the router share one long-cached `framework` chunk. Initial JS on `/entrar` went from 670 kB minified / 210 kB gzip to 508 kB / 158 kB. `/lancamentos` stays at 662 kB / 211 kB, now in route chunks that new screens will not grow. lucide-react was already tree-shaken (~8.5 kB), so per-file icon imports would not help. Follow-ups: the domain barrel puts zod (~53 kB) on `/entrar`, and react-router only ships its `development` build through its exports map.

Follow-ups found during Phase 1.5:

- [x] **`TRUST_PROXY` setting**: Express `trust proxy` comes from the `TRUST_PROXY` env var (default `loopback`), parsed and validated in `config.ts` and passed to `createApp`. Behind a reverse proxy in another container (the usual HTTPS setup), set it to `1` or `uniquelocal` so the per-IP login limit sees real client IPs instead of locking everyone out together.
- [x] **Smaller login bundle**: initial JS on `/entrar` went from 508 kB / 158 kB gzip to 450 kB / 144 kB. `packages/domain` is `"sideEffects": false` and `loginRequestSchema` lives in `auth/login-request.ts`, so the login page no longer pulls zod in; keep module-level zod schemas out of modules the login page imports. Production builds alias `react-router` to its `dist/production` entry (`vite.config.ts`), since its exports map only offers the development build.

### Phase 2 — Configurações (US-11) (done, PR #13)

- [x] API:
  - `POST/PATCH/DELETE /api/categories`; a category in use cannot be deleted; names must be unique per type, case-insensitive
  - `PUT /api/settings` with `partnerName` and `partnerShare` (0–100, step 5)
- [x] Domain: category validation messages ("Dê um nome para a categoria.", "Já existe uma categoria com esse nome nesse tipo."), usage counts, the swatch palette.
- [x] Web `/configuracoes`:
  - categories card with create, inline edit and delete
  - Divisão de contas with the live preview text
- [x] Restore the nav item, the user-menu item and "Gerenciar categorias".
- [x] Invalidate the `categories` and `settings` queries after edits; the Lançamentos tiles and form must reflect the new share.

### Phase 3 — Acerto and recorrentes (US-06, US-07) (done, PRs #14, #15)

- [x] **US-06 Gerar acerto** (PR #14):
  - dialog with the print summary, "Incluir contas previstas", share text, "Copiar texto", "Enviar no WhatsApp" and "Registrar acerto"
  - `buildShareText` and `settlementEntry` in the domain, on top of `computeSettlement`
  - the acerto is registered through `POST /api/transactions`
- [x] **US-07 Gerar recorrentes** (PR #15):
  - domain `recurringCandidates(transactions, month)`
  - `GET /api/recurring/candidates?month=` and `POST /api/recurring/generate` (validated, transactional, keeps `seriesId`)
  - review dialog
  - the banner with a per-month "Agora não", stored in `localStorage`
- [x] Restore the "Gerar acerto" (PR #14) and "Gerar recorrentes" (PR #15) buttons and the banner on Lançamentos.

### Phase 4 — Resumo mensal (US-08) (done, PR #17)

- [x] Domain: `monthSummary(month, mode)` and `summaryStatus`, plus the year aggregates.
- [x] API `GET /api/summary?year=&mode=real|proj`.
- [x] Web `/resumo`:
  - year navigation and mode toggle
  - KPI tiles
  - diverging "Balanço por mês" chart
  - table with Acumulado bars, Situação and links to each month

### Phase 5 — Visão geral (US-09) (done, PR #19)

- [x] Domain: KPIs and deltas against the 12-month average, the 12-month series, the category donut with the "Outras" bucket, open items with relative due labels.
- [x] API `GET /api/dashboard?month=&mode=`.
- [x] Web `/visao-geral`:
  - KPI tiles
  - bars chart with tooltip
  - donut and legend
  - "Em aberto no mês" with "Confirmar"
  - acerto card
- [x] Make Visão geral the landing page after login and the `/` redirect.

### Phase 6 — Patrimônio and Fechamento (US-10) (done, PRs #20, #21, #22)

- [x] Migration `003_wealth`: `assets` and `snapshots` tables.
- [x] Domain: asset value and cost, KPIs, allocation by class and institution.
- [x] Domain: closing availability (from the 25th), closing math.
- [x] API: asset CRUD, `GET /api/wealth`.
- [x] API: `POST /api/wealth/closings`.
- [x] Web `/patrimonio`: header with "Modo tranquilo", KPI tiles, evolution chart, allocation bar, assets table, asset sheet.
- [x] Web `/patrimonio`: banners, closing dialog.
- [x] Automatic quotes for `pricing: 'auto'` assets through brapi, with an optional `BRAPI_TOKEN` (decided 2026-11-03). A free token covers the `etf` and `fii` classes; crypto and currency need a paid plan, so those keep a typed price.

Follow-ups found during Phase 6:

- [x] Verify the Docker image with a real `BRAPI_TOKEN` (2026-11-03, Docker 28.4): an ETF is quoted from `oven/bun:1.3-slim` with the token, and keeps its typed price without it.
- [x] Crypto and currency quotes: decided against (2026-11-03). They stay manual, and quotes come only from brapi's free plan.
- [x] The closing's copy said automatic quotes were current even when they were not. It now follows each quote's status (PR #26).
- [x] `parseMoney` read `1.234` (a dot with no comma) as R$ 3,34 instead of R$ 1.234,00. This predated Phase 6 and affected every money field (PR #23).

