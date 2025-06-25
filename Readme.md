# OTP Microservice API Usage
The primary API endpoints for generating and verifying One-Time Passwords (OTPs).

## How to Use

All API requests require an **API Key** for authentication, which must be provided in the `X-API-Key` header. You can generate API keys using the `npm run manage-keys -- create <clientId>` command (refer to the full documentation for details).

**Base URL:** Your service's address (e.g., `http://localhost:3001`)

**Common Request Headers:**

*   `Content-Type: application/json`
*   `X-API-Key: sk_your_generated_api_key_here`
*   `X-Correlation-ID: <optional-unique-id>` (Optional, for request tracing. If omitted, one will be generated.)

---

## API Endpoints

### `POST /api/v1/otp/generate`

Generates and sends an OTP to the specified phone number.

*   **Description:** Requests the service to generate a new OTP and dispatch it via the configured provider (Twilio or Custom API) to the given identifier.
*   **Method:** `POST`
*   **Path:** `/api/v1/otp/generate`

**Request Body:**

```json
{
  "identifier": "+919876543210"
}
```

*   `identifier` (string, **required**): The recipient's phone number in E.164 format (e.g., `+12125551234`).

**Success Response (202 Accepted):**

```json
{
  "status": "success",
  "message": "OTP sent successfully. It will expire in 3 minutes.",
  "referenceId": "2e8f1a7b",
  "correlationId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Key Error Responses:**

*   `400 Bad Request`: Invalid `identifier` format.
*   `401 Unauthorized`: Missing or invalid API Key.
*   `429 Too Many Requests`: Rate limit exceeded (e.g., too many OTP requests for this identifier or API key).
*   `503 Service Unavailable`: OTP provider failed to send the message.

---

### `POST /api/v1/otp/verify`

Verifies a submitted OTP against the stored OTP for a given identifier.

*   **Description:** Checks if the provided OTP matches the one previously generated for the specified identifier.
*   **Method:** `POST`
*   **Path:** `/api/v1/otp/verify`

**Request Body:**

```json
{
  "identifier": "+919876543210",
  "otp": "123456"
}
```

*   `identifier` (string, **required**): The phone number for which the OTP was generated (E.164 format).
*   `otp` (string, **required**): The 6-digit OTP submitted by the user.

**Success Response (200 OK):**

```json
{
  "status": "success",
  "message": "OTP verified successfully.",
  "correlationId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Key Error Responses:**

*   `400 Bad Request`: Invalid `identifier`/`otp` format, incorrect OTP, or OTP has expired.
*   `401 Unauthorized`: Missing or invalid API Key.
*   `429 Too Many Requests`: Too many verification attempts for this identifier or API key.

---