# Authentication API Documentation

## Overview

This document provides comprehensive API documentation for the authentication endpoints in the Tutterfly Python application. The API uses JWT (JSON Web Tokens) for authentication and supports OAuth2 compatibility.

## Base URL

```
/api/v1/auth
```

## Authentication Methods

### Bearer Token Authentication
Most endpoints require JWT authentication using the `Authorization: Bearer <token>` header.

### OAuth2 Password Flow
The `/token` endpoint supports OAuth2 password flow for standard OAuth2 clients.

## Endpoints

### 1. User Registration

**POST** `/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "string (2-100 characters)",
  "email": "string (valid email)",
  "password": "string (min 8 characters)",
  "confirm_password": "string",
  "tenant_id": "string (optional)"
}
```

**Response (201 Created):**
```json
{
  "error": false,
  "message": "User registered successfully. Please verify your email.",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "detail": "Error message describing validation or registration failure"
}
```

---

### 2. User Login

**POST** `/login`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "string (valid email)",
  "password": "string",
  "remember_me": "boolean (default: false)"
}
```

**Response (200 OK):**
```json
{
  "access_token": "string (JWT)",
  "token_type": "bearer",
  "expires_in": "integer (seconds)",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "tenant_id": "string",
    "role_ids": ["string"]
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Invalid credentials",
  "headers": {
    "WWW-Authenticate": "Bearer"
  }
}
```

---

### 3. OAuth2 Token Endpoint

**POST** `/token`

OAuth2 compatible token endpoint for standard OAuth2 clients.

**Request Body (application/x-www-form-urlencoded):**
```
username: string (email)
password: string
grant_type: "password"
```

**Response (200 OK):**
```json
{
  "access_token": "string (JWT)",
  "token_type": "bearer",
  "refresh_token": "string"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Invalid credentials",
  "headers": {
    "WWW-Authenticate": "Bearer"
  }
}
```

---

### 4. Refresh Token

**POST** `/refresh`

Refresh an expired access token using a refresh token.

**Request Body:**
```json
{
  "refresh_token": "string"
}
```

**Response (200 OK):**
```json
{
  "access_token": "string (JWT)",
  "token_type": "bearer"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Invalid or expired refresh token"
}
```

---

### 5. Get Current User

**GET** `/me`

Get information about the currently authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "tenant_id": "string",
  "role_ids": ["string"],
  "is_active": "boolean",
  "is_verified": "boolean",
  "last_login_at": "datetime (ISO 8601)"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "detail": "Could not validate credentials"
}
```

---

### 6. Change Password

**POST** `/change-password`

Change the current user's password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "string",
  "new_password": "string (min 8 characters)",
  "confirm_password": "string"
}
```

**Response (200 OK):**
```json
{
  "error": false,
  "message": "Password changed successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "detail": "Current password is incorrect"
}
```

---

### 7. Request Password Reset

**POST** `/password-reset`

Request a password reset link to be sent to the user's email.

**Request Body:**
```json
{
  "email": "string (valid email)"
}
```

**Response (200 OK):**
```json
{
  "error": false,
  "message": "If email exists, password reset link has been sent"
}
```

---

### 8. Confirm Password Reset

**POST** `/password-reset/confirm`

Reset password using the token received via email.

**Request Body:**
```json
{
  "token": "string",
  "new_password": "string (min 8 characters)",
  "confirm_password": "string"
}
```

**Response (200 OK):**
```json
{
  "error": false,
  "message": "Password reset successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "detail": "Invalid or expired reset token"
}
```

---

### 9. Logout

**POST** `/logout`

Logout the current user (client-side token invalidation).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "error": false,
  "message": "Logged out successfully"
}
```

---

## Data Models

### UserLogin
```json
{
  "email": "EmailStr",
  "password": "string",
  "remember_me": "boolean (default: false)"
}
```

### UserRegister
```json
{
  "name": "string (2-100 characters)",
  "email": "EmailStr",
  "password": "string (min 8 characters)",
  "confirm_password": "string",
  "tenant_id": "string (optional)"
}
```

### PasswordChange
```json
{
  "current_password": "string",
  "new_password": "string (min 8 characters)",
  "confirm_password": "string"
}
```

### PasswordReset
```json
{
  "email": "EmailStr"
}
```

### PasswordResetConfirm
```json
{
  "token": "string",
  "new_password": "string (min 8 characters)",
  "confirm_password": "string"
}
```

### TokenResponse
```json
{
  "access_token": "string",
  "token_type": "string (default: 'bearer')",
  "expires_in": "integer",
  "user": "object"
}
```

### RefreshToken
```json
{
  "refresh_token": "string"
}
```

## Error Handling

The API returns standard HTTP status codes and JSON error responses:

- **200 OK** - Request successful
- **201 Created** - Resource created successfully
- **400 Bad Request** - Validation error or invalid request data
- **401 Unauthorized** - Authentication failed or missing/invalid token
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **422 Unprocessable Entity** - Request validation failed

## Security Considerations

1. **JWT Tokens**: Access tokens have a limited lifetime (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
2. **Password Requirements**: Minimum 8 characters
3. **Email Verification**: Users must verify their email after registration
4. **Token Refresh**: Use refresh tokens to obtain new access tokens
5. **HTTPS**: Always use HTTPS in production to protect tokens and credentials

## Usage Examples

### Register a new user
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123",
    "confirm_password": "securepassword123"
  }'
```

### Login and get token
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Access protected endpoint
```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <your_access_token>"
```

### Change password
```bash
curl -X POST "http://localhost:8000/api/v1/auth/change-password" \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "securepassword123",
    "new_password": "newsecurepassword456",
    "confirm_password": "newsecurepassword456"
  }'
```

## Integration with Swagger/OpenAPI

This API is automatically documented with Swagger/OpenAPI. Visit `/docs` in your browser to see the interactive API documentation with:

- Interactive testing interface
- Request/response schemas
- Authentication examples
- Error response details

The Swagger documentation is generated automatically from the FastAPI framework and Pydantic models used in this application.
