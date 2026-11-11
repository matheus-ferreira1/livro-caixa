# Livro-caixa

Self-hosted household cash book: entries, split bills, the monthly settlement with your partner, recurring entries, a monthly summary, a dashboard and a net-worth tracker. Runs as a single Docker container; your data stays on your instance.

Project site: https://matheus-ferreira1.github.io/livro-caixa/

## Run it

```bash
cp .env.example .env
docker compose up --build
```

Set `ADMIN_PASSWORD` in `.env` first. The app is then on http://localhost:3000.

Quotes for ETFs and FIIs are optional and need a [brapi.dev](https://brapi.dev) token in `BRAPI_TOKEN`. Without one, the instance makes no outbound request and prices stay as you type them. Crypto and currency are kept by hand: use the manual mode, or type the price, because brapi's free plan does not quote them.

See [CLAUDE.md](CLAUDE.md) for the architecture, conventions and workflow, [docs/user-stories.md](docs/user-stories.md) for the user stories and [docs/status.md](docs/status.md) for the project status.

## Contributing

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the setup, the commands and how changes are made, and [docs/status.md](docs/status.md#what-comes-next) lists the open work.

## License

[MIT](LICENSE)
