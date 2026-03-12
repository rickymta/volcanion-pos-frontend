# GET /api/v1/auth/login-history

## Mô tả

Xem lịch sử đăng nhập.  
- **User thường:** chỉ xem được lịch sử của **chính mình**.  
- **Admin:** có thể xem lịch sử của bất kỳ user nào trong tenant qua query param `userId`.

---

## Request

```http
GET /api/v1/auth/login-history?page=1&pageSize=20
GET /api/v1/auth/login-history?userId=550e8400-...&page=1&pageSize=20   (Admin only)
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `userId` | `Guid?` | null | Admin: xem user khác. Non-admin: bắt buộc null hoặc bằng userId của mình |
| `page` | `int` | 1 | Số trang (1-based) |
| `pageSize` | `int` | 50 | Số bản ghi mỗi trang |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "userId": "uuid",
            "username": "admin",
            "ipAddress": "127.0.0.1",
            "userAgent": "Mozilla/5.0...",
            "isSuccess": true,
            "failureReason": null,
            "loginAt": "2026-03-10T08:00:00Z"
        }
    ]
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `403` | Non-admin user cố xem lịch sử của user khác |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. GetCurrentUserId() → currentUserId
3. targetUserId = userId ?? currentUserId
4. Nếu targetUserId != currentUserId:
    → Kiểm tra User.IsInRole("Admin") từ JWT claims
    → Không phải Admin: return 403 Forbid()
5. authService.GetLoginHistoriesAsync(tenantId, targetUserId, page, pageSize, ct)
    ├── SELECT login_histories JOIN users
    │   WHERE tenant_id=? AND is_deleted=false
    │   [AND user_id=? nếu targetUserId có]
    │   ORDER BY login_at DESC
    │   SKIP (page-1)*pageSize TAKE pageSize
    │   IgnoreQueryFilters() — bao gồm soft-deleted records
    └── Map → LoginHistoryDto[]
6. Return 200 IEnumerable<LoginHistoryDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `login_histories` | SELECT (+ JOIN users) | `tenant_id`, `user_id`, `is_deleted`, `login_at` (ORDER BY) |
| `users` | JOIN | `username` |
