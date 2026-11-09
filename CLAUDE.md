# Livro-caixa

Self-hosted household cash book for a couple. It tracks income and expenses, marks bills that are split with a partner, and works out the monthly settlement (**acerto**). It also has recurring entries, a monthly summary, a dashboard and a net-worth tracker. Everything runs in a single Docker container, and the data stays on the user's own instance.

The source design is the Design canvas "Livro-caixa — Lançamentos e acerto": https://claude.ai/code/artifact/fe1ce3e5-2bb1-4f8e-8afa-5406b57c8a9a. Its `project/Main.dc.html` holds the whole interactive prototype, markup and logic. When a story below is ambiguous, the prototype decides.

**[Project status & roadmap](#project-status--roadmap) is the source of truth for what is done and what comes next.** Keep it current: every feature PR updates it (see the Definition of done).

## Language rules

- **Code, identifiers, comments, commits, branch names, PR titles and PR bodies are in English.**
- **UI copy is Brazilian Portuguese (pt-BR), verbatim from the design.** Never translate the UI and never paraphrase its strings. Quoted strings in this file are the exact copy.
- Domain terms keep the English names below in code. The pt-BR terms appear only in UI copy and in the persisted enum values listed here.

| pt-BR (UI) | Code | Notes |
|---|---|---|
| lançamento | `Transaction` | One entry in the cash book |
| receita | `'receita'` type, "income" | Persisted enum value stays pt-BR |
| despesa | `'despesa'` type, "expense" | |
| acerto | `'acerto'` type, "settlement" | Money received from the partner for split bills. It is not income. |
| previsto | `confirmed = false`, "pending" | |
| confirmado | `confirmed = true` | |
| conta dividida / dividido | `split` | Only expenses can be split |
| recorrente | `recurring`, `seriesId` | |
| companheira / companheiro(a) | `partner` | `settings.partnerName` |
| patrimônio | net worth / `Asset` | |
| fechamento | monthly net-worth closing / `Snapshot` | |
| aporte / resgate | contribution / withdrawal | |

## Stack

| Layer | Choice |
|---|---|
| Runtime / package manager | Bun (workspaces) |
| Backend | Express 5 on Bun, `bun:sqlite`, zod 3, cookie-parser |
| Frontend | Vite 7 + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui (new-york, radix-ui), TanStack Query 5, React Router 7, React Hook Form, Sonner, lucide-react |
| Shared | `packages/domain`: pure TypeScript domain rules and zod schemas, used by both apps |
| Tests | `bun test` (domain + API, supertest), Vitest 4 + Testing Library + happy-dom (web), Playwright (e2e, Chromium) |
| Delivery | One multi-stage Docker image. Express serves `/api` and the built SPA. SQLite lives on the `/data` volume. |

## Repository layout

```
packages/domain/        Pure domain: money (integer cents), dates, transactions, settlement, list queries, schemas
apps/api/
  src/application/      Use cases (one class or function per use case), ports (repository interfaces)
  src/infrastructure/   SQLite repositories, migrations, password hasher, clock
  src/interface/http/   Express routers, auth middleware, request validation, error mapping
  src/cli.ts            Admin commands: create-user, reset-password
apps/web/
  src/features/<feature>/   Pages, feature components, hooks, view-model mappers
  src/shared/ui/            shadcn/ui components (generated, then themed)
  src/shared/api/           Typed fetch client
e2e/                    Playwright specs
```

## Commands

```bash
bun install
bun run dev            # api on :3000 and web on :5173 (proxying /api)
bun run seed:demo      # loads the prototype's sample ledger (Nov 2025 – Oct 2026) and portfolio (assets and 12 closings) into a dev database, each only if it is empty
bun run test           # all unit + integration tests
bun run test:e2e       # Playwright: builds the SPA and serves it from the API on :4173 with an in-memory DB
bun run lint
bun run typecheck      # all workspaces plus e2e/
bun run build          # builds the SPA into apps/web/dist
docker compose up --build             # production image on http://localhost:3000
docker compose exec app bun run cli create-user <email> <name>
docker compose exec app bun run cli reset-password <email>
```

The first user comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` on first boot, or from `create-user`. There is no signup screen. The CLI prompts for the password, or reads it from `NEW_PASSWORD`. `reset-password` signs out every session of that user.

Environment variables (`apps/api/src/config.ts`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATABASE_PATH` | `./data/livro-caixa.sqlite` (`/data/livro-caixa.sqlite` in Docker) | SQLite file; `:memory:` for tests |
| `STATIC_DIR` | unset (`/app/apps/web/dist` in Docker) | Built SPA to serve; may be relative |
| `SECURE_COOKIES` | `false` | Set `true` behind HTTPS |
| `TRUST_PROXY` | `loopback` | Proxies allowed to set `X-Forwarded-For`, which decides the client IP for the per-IP login limit: `true`, `false`, a hop count, or a comma-separated list of IPs, CIDRs and `loopback` / `linklocal` / `uniquelocal`. Behind a reverse proxy in another container use `1` or `uniquelocal`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | unset | First user, created only while the database has no users |
| `BRAPI_TOKEN` | unset | Token for [brapi.dev](https://brapi.dev) quotes of ETFs and FIIs. Unset, the instance makes no outbound request and prices stay as typed. |

## Architecture

The backend follows **clean architecture**, and the dependency rule is strict:

```
interface (http, cli) → application (use cases, ports) → domain (packages/domain)
infrastructure (sqlite, hashing) implements application ports
```

- `packages/domain` has no I/O and no framework imports. It holds pure functions and types: money, date math, validation, settlement and tile calculations, sorting, filtering and pagination. It is the most heavily tested code.
- Use cases receive their dependencies (repositories, clock, hasher) through constructor injection. They never import Express or SQLite.
- Repositories are **ports** (interfaces) in `application`. Their **adapters** live in `infrastructure`.
- HTTP handlers stay thin: parse the input with zod, call a use case, map the result or error to a response.
- The frontend is **folder-by-feature**. Components render; *view-model mappers* (pure functions) turn domain data into display data such as labels, colors and aria strings. Server state lives in TanStack Query. Purely visual state stays local to its component.

### Design patterns in use

- **Repository**: persistence behind an interface (`TransactionRepository`, `SessionRepository`, `UserRepository`, `CategoryRepository`, `SettingsRepository`, `AssetRepository`, `SnapshotRepository`).
- **Use case / command**: `Login`, `Logout`, `ListTransactions`, `CreateTransaction`, `UpdateTransaction`, `DeleteTransaction`, `RegisterClosing`, `RefreshQuotes`, …
- **Adapter**: SQLite repositories, `BunPasswordHasher`, `SystemClock`, `BrapiQuoteProvider`.
- **Strategy**: sort comparators keyed by sort column; period-range resolvers.
- **Factory / builder for tests**: `aTransaction({...overrides})`, `aCategory(...)`.
- **Mapper / view model**: row view models in the web app, the same idea as `rowViewModel` in the prototype.

## Code conventions (clean code)

- TypeScript `strict`. No `any`; use `unknown` and narrow it. No non-null assertions without a comment explaining why.
- Small functions that each do one thing. Intention-revealing names. No abbreviations other than well-known ones (`id`, `url`).
- No magic numbers or strings: put named constants near their use (`MAX_LOGIN_ATTEMPTS = 5`, `LOCK_DURATION_MS = 60_000`).
- **Money is integer cents everywhere**: in the database, the API and the domain. Format only at the edge with `formatMoney`. Parse user input with `parseMoney` (pt-BR: `"1.234,56"`). Never do float math on reais.
- **Dates are `YYYY-MM-DD` strings**, and months are `YYYY-MM`. Never use `new Date(iso)` for calendar dates, because it parses them as UTC. The "today" used for defaults comes from the client.
- The minus sign shown in the UI is U+2212 `−`, as in the design.
- Fail fast at boundaries: validate requests with zod and return `400` with `{ error: { code, message } }`. Write user-facing messages in pt-BR, verbatim from the design.
- No dead code, no commented-out code, no TODOs without an issue link.
- Comments explain *why*, not *what*.
- ESLint and Prettier must pass. Imports are ordered automatically.

## Testing strategy — TDD

Work **red → green → refactor**. Write the failing test first, make it pass with the simplest code, then refactor with the tests green.

| Level | Tool | What | Location |
|---|---|---|---|
| Unit | `bun test` | Every domain rule: money parsing and formatting, tiles, settlement, filters, sort, pagination, validation | `packages/domain/**/*.test.ts` |
| Integration | `bun test` + supertest | HTTP endpoints against in-memory SQLite: auth, lockout, CRUD, authorization | `apps/api/**/*.test.ts` |
| Component | Vitest + Testing Library + happy-dom | Pages and forms. Query by role and label, as a user would. | `apps/web/**/*.test.tsx` |
| E2E | Playwright | Critical flows only: login, create, edit, delete, logout | `e2e/*.spec.ts` |

- Test behavior, not implementation. One reason to fail per test. Use test-data builders instead of large literals.
- Every bug fix starts with a test that reproduces the bug.
- **Definition of done:** tests written first and passing, plus `lint`, `typecheck` and `build` passing, plus the UI checked against the design at 1440px and 375px, plus [Project status & roadmap](#project-status--roadmap) updated in the same PR (story status, endpoints, schema, test counts, follow-ups).

## Git workflow

1. **Every feature or fix gets its own branch** off `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`. Never commit directly to `main`.
2. Commit in small steps with **Conventional Commits**, in English (`feat(transactions): add month tiles`).
3. When the work is done, push the branch and **open a pull request** for review. The PR has a summary, the user stories it covers, and a test plan. Dependent features may use stacked PRs, where each PR targets its parent branch and is retargeted to `main` once the parent merges.
4. Run the `code-review` skill to validate the changes, looking for code quality issues and bugs. If the agent approves, then proceed with the merge. The PR is merged only after it is **reviewed and approved**.
5. **After the merge, delete the feature branch both remotely and locally:**
   ```bash
   git switch main && git pull
   git push origin --delete <branch>   # skip if GitHub auto-deleted it
   git branch -d <branch>
   git fetch --prune
   ```
6. To complete the task, update the `CLAUDE.md` file with the current state, expliciting which phases are completed and what are the next steps.

## Design system

Fonts: **Schibsted Grotesk** (400/500/600/700) for UI and **IBM Plex Mono** (400/500/600) for all numbers and money. Both are self-hosted through `@fontsource`, never from a CDN. Base text is 15px with line-height 1.45.

| Token | Hex | Use |
|---|---|---|
| `--background` | `#F4F5F1` | Page background |
| `--foreground` / `--primary` / ink | `#17201C` | Text, primary buttons, header, dark tiles |
| mint | `#9FD8BE` | Logo, avatar, accents on dark |
| header-active | `#2C3832` | Active nav item, open user menu |
| on-dark muted | `#C9D3CD` | Secondary text on dark |
| `--muted-foreground` | `#5B6560` | Secondary text |
| icon | `#4A544F` | Icon buttons, inactive segment text |
| `--border` | `#DFE2DC` | Cards, outline buttons |
| divider | `#ECEEE9` | Row dividers |
| `--input` | `#C9CEC6` | Input borders, secondary outline buttons |
| table header | `#F8F9F6` | Table header and footer bands |
| segment track | `#E6E9E3` | Background of segmented controls |
| receita | `#136B4A` on `#E3F1EA` | Income, success, "Confirmado" (border `#B9DCCB`) |
| despesa / destructive | `#A8401A` on `#FBE9E0` | Expense, errors, delete. Deleting-row bg `#FBF3EF`. |
| acerto / link | `#2A4FB8` on `#E5EBFA` | Settlement, links, info. Info text `#1F3C8F`. |
| previsto | `#8A5A00` on `#FBF1DC`, dashed border `#D9B865` | Pending status |
| negative-on-dark | `#F2A27E` | Negative balance on dark tiles |
| disabled text | `#B5BBB6` | Disabled pager arrows |
| neutral swatch | `#9AA29D` | "Sem categoria", chart zero line |
| chart bars | `#86BFA5` surplus with previstos, `#C2561F` deficit, `#E8A887` deficit with previstos, `#2F6E57` Acumulado | Resumo mensal |
| dashboard chart | `#1A6E4E` Receitas, `#E8894A` Despesas, `#5FBF94` Receitas swatch on the dark tooltip, `#3A4640` tooltip divider, `#F1F2EE` hovered month, donut track and neutral badge | Visão geral |
| current row | `#F7F8F4` | Current month in the Resumo table |
| overlay | `rgba(23, 32, 28, 0.45)` | Modal and sheet backdrop |

Category palette (CVD-safe order): `#2A78D6 #EB6834 #1BAF7A #EDA100 #E87BA4 #008300 #6250D6 #E34948`.

Radii: 8px for small controls and row buttons, 10px for buttons and inputs, 12px for banners and segment tracks, 14px for cards, 18px for modals, 999px for pills and chips. Page container: `max-width: 1280px`, padding `32px 24px 64px`, section gap 24px.

**shadcn mapping**

| Design element | Component |
|---|---|
| Buttons (primary ink, outline, ghost, destructive, link-blue outline) | `Button` |
| Segmented controls ("Por mês / Todos", type and status filters, period, page size) | `ToggleGroup` styled as a segmented track |
| Tiles, list container | `Card` |
| Novo/Editar lançamento | `Sheet`, side right, 480px |
| Acerto, Recorrentes, Fechamento | `Dialog` |
| Toasts | `Sonner`, bottom center, ink background |
| User menu | `DropdownMenu` |
| Inputs | `Input`, `Textarea`, `Checkbox`, `Label` |
| Category chips | `Toggle`, pill shaped, with a color square |

**Accessibility, as drawn in the design:** touch targets of at least 44px; `aria-pressed` on toggle buttons; `aria-current="page"` on the active nav item and page number; `aria-label` on every icon-only button (in pt-BR, for example "Mês anterior" and "Editar {descrição}"); `role="alert"` for errors and `role="status"` for notices; text contrast of at least 4.5:1; a real `<button>`, `<a>` or `<input>` for every control.

---

# Project status & roadmap

_Last updated: 2026-11-09, after Phase 6 (PRs #20, #21, #22), the `parseMoney` fix (PR #23), the quote status on Patrimônio (PR #25), the closing's quote copy (PR #26), the MIT license (PR #27) and the phone layout (branch `feat/mobile-layout`, PR not opened yet). All planned phases are built and merged, and the roadmap has no open item. See [What comes next](#what-comes-next)._

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

The phone layout is committed on `feat/mobile-layout` and waits for its PR, review and merge. No phase is planned. What is left is optional:

1. **Small cleanups left from the review of PR #25**, none of them a bug:
   - the footer's "edite o ativo" also shows during a temporary provider failure
   - `dayAndMonth` could be shared with the closing's date label
   - `Date.now()` is read during render on Patrimônio and in the closing dialog
   - one web test uses a made-up fixture value
   - requests that join a refresh already running wait for it even when it started before their own read
2. **Keep typed values when leaving the closing to edit an asset.** The dialog restarts from stored values on each open, so following its advice loses what was typed. Editing the price inside the dialog would solve both.

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
| not opened yet | `feat/mobile-layout` | Phone layout: bottom nav bar, stacked rows in place of sideways-scrolling tables, charts that fit the screen, a shorter login panel; e2e spec at 375px |

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
| Domain unit | 297 | `bun run --filter '@livro-caixa/domain' test` |
| API integration | 209 | `bun run --filter '@livro-caixa/api' test` |
| Web component | 188 | `bun run --filter '@livro-caixa/web' test` |
| E2E | 6 flows: the phone layout (every screen and the two table dialogs at 375px, with no sideways scrolling and the nav on one line) and the portfolio (add an asset → first closing → waiting banner → remove the asset) and the ledger (login error → login → create → confirm → edit → Todos → register and delete an acerto → delete → logout) and recorrentes (create a recurring entry → next month's banner → review → generate) and the summary (create a pending split bill → Resumo in both modes → open the month) and the dashboard (land after sign-in → pending split bill in both modes → "Confirmar") | `bun run test:e2e` |

CI (`.github/workflows/ci.yml`) runs all of these, plus `lint`, `typecheck` and `build`, on every PR and on every push to `main`. Its two jobs are "Lint, typecheck, test, build" and "E2E (Playwright, Chromium)". Both are required status checks on `main`, for admins too.

### Decisions taken in Phase 1

- After sign-in the user landed on **Lançamentos** until US-09 existed. Since Phase 5 the landing page is Visão geral.
- The money parser accepts `1.234,56`, `1.234`, `1234,56`, `180`, `10.5` and `R$ 10,5`, and rejects anything else.
- A dot before exactly three digits is a thousands separator, so `10.012` is R$ 10.012,00 and never R$ 10,12. A dot before one or two digits is the decimal mark (`10.5`, `10.50`). Thousands groups must be well formed: `1234.567` and `0.123` are rejected, because guessing could silently store the wrong amount.
- Currency formatting keeps Intl's no-break space after `R$`, and negatives use U+2212 (`−R$ 50,00`).
- The "Todos" filters run in the domain over all rows instead of in SQL, which is fine at household scale. Revisit only if the data grows past ~50k entries.
- The month view loads the whole month and filters on the client, because the tiles need the full month anyway.
- The login lockout counters live in memory, so a restart clears them. This is acceptable for a single container.
- Login throttling has two in-memory limits: 5 failures per e-mail + IP lock that pair for 60 s, and 20 failures per IP within 15 min lock that IP for 15 min. Only failures count, and a success does not clear the IP counter. Both answer 429 "Muitas tentativas. Tente de novo em {N} s.". `req.ip` honors `X-Forwarded-For` only from the proxies that `TRUST_PROXY` allows (default `loopback`).
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
- On phones the Gerar recorrentes table scrolls sideways, like the prototype's 880px table.

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

### Decisions taken for the phone layout (branch `feat/mobile-layout`)

The design has no phone drawing beyond stacking, so everything here was decided in code. Breakpoints: stacked tables and the nav bar below 768px (`md`), fitted charts and the short login panel below 640px (`sm`).

- **One DOM, restyled with CSS.** Nothing is rendered twice for phones, because happy-dom ignores media queries and duplicated controls would break role queries. A stacked row is the same grid with other placements (`[grid-area:…]`), and labels that only phones need come from `data-label` through `STACKED_CELL_LABEL` (`shared/stacked.ts`).
- Below 768px the nav is a fixed bar at the bottom with an icon over each label: Visão geral, Lançamentos, Patrimônio, Resumo mensal. Configurações does not fit a fifth slot at 320px, so on phones it is reached from the account menu. `main` and the toasts leave room for the bar. From 768px to 1023px the nav has its own header row, and from 1024px it is inline.
- Lançamentos stacks each entry in three lines: description and value, date and category, then the toggles and actions. The "Tipo" pill and the "—" of "Dividido" are hidden there, since the value's sign and color tell the type. The header keeps only the three sort buttons.
- Resumo mensal stays a `<table>` whose rows become grids, and every element states its ARIA role, because browsers drop table semantics once `display` changes. A month with no entries keeps only its first line.
- Patrimônio stacks each asset on a grid of 6: name beside the current value and result, then Qtd., Preço médio and Cotação, then Aplicado, % carteira and the actions. A manual asset has no unit line.
- The dialogs of Gerar recorrentes and Fechamento stack their rows the same way, with each input under its label.
- Below 640px the three charts shrink to the screen instead of scrolling. The first axis label wraps ("Dez" over "’25"), and Balanço por mês hides the value over each bar, which the table below repeats.
- Stacked, the 36px pills get a 44px touch area from a pseudo-element, and row buttons, pager buttons and "Abrir mês" are 44px.
- On phones the login panel keeps only the logo and the headline, so the form is on the first screen.
- From 768px to about 1200px the tables still scroll sideways inside their card, as before.

## Roadmap

Every item below gets its own branch and PR, following the Git workflow above.

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

---

# User stories

Each story's heading shows its status and phase, as tracked in [Project status & roadmap](#project-status--roadmap). Each story becomes its own `feat/` branch and PR.

Shared rules:
- `partnerName` is `settings.partnerName.trim() || "Companheira"`. `partnerShare` is an integer from 0 to 100 (default 50).
- Money is shown as `Intl` pt-BR BRL (`R$ 1.234,56`). Signed values are shown as `+ R$ x` / `− R$ x`.
- Type meta:
  - receita: "Receita", sign `+`, `#136B4A` on `#E3F1EA`
  - despesa: "Despesa", sign `−`, `#A8401A` on `#FBE9E0`
  - acerto: "Acerto", sign `+`, `#2A4FB8` on `#E5EBFA`
- Month labels use full pt-BR month names ("Outubro 2026"). Weekday abbreviations are `dom seg ter qua qui sex sáb`.
- Toasts disappear after 2.8 s.

## Phase 1 — done

### US-01 Sign in — ✅ Done (Phase 1, PR #1)
As the instance owner, I want to sign in with the account my admin created, so my data is protected.

- Split layout. On the **left** is a dark panel (`#17201C`) with faint horizontal ruled lines every 44px (`rgba(159,216,190,0.09)`), containing:
  - the logo (ledger icon in mint) and "Livro-caixa"
  - h1 "Suas finanças, no seu servidor."
  - the paragraph "Lançamentos, contas divididas e acerto do mês num app que você mesmo hospeda. Os dados ficam só na sua instância."
  - three bullets with icons:
    - "Roda em Docker, local ou em qualquer servidor"
    - "Código aberto, sem conta em serviço de terceiros"
    - "Acesso protegido por login em cada instância"
  - the footer "Livro-caixa · self-hosted"

  On the **right** is the form (max 400px) with h2 "Entrar" and the subtitle "Use a conta criada na sua instância." The two halves stack on narrow screens.
- Fields:
  - "E-mail" (placeholder "voce@exemplo.com", `autocomplete=username`)
  - "Senha" with a show/hide icon button (aria "Mostrar senha" / "Ocultar senha", `aria-pressed`)
  - the checkbox "Manter conectado neste dispositivo", checked by default
- Validation, in order:
  - an empty field gives "Informe e-mail e senha."
  - an invalid e-mail gives "Digite um e-mail válido."
  - wrong credentials give "E-mail ou senha incorretos." The message is generic and never reveals whether the e-mail exists. The password field is cleared.
- **After 5 failed attempts, logins are locked for 60 s** and the error reads "Muitas tentativas. Tente de novo em {N} s." The lockout is enforced by the server.
- Error state: an alert banner (`#FBE9E0` / `#A8401A`, circle-alert icon), and the input borders turn `#A8401A`. Typing clears the error.
- While submitting, the button reads "Entrando…" with bg `#4A544F` and is disabled.
- "Esqueceu a senha?" (blue link button, `aria-expanded`) reveals the info box "Como cada instância é hospedada por você, a senha é redefinida pelo administrador do servidor, com o comando de redefinição do container."
- Footnote with a lock icon: "Ainda sem conta? O primeiro acesso é criado pelo administrador ao configurar a instância."
- On success, the user lands on **Visão geral**.
- "Manter conectado" checked gives a persistent session cookie (30 days); unchecked gives a browser-session cookie. The cookie is httpOnly and SameSite=Lax.

### US-02 Sign out and the app shell — ✅ Done (Phase 1, PR #1)
- Dark header (`#17201C`, min-height 64px) with the logo and "Livro-caixa".
- Nav (aria "Principal"). The nav is "Visão geral", "Lançamentos", "Patrimônio", "Resumo mensal", "Configurações". The active item has bg `#2C3832`, white text and `aria-current="page"`; inactive items use `#C9D3CD`.
- User menu button: a mint avatar with initials plus a chevron (aria "Conta de {nome}", `aria-haspopup=menu`). It opens a 264px white panel with:
  - the avatar, the name and the e-mail (ellipsis)
  - "Configurações"
  - "Sair" in `#A8401A`
- Clicking outside closes the menu.
- Sign out returns to the login screen with the notice "Você saiu da sua conta." (`#E3F1EA` / `#136B4A`, check icon).
- The display name comes from the user record. Initials are the first letters of the first two words, or the first two letters when the name is one word.

### US-03 Browse the month — ✅ Done (Phase 1, PR #2)
As a user, I want to see one month of entries with totals, so I know where the month stands.

- Header:
  - the segmented control "Por mês | Todos" (aria "Modo de exibição")
  - month navigation: 44px outline buttons "Mês anterior" / "Próximo mês" around h1 `{Mês AAAA}`, 32px bold
  - on the right, the primary button "Novo lançamento" (plus icon). "Gerar recorrentes" (outline) and "Gerar acerto" (blue outline) appear here too.
- Four tiles. Each white tile has a 14px radius, a colored dot and label, a 26px mono value and a 13px muted sub-line. The tiles read only the viewed month:
  1. "Receitas" (`#136B4A`): confirmed receitas. Sub-line: "Previsto no mês: {all receitas}".
  2. "Despesas" (`#A8401A`): confirmed despesas. Sub-line: "Previsto no mês: {all despesas}".
  3. "Acerto a receber" (`#2A4FB8`): `max(0, partner − received)`. Sub-line: "Recebido de {partnerName}: {received}".
  4. "Saldo realizado" (dark tile): `confirmed receitas + received − confirmed despesas`. The value turns `#F2A27E` when negative. Sub-line: "Projetado no fim do mês: {all receitas + max(partner, received + scheduled) − all despesas}".

  Here `partner = round(sum of split despesas in the month, previstos included × share%)`, `received` is the sum of confirmed acertos, and `scheduled` is the sum of unconfirmed acertos.
- Filters:
  - type segment "Todos | Receitas | Despesas | Acertos" (aria "Filtrar por tipo")
  - status segment "Todos | Confirmados | Previstos" (aria "Filtrar por status")
  - search input with a search icon, placeholder "Buscar descrição ou observação" and a visually hidden label "Buscar lançamentos". It matches description and note, case-insensitive.
- Table (white card, horizontal scroll, min-width 1120px). Grid columns are `76px 1fr(min 220) 170px 104px 100px 136px 140px 92px`. The header row (`#F8F9F6`, 12px uppercase) reads "Data", "Descrição", "Categoria", "Tipo", "Dividido", "Status", "Valor", "Ações". Each row:
  - Data: mono `dd/mm`, with the weekday below.
  - Descrição: bold, with a recurring icon (aria "Recorrente") when recurring, and the note below in muted text.
  - Categoria: a 10px color square and the name. Acertos show "Acerto"; entries without a category show "Sem categoria" (`#9AA29D`).
  - Tipo: a pill.
  - Dividido: despesas get a toggle button "Sim"/"Não" (aria "Conta dividida: sim/não", `aria-pressed`; on: bg `#E6E9E3`, border `#C9CEC6`). Other types show "—".
  - Status: a toggle pill. Confirmed is a check icon plus "Confirmado" (green, solid border). Pending is a clock icon plus "Previsto" (amber, dashed border). Aria: "{Status}, clique para alternar".
  - Valor: right-aligned mono `{sign} R$ x` in the type color.
  - Ações: icon buttons "Editar {descrição}" (pencil) and "Excluir {descrição}" (trash, `#A8401A`).
- Clicking the trash expands an inline confirmation under the row. The row bg turns `#FBF3EF`, with the text "Excluir “{descrição}”? Esta ação não pode ser desfeita.", "Cancelar" and "Excluir" (destructive). Confirming deletes the entry and shows the toast "Lançamento excluído".
- Month mode sorts by date ascending by default. Header sort buttons exist for Data, Descrição and Valor. Each has an arrow icon when active and the aria "Ordenar por {coluna}, crescente/decrescente". A new sort column starts with this direction: date asc in month mode or desc in Todos, description asc, value desc.
- Empty state: "Nenhum lançamento encontrado", then "Ainda não há lançamentos neste mês." or "Nenhum lançamento corresponde aos filtros.", then the button "Novo lançamento".
- Footer band: "{shown} de {total} lançamentos", and mono "Entradas {receitas+acertos}" (green) and "Saídas {despesas}" (red) for the filtered rows.
- Mode, month and filters are kept in the URL.

### US-04 Browse all entries — ✅ Done (Phase 1, PR #2)
- "Todos" switches to h1 "Todos os lançamentos", sorts by date descending and hides the month navigation.
- Tiles:
  - "Receitas filtradas"
  - "Despesas filtradas"
  - "Acertos filtrados"
  - dark "Saldo dos resultados" (`receitas + acertos − despesas`)

  The first three show the period name as their sub-line. The dark tile's sub-line is "{n} lançamento(s) encontrado(s)".
- Filter card:
  - "Período" segment: "Todo período", "Este ano", "Últimos 12 meses", "Personalizado". "Personalizado" reveals the date inputs "De" and "Até".
  - "Categoria" chips: "Todas", every category (receitas first, then despesas, each sorted by name), and "Sem categoria (acertos)". Chips are pill shaped; the active one has border `#17201C` and bg `#F4F5F1`.
- Dates show the year (`dd/mm/aa`).
- When sorted by date, rows are grouped by month. Each group header (`#F4F5F1`) shows the month label, "{n} lançamento(s)", the signed net (green or red) and the small button "Abrir mês" (aria "Abrir {Mês} na visão por mês"), which switches to month mode on that month.
- Pager:
  - "Mostrando {a}–{b} de {n}", or "Nenhum resultado"
  - page size segment "25 | 50 | 100" followed by "por página"
  - prev/next arrows ("Página anterior" / "Próxima página")
  - page buttons in mono, laid out as `1 … 4 5 6 … 12`; the current page is ink with `aria-current`
- Any filter change resets the list to page 1.
- Empty hint: "Nenhum lançamento corresponde aos filtros e ao período escolhidos."

### US-05 Create and edit an entry — ✅ Done (Phase 1, PR #3)
- "Novo lançamento" opens a right-side **sheet** (480px). The title is "Novo lançamento", or "Editar lançamento" when editing; the close button has the aria "Fechar".
- Fields:
  - "Tipo": a 3-column grid of "Receita / Despesa / Acerto". The active button gets the type's bg, color and border. Changing the type resets the category to the first category of that type and clears "split" unless the new type is despesa.
  - Acerto only: the info note "Acerto é o valor recebido de {partnerName} referente às contas divididas do mês. Não entra como receita."
  - "Data" (date input) and "Valor (R$)" (mono, right-aligned, placeholder "0,00"), side by side.
  - "Descrição", placeholder "Ex.: Conta de luz".
  - "Categoria" chips filtered by type, not shown for acertos. With the link "Gerenciar categorias".
  - "Observação" (marked "Opcional"): a textarea, placeholder "Ex.: leitura de 12/09 a 11/10".
  - Options box with checkboxes:
    - "Conta dividida": despesa only. Description: "Entra no cálculo do acerto com {partnerName} ({share}% para {partnerName})."
    - "Recorrente": not for acerto. Description: "Acontece todo mês. Será sugerido ao gerar os recorrentes do mês seguinte."
    - "Confirmado". Description: "Marque quando o valor já tiver saído ou entrado. Desmarcado, fica como previsto."
- Defaults: type despesa, the first despesa category, the date today if today falls in the viewed month (otherwise day 1 of that month), and every checkbox unchecked.
- Validation, in order; the first error is shown in `#A8401A` above the footer:
  1. "Informe a data."
  2. "Informe a descrição."
  3. "Informe um valor maior que zero."
  4. "Escolha uma categoria." (not for acertos)
- Values parse pt-BR input: `1.234,56`, `180`, `R$ 10,5`.
- Saving trims the description and note. An acerto is saved with no category, no split and no recurrence. `split` is kept only for despesas.
- A recurring entry gets a `seriesId`. The `seriesId` is kept when recurrence is later switched off, so history stays linked.
- After saving, the sheet closes, the list jumps to the month of the saved date, and the toast reads "Lançamento adicionado" or "Lançamento atualizado".
- Footer (`#F8F9F6`): "Cancelar" and the primary "Adicionar lançamento", or "Salvar alterações" when editing.
- Edit (pencil) opens the same sheet prefilled. The value is shown as `0,00`.

## Phase 2 — done

### US-11 Settings (Configurações) — ✅ Done (Phase 2, PR #13)
- Eyebrow "Preferências", h1 "Configurações".
- **Categorias**
  - Intro: "Categorias organizam receitas e despesas. Acertos não usam categoria. Uma categoria em uso não pode ser excluída, só renomeada."
  - Create form:
    - "Nova categoria" (placeholder "Ex.: Pets, Academia, Gás")
    - "Tipo": Receita / Despesa
    - "Cor": 8 palette swatches, aria "Cor 1…8"
    - "Adicionar"
  - Errors: "Dê um nome para a categoria." and, for a case-insensitive duplicate within the type, "Já existe uma categoria com esse nome nesse tipo."
  - Toast on create: "Categoria “{nome}” criada"
  - Lists: one card each for "Receitas" and "Despesas", with "{n} categorias" and per-item usage ("{n} lançamentos" or "Sem lançamentos").
  - Inline edit changes the name and color; the type cannot be changed. Toast: "Categoria atualizada".
  - Deleting is blocked while the category is in use, with the title "{nome} está em uso e não pode ser excluída". Otherwise it deletes immediately, with the toast "Categoria “{nome}” excluída".
- **Divisão de contas**
  - Intro: "Define quem divide as contas marcadas como “dividido” e a parte de cada um. É a base do cálculo do acerto."
  - "Nome do(a) companheiro(a)"
  - the slider "Parte de {partnerName} nas contas divididas": 0–100, step 5
  - example box: "Exemplo: numa conta dividida de R$ 100,00, {partnerName} paga {x} e você paga {y}."
- Both the nav item and the user-menu item "Configurações" open this page. The form's "Gerenciar categorias" link also lands here.

## Phase 3 — done

### US-06 Generate the settlement (Gerar acerto) — ✅ Done (Phase 3, PR #14)
- A dialog (1000px, bg `#F4F5F1`) titled "Acerto de contas", with the sub-line "{Mês AAAA} · contas divididas com {partnerName}".
- Left column, labeled "Resumo para print":
  - a card with a dark header showing "Acerto · {Mês}", "Valor a acertar por {partnerName}" and the 34px mono balance
  - a table with the columns "Conta", "Total" and "Parte {partnerName}". Each item shows `dd/mm · categoria` and " · previsto" when pending.
  - when there are no items: "Nenhuma conta dividida neste mês."
  - totals: "Total das contas divididas", "Minha parte ({100−share}%)", "Parte de {partnerName} ({share}%)", plus "Já recebido − x" and "Já registrado como previsto − x" when they apply
  - footnote: "Divisão {a}% / {b}% · {n} contas · inclui previstas | só confirmadas"
- Calculation:
  - Items are the split despesas of the month. Pending ones count only when the checkbox "Incluir contas previstas" (default on) is checked; its hint reads "Útil para avisar o valor antes de todas as contas vencerem."
  - `partner = total × share%`
  - `balance = max(0, partner − received − scheduled)`
- "Mensagem em texto": the WhatsApp-ready text from `buildShareText`, shown in a mono `<pre>`.
- Buttons:
  - "Copiar texto": becomes "Copiado!" for 3 s. On failure: "Não foi possível copiar automaticamente. Selecione o texto acima e copie."
  - "Enviar no WhatsApp": opens `https://wa.me/?text=…`
- Blue box: "Quando {partnerName} enviar o valor" / "Registre o acerto como previsto agora e marque como confirmado quando o dinheiro cair." The button "Registrar acerto de {balance}" creates a pending acerto on the month's last day, described "Acerto das contas divididas", with the note "{partnerName} · {n} contas de {Mês}". Toast: "Acerto registrado como previsto. Confirme quando receber." When the balance is 0, the button is disabled and reads "Acerto do mês já registrado".

### US-07 Generate recurring entries (Gerar recorrentes) — ✅ Done (Phase 3, PR #15)
- Candidates: for each `seriesId`, take the latest occurrence before the month. It is a candidate when it is still `recurring`, is not an acerto, and the series has no entry in the month yet. The candidate's day is the source's day, capped at the month's last day, and its value is the source's value.
- Banner (month mode only, `#E5EBFA` / `#1F3C8F`):
  - text: "1 lançamento recorrente ainda não foi gerado para {Mês}." or "{n} lançamentos recorrentes ainda não foram gerados para {Mês}."
  - sub-line: "Eles entram como previstos, com data e valor do último mês, para você ajustar."
  - buttons: "Agora não" dismisses the banner for that month; "Revisar e gerar" opens the dialog.
- Dialog (1040px) titled "Gerar lançamentos recorrentes", with the sub-line "{Mês} · a partir da última ocorrência de cada lançamento recorrente".
  - Intro: "Os lançamentos entram como **previstos**, sem observação. …"
  - Table with a select-all checkbox and the columns "Lançamento" (with category and " · dividida"), "Tipo", "Data" (limited to the month), "Valor (R$)" and "Último lançado". Unchecked rows are shown at 50% opacity.
  - Footer: "{x} de {n} selecionados", "+ receitas", "− despesas".
  - Button: "Gerar {n} lançamento(s)", disabled when nothing is selected.
  - Errors: "Selecione ao menos um lançamento." and "Revise “{descrição}”: a data deve ser em {Mês} e o valor maior que zero."
  - Empty state: "Tudo em dia" / "Todos os lançamentos recorrentes já estão em {Mês}."
- Generated entries are pending, with an empty note and `recurring: true`, and keep their `seriesId`. Toast: "{n} lançamento(s) gerado(s) como previstos".

## Phase 4 — done

### US-08 Monthly summary (Resumo mensal) — ✅ Done (Phase 4, PR #17)
- Eyebrow "Resumo mensal". Year navigation ("Ano anterior" / "Próximo ano") around a mono h1 with the year.
- Mode segment "Realizado | Com previstos". The hint reads "Só lançamentos confirmados." or "Inclui previstos e o acerto esperado das contas divididas."
- `monthSummary`:
  - "Realizado" counts confirmed entries only; "Com previstos" counts all of them
  - in "Com previstos", `acertos = max(sum of acertos, expected partner share)`
  - `balance = receitas + acertos − despesas`
- KPI tiles:
  - "Receitas no ano", sub-line "Mais {acertos} em acertos"
  - "Despesas no ano", sub-line "Média de {x} por mês"
  - "Média de balanço mensal", sub-line "Em {n} meses com lançamentos" or "Nenhum mês com lançamentos"
  - dark "Acumulado no ano", sub-line "Melhor mês: {Mês} ({balanço})" or "Sem lançamentos no ano"
- Chart "Balanço por mês": diverging bars around zero. Positive bars are `#136B4A`, or `#86BFA5` when the month has pending entries. Negative bars are `#C2561F`, or `#E8A887` when pending. The legend reads "Sobrou", "Faltou", "Mês com previstos". The current calendar month is highlighted.
- Table:
  - columns: "Mês", "Receitas", "Despesas", "Acertos", "Balanço", "Acumulado" (running total with a small bar), "Situação"
  - Situação is "Sem lançamentos", "Em aberto" (dashed amber) or "Fechado" (green)
  - the current month gets the badge "Atual"
  - each row's chevron "Ver lançamentos de {Mês}" opens that month
  - the last row is "Total {ano}"
- Footnote: "Balanço = receitas + acertos − despesas. O acerto entra no balanço porque compensa a parte das contas divididas que você pagou, mas não conta como receita."

## Phase 5 — done

### US-09 Dashboard (Visão geral) — ✅ Done (Phase 5, PR #19)
- Same month navigation and "Realizado | Com previstos" mode as US-08. The hint reads "Só lançamentos confirmados." or "Inclui previstos e o acerto esperado."
- KPI tiles; each delta is colored good, bad or neutral and shows an arrow:
  - **"Balanço do mês"**, hint "Receitas + acertos − despesas".
    - Delta: "{R$} a mais/a menos que {Mês anterior}".
    - Otherwise "Sem lançamentos no mês" or "Sem dados de {Mês}".
  - **"Taxa de poupança"** (`balance/receitas`), hint "Parte da receita que sobrou".
    - Delta: "±X,X p.p. vs média de 12 meses", or "Sem média para comparar".
  - **"Gasto líquido"** (`despesas − acertos`), hint "Despesas menos o acerto de {partnerName}".
    - Within ±3% of the 12-month average: "Na média dos últimos 12 meses".
    - Otherwise "X% acima/abaixo da média de 12 meses". Above the average is bad.
  - **"Acumulado no ano"**, hint "Janeiro a {Mês} de {AAAA}".
    - Delta: "Média de {x} por mês".
- "Receitas e despesas · últimos 12 meses":
  - paired bars, receitas `#1A6E4E` and despesas `#E8894A`
  - "nice" y-axis ticks
  - hover tooltip with Receitas, Despesas, Acertos and Balanço; "Sem lançamentos" for an empty month
  - the button "Ver tabela" opens US-08 for that year
- "Despesas por categoria":
  - donut (top 6 plus "Outras (n)"), comparing {Mês} with the average of the previous 12 months
  - the center shows "Total de despesas" and the count; on hover, the category and its percentage
  - legend deltas: "Na média" within ±3%, otherwise "X% vs média"; "Sem histórico" when there is no history
  - empty state: "Nenhuma despesa em {Mês} com o filtro atual."
- "Em aberto no mês":
  - shows the pending entries (up to 5) with a relative due label: "Atrasado", "Hoje", "Amanhã" or "Em N dias", amber within 3 days
  - each entry has a "Confirmar" button; toast "“{descrição}” confirmado"
  - "Ver mais {n} previstos" opens Lançamentos filtered to Previstos
  - the US-07 banner appears here as well
  - empty state: "Nada pendente em {Mês}."
- "Acerto com {partnerName}":
  - badge: "Sem contas divididas", "Quitado", "Parcial" or "Pendente"
  - the pending amount in blue, followed by "a receber de {esperado} esperados"
  - progress bar, then "{recebido} recebido · {n} contas divididas ({total})"
  - "Abrir acerto" opens US-06

## Phase 6 — done

### US-10 Net worth (Patrimônio) and monthly closing (Fechamento) — ✅ Done (Phase 6, PRs #20, #21, #22)
- Assets: `{ institution, name, assetClass, pricing: 'auto'|'manual', quantity, avgPrice, price, invested, current, dayChange, updatedAt }`.
  - Classes:

    | Key | Label | Color |
    |---|---|---|
    | reserva | Reserva | `#2A78D6` |
    | tesouro | Tesouro Direto | `#EB6834` |
    | garantia | Garantias | `#1BAF7A` |
    | etf | ETFs | `#EDA100` |
    | fii | Fundos imobiliários | `#E87BA4` |
    | cripto | Cripto | `#008300` |
    | cambio | Câmbio | `#6250D6` |
    | conta | Conta e poupança | `#9AA29D` |

  - Auto assets: value is `qty × price` and cost is `qty × avgPrice`. Manual assets: value is `current` and cost is `invested`. A null cost means "result unknown".
- Snapshots: `{ month, total, contributions }`, one per closing.
- Header:
  - the mono total, with "{n} ativos em {m} instituições"
  - the toggle "Modo tranquilo" (default on; hides daily changes), with the hint "Variações diárias ocultas" or "Mostrando variações do dia"
  - the buttons "Novo ativo" and "Fazer fechamento", or a disabled "Fechamento em dia"
- The closing opens on the 25th of the open month, the month after the last snapshot.
  - Banner while open: "O fechamento de {Mês} está disponível." with the button "Fazer fechamento".
  - Otherwise: "Fechamento de {Mês} registrado. O de {Mês} abre em 25/MM e até lá não há nada para atualizar."
- KPI tiles:
  - "Desde o fechamento de {Mês}" (dark)
  - "Fechamento de {Mês}" (aportes · rendimento)
  - "Últimos 12 meses"
  - "Resultado da carteira", with the delta "{±%} de rentabilidade"
- "Evolução mês a mês": bars for the last 11 closings plus the open month, with a tooltip showing patrimônio, variação, aportes and rendimento.
- "Distribuição da carteira": a stacked bar plus a legend, grouped "Por classe" or "Por instituição".
- Assets table:
  - columns: "Ativo", "Qtd.", "Preço médio", "Cotação", "Aplicado", "Atual", "Resultado", "% carteira", "Hoje" (only outside calm mode), "Ações"
  - assets are grouped, with group subtotals
  - each asset has a tag: "Atualizada há…", "Cotação indisponível" or "Manual · dd/mm" (see the quote status decisions)
  - inline removal: "Remover “{nome}” da carteira?"; toast "“{nome}” removido da carteira"
- Asset sheet ("Novo ativo" / "Editar ativo"):
  - "Banco ou corretora", with chips for institutions already used
  - "Ativo"
  - "Classe"
  - "Como o valor é atualizado": "Cotação automática" or "Manual, no fechamento"
  - auto fields: "Quantidade", "Preço médio (R$)", "Cotação atual (R$)"
  - manual fields: "Valor aplicado (R$)", "Valor atual (R$)"
  - errors, in order:
    1. "Informe o banco ou a corretora."
    2. "Informe o nome do ativo."
    3. "Informe uma quantidade maior que zero."
    4. "Informe a cotação atual."
    5. "Preço médio inválido."
    6. "Informe o valor atual."
    7. "Valor aplicado inválido."
  - toasts: "Ativo adicionado à carteira" / "Ativo atualizado"
- Closing dialog "Fechamento de {Mês}":
  - section "1. Valores manuais", with an "Aporte / resgate" and a "Valor atual" for each manual asset
  - section "2. Cotações automáticas", read-only, with each asset's quote status
  - footer totals: "Patrimônio no fechamento", "Variação no mês", "Aportes", "Rendimento"
  - error: "Revise os valores de “{nome}” ({instituição})."
- Registering a closing:
  - updates each manual asset's `current`
  - adds the flow to `invested`; a null `invested` stays null
  - appends a snapshot
  - toast: "Fechamento de {Mês} registrado"
