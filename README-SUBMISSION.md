# Ella API Assessment Submission

## Summary

This submission covers both assessment tracks:

- QA exploration and reproducible bug reports
- Users module manual test cases
- Users service unit tests
- Postman API collection with generated OpenAPI endpoints and QA scenarios
- Docker build troubleshooting and hardening
- CI workflow, environment notes, and deployment runbook

## QA artifacts

- `qa/BUGS.md` contains four bugs reproduced through API testing with severity, steps, payloads, expected results, actual results, and likely causes.
- `qa/test-cases.md` contains 15 Users module manual test cases and the results recorded so far.
- `qa/postman-collection.json` is the final Postman artifact. It includes the Swagger-generated API folders and seven executable QA scenarios.
- `qa/k6-script.js` exercises `GET /products` with five virtual users for 30 seconds and checks status, response shape, error rate, and latency.
- `src/users/users.service.spec.ts` contains four Users service unit tests.

## DevOps artifacts

- `.github/workflows/ci.yml` runs install, lint, typecheck, build, and unit tests on pushes and pull requests.
- `devops/ci-notes.md` explains the pipeline and a path toward continuous deployment.
- `devops/environment-notes.md` documents development, staging, and testing configuration.
- `devops/deployment-runbook.md` covers deployment, health checks, rollback, and common failures.
- `devops/cloud-deployment-plan.md` provides a beginner VPS or AWS ECS, ECR, RDS, and Secrets Manager deployment plan.
- `Dockerfile`, `docker-compose.yml`, and `docker-compose.dev.yml` were reviewed and hardened.

## Validation results

The following checks pass locally:

```bash
npm run lint
npm run typecheck
npm run build
npm test -- --runInBand
docker compose config --quiet
docker compose -f docker-compose.dev.yml config --quiet
```

The unit suite currently contains four passing Users service tests.

## Postman generation

The root `Ella API.postman_collection.json` is the regenerated OpenAPI collection. The final QA collection is produced reproducibly with:

```bash
npm run postman:merge
```

This reads the regenerated collection, appends the QA scenarios, and writes `qa/postman-collection.json`.

## Performance test

With k6 installed and the API running:

```bash
k6 run qa/k6-script.js
```

Use another base URL with `BASE_URL=https://staging.example.com k6 run qa/k6-script.js`. The scenario is intentionally small and is meant to provide a repeatable smoke-load baseline, not a capacity claim.

Local result on 2026-09-13 against the running development API: 5 VUs for 30 seconds, 150 requests, 0.00% request failures, 100% checks passed, average request duration 5.23 ms, and p95 request duration 12.62 ms. Both thresholds passed. This result is a local smoke-load observation, not a production capacity or scalability claim.

## Known limitations and next improvements

- Runtime testing covered the documented scenarios, but not every manual test case has been executed.
- Product price values are returned as strings by the PostgreSQL decimal driver and should be formally specified in the API contract.
- A dedicated `/health` endpoint would provide a clearer readiness contract than the current root-endpoint container check.
- The next regression-test expansion should cover Products and Transactions, especially inventory subtraction and product price updates.
