# POST /api/v1/auth/users/{id}/roles

## Mô tả

Thay thế toàn bộ roles của user (full replace). **Chỉ Admin**.  
Sau khi cập nhật, **refresh token bị thu hồi** → user phải đăng nhập lại để JWT mới phản ánh roles mới.

---

## Request

```http
POST /api/v1/auth/users/550e8400-e29b-41d4-a716-446655440000/roles
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "roleIds": ["uuid-manager-role"]
}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | `Guid` | ID của user |

**Body fields:**

| Field | Type | Mô tả |
|---|---|---|
| `roleIds` | `Guid[]` | Danh sách role IDs thay thế hoàn toàn các roles hiện tại |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "Role assignment updated.",
    "data": {
        "id": "uuid",
        "username": "nhanvien01",
        "isAllBranches": false,
        "branchIds": [],
        "roleIds": ["uuid-manager-role"]
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Một hoặc nhiều `roleId` không tồn tại trong tenant |
| `401` | Token không hợp lệ |
| `403` | Không có role Admin |
| `404` | User không tìm thấy |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. authService.AssignRolesToUserAsync(id, request, tenantId, ct)
    ├── SELECT users WHERE id=? AND tenant_id=? AND is_deleted=false
    ├── Validate RoleIds: SELECT id FROM roles WHERE tenant_id=? AND id IN (?)
    │   → invalid IDs → ValidationException
    ├── DELETE FROM user_role_assignments WHERE user_id=?   ← full replace
    ├── INSERT user_role_assignments { user_id, role_id } cho mỗi roleId (distinct)
    ├── Thu hồi refresh token
    └── SaveChangesAsync()
3. Return 200 UserDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT + UPDATE | `id`, refresh token fields |
| `roles` | SELECT | Validate IDs thuộc tenant |
| `user_role_assignments` | DELETE + INSERT | `user_id`, `role_id`, `created_at` |
