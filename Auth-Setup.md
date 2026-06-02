# Walk Like Local - Phase 1 (Config + Auth + Users)

## Goal

Build the foundation of the backend before implementing:

- Guide Profiles
- Tourist Profiles
- Tours
- Bookings
- Chat
- Reviews
- Notifications
- Admin Panel

---

# 1. Authentication APIs

## Register Guide

```http
POST /api/v1/auth/register-guide
```

### Request

```json
{
  "fullName": "Ahmed Mohamed",
  "email": "guide@example.com",
  "password": "Password123"
}
```

### Response

```json
{
  "success": true,
  "message": "Guide account created successfully"
}
```

---

## Register Tourist

```http
POST /api/v1/auth/register-tourist
```

### Request

```json
{
  "fullName": "John Smith",
  "email": "tourist@example.com",
  "password": "Password123"
}
```

### Response

```json
{
  "success": true,
  "message": "Tourist account created successfully"
}
```

---

## Login

```http
POST /api/v1/auth/login
```

### Request

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

### Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-token"
  }
}
```

---

## Google OAuth Login/Register

```http
POST /api/v1/auth/google
```

### Request

```json
{
  "idToken": "google-token",
  "role": "GUIDE/TOURIST"
}
```

### Response

```json
{
  "success": true,
  "message": "Login successful"
}
```

---

# 2. Email Verification

## Verify Email

User receives a verification link via email.

```http
GET /api/v1/auth/verify-email?token=:token
```

### Behavior

- Verify user email.
- Set `isEmailVerified = true`.
- Remove verification token.
- Redirect to frontend success page.

---

## Resend Verification Email

```http
POST /api/v1/auth/resend-verification-email
```

### Request

```json
{
  "email": "user@example.com"
}
```

### Behavior

- Generate new verification token.
- Invalidate previous token.
- Send new verification email.

---

# 3. Forgot Password Flow (OTP)

## Request Password Reset

```http
POST /api/v1/auth/request-password-reset
```

### Request

```json
{
  "email": "user@example.com"
}
```

### Behavior

- Generate 6-digit OTP.
- Store hashed OTP.
- OTP expires after 10 minutes.
- Send OTP to email.

---

## Verify Reset Code

```http
POST /api/v1/auth/verify-reset-code
```

### Request

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### Behavior

- Verify OTP.
- Mark reset session as verified.
- Allow password reset.

---

## Resend Reset Code

```http
POST /api/v1/auth/resend-reset-code
```

### Request

```json
{
  "email": "user@example.com"
}
```

### Behavior

- Invalidate previous OTP.
- Generate new OTP.
- Send new OTP email.

---

## Reset Password

```http
POST /api/v1/auth/reset-password
```

### Request

```json
{
  "email": "user@example.com",
  "newPassword": "NewPassword123"
}
```

### Behavior

- User must complete Verify Reset Code step first.
- Hash new password.
- Clear reset code.
- Clear reset verification flag.
- Password updated successfully.

---

# 4. Change Password

Requires authentication.

```http
PATCH /api/v1/auth/change-password
```

### Headers

```http
Authorization: Bearer access-token
```

### Request

```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Behavior

- Verify current password.
- Hash new password.
- Update password.
- Optionally invalidate active sessions.

---

# 5. User APIs

## Get Current User

```http
GET /api/v1/users/me
```

### Headers

```http
Authorization: Bearer access-token
```

---

# 6. User Schema Design

## Users Collection

```js
{
  _id: ObjectId,

  fullName: String,

  email: String,

  password: String,

  authProvider: String,

  googleId: String,

  role: String,

  isEmailVerified: Boolean,

  profilePicture: String,

  status: String,

  lastLoginAt: Date,

  emailVerificationToken: String,

  emailVerificationExpiresAt: Date,

  passwordResetCode: String,

  passwordResetCodeExpiresAt: Date,

  isResetCodeVerified: Boolean,

  createdAt: Date,

  updatedAt: Date
}
```

---

## Role Enum

```js
["GUIDE", "TOURIST", "ADMIN"];
```

---

## Auth Provider Enum

```js
["LOCAL", "GOOGLE"];
```

---

## Status Enum

```js
["ACTIVE", "SUSPENDED", "DELETED"];
```

---

# 7. Business Rules

## Registration Rules

- Guide can register using Email & Password.
- Guide can register using Google OAuth.
- Tourist can register using Email & Password.
- Tourist can register using Google OAuth.
- Admin accounts cannot be created publicly.

---

## Email Rules

- Email must be unique.
- Email is stored in lowercase.

---

## Password Rules

- Minimum password length is 8 characters.
- Passwords must be hashed before storage.

---

## Account Separation Rules

- Guide and Tourist are completely separate accounts.
- Guide cannot switch to Tourist.
- Tourist cannot switch to Guide.
- New account registration is required for a different role.

---

## Admin Rules

- Admins are created manually.
- Admins do not have GuideProfile.
- Admins do not have TouristProfile.

---

# 8. Validation Rules

## Register

```json
{
  "fullName": "required",
  "email": "required",
  "password": "required|min:8"
}
```

---

## Login

```json
{
  "email": "required",
  "password": "required"
}
```

---

## Request Password Reset

```json
{
  "email": "required"
}
```

---

## Verify Reset Code

```json
{
  "email": "required",
  "code": "required|length:6"
}
```

---

## Reset Password

```json
{
  "email": "required",
  "newPassword": "required|min:8"
}
```

---

## Change Password

```json
{
  "currentPassword": "required",
  "newPassword": "required|min:8"
}
```

---

# 9. API Response Standard

## Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

---

## Error Response

```json
{
  "success": false,
  "message": "Operation failed"
}
```

---

# 10. Authentication Flows

## Registration Flow

```text
Register
↓
Create User
↓
Generate Verification Token
↓
Send Verification Email
↓
User Clicks Verification Link
↓
Email Verified
↓
Login Allowed
```

---

## Login Flow

```text
Login
↓
Validate Credentials
↓
Generate JWT
↓
Return Access Token
```

---

## Google OAuth Flow

```text
Google Login
↓
Verify Google Token
↓
Create User If Not Exists
↓
Generate JWT
↓
Return Access Token
```

---

## Forgot Password Flow

```text
Request Password Reset
↓
Generate OTP
↓
Send OTP To Email
↓
Verify Reset Code
↓
Reset Password
↓
Login
```

---

## Change Password Flow

```text
Login
↓
Enter Current Password
↓
Verify Password
↓
Set New Password
↓
Password Updated
```

---

# 11. Required Packages

```bash
npm install express
npm install mongoose
npm install dotenv
npm install bcryptjs
npm install jsonwebtoken
npm install cors
npm install helmet
npm install cookie-parser
npm install express-validator
```

---

# 12. User Stories

## Register Guide

As a Guide,

I want to create an account,

So that I can become a verified guide and create tours.

---

## Register Tourist

As a Tourist,

I want to create an account,

So that I can browse and book tours.

---

## Login

As a User,

I want to log into my account,

So that I can access protected features.

---

## Forgot Password

As a User,

I want to reset my password,

So that I can regain access to my account.

---

## Change Password

As a User,

I want to change my password,

So that I can improve account security.

---

## View My Profile

As a User,

I want to view my account information,

So that I can manage my profile.
