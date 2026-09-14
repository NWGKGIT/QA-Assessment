# CI/CD Notes

## Current pipeline

The workflow in `.github/workflows/ci.yml` runs on every push and pull request and is split into two jobs.

### quality job

1. Check out repository.
2. Set up Node.js 20 with npm caching.
3. Install locked dependency tree with `npm ci`.
4. Run ESLint (`npm run lint`).
5. Run TypeScript compiler without emitting (`npm run typecheck`).
6. Build the NestJS application (`npm run build`).
7. Run Jest unit tests in-band (`npm test -- --runInBand`).
8. Build the Docker image and tag it `ella-api:ci`.
9. Export the image as a gzipped tar and upload it as a workflow artifact (retention: 1 day).

### integration job (runs after quality passes)

1. Check out repository.
2. Install k6.
3. Download the Docker image artifact from the quality job.
4. Load the image into the local Docker daemon (`docker load`).
5. Start the stack with `docker compose up -d` (no `--build` — uses the pre-loaded image).
6. Wait for DB: poll `pg_isready` via `docker exec` up to 30 × 3 s = 90 s.
7. Wait for API: poll `curl http://localhost:4000/` up to 60 × 3 s = 180 s.
8. Run `k6 run qa/k6-script.js`.
9. Print full container logs on failure for instant diagnosis.
10. Always tear down containers and volumes.

The build-once / load approach ensures the integration job tests the **exact image** that passed all quality checks, rather than rebuilding from a possibly different layer cache state.

Each step is a separate workflow step. GitHub Actions stops the job when a command exits non-zero, so any lint, typecheck, build, or test failure blocks the run.

## Bugs found and fixed during CI setup

| Bug | Symptom | Fix |
|-----|---------|-----|
| `app.listen(port)` binds to `127.0.0.1` | Docker port-mapping delivers traffic to `eth0`, not loopback — API unreachable from host | `app.listen(port, '0.0.0.0')` |
| TypeORM default `retryAttempts: 10` | App exited after 30 s if DB wasn't ready; container stayed up but process was dead | `retryAttempts: 20, retryDelay: 3000` |
| `CREATE TYPE IF NOT EXISTS` is invalid SQL | PostgreSQL doesn't have this syntax — migration failed with `42601 syntax error at "NOT"` | Replaced with `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` |
| Docker image not shared between runners | quality built `ella-api:SHA` on runner A; integration runner B didn't have it | Build-once artifact upload/download pattern |

## Local equivalent

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test -- --runInBand
docker build --tag ella-api:ci .
DB_USERNAME=postgres DB_PASSWORD=postgres DB_DATABASE=ella_ci docker compose up -d
curl --retry 30 --retry-delay 3 --retry-connrefused http://localhost:4000/
k6 run qa/k6-script.js
docker compose down --volumes --remove-orphans
```

## Extension toward continuous deployment

After the quality job passes on the default branch, the workflow artifact (the Docker image tar) can be loaded into a deployment job that re-tags the image with the commit SHA, pushes it to a private registry (Amazon ECR, GCR, GHCR), and updates the runtime service (ECS task, Cloud Run revision, Kubernetes deployment). A protected GitHub Actions environment with required reviewers can gate production pushes.

The integration job's health-check pattern (wait for DB → wait for API → run smoke test) is a template for a post-deployment smoke test that confirms the new revision is serving traffic before the old one is removed.

Production credentials should come from GitHub Actions secrets or an OIDC trust relationship with the cloud provider, not from repository files.
