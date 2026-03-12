# PUT /api/v1/auth/users/{id}

## Mô tả

Cập nhật trạng thái (`status`) và flag `isAllBranches` của user. **Chỉ Admin**.  
Sau khi cập nhật, **refresh token của user bị thu hồi** → buộc user phải đăng nhập lại với quyền mới.

---

## Request

```http
PUT /api/v1/auth/users/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "status": 1,
    "isAllBranches": false
}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | `Guid` | ID của user cần cập nhật |

**Body fields:**

| Field | Type | Mô tả |
|---|---|---|
| `status` | `int` | `Active = 1`, `Inactive = 0` |
| `isAllBranches` | `bool` | Có quyền truy cập tất cả chi nhánh không |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "User updated.",
    "data": {
        "id": "uuid",
        "username": "nhanvien01",
        "status": 1,
        "isAllBranches": false,
        "tenantId": "uuid",
        "branchIds": ["uuid-branch-1"],
        "roleIds": ["uuid-staff-role"]
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Body không hợp lệ |
| `401` | Token không hợp lệ |
| `403` | Không có role Admin |
| `404` | User không tìm thấy |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. authService.UpdateUserAsync(id, request, tenantId, ct)
    ├── SELECT users WHERE id=? AND tenant_id=? AND is_deleted=false
    │   → không có: NotFoundException 404
    ├── user.Status = request.Status
    ├── user.IsAllBranches = request.IsAllBranches
    ├── Thu hồi refresh token: hash=null, expiry=null, id=null
    ├── SaveChangesAsync()
    └── GetUserByIdAsync → UserDto
3. Return 200 UserDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT | `id`, `tenant_id`, `is_deleted` |
| `users` | UPDATE | `status`, `is_all_branches`, `refresh_token_hash`, `refresh_token_expiry`, `refresh_token_id`, `updated_at` |
