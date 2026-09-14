# Ella API — Assessment Submission

## Summary

This submission covers both the QA and DevOps tracks of the assessment. The approach was iterative: exploratory testing first, then systematic deep-dives that uncovered progressively subtler issues. All bugs found were fixed with atomic, conventional-commit-style commits. The CI pipeline was also debugged end-to-end until it passed.

---

## QA Track

### 1. Exploratory testing — `qa/BUGS.md`

Three full exploratory passes were completed, uncovering **24 bugs** across logic, data integrity, validation, configuration, DevOps, and documentation categories. Each bug entry includes:

- Title and severity (Critical / High / Medium / Low)
- Endpoint and payload
- Steps to reproduce
- Expected vs. actual result
- Root cause and fix applied

**Selected highlights:**

| ID | Severity | Description |
|----|----------|-------------|
| BUG-001 | High | Product update overwrites `price` with `quantity` value |
| BUG-002 | Critical | Purchasing a product **increases** inventory instead of decreasing it |
| BUG-005 | Critical | No DB transaction wrapping the transaction create — partial writes possible |
| BUG-006 | Critical | `OUT_OF_STOCK` status never enforced; products could be purchased regardless |
| BUG-016 | Critical | `@Column('decimal')` returns a JavaScript string at runtime — `price` serialised as `"1000"` not `1000` |
| BUG-017 | Critical | Restocking via `PUT /products/:id` leaves status `OUT_OF_STOCK` — product stays unpurchasable |

### 2. Manual test cases — `qa/test-cases.md`

15 Users module test cases covering happy paths, validation failures, edge cases (duplicate email, non-numeric ID, empty fields, unknown fields, partial update). Execution record updated after fixes.

### 3. Unit tests — `src/users/users.service.spec.ts`

4 Users service unit tests using Jest with a typed repository mock (no live DB required):

- Creates a user and returns the saved entity
- Translates a duplicate-email database error into a 409 ConflictException
- Returns a user with their related transactions
- Throws NotFoundException when a user does not exist

Run with: `npm test -- --runInBand`

### 4. API testing — `qa/postman-collection.json`

Generated reproducibly with `npm run postman:merge` (script at `scripts/merge-postman-collection.js`). Covers:

- Happy-path CRUD for Users, Products, and Transactions
- Validation failures: missing fields, malformed email, negative price, zero/negative quantity, non-integer IDs
- Conflict cases: duplicate email, duplicate product name, oversold stock
- Status guard: purchase blocked when product is `OUT_OF_STOCK`
- Regression tests for all fixed bugs (assertions updated to expect corrected behavior)

### 5. Performance testing — `qa/k6-script.js`

Two concurrent scenarios:

| Scenario | VUs | Duration | Endpoints |
|----------|-----|----------|-----------|
| `products_read` | 5 | 30 s | `GET /products` |
| `transaction_write` | 3 | 30 s | `POST /users` → `POST /products` → `POST /transactions` → `GET /products/:id` (inventory check) |

Thresholds: `http_req_failed < 1%`, `p(95) < 500 ms`.
The write scenario verifies that inventory is decremented by exactly 1 after each transaction — catching any regression in the stock logic under concurrent load.

---

## DevOps Track

### 1. CI/CD pipeline — `.github/workflows/ci.yml`

Two-job pipeline:

**quality:** lint → typecheck → build → unit tests → Docker build → export image artifact

**integration:** load pre-built image → `docker compose up` → wait for DB → wait for API → k6 smoke test → teardown

Full pipeline notes in `devops/ci-notes.md`, including a bugs-found-during-CI-setup table.

### 2. Containerization — `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`

Issues found and fixed:

| Problem | Fix |
|---------|-----|
| `app.listen(port)` binds to `127.0.0.1` — unreachable inside Docker | `app.listen(port, '0.0.0.0')` |
| TypeORM crashes process after 10 connection retries | `retryAttempts: 20, retryDelay: 3000` |
| `CREATE TYPE IF NOT EXISTS` — invalid PostgreSQL syntax | `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` |
| Docker image not shared between CI runners | Build-once artifact upload/download |
| `postgres:16` (~430 MB) slow to pull | Switched to `postgres:16-alpine` (~90 MB) |
| `Number(process.env.DB_PORT)` → `NaN` when unset | `parseInt(env ?? '5432', 10)` |
| `GET /` returned `"Hello World!"` — useless health check | Structured `{ status, uptime, timestamp }` response |

### 3. Environment configuration — `devops/environment-notes.md`

Documents all required variables across development, staging, and testing environments, with `.env.example` as the starting point.

### 4. Health checks — `GET /`

The root endpoint now returns `{ status: "ok", uptime: <seconds>, timestamp: <iso> }`. Both the Docker Compose healthcheck and the CI readiness loop probe this endpoint.

### 5. Deployment runbook — `devops/deployment-runbook.md`

Covers deploy, migration management, rollback, common failures with symptoms and fixes, and monitoring approach.

### 6. Cloud deployment plan — `devops/cloud-deployment-plan.md`

Beginner-level plan for deploying to AWS using ECR (image registry), ECS Fargate (container runtime), RDS PostgreSQL (managed DB), and Secrets Manager (credentials).

---

## Validation

All of the following pass locally:

```bash
npm run lint
npm run typecheck
npm run build
npm test -- --runInBand
docker compose config --quiet
docker compose -f docker-compose.dev.yml config --quiet
```

---

## Known limitations and assumptions

- All 24 bugs were fixed with atomic commits as part of the assessment — the repository is in a corrected state, not just documented.
- The unit test suite covers the Users service. Products and Transactions services have the same pattern and would be straightforward to extend.
- The k6 write scenario creates unique users and products per iteration (timestamped names) to avoid conflicts in a shared DB. It is a smoke-load baseline, not a capacity claim.
- Migrations run automatically on startup (`migrationsRun: true`). For a production rollout, a pre-deployment migration step with a backup checkpoint is recommended.
