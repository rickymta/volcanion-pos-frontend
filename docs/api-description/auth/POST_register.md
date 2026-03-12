# POST /api/v1/auth/register

## Mô tả

Tạo user mới trong tenant hiện tại. **Chỉ Admin** (`RequireAdmin` policy) mới được phép.

---

## Request

```http
POST /api/v1/auth/register
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "username": "nhanvien01",
    "email": "nv01@company.com",
    "password": "Pass@1234",
    "fullName": "Nguyễn Văn A",
    "role": "Staff",
    "isAllBranches": false
}
```

**Validation (`RegisterUserRequestValidator`):**

| Field | Rule |
|---|---|
| `username` | Required, 3–100 ký tự, chỉ `[a-zA-Z0-9_\-.]` |
| `email` | Required, định dạng email hợp lệ |
| `password` | Required, ≥ 8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 số |
| `fullName` | Required, ≤ 200 ký tự |

**`role` enum:** `Admin = 0`, `Manager = 1`, `Staff = 2`, `Viewer = 3`. Default = `Staff`.

---

## Response thành công — `201 Created`

```json
{
    "success": true,
    "message": "User registered.",
    "data": {
        "id": "uuid",
        "username": "nhanvien01",
        "email": "nv01@company.com",
        "fullName": "Nguyễn Văn A",
        "status": 1,
        "tenantId": "uuid",
        "isAllBranches": false,
        "branchIds": [],
        "roleIds": ["uuid-of-staff-role"]
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail (username/email/password/fullName) |
| `400` | Username hoặc email đã tồn tại trong tenant (`"Username or email already in use within this tenant."`) |
| `401` | Token hết hạn hoặc không hợp lệ |
| `403` | User không có role Admin |
| `429` | Vượt quá 10 requests/phút |

---

## Logic xử lý

```
1. RequireTenantId() → tenantId
2. authService.RegisterAsync(request, tenantId, ct)
    ├── Kiểm tra trùng: AnyAsync(u => u.TenantId==? && (username==? || email==?))
    │   → nếu trùng: throw ValidationException 400
    ├── Tạo User mới: Id=Guid.NewGuid(), password=BCrypt.Hash, Status=Active
    ├── INSERT users
    ├── Tìm Role theo tên request.Role.ToString() trong tenant
    │   → nếu tìm thấy: INSERT user_role_assignments { userId, roleId }
    │   → nếu role == "Admin": user.IsAllBranches = true
    ├── SaveChangesAsync()
    └── Load lại user với roles+branches → MapToDto
3. Return 201 CreatedAtAction(nameof(Me), userDto)
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `users` | SELECT (kiểm tra trùng) | `tenant_id`, `username`, `email` |
| `roles` | SELECT | `tenant_id`, `name`, `is_deleted` |
| `users` | INSERT | `id`, `tenant_id`, `username`, `email`, `password_hash`, `full_name`, `is_all_branches`, `status`, `created_at` |
| `user_role_assignments` | INSERT | `user_id`, `role_id`, `created_at` |
