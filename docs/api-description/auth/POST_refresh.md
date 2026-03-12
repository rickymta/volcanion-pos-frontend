# POST /api/v1/auth/refresh

## Mô tả

Đổi refresh token lấy access token + refresh token mới. **AllowAnonymous** — không cần JWT.

---

## Request

```http
POST /api/v1/auth/refresh
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "refreshToken": "base64-64-bytes..."
}
```

**Validation (`RefreshTokenRequestValidator`):**  
`refreshToken`: Required, minLength 20.

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": null,
    "data": {
        "accessToken": "eyJ...",
        "refreshToken": "new-base64-token",
        "expiresAt": "2026-03-10T10:00:00Z",
        "tokenType": "Bearer"
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail / thiếu `refreshToken` |
| `400` | Thiếu `X-Tenant-Id` |
| `403` | Refresh token không tồn tại, đã hết hạn, hoặc BCrypt.Verify thất bại (`"Invalid or expired refresh token."`) |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. authService.RefreshTokenAsync(request, tenantId, ct)
    ├── tokenId = request.RefreshToken[..12]  — prefix 12 ký tự đầu
    ├── Truy vấn O(1): SELECT * FROM users WHERE tenant_id=? AND refresh_token_id=? 
    │   AND refresh_token_expiry > now() AND is_deleted=false
    │   JOIN user_role_assignments → roles
    │   JOIN user_branches
    ├── BCrypt.Verify(refreshToken, refreshTokenHash) trên candidates nhỏ
    │   → không khớp: throw ForbiddenException 403
    └── IssueTokensAsync(user)
        ├── Tạo JWT access token mới + refresh token mới
        ├── UPDATE users: refresh_token_hash, refresh_token_expiry, refresh_token_id
        └── Return AuthTokenResponse
3. Return 200 AuthTokenResponse
```

> **Cơ chế tối ưu hóa O(1) lookup:**  
> - `refresh_token_id` (12 ký tự đầu, plain) → dùng WHERE clause → tìm nhanh trong DB  
> - `refresh_token_hash` (BCrypt đầy đủ) → BCrypt.Verify trên tập candidates nhỏ

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT (+ JOIN) | `refresh_token_id`, `refresh_token_expiry`, `is_deleted`, `tenant_id` |
| `users` | UPDATE | `refresh_token_hash`, `refresh_token_expiry`, `refresh_token_id` |
