# Livro-caixa

Self-hosted household cash book for a couple. It tracks income and expenses, marks bills that are split with a partner, and works out the monthly settlement (**acerto**). Later phases add recurring entries, a monthly summary, a dashboard and a net-worth tracker. Everything runs in a single Docker container, and the data stays on the user's own instance.

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
bun run seed:demo      # loads the prototype's sample data (Nov 2025 – Oct 2026) into an empty dev database
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
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | unset | First user, created only while the database has no users |

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

- **Repository**: persistence behind an interface (`TransactionRepository`, `SessionRepository`, `UserRepository`, `CategoryRepository`, `SettingsRepository`).
- **Use case / command**: `Login`, `Logout`, `ListTransactions`, `CreateTransaction`, `UpdateTransaction`, `DeleteTransaction`, …
- **Adapter**: SQLite repositories, `BunPasswordHasher`, `SystemClock`.
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
4. The PR is merged only after it is **reviewed and approved**.
5. **After the merge, delete the feature branch both remotely and locally:**
   ```bash
   git switch main && git pull
   git push origin --delete <branch>   # skip if GitHub auto-deleted it
   git branch -d <branch>
   git fetch --prune
   ```

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
| neutral swatch | `#9AA29D` | "Sem categoria" |
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

_Last updated: 2026-10-29, after PR #6 (CI) was merged into `main` and the Docker image was verified._

## Summary

| Phase | Scope | Status |
|---|---|---|
| 0 — Bootstrap | Repo, CLAUDE.md, tooling (Bun workspaces, TS strict, ESLint, Prettier) | ✅ Done (commit `13b93f3`) |
| 1 — Core ledger | US-01 Sign in, US-02 Sign out & shell, US-03 Month list, US-04 "Todos" list, US-05 Create/edit | ✅ Done (PRs #1, #2, #3) |
| 1.5 — Hardening | CI, Docker verification, small follow-ups from phase 1 | 🚧 In progress (CI, Docker verification and session cleanup done) |
| 2 — Configurações | US-11 Categories and partner split settings | ⏳ Planned |
| 3 — Acerto & recorrentes | US-06 Gerar acerto, US-07 Gerar recorrentes | ⏳ Planned |
| 4 — Resumo mensal | US-08 | ⏳ Planned |
| 5 — Visão geral | US-09 (becomes the landing page) | ⏳ Planned |
| 6 — Patrimônio | US-10 Net worth and monthly closing | ⏳ Planned |

Phases are ordered by dependency. Configurações comes first because acerto, recorrentes and the dashboard need editable categories and partner settings. US-09 links into US-06, US-07 and US-08, so it comes after them.

## What is built (Phase 1 and 1.5 so far)

| PR | Branch | Delivered |
|---|---|---|
| [#1](https://github.com/matheus-ferreira1/livro-caixa/pull/1) | `feat/auth-login` | Session auth, login throttling, admin CLI, login page, app shell, Docker image |
| [#2](https://github.com/matheus-ferreira1/livro-caixa/pull/2) | `feat/transactions-list` | Money, date, settlement and list rules; ledger schema; read, toggle and delete endpoints; Lançamentos page in both modes; demo seed |
| [#3](https://github.com/matheus-ferreira1/livro-caixa/pull/3) | `feat/transaction-form` | Form rules; create/replace endpoints; Novo/Editar lançamento sheet; Playwright e2e; SPA path fix |
| [#6](https://github.com/matheus-ferreira1/livro-caixa/pull/6) | `chore/ci` | GitHub Actions CI (lint, typecheck, test, build, e2e); fixed a timing race in the web form test |

### Web routes

| Route | Screen | Notes |
|---|---|---|
| `/entrar` | Login (US-01) | Redirects to `/lancamentos` (or the page you came from) when already signed in. Shows the `notice` passed in router state after sign-out. |
| `/` | — | Redirects to `/lancamentos` |
| `/lancamentos` | Lançamentos (US-03, US-04, US-05) | State lives in the URL: `modo` (`all`), `mes`, `tipo`, `status`, `busca`, `periodo`, `de`, `ate`, `categoria`, `ordem`, `direcao`, `pagina`, `itens`. Defaults are left out of the URL. |
| any other path | — | Redirects to `/lancamentos`; every route except `/entrar` requires a session |

### API

All routes except `/api/health` and `/api/auth/login` require the `lc_session` cookie. Errors look like `{ error: { code, message } }`; the codes are `validation_error` (400), `invalid_credentials` / `unauthenticated` (401), `not_found` (404), `conflict` (409) and `too_many_attempts` (429). Validation messages are the pt-BR copy from the design.

| Method & path | Use case | Notes |
|---|---|---|
| `GET /api/health` | — | `{ ok: true }`; used by the Docker healthcheck |
| `POST /api/auth/login` | `Login` | Body `{ email, password, remember }`. Locks e-mail + IP for 60 s after 5 failures. A cookie that lasts 30 days with `remember`, a browser-session cookie otherwise (the server still expires it after 12 h). |
| `POST /api/auth/logout` | `Logout` | 204; deletes the session |
| `GET /api/auth/me` | `Authenticate` | `{ user: { id, email, name } }` |
| `GET /api/categories` | — | `{ categories }` |
| `GET /api/settings` | — | `{ settings: { partnerName, partnerShare } }` |
| `GET /api/transactions?month=YYYY-MM` | `ListMonthTransactions` | The month's entries; the client filters and sorts them |
| `GET /api/transactions/search` | `SearchTransactions` | Query params `type, status, category ('all' \| id \| 'none'), q, from, to, sort, dir, page, pageSize (25\|50\|100)`. Returns `{ items, page, totalPages, start, end, total, totals, groups[{ monthKey, count, netCents, ids }] }`. Filters run in the domain over all rows. |
| `POST /api/transactions` | `SaveTransaction` | 201; body is `TransactionInput` (`valueCents` as an integer) |
| `PUT /api/transactions/:id` | `SaveTransaction` | Full replace; keeps `seriesId` |
| `PATCH /api/transactions/:id` | `ToggleTransactionFlags` | `{ confirmed?, split? }`; only expenses can be split |
| `DELETE /api/transactions/:id` | `DeleteTransaction` | 204 |

### Database (SQLite, `apps/api/src/infrastructure/db/migrations.ts`)

Migrations are append-only and tracked in `schema_migrations`.

- `001_users_and_sessions`:
  - `users(id, email UNIQUE, name, password_hash, created_at)`
  - `sessions(token_hash PK, user_id, expires_at, persistent)`; only the SHA-256 of the token is stored
- `002_ledger`:
  - `categories(id, name, type receita|despesa, color, UNIQUE(type, name NOCASE))`, seeded with the 12 default categories from the design
  - `transactions(id, date YYYY-MM-DD, description, note, type, category_id, value_cents > 0, split, confirmed, recurring, series_id, created_at, updated_at)`
  - `settings(id = 1, partner_name, partner_share 0–100)`, seeded with `('Companheira', 50)`

### Domain (`packages/domain`)

- `auth/`: login validation and messages, `nameFromEmail`, `initialsOf`
- `money/`: `parseMoney` (pt-BR input → cents), `formatMoney`, `formatSignedMoney`, `toMoneyInput`, `percentOf`
- `dates/`: `monthLabel`, `shiftMonth`, `lastDayOfMonth`, `dateParts`, `todayIso`, `defaultDateForMonth`
- `transactions/transaction.ts`: the `Transaction`, `Category` and `Settings` types, `signedCents`, `displayPartnerName`
- `transactions/month-summary.ts`: `computeSettlement` (the acerto calculation, ready for US-06) and `monthTiles`
- `transactions/list-query.ts`: filters, `periodRange`, sorting (pt-BR collation), `paginate`, `pageList`, `groupByMonth`, `totalsOf`
- `transactions/transaction-input.ts`: the form draft, `applyTypeChange`, `validateInput`, `draftToInput`, `toTransaction` (the entry rules), `transactionInputSchema`

### Tests (all green on `main` and in CI)

| Suite | Count | Command |
|---|---|---|
| Domain unit | 56 | `bun run --filter '@livro-caixa/domain' test` |
| API integration | 36 | `bun run --filter '@livro-caixa/api' test` |
| Web component | 28 | `bun run --filter '@livro-caixa/web' test` |
| E2E | 1 flow (login error → login → create → confirm → edit → Todos → delete → logout) | `bun run test:e2e` |

CI (`.github/workflows/ci.yml`) runs all of these, plus `lint`, `typecheck` and `build`, on every PR and on every push to `main`. Its two jobs are "Lint, typecheck, test, build" and "E2E (Playwright, Chromium)".

### Decisions taken in Phase 1

- After sign-in the user lands on **Lançamentos** instead of Visão geral, because US-09 was not built yet. Switch the landing page in Phase 5.
- The money parser accepts `1.234,56`, `1234,56`, `180`, `10.5` and `R$ 10,5`, and rejects anything else.
- Currency formatting keeps Intl's no-break space after `R$`, and negatives use U+2212 (`−R$ 50,00`).
- The "Todos" filters run in the domain over all rows instead of in SQL, which is fine at household scale. Revisit only if the data grows past ~50k entries.
- The month view loads the whole month and filters on the client, because the tiles need the full month anyway.
- The login lockout counters live in memory, so a restart clears them. This is acceptable for a single container.
- Login throttling has two in-memory limits: 5 failures per e-mail + IP lock that pair for 60 s, and 20 failures per IP within 15 min lock that IP for 15 min. Only failures count, and a success does not clear the IP counter. Both answer 429 "Muitas tentativas. Tente de novo em {N} s.". `req.ip` honors `X-Forwarded-For` only from loopback proxies (`trust proxy: 'loopback'`).
- Expired sessions are purged on boot and then every hour (`startSessionPurge` in `apps/api/src/session-purge.ts`, use case `PurgeExpiredSessions`). `Authenticate` still drops an expired session as soon as its cookie comes back.
- The fonts ship as `@fontsource` Latin subsets instead of a CDN, so the "data stays on your instance" promise holds.
- Single-choice segmented controls are shadcn `ToggleGroup`s, which render as `radiogroup`/`radio`. Category chips and row toggles are buttons with `aria-pressed`.
- Demo data (`seed:demo`) is for development only and refuses to load into a non-empty database.
- **The app is individual (decided 2026-10-29).** One person uses each instance. The partner is only a name and a split share in `settings` and never gets a login. Do not add per-user data, partner accounts or sharing features. The CLI can still create more accounts, which all see the same ledger; keep that for admin and recovery only.

## Phase 1 placeholders to restore later

These parts of the design were hidden on purpose in Phase 1. Each one comes back with the phase that builds its target.

| Hidden element | Where | Restore in |
|---|---|---|
| Nav items "Visão geral", "Patrimônio", "Resumo mensal", "Configurações" | `NAV_ITEMS` in `apps/web/src/shared/layout/AppShell.tsx` | The phase that builds each screen |
| User-menu item "Configurações" | `apps/web/src/shared/layout/UserMenu.tsx` | Phase 2 |
| "Gerenciar categorias" link in the form | `TransactionFormSheet.tsx`, category header | Phase 2 |
| "Gerar recorrentes" and "Gerar acerto" header buttons | `TransactionsPage.tsx` header actions, next to `NewEntryButton` | Phase 3 |
| Recurring banner in month mode | `TransactionsPage.tsx`, between the header and the tiles | Phase 3 |
| Landing on Visão geral after login | `HOME_PATH` in `LoginPage.tsx`, the index redirect in `routes.tsx` | Phase 5 |

## Roadmap

Every item below gets its own branch and PR, following the Git workflow above.

### Phase 1.5 — Hardening (in progress)

- [x] **CI** (PR #6): `.github/workflows/ci.yml` runs on every PR and on pushes to `main`, pinned to Bun 1.3.4. Job "Lint, typecheck, test, build" runs `bun install --frozen-lockfile`, `lint`, `typecheck`, `test` and `build`; job "E2E (Playwright, Chromium)" runs `test:e2e` with cached browsers and uploads `test-results/` on failure.
  - [ ] Make both jobs required status checks on `main` (GitHub → Settings → Branches; repo admin only).
- [x] **Verify the Docker image** (2026-10-29, Docker 28.4, image 283 MB): `docker compose up --build` with `ADMIN_PASSWORD` set creates the admin on first boot only; the healthcheck reports healthy; the SPA and `/api` are served from one port; login works and sets the session cookie; an entry and its session survive both `restart` and `down`/`up` (`/data` volume); `cli reset-password` (with `NEW_PASSWORD`) changes the password and signs out existing sessions; `cli create-user` works.
- [x] **Clean up expired sessions**: `PurgeExpiredSessions` deletes rows past `expires_at` on boot and every hour.
- [x] **Rate limit by IP**: `POST /api/auth/login` also locks a client IP for 15 min after 20 failures within 15 min, across any e-mails (`IP_THROTTLE_POLICY` in `LoginThrottle.ts`).
- [x] **Session expiry in the UI**: `createQueryClient` (`shared/api/query-client.ts`) clears the user query on any 401 from a query or mutation (except login and logout), so `RequireAuth` redirects to `/entrar` and back after sign-in; 401s are not retried and show no error toast.
- [ ] **Bundle size**: the app chunk is ~377 kB minified (118 kB gzip); consider importing lucide icons per file and lazy-loading routes once more screens exist.

### Phase 2 — Configurações (US-11)

- [ ] API:
  - `POST/PATCH/DELETE /api/categories`; a category in use cannot be deleted; names must be unique per type, case-insensitive
  - `PUT /api/settings` with `partnerName` and `partnerShare` (0–100, step 5)
- [ ] Domain: category validation messages ("Dê um nome para a categoria.", "Já existe uma categoria com esse nome nesse tipo."), usage counts, the swatch palette.
- [ ] Web `/configuracoes`:
  - categories card with create, inline edit and delete
  - Divisão de contas with the live preview text
- [ ] Restore the nav item, the user-menu item and "Gerenciar categorias".
- [ ] Invalidate the `categories` and `settings` queries after edits; the Lançamentos tiles and form must reflect the new share.

### Phase 3 — Acerto and recorrentes (US-06, US-07)

- [ ] **US-06 Gerar acerto**:
  - dialog with the print summary, "Incluir contas previstas", share text, "Copiar texto", "Enviar no WhatsApp" and "Registrar acerto"
  - `computeSettlement` already exists; add `buildShareText` in the domain
  - register the acerto through `POST /api/transactions`
- [ ] **US-07 Gerar recorrentes**:
  - domain `recurringCandidates(transactions, month)`
  - `GET /api/recurring/candidates?month=` and `POST /api/recurring/generate` (validated, transactional, keeps `seriesId`)
  - review dialog
  - the banner with a per-month "Agora não", stored server-side or in `localStorage`; decide in that PR
- [ ] Restore the "Gerar recorrentes" and "Gerar acerto" buttons and the banner on Lançamentos.

### Phase 4 — Resumo mensal (US-08)

- [ ] Domain: `monthSummary(month, mode)` and `summaryStatus`, plus the year aggregates.
- [ ] API `GET /api/summary?year=&mode=real|proj`.
- [ ] Web `/resumo`:
  - year navigation and mode toggle
  - KPI tiles
  - diverging "Balanço por mês" chart
  - table with Acumulado bars, Situação and links to each month

### Phase 5 — Visão geral (US-09)

- [ ] Domain: KPIs and deltas against the 12-month average, the 12-month series, the category donut with the "Outras" bucket, open items with relative due labels.
- [ ] API `GET /api/dashboard?month=&mode=`.
- [ ] Web `/visao-geral`:
  - KPI tiles
  - bars chart with tooltip
  - donut and legend
  - "Em aberto no mês" with "Confirmar"
  - acerto card
- [ ] Make Visão geral the landing page after login and the `/` redirect.

### Phase 6 — Patrimônio and Fechamento (US-10)

- [ ] Migration `003_wealth`: `assets` and `snapshots` tables.
- [ ] Domain: asset value and cost, KPIs, allocation by class and institution, closing availability (from the 25th), closing math.
- [ ] API: asset CRUD, `GET /api/wealth`, `POST /api/wealth/closings`.
- [ ] Web `/patrimonio`:
  - header with "Modo tranquilo"
  - banners
  - KPI tiles
  - evolution chart
  - allocation bar
  - assets table
  - asset sheet
  - closing dialog
- [ ] Automatic quotes for `pricing: 'auto'` assets need a price source. This is an open decision: pick a provider that needs no third-party account, or keep quotes manual.

## Open questions

- Where to store "Agora não" for the recurring banner (Phase 3): server-side per user, or `localStorage`.
- Price source for automatic asset quotes (Phase 6).

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
- On success, the user lands on **Lançamentos**. (Once Visão geral exists, it becomes the landing page.)
- "Manter conectado" checked gives a persistent session cookie (30 days); unchecked gives a browser-session cookie. The cookie is httpOnly and SameSite=Lax.

### US-02 Sign out and the app shell — ✅ Done (Phase 1, PR #1)
- Dark header (`#17201C`, min-height 64px) with the logo and "Livro-caixa".
- Nav (aria "Principal"). Phase 1 shows only "Lançamentos". The full nav is "Visão geral", "Lançamentos", "Patrimônio", "Resumo mensal", "Configurações". The active item has bg `#2C3832`, white text and `aria-current="page"`; inactive items use `#C9D3CD`.
- User menu button: a mint avatar with initials plus a chevron (aria "Conta de {nome}", `aria-haspopup=menu`). It opens a 264px white panel with:
  - the avatar, the name and the e-mail (ellipsis)
  - "Configurações" (hidden until US-11)
  - "Sair" in `#A8401A`
- Clicking outside closes the menu.
- Sign out returns to the login screen with the notice "Você saiu da sua conta." (`#E3F1EA` / `#136B4A`, check icon).
- The display name comes from the user record. Initials are the first letters of the first two words, or the first two letters when the name is one word.

### US-03 Browse the month — ✅ Done (Phase 1, PR #2)
As a user, I want to see one month of entries with totals, so I know where the month stands.

- Header:
  - the segmented control "Por mês | Todos" (aria "Modo de exibição")
  - month navigation: 44px outline buttons "Mês anterior" / "Próximo mês" around h1 `{Mês AAAA}`, 32px bold
  - on the right, the primary button "Novo lançamento" (plus icon). "Gerar recorrentes" (outline) and "Gerar acerto" (blue outline) appear here too, once US-06 and US-07 ship.
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
  - "Categoria" chips filtered by type, not shown for acertos. The link "Gerenciar categorias" appears once US-11 ships.
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

## Backlog — not started

### US-06 Generate the settlement (Gerar acerto) — ⏳ Phase 3
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

### US-07 Generate recurring entries (Gerar recorrentes) — ⏳ Phase 3
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

### US-08 Monthly summary (Resumo mensal) — ⏳ Phase 4
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

### US-09 Dashboard (Visão geral) — ⏳ Phase 5
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

### US-10 Net worth (Patrimônio) and monthly closing (Fechamento) — ⏳ Phase 6
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
  - each asset has a tag: "Cotação automática" or "Manual · dd/mm"
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
  - section "2. Cotações automáticas", read-only
  - footer totals: "Patrimônio no fechamento", "Variação no mês", "Aportes", "Rendimento"
  - error: "Revise os valores de “{nome}” ({instituição})."
- Registering a closing:
  - updates each manual asset's `current`
  - adds the flow to `invested`; a null `invested` stays null
  - appends a snapshot
  - toast: "Fechamento de {Mês} registrado"

### US-11 Settings (Configurações) — ⏳ Phase 2
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
