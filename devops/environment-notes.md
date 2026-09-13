# Environment Configuration

## Required variables

| Variable      | Development                         | Staging                                           | Testing                                           |
| ------------- | ----------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| `PORT`        | `4000`                              | Platform-assigned or `4000`                       | `4001` or an isolated test port                   |
| `DB_HOST`     | `localhost` for the locally run API | Compose service name or managed database hostname | Isolated PostgreSQL service or test database host |
| `DB_PORT`     | `5432`                              | `5432` unless the provider uses another port      | Isolated database port, normally `5432`           |
| `DB_USERNAME` | Local development role              | Secret-managed staging role                       | Disposable test role                              |
| `DB_PASSWORD` | Local-only password                 | Secret-managed password                           | Disposable test password                          |
| `DB_DATABASE` | `ella`                              | Staging database name                             | Isolated test database name                       |

## Development

Copy `.env.example` to `.env` for the locally run API:

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npm run migration:run
npm run start:dev
```

In this mode the API runs on the host and connects to PostgreSQL through `localhost`. The development Compose file intentionally starts only the database so Nest watch mode can reload source changes directly.

## Staging

Staging should use values supplied by the deployment platform or secret manager. Do not commit a staging `.env` file. The full Compose configuration uses `DB_HOST=db` inside the API container and requires `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE` to be explicitly set. Missing database credentials fail before Compose starts.

Use a separate database and volume from development. Run migrations as a controlled release step, then start the application and wait for the database and API health checks.

## Testing

Tests should use an isolated database that can be recreated without affecting development or staging. Credentials should be supplied by the CI secret store or the test runner environment. Unit tests in this repository mock repositories and do not require PostgreSQL; integration or end-to-end tests should use a disposable PostgreSQL service.

## Security and configuration rules

- `.env` is ignored by Git and must not be baked into the Docker image.
- Database credentials are required Compose variables, not silent defaults.
- Ports have development-friendly defaults, but can be overridden by the environment.
- Production and staging credentials should come from a secret manager, GitHub Actions secrets, or workload identity.
