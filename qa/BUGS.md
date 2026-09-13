# Exploratory API Bug Reports

Testing was performed against `http://localhost:4000` with PostgreSQL running locally through Docker. The response bodies below are abbreviated only where the unchanged fields are not relevant to the defect.

---

## PASS 1 — Initial audit

---

## BUG-001: Product update overwrites price with quantity · ✅ Fixed

- **Severity:** High
- **Endpoint:** `PUT /products/:id`
- **Precondition:** Product exists with `price: 1000`, `quantity: 10`.
- **Payload:** `{ "name": "Updated Laptop", "price": 1200, "quantity": 8 }`
- **Expected:** `price: 1200`, `quantity: 8`
- **Actual:** `price: "8"`, `quantity: 8` — price was assigned the value of `dto.quantity`.
- **Root cause:** `product.price = dto.quantity` instead of `dto.price` in `products.service.ts`.
- **Fix:** `products.service.ts` — correct assignment to `dto.price`.

---

## BUG-002: Creating a transaction increases inventory · ✅ Fixed

- **Severity:** Critical
- **Endpoint:** `POST /transactions`
- **Precondition:** Product has `quantity: 8`.
- **Payload:** `{ "userId": 1, "productId": 1, "quantity": 2 }`
- **Expected:** Inventory decreases to `6`.
- **Actual:** Inventory increases to `10`.
- **Root cause:** `product.quantity += dto.quantity` instead of `-=`.
- **Fix:** `transactions.service.ts` — changed to `product.quantity -= dto.quantity`; OUT_OF_STOCK guard widened to `<= 0`.

---

## BUG-003: Malformed email address accepted with 201 · ✅ Fixed

- **Severity:** Medium
- **Endpoint:** `POST /users`
- **Payload:** `{ "name": "Test", "email": "not-an-email" }`
- **Expected:** HTTP 400 with validation error.
- **Actual:** HTTP 201 — invalid email persisted.
- **Root cause:** `CreateUserDto` had `@IsNotEmpty()` but no `@IsEmail()`.
- **Fix:** Added `@IsEmail()` to `CreateUserDto`.

---

## BUG-004: Non-integer route `:id` returns 500 instead of 400 · ✅ Fixed

- **Severity:** High
- **Endpoint:** `GET /users/abc`, `GET /products/abc`, `GET /transactions/abc`, `PUT /users/abc`, `PUT /products/abc`
- **Expected:** HTTP 400.
- **Actual:** HTTP 500 — raw DB error message leaked (`invalid input syntax for type integer`).
- **Root cause:** Controllers used bare `Number(id)` which produces `NaN` for non-numeric strings.
- **Fix:** `ParseIntPipe` applied to all `:id` params across all three controllers.

---

## PASS 2 — Deep dive

---

## BUG-005: Partial write corruption — no DB transaction wrapping `create()` · ✅ Fixed

- **Severity:** Critical
- **Endpoint:** `POST /transactions`
- **Scenario:** `transactionRepository.save()` succeeds but `productRepository.save()` subsequently fails.
- **Expected:** Both writes succeed or both roll back atomically.
- **Actual:** Transaction row created but inventory never decremented — permanently inconsistent state.
- **Root cause:** Two separate `save()` calls with no wrapping DB transaction.
- **Fix:** Wrapped both writes in a `QueryRunner` transaction in `transactions.service.ts`.

---

## BUG-006: `OUT_OF_STOCK` status never enforced on purchases · ✅ Fixed

- **Severity:** Critical
- **Endpoint:** `POST /transactions`
- **Scenario:** Product manually set to `OUT_OF_STOCK` via `PUT`, but still has `quantity > 0`.
- **Expected:** HTTP 409 — purchase blocked.
- **Actual:** Purchase succeeds — `status` field was decorative and never checked.
- **Root cause:** `transactions.service.ts` only checked `dto.quantity > product.quantity`, not `product.status`.
- **Fix:** Added explicit `OUT_OF_STOCK` status check before the quantity check.

---

## BUG-007: `price` accepts zero and negative values · ✅ Fixed

- **Severity:** High
- **Endpoint:** `POST /products`
- **Payload:** `{ "name": "Free Item", "price": -500, "quantity": 10 }`
- **Expected:** HTTP 400.
- **Actual:** HTTP 201 — negative price persisted.
- **Root cause:** `CreateProductDto.price` had `@IsNumber()` but no `@Min`.
- **Fix:** Added `@Min(0.01)` to `price` field.

---

## BUG-008: Product created with `quantity: 0` gets `status: FOR_SALE` · ✅ Fixed

- **Severity:** High
- **Endpoint:** `POST /products`
- **Payload:** `{ "name": "Empty Stock", "price": 100, "quantity": 0 }`
- **Expected:** `status: OUT_OF_STOCK`.
- **Actual:** `status: FOR_SALE` — product appeared purchasable but blocked all purchases.
- **Root cause:** `products.service.ts` always defaulted to `FOR_SALE` regardless of initial quantity.
- **Fix:** Auto-set `OUT_OF_STOCK` when initial `quantity === 0`.

---

## BUG-009: Postman regression tests asserted old buggy behavior · ✅ Fixed

- **Severity:** High
- **File:** `scripts/merge-postman-collection.js`
- **Description:** Three test cases expected `201` for invalid email, `500` for `/abc`, and `price === '8'` — all wrong after fixes.
- **Fix:** Updated test names and assertions to reflect corrected API behavior.

---

## BUG-010: `DB_PORT` silently becomes `NaN` when env var is missing · ✅ Fixed

- **Severity:** High
- **Files:** `src/app.module.ts`, `data-source.ts`
- **Description:** `Number(process.env.DB_PORT)` produces `NaN` when `DB_PORT` is unset. TypeORM receives `NaN` as the port, causing an opaque connection error.
- **Fix:** `parseInt(process.env.DB_PORT ?? '5432', 10)` in both files.

---

## BUG-011: `productId` missing `@ApiProperty` and `@Min(1)` in transaction DTO · ✅ Fixed

- **Severity:** Medium
- **File:** `src/transactions/dto/create-transaction.dto.ts`
- **Description:** `productId` was invisible in Swagger; `productId: 0` passed validation and produced a confusing NotFoundException.
- **Fix:** Added `@ApiProperty`, `@Min(1)`, and `@IsNotEmpty()`.

---

## BUG-012: `userId` had duplicate `@ApiProperty` in transaction DTO · ✅ Fixed

- **Severity:** Medium
- **File:** `src/transactions/dto/create-transaction.dto.ts`
- **Description:** Copy-paste error — two `@ApiProperty` decorators on `userId`, first was dead code.
- **Fix:** Removed duplicate, kept one correctly positioned decorator.

---

## BUG-013: `typeorm.config.ts` was an empty 0-byte file · ✅ Fixed

- **Severity:** Medium
- **Description:** Confusing dead file — actual config lives in `data-source.ts` and `app.module.ts`.
- **Fix:** File deleted.

---

## BUG-014: `GET /` returned `"Hello World!"` — not a real health check · ✅ Fixed

- **Severity:** Medium
- **Description:** CI and Docker Compose healthchecks probed `GET /`, which returned `"Hello World!"` even when the DB was unreachable.
- **Fix:** Replaced with structured JSON `{ status, uptime, timestamp }` response.

---

## BUG-015: `@IsNotEmpty()` missing on `userId`/`productId` in transaction DTO · ✅ Fixed

- **Severity:** Low
- **Description:** Omitting the field produced `"value must be an integer"` instead of `"field is required"`.
- **Fix:** Added `@IsNotEmpty()` to all three fields.

---

## PASS 3 — Runtime and schema audit

---

## BUG-016: `@Column('decimal')` returns a string at runtime · ✅ Fixed

- **Severity:** Critical
- **Endpoint:** Any endpoint returning a product
- **Description:** The `pg` driver returns `numeric` columns as JavaScript strings. `product.price` was `"1000"` (string) at runtime despite `price: number` in TypeScript. JSON responses serialized `price` as `"1000"`, violating the Swagger schema.
- **Fix:** Added `transformer: { from: (v) => parseFloat(v) }` to the `@Column('decimal')` decorator.

---

## BUG-017: Restocking via `PUT` leaves product permanently unpurchasable · ✅ Fixed

- **Severity:** Critical
- **Endpoint:** `PUT /products/:id`
- **Scenario:** Product sells out (`OUT_OF_STOCK`). Operator does `PUT /products/:id` with `{ "quantity": 50 }`. Product stays `OUT_OF_STOCK`.
- **Expected:** Status auto-restores to `FOR_SALE` when quantity is updated to `> 0`.
- **Actual:** Product has 50 units but cannot be purchased — operator must also send `"status": "FOR_SALE"` (undocumented requirement).
- **Fix:** `products.service.ts` now auto-flips status to `FOR_SALE` when new quantity `> 0` and current status is `OUT_OF_STOCK`, unless the caller explicitly sets a different status.

---

## BUG-018: FK columns `userId`/`productId` nullable in DB — no NOT NULL constraint · ✅ Fixed

- **Severity:** High
- **File:** Migration `1789324328927`
- **Description:** `@ManyToOne` defaults to `nullable: true`. The DDL created `userId integer` (nullable). Deleting a User or Product with transactions threw a raw Postgres FK violation (500). A Transaction with null FKs could theoretically be inserted.
- **Fix:** Added `{ nullable: false }` to both `@ManyToOne` relations; added migration `1789337198145` to `ALTER` the columns to `NOT NULL`.

---

## BUG-019: Dead `instanceof NotFoundException` guard in `products.service.ts` `update()` · ✅ Fixed

- **Severity:** High
- **File:** `src/products/products.service.ts`
- **Description:** `findOne()` was called **before** the `try` block. `NotFoundException` was thrown before `try` was entered, making the `catch` guard `if (error instanceof NotFoundException) throw error` permanently unreachable dead code.
- **Fix:** Moved `findOne` inside the `try` block, making the guard live — matching the pattern in `users.service.ts`.

---

## BUG-020: No `@MaxLength` on any string field — unbounded payloads accepted · ✅ Fixed

- **Severity:** High
- **Endpoints:** `POST /users`, `PUT /users/:id`, `POST /products`, `PUT /products/:id`
- **Description:** All string fields (`name`, `email`, product `name`) had no upper length bound. A 1 MB `name` passed all validators and hit the database — denial-of-service vector.
- **Fix:** Added `@MaxLength(200)` on name fields, `@MaxLength(320)` on email (RFC 5321 max).

---

## BUG-021: `test-cases.md` documented fixed bugs as still open · ✅ Fixed

- **Severity:** Medium
- **File:** `qa/test-cases.md`
- **Description:** Execution records for USR-009/USR-014 still showed `Failed`; the risks section described all three fixed issues as open concerns.
- **Fix:** Updated execution records to `Fixed`, updated expected results and risks section.

---

## BUG-022: k6 script only tested `GET /products` — no write path coverage · ✅ Fixed

- **Severity:** Medium
- **File:** `qa/k6-script.js`
- **Description:** 5 VUs against one read endpoint. No `POST /transactions`, no inventory verification, no write throughput signal.
- **Fix:** Added second scenario covering `POST /users` → `POST /products` → `POST /transactions` → inventory verification. Added numeric `price` type assertion.

---

## BUG-023: Migration `CREATE TYPE` not idempotent · ✅ Fixed

- **Severity:** Medium
- **File:** `src/migrations/1789324328927-migration.ts`
- **Description:** `CREATE TYPE "product_status_enum"` fails with "type already exists" if the migration is re-run (e.g. after dropping the tracking table).
- **Fix:** Changed to `CREATE TYPE IF NOT EXISTS`.

---

## BUG-024: `@Type(() => Number)` silently coerces booleans · ✅ Fixed

- **Severity:** Medium
- **File:** `src/transactions/dto/create-transaction.dto.ts`
- **Description:** `{ "userId": true }` was coerced to `{ userId: 1 }` by class-transformer before validators ran — booleans passed `@IsInt()` and `@Min(1)`.
- **Fix:** Added `@IsNumber()` before `@Type()` to validate the raw JSON type before coercion.

---

*All 24 bugs found across three exploratory passes. All are fixed and committed.*
