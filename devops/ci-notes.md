# CI/CD Notes

## Current pipeline

The workflow in `.github/workflows/ci.yml` runs on every push and pull request. It:

1. Checks out the repository.
2. Sets up Node.js 20 with npm caching.
3. Installs the locked dependency tree with `npm ci`.
4. Runs the ESLint command with `npm run lint`.
5. Runs the TypeScript compiler without emitting files with `npm run typecheck`.
6. Builds the NestJS application with `npm run build`.
7. Builds the Docker image with the commit SHA as its tag.
8. Runs the Jest unit tests in-band with `npm test -- --runInBand`.

After the quality job passes, a separate integration job starts the full Docker Compose stack with CI-only database credentials, waits for the API root endpoint, runs the k6 smoke-load test, prints service logs on failure, and always removes the containers and volume.

Each command is a separate workflow step. GitHub Actions stops the job when a command exits non-zero, so a lint, typecheck, build, or test failure blocks a passing CI run.

## Local equivalent

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm test -- --runInBand
docker build --tag ella-api:local .
DB_USERNAME=postgres DB_PASSWORD=postgres DB_DATABASE=ella_ci docker compose up -d --build
for attempt in $(seq 1 30); do curl --fail --silent http://localhost:4000/ && break; sleep 2; done
k6 run qa/k6-script.js
docker compose down --volumes --remove-orphans
```

## Extension toward continuous deployment

After CI passes on the default branch, a separate deployment job could build the Docker image, tag it with the commit SHA, and push it to a private registry such as Amazon ECR. A protected deployment environment would then update the runtime service, wait for the application and database health checks, and stop the rollout if the new revision does not become healthy. Production credentials should come from GitHub Actions secrets or an OIDC trust relationship, not from repository files.

A later improvement would be to keep deployment approval separate from the build job so pull requests can validate the image without receiving production credentials.
