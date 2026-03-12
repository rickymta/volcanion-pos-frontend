# POST /api/v1/auth/users/{id}/branches

## Mô tả

Thay thế toàn bộ danh sách chi nhánh được phép truy cập của user. **Chỉ Admin**.  
- Nếu `isAllBranches = true`: xóa hết `user_branches`, set `is_all_branches = true`.  
- Nếu `isAllBranches = false`: thay thế danh sách bằng `branchIds` mới.  
Sau khi cập nhật, **refresh token bị thu hồi** → user phải đăng nhập lại.

---

## Request

```http
POST /api/v1/auth/users/550e8400-e29b-41d4-a716-446655440000/branches
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "branchIds": ["uuid1", "uuid2"],
    "isAllBranches": false
}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | `Guid` | ID của user |

**Body fields:**

| Field | Type | Mô tả |
|---|---|---|
| `branchIds` | `Guid[]` | Danh sách chi nhánh được phép truy cập |
| `isAllBranches` | `bool` | Nếu `true`, xóa hết user_branches và set flag |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "Branch access updated.",
    "data": {
        "id": "uuid",
        "username": "nhanvien01",
        "isAllBranches": false,
        "branchIds": ["uuid1", "uuid2"],
        "roleIds": ["uuid-staff-role"]
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Một hoặc nhiều `branchId` không tồn tại trong tenant (`"Branch(es) not found in this tenant: uuid1, ..."`) |
| `401` | Token không hợp lệ |
| `403` | Không có role Admin |
| `404` | User không tìm thấy |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. authService.AssignBranchesAsync(id, request, tenantId, ct)
    ├── SELECT users WHERE id=? AND tenant_id=? AND is_deleted=false
    ├── Validate BranchIds: SELECT id FROM branches WHERE tenant_id=? AND id IN (?)
    │   → tìm invalid IDs → ValidationException nếu có
    ├── DELETE FROM user_branches WHERE user_id=?   ← xóa hết cũ
    ├── user.IsAllBranches = request.IsAllBranches
    ├── Nếu !isAllBranches: INSERT user_branches cho mỗi branchId
    ├── Thu hồi refresh token
    └── SaveChangesAsync()
3. Return 200 UserDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT + UPDATE | `is_all_branches`, refresh token fields |
| `branches` | SELECT | Validate IDs thuộc tenant |
| `user_branches` | DELETE + INSERT | `user_id`, `branch_id`, `created_at` |
