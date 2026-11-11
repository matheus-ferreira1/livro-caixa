# Contributing to Livro-caixa

Thanks for helping. This guide covers the essentials; [CLAUDE.md](CLAUDE.md) has the full conventions and [docs/status.md](docs/status.md) has the project status.

## Find something to work on

The open work is listed in [docs/status.md › What comes next](docs/status.md#what-comes-next). Pick an item, open an [issue](https://github.com/matheus-ferreira1/livro-caixa/issues) to say you are on it, and read the decisions in `docs/status.md` before changing behavior a past decision may cover. Screens and their pt-BR copy are specified in [docs/user-stories.md](docs/user-stories.md).

## Set up

You need [Bun](https://bun.sh) 1.3. Fork the repository, clone your fork, then:

```bash
bun install
# a year of sample data in a dev database
bun run seed:demo
```

Create your dev account. The command asks for a password, so run it on its own:

```bash
bun run --cwd=apps/api cli create-user you@example.com
```

Start the app, with the API on :3000 and the web app on :5173. It keeps running, so run the tests from another terminal:

```bash
bun run dev
```

## Commands

| Command                          | What it does                                                    |
| -------------------------------- | --------------------------------------------------------------- |
| `bun run test`                   | Unit, integration and component tests                           |
| `bun run test:e2e`               | Playwright against a production build and an in-memory database |
| `bun run lint`                   | ESLint                                                          |
| `bun run typecheck`              | TypeScript in every workspace and in `e2e/`                     |
| `bun run build`                  | Builds the app's SPA (what the Docker image ships)              |
| `bun run dev:site`, `build:site` | The project site in `apps/site` (dev on :5174), on GitHub Pages |
| `bun run capture:site`           | Retakes the site's screenshots from the app with the demo data  |

## How changes are made

- **Tests first.** Work red → green → refactor. Every bug fix starts with a test that reproduces it. Domain rules go in `packages/domain` with unit tests; HTTP endpoints get integration tests; screens get component tests queried by role and label.
- **Done means** tests passing, plus `lint`, `typecheck` and `build`, the UI checked at 1440px and 375px, and `docs/status.md` updated in the same pull request.
- **Architecture.** The backend follows clean architecture: `packages/domain` is pure, use cases depend on ports, SQLite adapters implement them. Money is integer cents everywhere; dates are `YYYY-MM-DD` strings. See [CLAUDE.md](CLAUDE.md#architecture).

## Branches, commits and pull requests

- One branch per change, off `main`: `feat/<short-name>`, `fix/<short-name>` or `chore/<short-name>`.
- Small commits with [Conventional Commits](https://www.conventionalcommits.org), in English: `feat(transactions): add month tiles`.
- Open a pull request against `main` with a summary, the user stories it covers and a test plan. CI must pass, and a review is required before merge.

## Language

- Code, identifiers, comments, commits, branch names and pull requests are in **English**.
- The UI copy is **Brazilian Portuguese**, word for word from the design and [docs/user-stories.md](docs/user-stories.md). Never translate or paraphrase it. Domain terms keep English names in code (`Transaction`, `split`, `partner`); see the table in [CLAUDE.md](CLAUDE.md#language-rules).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
