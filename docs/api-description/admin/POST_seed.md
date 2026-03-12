# POST /api/v1/admin/seed

## Mô tả

Seed dữ liệu mặc định (units, VAS chart of accounts, admin user, 4 system roles, role assignment) cho tenant hiện tại.  
Endpoint này là **IDEMPOTENT** — có thể gọi nhiều lần mà không tạo dữ liệu trùng.

---

## Request

```http
POST /api/v1/admin/seed
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Headers:**

| Header | Bắt buộc | Mô tả |
|---|---|---|
| `Authorization` | Có | `Bearer {access_token}` |
| `X-Tenant-Id` | Có | UUID của tenant |
| `Idempotency-Key` | Không | UUID tùy chọn — cached Redis 24h; replay trả về header `X-Idempotency-Replayed: true` |

**Body:** _(không có)_

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "Default data seeded successfully.",
    "data": null,
    "errors": []
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Thiếu hoặc không hợp lệ `X-Tenant-Id` |
| `400` | `Idempotency-Key` không phải GUID hợp lệ |
| `401` | JWT thiếu, hết hạn hoặc không hợp lệ |
| `403` | User không có role Admin |
| `429` | Vượt quá 200 requests/phút |
| `500` | Unhandled exception → `{"success":false,"message":"An unexpected error occurred.","traceId":"..."}` |

---

## Logic xử lý

```
1. TenantMiddleware → JWT → Authorize(Admin)
2. TenantId từ ITenantProvider
3. DataSeeder.SeedTenantAsync(tenantId, ct)
4. Return 200 "Default data seeded successfully."
```

### DataSeeder.SeedTenantAsync — Chi tiết

```
DataSeeder.SeedTenantAsync(tenantId, ct)
├── SeedUnitsAsync
│   └── INSERT 7 units nếu chưa có trong tenant:
│       Cái (cái, base), Hộp (hộp), Thùng (thùng),
│       Lít (L, base), Kg (kg, base), Gram (g, base), Mét (m, base)
│
├── SeedChartOfAccountsAsync
│   └── INSERT các tài khoản VAS nếu chưa có:
│       111, 112, 131, 331, 156, 511, 632, 641, 642, ...
│
├── SeedAdminUserAsync
│   └── INSERT user admin nếu chưa tồn tại:
│       username=admin, email=admin@pos.local,
│       password=BCrypt("Admin@123"), IsAllBranches=true
│
├── SeedSystemRolesAsync
│   └── INSERT 4 roles hệ thống nếu chưa có:
│       Admin, Manager, Staff, Viewer (IsSystemRole=true)
│       + INSERT role_permissions tương ứng
│
├── SeedAdminRoleAssignmentAsync
│   └── INSERT user_role_assignments nếu chưa có: admin → Admin role
│
└── db.SaveChangesAsync()
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `units` | AnyAsync check, INSERT | `id`, `tenant_id`, `name`, `symbol`, `is_base_unit`, `created_at`, `is_deleted=false` |
| `accounts` | AnyAsync check, INSERT | `id`, `tenant_id`, `code`, `name`, `description`, `normal_balance`, `account_type`, `parent_account_id`, `created_at`, `is_deleted=false` |
| `users` | AnyAsync(`username=="admin"`), INSERT | `id`, `tenant_id`, `username`, `email`, `password_hash`, `full_name`, `is_all_branches`, `status`, `created_at` |
| `roles` | AnyAsync(`IsSystemRole`), INSERT | `id`, `tenant_id`, `name`, `description`, `is_system_role`, `created_at`, `is_deleted=false` |
| `role_permissions` | INSERT | `role_id`, `permission_id`, `created_at` |
| `user_role_assignments` | AnyAsync check, INSERT | `user_id`, `role_id`, `created_at` |
