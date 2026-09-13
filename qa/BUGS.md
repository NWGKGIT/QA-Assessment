# Exploratory API Bug Reports

Testing was performed against `http://localhost:4000` with PostgreSQL running locally through Docker. The response bodies below are abbreviated only where the unchanged fields are not relevant to the defect.

## BUG-001: Product update overwrites price with quantity

- **Severity:** High
- **Endpoint:** `PUT /products/1`
- **Precondition:** Product 1 exists with price `1000` and quantity `10`.
- **Payload:**

```json
{
  "name": "Updated Laptop",
  "price": 1200,
  "quantity": 8,
  "status": "FOR_SALE"
}
```

- **Steps to reproduce:**
  1. Create a product with a known price and quantity.
  2. Update the product with different `price` and `quantity` values.
  3. Retrieve the product with `GET /products/1`.
- **Expected:** The saved product has `price: 1200` and `quantity: 8`.
- **Actual:** The update response and subsequent GET show `price: "8"` and `quantity: 8`.
- **Evidence:** Postman update response returned `"price": 8`; `GET /products/1` returned `"price": "8"`.
- **Likely cause:** `ProductsService.update()` assigns `product.price = dto.quantity` instead of `dto.price`.

## BUG-002: Creating a transaction increases inventory

- **Severity:** Critical
- **Endpoint:** `POST /transactions`
- **Precondition:** Product 1 has quantity `8`; User 1 exists.
- **Payload:**

```json
{
  "userId": 1,
  "productId": 1,
  "quantity": 2
}
```

- **Steps to reproduce:**
  1. Record the product quantity before the transaction.
  2. Create a transaction for quantity `2`.
  3. Retrieve the product with `GET /products/1`.
- **Expected:** Inventory decreases from `8` to `6` after the sale.
- **Actual:** Inventory increases from `8` to `10`.
- **Evidence:** The transaction returned `201`; the following product GET returned `"quantity": 10`.
- **Likely cause:** `TransactionsService.create()` uses `product.quantity += dto.quantity` instead of subtracting the purchased quantity.

## BUG-003: Malformed email address is accepted

- **Severity:** Medium
- **Endpoint:** `POST /users`
- **Payload:**

```json
{
  "name": "Invalid Email",
  "email": "not-an-email"
}
```

- **Steps to reproduce:**
  1. Submit the payload to `POST /users`.
  2. Inspect the response status and persisted record.
- **Expected:** HTTP `400 Bad Request` for an invalid email format, if email format is part of the user acceptance criteria.
- **Actual:** HTTP `201 Created`; the invalid value is persisted as user 2.
- **Evidence:** Postman returned `"statusCode": 201` with `"email": "not-an-email"`.
- **Likely cause:** `CreateUserDto` checks only `@IsNotEmpty()` for `email`; it does not use `@IsEmail()`.

## BUG-004: Non-numeric user id produces HTTP 500

- **Severity:** Medium
- **Endpoint:** `GET /users/abc`
- **Steps to reproduce:**
  1. Send `GET http://localhost:4000/users/abc`.
  2. Inspect the response status and body.
- **Expected:** HTTP `400 Bad Request` explaining that the route id must be an integer.
- **Actual:** HTTP `500`; the response exposes the database error `invalid input syntax for type integer: "NaN"`.
- **Evidence:** Postman returned:

```json
{
  "statusCode": 500,
  "message": "Error retrieving user",
  "error": "invalid input syntax for type integer: \"NaN\""
}
```

- **Likely cause:** `UsersController` converts the route parameter with `Number(id)` without a `ParseIntPipe` or equivalent validation.
- **Additional risk:** The same pattern exists in the Products and Transactions controllers.

## Observed behavior that is not currently logged as a bug

- PostgreSQL decimal columns return product prices as strings in retrieval responses, for example `"price": "1000"`. This should be confirmed against the API contract before classifying it as a defect.
- The initial command `docker run start:dev` is not the repository's documented startup command. The correct local command is `npm run start:dev`; Docker uses `docker compose up -d --build`.
