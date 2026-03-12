# Hướng dẫn nghiệp vụ phân quyền (RBAC)

> **Phiên bản:** 1.0 — **Cập nhật:** 2026-03-08  
> **Áp dụng cho:** POS SaaS Backend — `src/POS.Core/Authorization`, `src/POS.Services/AuthService`, `src/POS.Services/RoleService`

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Các khái niệm cốt lõi](#2-các-khái-niệm-cốt-lõi)
3. [Vai trò hệ thống (System Roles)](#3-vai-trò-hệ-thống-system-roles)
4. [Danh sách quyền hạn (Permissions)](#4-danh-sách-quyền-hạn-permissions)
5. [Phân quyền theo chi nhánh](#5-phân-quyền-theo-chi-nhánh)
6. [JWT và thông tin xác thực](#6-jwt-và-thông-tin-xác-thực)
7. [Vòng đời token](#7-vòng-đời-token)
8. [Lịch sử đăng nhập](#8-lịch-sử-đăng-nhập)
9. [Luồng nghiệp vụ](#9-luồng-nghiệp-vụ)
10. [API Reference](#10-api-reference)
11. [Quy tắc nghiệp vụ quan trọng](#11-quy-tắc-nghiệp-vụ-quan-trọng)

---

## 1. Tổng quan kiến trúc

Hệ thống phân quyền được xây dựng theo mô hình **RBAC** (Role-Based Access Control) kết hợp với **phân tầng theo chi nhánh** và **cô lập theo tenant** (multi-tenant SaaS).

```
┌─────────────────────────────────────────────────────────────┐
│                         TENANT A                            │
│                                                             │
│  ┌────────┐    có nhiều    ┌────────┐   được gán    ┌──────┐│
│  │  User  │ ──────────────>│  Role  │ ─────────────>│ Perm ││
│  └────────┘                └────────┘               └──────┘│
│      │                                                      │
│      │ truy cập           ┌────────────┐                    │
│      └───────────────────>│  Branch(s) │                    │
│                           └────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Ba lớp kiểm soát quyền truy cập

| Lớp | Mô tả | Thực thi tại |
|-----|-------|-------------|
| **Tenant** | Dữ liệu hoàn toàn cô lập giữa các tenant | EF global query filter |
| **Role / Permission** | Kiểm soát chức năng (thao tác, màn hình) | JWT claim + Policy |
| **Chi nhánh** | Kiểm soát dữ liệu theo chi nhánh | `ICurrentUserContext.HasBranchAccess()` |

---

## 2. Các khái niệm cốt lõi

### 2.1 User (Người dùng)

Mỗi tài khoản người dùng thuộc về **một tenant** và mang các thuộc tính:

| Thuộc tính | Ý nghĩa |
|-----------|---------|
| `Username` | Tên đăng nhập, duy nhất trong tenant |
| `Email` | Email, duy nhất trong tenant |
| `Role` | Vai trò hệ thống (`Admin`, `Manager`, `Staff`, `Viewer`) |
| `Status` | `Active` hoặc `Inactive` — tài khoản inactive không thể đăng nhập |
| `IsAllBranches` | `true` = truy cập mọi chi nhánh; `false` = chỉ những chi nhánh được gán |
| `UserBranches` | Danh sách chi nhánh được phép (khi `IsAllBranches = false`) |
| `UserRoles` | Danh sách vai trò tùy chỉnh được gán thêm |

### 2.2 Role (Vai trò)

Mỗi **Role** là một tập hợp quyền hạn được đặt tên, thuộc về một tenant cụ thể.

- **System Role** (`IsSystemRole = true`): được tạo tự động khi tenant đăng ký, **không thể xóa hay đổi tên**.
- **Custom Role**: do Admin tenant tạo, có thể tùy chỉnh và xóa tự do.

### 2.3 Permission (Quyền hạn)

Permission là **đơn vị nhỏ nhất của quyền truy cập**, được định nghĩa theo module và hành động.

- Toàn bộ permissions được **seed sẵn** khi khởi động hệ thống.
- Admin **không thể** tạo permission mới qua API — chỉ có thể gán permission có sẵn cho role.
- Mã quyền theo quy ước: `{module}.{action}` (ví dụ: `sales.create`, `finance.view`).

### 2.4 UserRole (Gán vai trò)

Bảng nối `UserRoles` ghi nhận **User được gán Role nào**. Một user có thể có nhiều role.

> ⚠️ Khi cập nhật vai trò, quyền hạn có hiệu lực ngay lần đăng nhập tiếp theo (refresh token bị thu hồi).

### 2.5 RolePermission (Gán quyền cho Role)

Bảng nối `RolePermissions` ghi nhận **Role có Permission nào**. Hỗ trợ nhiều-nhiều.

### 2.6 LoginHistory (Lịch sử đăng nhập)

Mọi lần đăng nhập — kể cả **thất bại** — đều được ghi lại với IP, User-Agent và lý do lỗi.

---

## 3. Vai trò hệ thống (System Roles)

Bốn vai trò sau được tạo tự động cho mọi tenant khi khởi tạo. **Không thể xóa hay đổi tên.**

| Vai trò | Phạm vi mặc định | Mô tả |
|---------|-----------------|-------|
| **Admin** | Toàn bộ tính năng + tất cả chi nhánh | Quản trị hệ thống, quản lý người dùng, cấu hình tenant |
| **Manager** | Bán hàng, mua hàng, tồn kho | Quản lý hoạt động kinh doanh hàng ngày |
| **Staff** | Bán hàng, thu ngân | Nhân viên thực hiện giao dịch POS |
| **Viewer** | Chỉ xem báo cáo | Theo dõi, kiểm tra dữ liệu, không thao tác |

### Ma trận chính sách (Policy Matrix)

| Policy | Roles được phép |
|--------|----------------|
| `RequireAdmin` | Admin |
| `RequireManager` | Admin, Manager |
| `RequireStaff` | Admin, Manager, Staff |
| *(không có policy)* | Mọi user đã xác thực |

---

## 4. Danh sách quyền hạn (Permissions)

Tổng cộng **36 permissions** được seed sẵn, phân nhóm theo module:

### Sản phẩm
| Mã quyền | Tên |
|----------|-----|
| `products.view` | Xem sản phẩm |
| `products.create` | Tạo sản phẩm |
| `products.edit` | Sửa sản phẩm |
| `products.delete` | Xóa sản phẩm |

### Danh mục
| Mã quyền | Tên |
|----------|-----|
| `catalog.categories.manage` | Quản lý danh mục |
| `catalog.units.manage` | Quản lý đơn vị đo |

### Kho hàng
| Mã quyền | Tên |
|----------|-----|
| `warehouses.view` | Xem kho hàng |
| `warehouses.manage` | Quản lý kho hàng |

### Khách hàng
| Mã quyền | Tên |
|----------|-----|
| `customers.view` | Xem khách hàng |
| `customers.manage` | Quản lý khách hàng |

### Nhà cung cấp
| Mã quyền | Tên |
|----------|-----|
| `suppliers.view` | Xem nhà cung cấp |
| `suppliers.manage` | Quản lý nhà cung cấp |

### Bán hàng
| Mã quyền | Tên |
|----------|-----|
| `sales.view` | Xem đơn bán hàng |
| `sales.create` | Tạo đơn bán hàng |
| `sales.confirm` | Xác nhận đơn bán hàng |
| `sales.return` | Trả hàng bán |
| `sales.delete` | Xóa đơn bán hàng |

### Mua hàng
| Mã quyền | Tên |
|----------|-----|
| `purchasing.view` | Xem đơn mua hàng |
| `purchasing.create` | Tạo đơn mua hàng |
| `purchasing.confirm` | Xác nhận đơn mua hàng |
| `purchasing.return` | Trả hàng mua |
| `purchasing.delete` | Xóa đơn mua hàng |

### Tồn kho
| Mã quyền | Tên |
|----------|-----|
| `inventory.view` | Xem tồn kho |
| `inventory.transfer` | Chuyển kho |
| `inventory.adjust` | Điều chỉnh tồn kho |

### Tài chính
| Mã quyền | Tên |
|----------|-----|
| `finance.view` | Xem tài chính |
| `finance.payment.manage` | Quản lý thanh toán |
| `finance.account.manage` | Quản lý tài khoản kế toán |
| `finance.journal.manage` | Quản lý sổ nhật ký |
| `finance.expense.manage` | Quản lý chi phí |

### Báo cáo
| Mã quyền | Tên |
|----------|-----|
| `reports.view` | Xem báo cáo |
| `reports.export` | Xuất báo cáo |

### Chi nhánh
| Mã quyền | Tên |
|----------|-----|
| `branches.view` | Xem chi nhánh |
| `branches.manage` | Quản lý chi nhánh |

### Người dùng
| Mã quyền | Tên |
|----------|-----|
| `users.view` | Xem người dùng |
| `users.manage` | Quản lý người dùng |

---

## 5. Phân quyền theo chi nhánh

### Nguyên tắc

Ngoài phân quyền theo chức năng (Permission), mỗi user còn bị giới hạn **dữ liệu nào được xem** dựa trên chi nhánh.

```
User.IsAllBranches = true   →  Truy cập mọi chi nhánh trong tenant
User.IsAllBranches = false  →  Chỉ truy cập các chi nhánh trong UserBranches
```

> Admin luôn có `IsAllBranches = true` — không thể thay đổi.

### Kiểm tra quyền chi nhánh trong code

```csharp
// Inject ICurrentUserContext vào service
if (!currentUser.HasBranchAccess(branchId))
    throw new ForbiddenException("Bạn không có quyền truy cập chi nhánh này.");
```

### Thông tin chi nhánh trong JWT

Khi `IsAllBranches = false`, JWT chứa các claim:

```json
{
  "all_branches": "false",
  "branch_id": "guid-chi-nhanh-1",
  "branch_id": "guid-chi-nhanh-2"
}
```

Khi `IsAllBranches = true`:

```json
{
  "all_branches": "true"
}
```

---

## 6. JWT và thông tin xác thực

### Cấu trúc Access Token

| Claim | Giá trị ví dụ | Mô tả |
|-------|--------------|-------|
| `sub` | `"3fa85f64-..."` | User ID |
| `email` | `"nv@company.vn"` | Email |
| `jti` | `"abc123..."` | JWT ID (duy nhất mỗi token) |
| `name` (ClaimTypes) | `"nguyenvan"` | Username |
| `role` (ClaimTypes) | `"Manager"` | Vai trò hệ thống |
| `tenant_id` | `"7c9e6679-..."` | Tenant ID |
| `full_name` | `"Nguyễn Văn A"` | Họ tên đầy đủ |
| `all_branches` | `"true"` / `"false"` | Có truy cập tất cả chi nhánh không |
| `branch_id` | `"guid..."` | ID từng chi nhánh (multi-value, nhiều claim cùng tên) |

### Thời hạn token

| Token | Thời hạn mặc định | Cấu hình |
|-------|-------------------|---------|
| Access Token | 60 phút | `JwtSettings:ExpiryMinutes` |
| Refresh Token | 7 ngày | `JwtSettings:RefreshTokenExpiryDays` |

> Refresh token được hash bằng **BCrypt** trước khi lưu vào database — không ai có thể đọc được giá trị gốc.

---

## 7. Vòng đời token

```
┌──────────┐   POST /api/auth/login    ┌──────────────────────┐
│  Client  │ ─────────────────────────>│ Trả về access_token  │
│          │                           │ + refresh_token       │
│          │   POST /api/auth/refresh  └──────────────────────┘
│          │ ─────────────────────────> Cấp cặp token mới
│          │
│          │   POST /api/auth/logout
│          │ ─────────────────────────> Thu hồi refresh_token
└──────────┘
```

### Khi nào refresh token bị thu hồi tự động?

Hệ thống **tự động thu hồi refresh token** (buộc đăng nhập lại) trong các trường hợp sau:

| Tình huống | Lý do |
|-----------|-------|
| Đổi mật khẩu (`POST /api/auth/change-password`) | Token cũ không còn hợp lệ sau khi đổi mật khẩu |
| Admin cập nhật Role/Status (`PUT /api/auth/users/{id}`) | Quyền mới có hiệu lực ngay lần đăng nhập tiếp |
| Admin gán lại chi nhánh (`POST /api/auth/users/{id}/branches`) | JWT phải được tái tạo để cập nhật `branch_id` mới |
| Admin gán lại Role tùy chỉnh (`POST /api/auth/users/{id}/roles`) | Đảm bảo JWT phản ánh đúng quyền hạn mới nhất |
| Đăng xuất (`POST /api/auth/logout`) | Người dùng yêu cầu thoát phiên |

---

## 8. Lịch sử đăng nhập

Mọi lần đăng nhập đều được ghi lại trong bảng `LoginHistories`, bao gồm cả **đăng nhập thất bại**.

### Thông tin được lưu

| Trường | Mô tả |
|--------|-------|
| `UserId` | ID người dùng |
| `IpAddress` | Địa chỉ IP của client |
| `UserAgent` | Chuỗi User-Agent (trình duyệt, app) |
| `IsSuccess` | `true` = thành công, `false` = thất bại |
| `FailureReason` | Lý do cụ thể nếu thất bại |
| `LoginAt` | Thời điểm UTC |

### Các lý do thất bại được ghi nhận

| Lý do | Mô tả |
|-------|-------|
| `"Tài khoản không tồn tại."` | Username không tìm thấy trong tenant |
| `"Tài khoản đã bị vô hiệu hoá."` | User.Status = Inactive |
| `"Mật khẩu không đúng."` | Password hash không khớp |

> Lưu ý: Ghi lịch sử được thực hiện trong khối `try/catch` riêng — lỗi khi ghi lịch sử **không làm gián đoạn** luồng đăng nhập.

### Xem lịch sử đăng nhập

- **User thường**: Chỉ xem lịch sử của chính mình.
- **Admin**: Có thể xem lịch sử của bất kỳ user nào trong tenant bằng cách truyền `?userId={id}`.

---

## 9. Luồng nghiệp vụ

### 9.1 Khởi tạo tenant mới

```
Tenant đăng ký
    │
    ├─> Seed 4 System Roles:  Admin / Manager / Staff / Viewer
    ├─> Seed Admin user:      username=admin, password=Admin@123
    └─> Seed 36 Permissions:  (chạy một lần toàn hệ thống — SeedGlobalAsync)
```

> ⚠️ **Yêu cầu bảo mật:** Đổi mật khẩu admin mặc định ngay sau khi khởi tạo tenant.

### 9.2 Tạo và cấu hình vai trò tùy chỉnh

```
Admin đăng nhập
    │
    ├─> GET  /api/roles/permissions          ← Lấy danh sách 36 permissions
    ├─> POST /api/roles                      ← Tạo role mới (VD: "Kế toán")
    └─> PUT  /api/roles/{id}/permissions     ← Gán permissions cho role
              Body: { "permissionIds": ["guid1", "guid2", ...] }
```

### 9.3 Thêm người dùng và gán quyền

```
Admin đăng nhập
    │
    ├─> POST /api/auth/register              ← Tạo user mới
    │         Body: { username, email, password, fullName, role }
    │
    ├─> POST /api/auth/users/{id}/roles      ← Gán role tùy chỉnh
    │         Body: { "roleIds": ["guid-role-ke-toan"] }
    │
    ├─> POST /api/auth/users/{id}/branches   ← Giới hạn chi nhánh truy cập
    │         Body: { "branchIds": ["guid-cn1"], "isAllBranches": false }
    │
    └─> (User nhận thông báo, đăng nhập lần đầu và đổi mật khẩu)
```

### 9.4 Thay đổi quyền user đang hoạt động

```
Admin cập nhật role hoặc chi nhánh
    │
    ├─> Hệ thống tự động thu hồi refresh token của user đó
    │
    └─> Lần gọi API tiếp theo của user sẽ nhận 401
              > Client phải gọi POST /api/auth/refresh
              > Nếu refresh token cũng hết hạn → buộc đăng nhập lại
              > JWT mới chứa quyền, chi nhánh mới nhất
```

### 9.5 Luồng đăng nhập đầy đủ

```
Client                          API Server                    Database
  │                                │                              │
  │  POST /api/auth/login           │                              │
  │  Header: X-Tenant-Id: {id}     │                              │
  │ ─────────────────────────────> │                              │
  │                                │─── Tìm user theo tenant ────>│
  │                                │◀── User found ───────────────│
  │                                │                              │
  │                                │─── Kiểm tra password ────────│
  │                                │─── Ghi LoginHistory ─────────>│
  │                                │                              │
  │                                │─── Tạo JWT (access + refresh)│
  │                                │─── Lưu RefreshTokenHash ─────>│
  │◀─────────────────────────────── │                              │
  │  { accessToken, refreshToken }  │                              │
```

---

## 10. API Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Auth yêu cầu | Mô tả |
|--------|----------|-------------|-------|
| `POST` | `/api/auth/login` | Không | Đăng nhập, nhận JWT |
| `POST` | `/api/auth/refresh` | Không | Gia hạn access token |
| `POST` | `/api/auth/logout` | Đã đăng nhập | Thu hồi refresh token |
| `POST` | `/api/auth/change-password` | Đã đăng nhập | Đổi mật khẩu |
| `GET` | `/api/auth/me` | Đã đăng nhập | Xem thông tin bản thân |
| `GET` | `/api/auth/login-history` | Đã đăng nhập | Xem lịch sử đăng nhập |

### Quản lý người dùng (`/api/auth` — Admin only)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/api/auth/register` | Tạo user mới |
| `GET` | `/api/auth/users` | Danh sách user trong tenant |
| `GET` | `/api/auth/users/{id}` | Chi tiết một user |
| `PUT` | `/api/auth/users/{id}` | Cập nhật role/status/IsAllBranches |
| `POST` | `/api/auth/users/{id}/branches` | Gán chi nhánh cho user |
| `POST` | `/api/auth/users/{id}/roles` | Gán vai trò tùy chỉnh cho user |

### Quản lý vai trò (`/api/roles` — Admin only)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/roles` | Danh sách tất cả roles của tenant |
| `GET` | `/api/roles/{id}` | Chi tiết một role (kèm permissions) |
| `POST` | `/api/roles` | Tạo role tùy chỉnh mới |
| `PUT` | `/api/roles/{id}` | Sửa tên/mô tả role (không áp dụng system role) |
| `DELETE` | `/api/roles/{id}` | Xóa role (không áp dụng system role) |
| `PUT` | `/api/roles/{id}/permissions` | Gán permissions cho role (thay thế toàn bộ) |
| `GET` | `/api/roles/permissions` | Danh sách tất cả permissions trong hệ thống |

### Request/Response mẫu

#### Đăng nhập

```http
POST /api/auth/login
X-Tenant-Id: 7c9e6679-7425-40de-944b-e07fc1f90ae7
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123"
}
```

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "base64-encoded-token",
    "expiresAt": "2026-03-08T10:00:00Z",
    "tokenType": "Bearer"
  }
}
```

#### Tạo role tùy chỉnh

```http
POST /api/roles
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "name": "Kế toán",
  "description": "Quản lý tài chính và sổ sách kế toán"
}
```

#### Gán permissions cho role

```http
PUT /api/roles/{roleId}/permissions
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "permissionIds": [
    "guid-of-finance.view",
    "guid-of-finance.payment.manage",
    "guid-of-finance.journal.manage",
    "guid-of-reports.view",
    "guid-of-reports.export"
  ]
}
```

> **Lưu ý:** Gán permissions luôn **thay thế toàn bộ** (full replace), không phải append. Nếu muốn giữ permissions cũ, cần truyền lại toàn bộ danh sách bao gồm cả permissions cũ.

#### Gán chi nhánh cho user

```http
POST /api/auth/users/{userId}/branches
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "branchIds": [
    "guid-chi-nhanh-ha-noi",
    "guid-chi-nhanh-hcm"
  ],
  "isAllBranches": false
}
```

---

## 11. Quy tắc nghiệp vụ quan trọng

### ✅ Bắt buộc

1. **Mọi request đều phải gửi header `X-Tenant-Id`** — dù là đăng nhập hay không cần xác thực.
2. **Access token hết hạn** → gọi `POST /api/auth/refresh` trước khi gọi lại API.
3. **Khi nhận 401 sau refresh** → buộc người dùng đăng nhập lại (quyền đã thay đổi).
4. **Permissions là read-only** — không thể tạo/sửa/xóa permission qua API.

### 🚫 Giới hạn

| Hành động | Giới hạn |
|-----------|---------|
| Xóa System Role | **Không cho phép** — bảo vệ tính toàn vẹn hệ thống |
| Sửa System Role | **Không cho phép** — tên/mô tả cố định |
| User inactive đăng nhập | **403 Forbidden** — kèm thông báo liên hệ admin |
| Admin truy cập tenant khác | **Không được** — dữ liệu hoàn toàn cô lập theo tenant |
| Viewer thao tác dữ liệu | **403 Forbidden** — chỉ xem báo cáo đọc-công khai |

### 📋 Checklist triển khai tenant mới

- [ ] Chạy `DataSeeder.SeedGlobalAsync()` một lần khi deploy (seed Permissions)
- [ ] Chạy `DataSeeder.SeedTenantAsync(tenantId)` khi tenant đăng ký (seed Roles + Admin user)
- [ ] Admin tenant đổi mật khẩu mặc định `Admin@123` ngay lập tức
- [ ] Cấu hình `JwtSettings:SecretKey` đủ mạnh (tối thiểu 32 ký tự)
- [ ] Xem xét điều chỉnh `ExpiryMinutes` và `RefreshTokenExpiryDays` theo yêu cầu bảo mật

---

## Sơ đồ quan hệ bảng (ERD)

```
Users (TenantEntity)
 ├── UserBranches ──────────> Branches
 ├── UserRoles ─────────────> Roles (TenantEntity)
 │                               └── RolePermissions ──> Permissions (global)
 └── LoginHistories
```

### Bảng trong database

| Bảng | Loại | Mô tả |
|------|------|-------|
| `users` | TenantEntity | Tài khoản người dùng |
| `UserBranches` | Join table | User ↔ Branch |
| `Roles` | TenantEntity | Vai trò trong tenant |
| `Permissions` | BaseEntity (global) | Quyền hạn toàn hệ thống |
| `RolePermissions` | Join table | Role ↔ Permission |
| `UserRoles` | Join table | User ↔ Role |
| `LoginHistories` | TenantEntity | Lịch sử đăng nhập |
