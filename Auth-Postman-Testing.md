# Auth API — Postman Testing Guide

Step-by-step instructions to test every auth endpoint in Postman for **Walk Like Local Backend**.

---

## Before you start

### 1. Run the server

```bash
npm install
npm run dev
```

Default base URL (from `.env`):

| Variable       | Example                 |
| -------------- | ----------------------- |
| `PORT`         | `5000`                  |
| `API_BASE_URL` | `http://localhost:5000` |

**Auth base path:** `http://localhost:5000/api/v1/auth`

### 2. Health check (optional)

Confirm the API is up:

|             |                                       |
| ----------- | ------------------------------------- |
| **Method**  | `GET`                                 |
| **URL**     | `http://localhost:5000/api/v1/health` |
| **Headers** | None                                  |
| **Body**    | None                                  |

**Expected (200):**

```json
{
  "success": true,
  "message": "Server is running"
}
```

### 3. Postman environment (recommended)

Create an environment named **Walk Like Local — Local** with:

| Variable       | Initial value                    |
| -------------- | -------------------------------- |
| `baseUrl`      | `http://localhost:5000`          |
| `authUrl`      | `{{baseUrl}}/api/v1/auth`        |
| `accessToken`  | _(leave empty; set after login)_ |
| `testEmail`    | `guide.test@example.com`         |
| `testPassword` | `Password123`                    |

Use `{{authUrl}}` and `{{accessToken}}` in requests below.

### 4. Headers used on most requests

For any request with a **JSON body**:

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

For **protected** routes (change password):

| Key             | Value                    |
| --------------- | ------------------------ |
| `Content-Type`  | `application/json`       |
| `Authorization` | `Bearer {{accessToken}}` |

---

## Recommended test order

```text
1. Register (guide or tourist)
2. Verify email (link from email or server console)
3. Login → save accessToken
4. Change password (optional, needs token)
---
Forgot password flow (separate user or after login):
5. Request password reset
6. Verify reset code (from email)
7. Reset password
8. Login with new password
```

---

## 1. Register Guide

|            |                              |
| ---------- | ---------------------------- |
| **Method** | `POST`                       |
| **URL**    | `{{authUrl}}/register-guide` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "fullName": "Ahmed Mohamed",
  "email": "guide@example.com",
  "password": "Password123"
}
```

**Expected (201):**

```json
{
  "success": true,
  "message": "Guide account created successfully"
}
```

**Validation / errors**

| Status | When                                                                  |
| ------ | --------------------------------------------------------------------- |
| `400`  | Missing/invalid email, password &lt; 8 chars, fullName not 3–25 chars |
| `409`  | Email already exists                                                  |

**Notes**

- The server automatically sends a verification email after registration.
- The register response does not include the token.
- If SMTP is not configured, the verification link is printed in the server terminal as `[EMAIL] Mock send:`.
- If SMTP is configured and you are running locally, you may also see a debug log like `[EMAIL] Sending via SMTP:`.
- You **cannot login** until email is verified.

---

## 2. Register Tourist

|            |                                |
| ---------- | ------------------------------ |
| **Method** | `POST`                         |
| **URL**    | `{{authUrl}}/register-tourist` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "fullName": "John Smith",
  "email": "tourist@example.com",
  "password": "Password123"
}
```

**Expected (201):**

```json
{
  "success": true,
  "message": "Tourist account created successfully"
}
```

**Notes**

- The server automatically sends a verification email after registration.
- The register response does not include the token.
- If SMTP is not configured, the verification link is printed in the server terminal as `[EMAIL] Mock send:`.
- If SMTP is configured and you are running locally, you may also see a debug log like `[EMAIL] Sending via SMTP:`.
- You **cannot login** until email is verified.

Same validation rules as register guide.

---

## 3. Login

|            |                     |
| ---------- | ------------------- |
| **Method** | `POST`              |
| **URL**    | `{{authUrl}}/login` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "email": "guide@example.com",
  "password": "Password123"
}
```

**Expected (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save the token in Postman**

1. Open the **Tests** tab on this request.
2. Add:

```javascript
const json = pm.response.json();
if (json.data?.accessToken) {
  pm.environment.set("accessToken", json.data.accessToken);
}
```

3. Send the request again after a successful login — `{{accessToken}}` will be set automatically.

**Common errors**

| Status | Message (example)                                            |
| ------ | ------------------------------------------------------------ |
| `401`  | Invalid credentials                                          |
| `403`  | Please verify your email before logging in                   |
| `403`  | Your account is not active                                   |
| `400`  | Please login with Google _(account was created with Google)_ |

---

## 4. Verify email

Triggered when the user clicks the link in the verification email.

|            |                                                   |
| ---------- | ------------------------------------------------- |
| **Method** | `GET`                                             |
| **URL**    | `{{authUrl}}/verify-email?token=PASTE_TOKEN_HERE` |

**Headers** — none required.

**Query params**

| Param   | Required | Description                       |
| ------- | -------- | --------------------------------- |
| `token` | Yes      | Hex token from verification email |

**Example URL**

```http
GET http://localhost:5000/api/v1/auth/verify-email?token=a1b2c3d4e5f6...
```

**Expected behavior**

- **Success:** HTTP redirect to `{FRONTEND_URL}/email-verified` (e.g. `http://localhost:5173/email-verified`). Postman may show `302` and a redirect URL instead of JSON.
- **Failure:** Redirect to `{FRONTEND_URL}/email-verification-failed`.

**How to get the token in Postman**

1. Register a user via `POST /api/v1/auth/register-guide` or `POST /api/v1/auth/register-tourist`.
2. If SMTP is configured, the link is sent to the registered email inbox.
3. If SMTP is not configured, the server console prints the link in a line like:
   - `[EMAIL] Mock send: { to: ..., subject: ..., text: "Please verify your email by visiting: http://localhost:5000/api/v1/auth/verify-email?token=..." }`
4. If SMTP is configured locally, you should also see a debug log like:
   - `[EMAIL] Sending via SMTP: { to: ..., subject: ..., text: "..." }`
5. Copy the `token=...` value from the link.
   - Make sure you do not include any trailing spaces or newline characters.
   - If the URL shown in the console ends with `\n`, remove that before sending the request.
6. Send `GET {{authUrl}}/verify-email?token=PASTE_TOKEN_HERE` in Postman.

**Token expiry:** 3 hours (server-side).

---

## 5. Resend verification email

|            |                                         |
| ---------- | --------------------------------------- |
| **Method** | `POST`                                  |
| **URL**    | `{{authUrl}}/resend-verification-email` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "email": "guide@example.com"
}
```

**Expected (200):**

```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

**Errors**

| Status | When                      |
| ------ | ------------------------- |
| `404`  | User not found            |
| `400`  | Email is already verified |

---

## 6. Google sign-in (ID token — mobile / SPA)

|            |                      |
| ---------- | -------------------- |
| **Method** | `POST`               |
| **URL**    | `{{authUrl}}/google` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "idToken": "YOUR_GOOGLE_ID_TOKEN",
  "role": "GUIDE"
}
```

`role` must be exactly `"GUIDE"` or `"TOURIST"`.

**Expected (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "..."
  }
}
```

**Postman note:** You need a real Google **ID token** from your frontend or Google OAuth playground. This is hard to fake manually; use the **browser redirect flow** below for easier local testing.

Use the same **Tests** script as login to save `accessToken`.

**Errors**

| Status | When                                      |
| ------ | ----------------------------------------- |
| `401`  | Invalid Google token                      |
| `409`  | Email already registered with local login |
| `409`  | Role mismatch for this Google account     |

---

## 7. Google OAuth (browser redirect)

Best tested in a **browser**, not Postman’s JSON body.

### Step A — Start OAuth

|            |                                 |
| ---------- | ------------------------------- |
| **Method** | `GET`                           |
| **URL**    | `{{authUrl}}/google?role=GUIDE` |

Or for tourist:

```http
GET http://localhost:5000/api/v1/auth/google?role=TOURIST
```

**Query params**

| Param  | Required | Values               |
| ------ | -------- | -------------------- |
| `role` | Yes      | `GUIDE` or `TOURIST` |

**Expected:** Redirect to Google sign-in, then to your callback.

**Requires in `.env`:**

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` (e.g. `http://localhost:5000/api/v1/auth/google/callback`)

If not configured: **503** with message `Google OAuth redirect is not configured on the server`.

### Step B — Callback (automatic)

|            |                                                     |
| ---------- | --------------------------------------------------- |
| **Method** | `GET`                                               |
| **URL**    | `http://localhost:5000/api/v1/auth/google/callback` |

Google calls this after login. You do not call it manually in Postman.

**Success:** Redirect to:

```text
{FRONTEND_URL}/auth/callback?token=<JWT>
```

**Failure:** Redirect to `{FRONTEND_URL}/auth/error?message=...`

Copy `token` from the URL into Postman as `accessToken`.

---

## 8. Request password reset

|            |                                      |
| ---------- | ------------------------------------ |
| **Method** | `POST`                               |
| **URL**    | `{{authUrl}}/request-password-reset` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "email": "guide@example.com"
}
```

**Expected (200):**

```json
{
  "success": true,
  "message": "Password reset code sent successfully"
}
```

A **6-digit code** is emailed (or printed in the server console if SMTP is mocked).

**OTP expiry:** 1 minute (complete steps 9–10 quickly).

---

## 9. Verify reset code

|            |                                 |
| ---------- | ------------------------------- |
| **Method** | `POST`                          |
| **URL**    | `{{authUrl}}/verify-reset-code` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "email": "guide@example.com",
  "code": "123456"
}
```

`code` must be exactly **6 digits**.

**Expected (200):**

```json
{
  "success": true,
  "message": "Reset code verified successfully"
}
```

**Errors**

| Status | When                   |
| ------ | ---------------------- |
| `400`  | Invalid reset code     |
| `400`  | Reset code has expired |
| `400`  | No reset request found |

You **must** complete this step before **Reset password**.

---

## 10. Resend reset code

|            |                                 |
| ---------- | ------------------------------- |
| **Method** | `POST`                          |
| **URL**    | `{{authUrl}}/resend-reset-code` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "email": "guide@example.com"
}
```

Same body as request password reset. Invalidates the previous code and sends a new one.

**Expected (200):**

```json
{
  "success": true,
  "message": "Password reset code sent successfully"
}
```

---

## 11. Reset password

|            |                              |
| ---------- | ---------------------------- |
| **Method** | `POST`                       |
| **URL**    | `{{authUrl}}/reset-password` |

**Headers**

| Key            | Value              |
| -------------- | ------------------ |
| `Content-Type` | `application/json` |

**Body** → raw → JSON

```json
{
  "email": "guide@example.com",
  "newPassword": "NewPassword123"
}
```

**Expected (200):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error if step 9 was skipped:**

```json
{
  "success": false,
  "message": "Reset code verification is required before changing password"
}
```

Then **login** with `newPassword`.

---

## 12. Change password (protected)

|            |                               |
| ---------- | ----------------------------- |
| **Method** | `PATCH`                       |
| **URL**    | `{{authUrl}}/change-password` |

**Headers**

| Key             | Value                    |
| --------------- | ------------------------ |
| `Content-Type`  | `application/json`       |
| `Authorization` | `Bearer {{accessToken}}` |

**Body** → raw → JSON

```json
{
  "currentPassword": "Password123",
  "newPassword": "AnotherPass123"
}
```

**Expected (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Errors**

| Status | When                                   |
| ------ | -------------------------------------- |
| `401`  | Missing/invalid/expired token          |
| `400`  | Current password is incorrect          |
| `400`  | New password shorter than 8 characters |

**Postman tip:** In the **Authorization** tab you can choose **Bearer Token** and paste `{{accessToken}}` instead of typing the header manually.

---

## Quick reference — all auth URLs

Assume `BASE = http://localhost:5000/api/v1/auth`

| #   | Method  | Endpoint                           | Auth required        |
| --- | ------- | ---------------------------------- | -------------------- |
| 1   | `POST`  | `{BASE}/register-guide`            | No                   |
| 2   | `POST`  | `{BASE}/register-tourist`          | No                   |
| 3   | `POST`  | `{BASE}/login`                     | No                   |
| 4   | `POST`  | `{BASE}/google`                    | No                   |
| 5   | `GET`   | `{BASE}/google?role=GUIDE`         | No (browser)         |
| 6   | `GET`   | `{BASE}/google/callback`           | No (Google)          |
| 7   | `GET`   | `{BASE}/verify-email?token=...`    | No                   |
| 8   | `POST`  | `{BASE}/resend-verification-email` | No                   |
| 9   | `POST`  | `{BASE}/request-password-reset`    | No                   |
| 10  | `POST`  | `{BASE}/verify-reset-code`         | No                   |
| 11  | `POST`  | `{BASE}/resend-reset-code`         | No                   |
| 12  | `POST`  | `{BASE}/reset-password`            | No                   |
| 13  | `PATCH` | `{BASE}/change-password`           | **Yes** — Bearer JWT |

---

## Standard error shape

Most failures return:

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

Validation errors (missing fields, bad email, etc.) usually return **400** with the first validation message.

---

## Full happy-path example (local account)

1. **POST** `register-tourist` with a new email.
2. Copy verification `token` from terminal or email.
3. **GET** `verify-email?token=...` (or open link in browser).
4. **POST** `login` → save `accessToken`.
5. **PATCH** `change-password` with `Authorization: Bearer {{accessToken}}`.

**Forgot password (same user):**

6. **POST** `request-password-reset`.
7. Copy 6-digit `code` from email/console within 1 minute.
8. **POST** `verify-reset-code` with `email` + `code`.
9. **POST** `reset-password` with `newPassword`.
10. **POST** `login` with the new password.

---

## Import into Postman (optional)

You can create a collection manually using the table above, or duplicate this structure:

- **Folder:** Auth
  - Register Guide
  - Register Tourist
  - Login _(with Tests script for token)_
  - Resend Verification
  - Verify Email _(GET with query `token`)_
  - Request Password Reset
  - Verify Reset Code
  - Resend Reset Code
  - Reset Password
  - Change Password _(Bearer auth)_
  - Google ID Token
  - Google OAuth Start _(GET, for browser)_

Set the collection variable `authUrl` to `http://localhost:5000/api/v1/auth` if you do not use a Postman environment.

---

## Troubleshooting

| Problem                  | What to check                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection refused       | Server running? Correct `PORT`?                                                                                                                                         |
| Login 403 — verify email | Run verify-email flow first                                                                                                                                             |
| Reset code expired       | OTP lasts **1 minute**; call `resend-reset-code`                                                                                                                        |
| Reset password 400       | Call `verify-reset-code` first                                                                                                                                          |
| Google 503               | Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`                                                                                                   |
| No emails                | Configure `SMTP_USER`, `SMTP_PASS`, etc., or read `[EMAIL] Mock send` in terminal. If SMTP is enabled locally, also check for `[EMAIL] Sending via SMTP:` debug output. |
| 401 on change-password   | Login again; use `Bearer ` + token (space after Bearer)                                                                                                                 |

For API design details, see [Auth-Setup.md](./Auth-Setup.md).
