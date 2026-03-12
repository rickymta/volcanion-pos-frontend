# POST /api/v1/auth/login

## Mô tả

Đăng nhập bằng username + password. Trả về JWT access token + refresh token.  
Endpoint này là **AllowAnonymous** (không yêu cầu JWT) nhưng vẫn yêu cầu `X-Tenant-Id`.

> `X-Tenant-Id` **không bắt buộc** theo TenantMiddleware (nằm trong `_excludedPaths`), nhưng controller sẽ extract nó qua `RequireTenantId()` — nếu thiếu sẽ throw `AppException 400`.

---

## Request

```http
POST /api/v1/auth/login
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "username": "admin",
    "password": "Admin@123"
}
```

**Validation (`LoginRequestValidator`):**

| Field | Rule |
|---|---|
| `username` | Required, maxLength 100 |
| `password` | Required, minLength 6 |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "Login successful.",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "base64-encoded-64-byte-random-string",
        "expiresAt": "2026-03-10T09:00:00Z",
        "tokenType": "Bearer"
    }
}
```

**JWT Access Token claims:**

| Claim | Giá trị |
|---|---|
| `sub` | User ID (UUID) |
| `email` | Email của user |
| `jti` | UUID duy nhất cho token này |
| `name` (ClaimTypes.Name) | Username |
| `tenant_id` | Tenant ID |
| `full_name` | Họ tên đầy đủ |
| `all_branches` | `"true"` hoặc `"false"` |
| `role` | Tên role (có thể nhiều giá trị) |
| `branch_id` | Branch ID (có thể nhiều giá trị, nếu `IsAllBranches=false`) |

**Token TTL:** `ExpiryMinutes` (mặc định **60 phút**). Refresh token: `RefreshTokenExpiryDays` (mặc định **7 ngày**).

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Thiếu `username` hoặc `password`; validation fail |
| `400` | Thiếu `X-Tenant-Id` hoặc không phải GUID (từ `RequireTenantId()`) |
| `401` | Username không tồn tại hoặc password sai |
| `403` | Tài khoản bị inactive (`EntityStatus != Active`) |
| `403` | Tài khoản tạm khóa do đăng nhập sai ≥ 5 lần (lockout chưa hết hạn) |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() — lấy tenantId từ TenantContext
2. Lấy ipAddress từ HttpContext.Connection.RemoteIpAddress
3. Lấy userAgent từ Request.Headers.UserAgent
4. authService.LoginAsync(request, tenantId, ipAddress, userAgent, ct)
    ├── Load user: SELECT * FROM users WHERE tenant_id=? AND username=? AND is_deleted=false
    │   JOIN user_role_assignments → roles
    │   JOIN user_branches
    ├── Kiểm tra: user == null → AppException 401 (generic message)
    ├── Kiểm tra: user.Status != Active → ForbiddenException 403
    ├── Kiểm tra: LockedUntil > UtcNow → ForbiddenException 403 (còn N phút)
    ├── BCrypt.Verify(password, passwordHash):
    │   ├── false → FailedLoginAttempts++
    │   │          nếu >= 5 → LockedUntil = UtcNow + 15 phút
    │   │          UPDATE users SET failed_login_attempts, locked_until
    │   │          Ghi LoginHistory(isSuccess=false)
    │   │          AppException 401
    │   └── true → IssueTokensAsync(user)
    │              ├── jti = Guid.NewGuid()
    │              ├── GenerateAccessToken (HS256 JWT)
    │              ├── GenerateRefreshToken (64 random bytes → Base64)
    │              ├── user.FailedLoginAttempts = 0, LockedUntil = null
    │              ├── user.RefreshTokenHash = BCrypt(refreshToken)
    │              ├── user.RefreshTokenExpiry = UtcNow + 7 ngày
    │              ├── user.RefreshTokenId = refreshToken[..12]
    │              └── UPDATE users (refresh token fields, reset counters)
    └── Ghi LoginHistory(isSuccess=true, tokenId=jti)
5. Return 200 AuthTokenResponse
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT (+ JOIN) | Load user + roles + branches |
| `users` | UPDATE (login fail) | `failed_login_attempts`, `locked_until` |
| `users` | UPDATE (login thành công) | `refresh_token_hash`, `refresh_token_expiry`, `refresh_token_id`, `failed_login_attempts=0`, `locked_until=null` |
| `login_histories` | INSERT | `id`, `tenant_id`, `user_id`, `ip_address`, `user_agent`, `is_success`, `failure_reason`, `login_at`, `token_id` |
