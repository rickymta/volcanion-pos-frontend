# GET /api/v1/auth/users

## Mô tả

Liệt kê tất cả users trong tenant hiện tại. **Chỉ Admin** (`RequireAdmin` policy).

---

## Request

```http
GET /api/v1/auth/users
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Body:** _(không có)_

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "username": "admin",
            "email": "admin@pos.local",
            "fullName": "System Administrator",
            "status": 1,
            "tenantId": "uuid",
            "isAllBranches": true,
            "branchIds": [],
            "roleIds": ["uuid"]
        }
    ]
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `403` | User không có role Admin |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. authService.GetUsersAsync(tenantId, ct)
    ├── SELECT users + branches + roles
    │   WHERE tenant_id=? AND is_deleted=false
    │   ORDER BY username ASC
    └── Map mỗi user → UserDto
3. Return 200 IEnumerable<UserDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT + JOIN | `tenant_id`, `is_deleted` |
| `user_branches` | JOIN | `user_id`, `branch_id` |
| `user_role_assignments` | JOIN | `user_id`, `role_id` |
| `roles` | JOIN | `id`, `name` |
