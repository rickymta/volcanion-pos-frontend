# Luồng Xác thực & Phân quyền (Auth & RBAC)

> **Liên quan:** [../api-description/auth/](../api-description/auth/) · [../api-description/role/](../api-description/role/) · [../api-description/admin/](../api-description/admin/)  
> **Database:** [../database/auth/](../database/auth/) · [../database/master-data/Users.md](../database/master-data/Users.md)

---

## 1. Tổng quan

Hệ thống sử dụng **JWT Bearer** với cặp token `AccessToken` (short-lived) + `RefreshToken` (long-lived).  
Phân quyền dựa trên **RBAC** (Role-Based Access Control): mỗi `User` có nhiều `Role`, mỗi `Role` có nhiều `Permission`.

---

## 2. Luồng đăng ký Tenant mới

```
Client                           API
  │                               │
  ├─► POST /api/v1/auth/register ─┤
  │   Body:                       │  1. Kiểm tra Email chưa tồn tại
  │   { tenantName, ownerName,    │  2. Hash password (BCrypt)
  │     email, password }         │  3. Tạo Tenant record
  │                               │  4. Tạo User (IsAdmin=true)
  │ ◄──────────────────────────── │  5. Gán role Admin mặc định
  │   201 Created                 │
  │   { userId, tenantId }        │
```

**API:** [`POST /api/v1/auth/register`](../api-description/auth/POST_register.md)  
**Bảng ghi:** `Tenants`, `Users`, `Roles` (Admin default), `UserRoles`

---

## 3. Luồng đăng nhập

```
Client                           API
  │                               │
  ├─► POST /api/v1/auth/login ───►│
  │   { email, password,          │  1. Tìm User theo email + TenantId
  │     tenantId }                │  2. Verify BCrypt password
  │                               │  3. Load UserRoles + Permissions
  │                               │  4. Tạo AccessToken (JWT, 15 phút)
  │                               │     Claims: userId, tenantId, roles, permissions
  │                               │  5. Tạo RefreshToken (GUID, 7 ngày)
  │                               │     Lưu vào DB (hashed)
  │                               │  6. Append LoginHistory record
  │ ◄──────────────────────────── │
  │   200 OK                      │
  │   { accessToken,              │
  │     refreshToken,             │
  │     expiresAt }               │
```

**API:** [`POST /api/v1/auth/login`](../api-description/auth/POST_login.md)  
**Bảng ghi:** `LoginHistories` (append-only), `RefreshTokens`

### AccessToken Claims

| Claim | Giá trị |
|---|---|
| `sub` | UserId |
| `tenant_id` | TenantId |
| `email` | Email |
| `roles` | Danh sách role names |
| `permissions` | Danh sách permission codes |
| `exp` | now + 15 phút |

---

## 4. Luồng làm mới token

```
Client                           API
  │                               │
  ├─► POST /api/v1/auth/refresh ─►│
  │   { refreshToken }            │  1. Find RefreshToken trong DB
  │                               │  2. Kiểm tra: chưa hết hạn, chưa revoke
  │                               │  3. Revoke token cũ
  │                               │  4. Tạo AccessToken mới
  │                               │  5. Tạo RefreshToken mới
  │ ◄──────────────────────────── │
  │   200 OK { accessToken,       │
  │            refreshToken }     │
```

**API:** [`POST /api/v1/auth/refresh`](../api-description/auth/POST_refresh.md)

---

## 5. Luồng đăng xuất

```
Client                           API
  │                               │
  ├─► POST /api/v1/auth/logout ──►│  [Yêu cầu AccessToken hợp lệ]
  │   { refreshToken }            │  1. Revoke RefreshToken (IsRevoked=true)
  │                               │  2. AccessToken hết hiệu lực tự nhiên (không blacklist)
  │ ◄──────────────────────────── │
  │   204 No Content              │
```

**API:** [`POST /api/v1/auth/logout`](../api-description/auth/POST_logout.md)

---

## 6. Luồng đổi mật khẩu

```
Client                           API
  │                               │
  ├─► POST /auth/change-password ►│  [Yêu cầu AccessToken hợp lệ]
  │   { currentPassword,          │  1. Verify currentPassword
  │     newPassword }             │  2. Hash newPassword
  │                               │  3. Update User.PasswordHash
  │                               │  4. Revoke tất cả RefreshTokens của user
  │ ◄──────────────────────────── │
  │   204 No Content              │
```

**API:** [`POST /api/v1/auth/change-password`](../api-description/auth/POST_change-password.md)

---

## 7. Lấy thông tin tài khoản hiện tại

```
Client                           API
  │                               │
  ├─► GET /api/v1/auth/me ───────►│  [Yêu cầu AccessToken hợp lệ]
  │                               │  1. Đọc UserId từ JWT Claims
  │                               │  2. Load User + Roles + Permissions
  │ ◄──────────────────────────── │
  │   200 OK                      │
  │   { id, name, email, roles,   │
  │     permissions, branches }   │
```

**API:** [`GET /api/v1/auth/me`](../api-description/auth/GET_me.md)

---

## 8. Quản lý Role & Permission (Admin)

### 8.1 Tạo role mới

```
POST /api/v1/roles
Body: { name, description }
→ Role record

PUT /api/v1/roles/{id}/permissions
Body: { permissionIds: [1, 2, 3] }
→ REPLACE toàn bộ RolePermissions (xóa cũ, insert mới)
```

**API:** [`POST /api/v1/roles`](../api-description/role/POST_roles.md) · [`PUT /api/v1/roles/{id}/permissions`](../api-description/role/PUT_roles_{id}_permissions.md)

### 8.2 Gán role cho User

```
POST /api/v1/admin/users/{id}/roles
Body: { roleIds: [1, 2] }
→ REPLACE toàn bộ UserRoles của user
→ Lần đăng nhập tiếp theo, token mới phản ánh role mới
```

**API:** [`POST /api/v1/admin/users/{id}/roles`](../api-description/admin/POST_users_{id}_roles.md)

### 8.3 Gán chi nhánh cho User

```
POST /api/v1/admin/users/{id}/branches
Body: { branchIds: [1, 2] }
→ REPLACE toàn bộ UserBranches
→ User chỉ truy cập dữ liệu của branch được gán
```

**API:** [`POST /api/v1/admin/users/{id}/branches`](../api-description/admin/POST_users_{id}_branches.md)

---

## 9. Cơ chế bảo mật API

### Policy ASP.NET Core

| Policy | Điều kiện |
|---|---|
| `RequireAdmin` | Claim `roles` chứa `"Admin"` |
| `RequireManager` | Claim `roles` chứa `"Admin"` hoặc `"Manager"` |
| _(Default)_ | AccessToken hợp lệ + TenantId khớp |

### Middleware RBAC

```
Request → [JWT Middleware] → Extract Claims
        → [Tenant Middleware] → Set TenantId context
        → [Authorization] → Check Policy
        → Controller Action
```

---

## 10. Lịch sử đăng nhập

```
GET /api/v1/auth/login-history
→ Danh sách LoginHistories của user hiện tại
→ Sắp xếp mới nhất trước
→ Bao gồm: IpAddress, UserAgent, CreatedAt
```

**API:** [`GET /api/v1/auth/login-history`](../api-description/auth/GET_login-history.md)  
**Bảng:** [`LoginHistories`](../database/auth/LoginHistories.md) — append-only, không update/delete

---

## 11. Bảng dữ liệu liên quan

| Bảng | Vai trò |
|---|---|
| [`Users`](../database/master-data/Users.md) | Tài khoản người dùng |
| [`Roles`](../database/auth/Roles.md) | Nhóm quyền |
| [`Permissions`](../database/auth/Permissions.md) | Quyền hạn cụ thể |
| [`RolePermissions`](../database/auth/RolePermissions.md) | Ánh xạ Role ↔ Permission |
| [`UserRoles`](../database/auth/UserRoles.md) | Ánh xạ User ↔ Role |
| [`LoginHistories`](../database/auth/LoginHistories.md) | Lịch sử đăng nhập (audit) |
