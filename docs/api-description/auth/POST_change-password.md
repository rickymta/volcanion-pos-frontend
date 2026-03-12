# POST /api/v1/auth/change-password

## Mô tả

Đổi mật khẩu user hiện tại. Sau khi đổi thành công, **refresh token bị thu hồi** — user phải đăng nhập lại.

---

## Request

```http
POST /api/v1/auth/change-password
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "currentPassword": "Admin@123",
    "newPassword": "NewPass@456",
    "confirmNewPassword": "NewPass@456"
}
```

**Validation (`ChangePasswordRequestValidator`):**

| Field | Rule |
|---|---|
| `currentPassword` | Required |
| `newPassword` | Required, ≥ 8 ký tự, có chữ hoa/thường/số, khác `currentPassword` |
| `confirmNewPassword` | Phải bằng `newPassword` |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "Password changed successfully.",
    "data": null
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail |
| `400` | `newPassword != confirmNewPassword` (`"New password and confirmation do not match."`) |
| `400` | `currentPassword` sai (`"Current password is incorrect."`) |
| `401` | Token không hợp lệ |
| `404` | User không tìm thấy |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. GetCurrentUserId() → userId
2. authService.ChangePasswordAsync(userId, request, ct)
    ├── Kiểm tra newPassword == confirmNewPassword → nếu không khớp: ValidationException
    ├── SELECT users WHERE id=? AND is_deleted=false
    ├── BCrypt.Verify(currentPassword, passwordHash):
    │   → sai: throw ValidationException "Current password is incorrect."
    ├── user.PasswordHash = BCrypt.Hash(newPassword)
    ├── user.RefreshTokenHash = null    ← thu hồi session hiện tại
    ├── user.RefreshTokenExpiry = null
    ├── user.RefreshTokenId = null
    └── SaveChangesAsync()
3. Return 200 "Password changed successfully."
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT | `id`, `password_hash`, `is_deleted` |
| `users` | UPDATE | `password_hash`, `refresh_token_hash = NULL`, `refresh_token_expiry = NULL`, `refresh_token_id = NULL` |
