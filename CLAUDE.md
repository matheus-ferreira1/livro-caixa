# Livro-caixa

Self-hosted household cash book for a couple. It tracks income and expenses, marks bills that are split with a partner, and works out the monthly settlement (**acerto**). It also has recurring entries, a monthly summary, a dashboard and a net-worth tracker. Everything runs in a single Docker container, and the data stays on the user's own instance.

The source design is the Design canvas "Livro-caixa — Lançamentos e acerto": https://claude.ai/code/artifact/fe1ce3e5-2bb1-4f8e-8afa-5406b57c8a9a. Its `project/Main.dc.html` holds the whole interactive prototype, markup and logic. When a user story is ambiguous, the prototype decides.

**[Project status & roadmap](docs/status.md) is the source of truth for what is done and what comes next.** Keep it current: every feature PR updates it (see the Definition of done).

## Where the rest lives

Read these when the task needs them; they are not loaded automatically.

- [docs/status.md](docs/status.md): status by phase, what comes next, web routes, API endpoints, database schema, domain modules, test counts, the decisions taken in each phase, and the roadmap. Read it before changing behavior a past decision may cover.
- [docs/user-stories.md](docs/user-stories.md): the user stories (US-01 to US-11) with the exact pt-BR UI copy. Read it before touching a screen or its strings.
- `apps/site`: the public project site (static HTML + Tailwind, no framework, English copy) at https://matheus-ferreira1.github.io/livro-caixa/, deployed by `.github/workflows/pages.yml`. It is not part of the Docker image.
- [apps/web/CLAUDE.md](apps/web/CLAUDE.md): the design system (fonts, color tokens, radii, shadcn mapping, accessibility rules). It loads on its own when working under `apps/web`.

## Language rules

- **Code, identifiers, comments, commits, branch names, PR titles and PR bodies are in English.**
- **pt-BR is the source UI copy, verbatim from the design.** Never paraphrase its strings. Quoted strings in this file and in [docs/user-stories.md](docs/user-stories.md) are the exact copy.
- **English (`en`) is a translation and lives only in the message catalog** (`packages/domain/src/i18n/messages/en/`), which must define the same keys as pt-BR (a missing key is a type error). A new string needs both languages, and no copy is ever hard-coded in a component, view model, validator or use case: it comes from the catalog through `t(key, ...values)`. Category names and entry descriptions are user data and are never translated.
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
| idioma | `Language` (`'pt-BR'`, `'en'`), `settings.language` | Changes only the UI copy |
| moeda | `Currency` (`'BRL'`, `'USD'`, `'EUR'`, `'GBP'`), `settings.currency` | Display-only: it changes how amounts are formatted and typed. Nothing is converted and stored cents never change. |
| fechamento | monthly net-worth closing / `Snapshot` | |
| aporte / resgate | contribution / withdrawal | |

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
bun run dev:site       # the project site (apps/site) on :5174, under /livro-caixa/
bun run build:site     # builds the project site into apps/site/dist (deployed to GitHub Pages)
bun run capture:site   # retakes the site's screenshots from the app with the demo seed, on a temp database
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
- **Definition of done:** tests written first and passing, plus `lint`, `typecheck` and `build` passing, plus the UI checked against the design at 1440px and 375px, plus [Project status & roadmap](docs/status.md) updated in the same PR (story status, endpoints, schema, test counts, follow-ups).

## Git workflow

1. **Every feature or fix gets its own branch** off `main`: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`. Never commit directly to `main`.
2. Commit in small steps with **Conventional Commits**, in English (`feat(transactions): add month tiles`).
3. When the work is done, push the branch and **open a pull request** for review. The PR has a summary, the user stories it covers, and a test plan. Dependent features may use stacked PRs, where each PR targets its parent branch and is retargeted to `main` once the parent merges.
4. Run the `code-review` skill at `medium` effort to validate the changes, looking for code quality issues and bugs. If the agent approves, then proceed with the merge. The PR is merged only after it is **reviewed and approved**.
5. **After the merge, delete the feature branch both remotely and locally:**
   ```bash
   git switch main && git pull
   git push origin --delete <branch>   # skip if GitHub auto-deleted it
   git branch -d <branch>
   git fetch --prune
   ```
6. To complete the task, update `docs/status.md` with the current state, expliciting which phases are completed and what are the next steps.

