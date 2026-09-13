# Deployment Runbook

## Scope

This runbook covers the Docker Compose deployment of the Ella API and PostgreSQL database.

## Prerequisites

- Docker Engine and Docker Compose
- A populated `.env` based on `.env.example`
- The required database variables: `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE`

## Deploy

1. Check the configuration without starting services:

   ```bash
   docker compose config --quiet
   ```

2. Build and start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Check service state and health:

   ```bash
   docker compose ps
   curl http://localhost:4000/
   curl http://localhost:4000/api-json
   ```

4. Review logs if the API is not healthy:

   ```bash
   docker compose logs --tail=200 api
   docker compose logs --tail=200 db
   ```

The database health check gates API startup. The API health check calls the root endpoint and should become healthy after the Nest application starts.

## Database migrations

The application runs compiled migrations on startup. For a controlled release, verify that the migration exists in the image and review the database backup policy before deployment. For host-based development, the equivalent commands are:

```bash
npm run migration:run
```

## Rollback

1. Stop the current application while preserving the database volume:

   ```bash
   docker compose stop api
   ```

2. Deploy the previously known-good image or Git revision:

   ```bash
   git checkout <known-good-revision>
   docker compose up -d --build api
   ```

3. Confirm API and database health:

   ```bash
   docker compose ps
   curl http://localhost:4000/
   ```

4. Do not remove the database volume during an application rollback. Revert migrations only when the migration is explicitly reversible and the data impact has been reviewed.

## Common failures

### Missing database variables

**Symptom:** Compose reports `DB_DATABASE must be set`, `DB_USERNAME must be set`, or `DB_PASSWORD must be set`.

**Fix:** Create `.env` from `.env.example` locally, or provide the variables through the deployment secret store. Compose intentionally fails instead of using insecure database defaults.

### Image build fails at `npm run build`

**Symptom:** TypeScript compilation fails during the builder stage.

**Fix:** Run `npm ci`, `npm run typecheck`, and `npm run build` locally. Correct the source or test fixture causing the compiler error before rebuilding the image.

### Database is unhealthy

**Symptom:** The API remains pending because `depends_on` waits for the database health check.

**Fix:** Run `docker compose logs db`, verify credentials and volume state, and check that port `5432` is available. Recreate the database volume only when its data can be discarded.

### API restarts or is unhealthy

**Symptom:** The API container repeatedly restarts or fails its root endpoint health check.

**Fix:** Run `docker compose logs api`, verify database connectivity, confirm migrations are present, and check that port `4000` is available.

### Port already in use

**Symptom:** Compose cannot bind `4000` or `5432`.

**Fix:** Stop the conflicting process or change the host-side port mapping while keeping the container port and database connection settings consistent.

## Monitoring approach

For a running environment, collect structured API and database container logs centrally, alert on repeated restarts and failed health checks, and monitor CPU, memory, disk, database connections, and response latency. The current Compose health checks provide a basic liveness signal; a future `/health` endpoint should include database readiness separately.
