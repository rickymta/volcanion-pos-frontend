# POST /api/v1/auth/logout

## Mô tả

Thu hồi refresh token của user hiện tại. Buộc user phải đăng nhập lại.

---

## Request

```http
POST /api/v1/auth/logout
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Body:** _(không có)_

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "Logged out successfully.",
    "data": null
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Thiếu `X-Tenant-Id` |
| `401` | Token không hợp lệ / hết hạn |
| `404` | User không tìm thấy (đã bị xóa mềm) |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. GetCurrentUserId() — lấy userId từ claim "sub"
2. authService.RevokeRefreshTokenAsync(userId, ct)
    ├── SELECT users WHERE id=? AND is_deleted=false
    │   → không có: throw NotFoundException 404
    ├── user.RefreshTokenHash = null
    ├── user.RefreshTokenExpiry = null
    ├── user.RefreshTokenId = null
    └── UPDATE users
3. Return 200 "Logged out successfully."
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT | `id`, `is_deleted` |
| `users` | UPDATE | `refresh_token_hash = NULL`, `refresh_token_expiry = NULL`, `refresh_token_id = NULL` |
