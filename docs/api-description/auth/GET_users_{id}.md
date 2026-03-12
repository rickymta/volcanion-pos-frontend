# GET /api/v1/auth/users/{id}

## Mô tả

Lấy thông tin chi tiết của 1 user theo ID. **Chỉ Admin** (`RequireAdmin` policy).

---

## Request

```http
GET /api/v1/auth/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | `Guid` | ID của user cần lấy |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "username": "nhanvien01",
        "email": "nv01@company.com",
        "fullName": "Nguyễn Văn A",
        "status": 1,
        "tenantId": "uuid",
        "isAllBranches": false,
        "branchIds": ["uuid-branch-1"],
        "roleIds": ["uuid-staff-role"]
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `403` | Không có role Admin |
| `404` | User không tìm thấy trong tenant (`"User not found."`) |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. authService.GetUserByIdAsync(id, tenantId, ct)
    ├── SELECT users + user_branches + user_role_assignments + roles
    │   WHERE id=? AND tenant_id=? AND is_deleted=false
    │   → không có: throw NotFoundException 404
    └── MapToDto(user) → UserDto
3. Return 200 UserDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Điều kiện |
|---|---|---|
| `users` | SELECT + JOIN | `id=?`, `tenant_id=?`, `is_deleted=false` |
| `user_branches` | JOIN | `user_id` |
| `user_role_assignments` | JOIN | `user_id` |
| `roles` | JOIN | `id`, `name` |
