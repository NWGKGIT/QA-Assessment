# Users Module Manual Test Cases

## Scope and assumptions

- Base URL: `http://localhost:4000`
- The application is started with `npm run start:dev` or through the full Docker Compose stack.
- `ValidationPipe` uses `transform: true` and `whitelist: true`.
- A successful create is expected to return HTTP `201`.
- A missing user is expected to return HTTP `404`.
- Email uniqueness is enforced by the database and should return HTTP `409`.

## Test cases

| ID      | Scenario                          | Request                                                                                                  | Expected result                                                                                                                                                                            |
| ------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| USR-001 | Create a valid user               | `POST /users` with `{ "name": "Ada Lovelace", "email": "ada@example.com" }`                              | HTTP `201`; response contains a persisted user with an id, name, email, timestamps, and success message.                                                                                   |
| USR-002 | List users                        | `GET /users` after creating at least one user                                                            | HTTP `200`; response contains an array and each user has its related transactions collection.                                                                                              |
| USR-003 | Get an existing user              | `GET /users/{existingId}`                                                                                | HTTP `200`; response contains the requested user and its transactions.                                                                                                                     |
| USR-004 | Update an existing user           | `PUT /users/{existingId}` with `{ "name": "Augusta Ada King", "email": "ada.updated@example.com" }`      | HTTP `200`; response contains the updated values and preserves the user id.                                                                                                                |
| USR-005 | Create without name               | `POST /users` with `{ "email": "missing-name@example.com" }`                                             | HTTP `400`; validation identifies that name is required. No user is created.                                                                                                               |
| USR-006 | Create without email              | `POST /users` with `{ "name": "Missing Email" }`                                                         | HTTP `400`; validation identifies that email is required. No user is created.                                                                                                              |
| USR-007 | Create with empty required values | `POST /users` with `{ "name": "", "email": "" }`                                                         | HTTP `400`; both required fields are rejected. No user is created.                                                                                                                         |
| USR-008 | Create with non-string name       | `POST /users` with `{ "name": 123, "email": "number-name@example.com" }`                                 | HTTP `400`; name is rejected because it must be a string.                                                                                                                                  |
| USR-009 | Create with malformed email       | `POST /users` with `{ "name": "Malformed Email", "email": "not-an-email" }`                              | Expected HTTP `400` if email format is part of the acceptance criteria. Current DTO has no email-format validator, so this test is expected to reveal a defect if the request is accepted. |
| USR-010 | Create duplicate email            | First create a user with `ada@example.com`, then repeat the request with another name and the same email | HTTP `409`; response reports an email conflict. No duplicate user is created.                                                                                                              |
| USR-011 | Get a missing user                | `GET /users/999999`                                                                                      | HTTP `404`; response reports that the user was not found.                                                                                                                                  |
| USR-012 | Update a missing user             | `PUT /users/999999` with `{ "name": "Unknown", "email": "unknown@example.com" }`                         | HTTP `404`; no user is created as a side effect.                                                                                                                                           |
| USR-013 | Ignore an unknown field           | `POST /users` with valid fields plus `{ "role": "admin" }`                                               | HTTP `201`; unknown field is excluded from the validated DTO and is not persisted.                                                                                                         |
| USR-014 | Use a non-numeric id              | `GET /users/abc`                                                                                         | Expected HTTP `400` for an invalid id. Verify actual behavior because the controller converts the value with `Number()` and does not use a parse pipe.                                     |
| USR-015 | Update with a duplicate email     | Create users with two different emails, then update the second user using the first user's email         | HTTP `409`; existing user data remains unchanged.                                                                                                                                          |

## Execution record

| ID                 | Status  | Evidence / notes                                                                |
| ------------------ | ------- | ------------------------------------------------------------------------------- |
| USR-001            | Passed  | `POST /users` returned HTTP `201` and persisted user 1 with timestamps.         |
| USR-002            | Passed  | `GET /users` returned HTTP `200` with user 1 and an empty transactions array.   |
| USR-003            | Passed  | `GET /users/1` returned HTTP `200` with the requested user.                     |
| USR-004            | Not run | A dedicated user update request remains.                                        |
| USR-005 to USR-008 | Not run | Validation cases remain to be executed in Postman.                              |
| USR-009            | Fixed   | Was failing (HTTP `201` for invalid email). Fixed by adding `@IsEmail()` to `CreateUserDto` (BUG-003). Now returns `400`. |
| USR-010 to USR-013 | Not run | Duplicate, missing-user, unknown-field, and update cases remain to be executed. |
| USR-014            | Fixed   | Was failing (`GET /users/abc` returned `500`). Fixed by applying `ParseIntPipe` to controllers (BUG-004). Now returns `400`. |
| USR-015            | Not run | Duplicate-email update remains to be executed.                                  |

## Risks identified from the test design (updated after fixes)

- `CreateUserDto` now validates both email presence and email format via `@IsEmail()` (BUG-003 fixed).
- `GET /users/:id` and `PUT /users/:id` now use `ParseIntPipe`, returning `400` for non-numeric ids (BUG-004 fixed).
- The update controller now uses `UpdateUserDto` (PartialType), making all fields optional for partial updates.
