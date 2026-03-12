# GET /api/v1/auth/me

## Mô tả

Trả về thông tin profile của user đang đăng nhập.

---

## Request

```http
GET /api/v1/auth/me
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Body:** _(không có)_

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "username": "admin",
        "email": "admin@pos.local",
        "fullName": "System Administrator",
        "status": 1,
        "tenantId": "uuid",
        "isAllBranches": true,
        "branchIds": [],
        "roleIds": ["uuid-admin-role"]
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `404` | User không tìm thấy (đã bị xóa mềm) |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. GetCurrentUserId() → userId
2. authService.GetCurrentUserAsync(userId, ct)
    ├── SELECT users + user_branches + user_roles + roles
    │   WHERE id=? (IgnoreQueryFilters để bao gồm soft-deleted)
    │   → nếu không có: NotFoundException 404
    └── MapToDto(user) → UserDto
3. Return 200 UserDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT + JOIN | `id`, `username`, `email`, `full_name`, `status`, `tenant_id`, `is_all_branches` |
| `user_branches` | JOIN | `user_id`, `branch_id` |
| `user_role_assignments` | JOIN | `user_id`, `role_id` |
| `roles` | JOIN | `id`, `name` |
