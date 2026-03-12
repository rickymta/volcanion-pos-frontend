# AuthController — Tổng quan

> **Base route:** `/api/v1/auth`
> **Rate limiter:** `auth` — 10 requests/phút (fixed window) — áp dụng toàn bộ controller
> **Lưu ý:** Một số endpoint yêu cầu JWT + X-Tenant-Id; một số endpoint `[AllowAnonymous]`

---

## Danh sách endpoints

| Method | Endpoint | Auth | Policy | Mô tả |
|---|---|---|---|---|
| `POST` | `/auth/login` | AllowAnonymous | — | Đăng nhập, nhận JWT + refresh token |
| `POST` | `/auth/register` | JWT | RequireAdmin | Tạo user mới |
| `POST` | `/auth/refresh` | AllowAnonymous | — | Làm mới access token |
| `POST` | `/auth/logout` | JWT | Authorize | Thu hồi refresh token |
| `POST` | `/auth/change-password` | JWT | Authorize | Đổi mật khẩu |
| `GET` | `/auth/me` | JWT | Authorize | Lấy profile hiện tại |
| `GET` | `/auth/users` | JWT | RequireAdmin | Liệt kê users trong tenant |
| `GET` | `/auth/users/{id}` | JWT | RequireAdmin | Lấy user theo ID |
| `PUT` | `/auth/users/{id}` | JWT | RequireAdmin | Cập nhật user |
| `POST` | `/auth/users/{id}/branches` | JWT | RequireAdmin | Gán chi nhánh cho user |
| `POST` | `/auth/users/{id}/roles` | JWT | RequireAdmin | Gán roles cho user |
| `GET` | `/auth/login-history` | JWT | Authorize (+ self-only) | Xem lịch sử đăng nhập |

---

## Middleware Pipeline

```
Client Request
    ↓
[1] ExceptionHandlingMiddleware        — bắt mọi exception, trả ApiResponse chuẩn
    ↓
[2] RequestResponseLoggingMiddleware   — log method, path, status, elapsed, body (JSON ≤ 4 096 bytes)
    ↓
[3] TenantMiddleware                   — đọc X-Tenant-Id header → TenantContext
    ↓
[4] Authentication (JWT Bearer)        — validate token nếu có Authorization header
    ↓
[5] Authorization                      — kiểm tra policy/role (tùy endpoint)
    ↓
[6] RateLimitingMiddleware (auth)       — 10 req/min fixed window
    ↓
[7] FluentValidationActionFilter       — validate request body DTO
    ↓
[8] Controller Action
```

### Chi tiết middleware

| Middleware | Hành vi |
|---|---|
| **ExceptionHandlingMiddleware** | Bắt `AppException` → 4xx; `NotFoundException` → 404; `ForbiddenException` → 403; `ValidationException` → 400 kèm `errors[]`; Exception khác → 500. Response luôn kèm `traceId`. |
| **RequestResponseLoggingMiddleware** | Log Serilog với `TraceId`, `TenantId`, `ClientIp`. Không log `Authorization`, `Cookie` header. |
| **TenantMiddleware** | Đọc `X-Tenant-Id: {guid}` vào `TenantContext`. Nếu request có `Authorization` mà **không** có `X-Tenant-Id` và đường dẫn không nằm trong `_excludedPaths` → `400`. Các endpoint **excluded**: `/api/auth/login`, `/api/auth/refresh`. |
| **JWT Bearer** | Validate `iss`, `aud`, HS256 signature. Trích claims: `sub`(userId), `tenant_id`, `role[]`, `branch_id[]`, `all_branches`. Hết hạn → 401. |
| **RateLimiter (auth)** | 10 requests/phút per IP, QueueLimit = 0. Vượt quá → `429`. Chặt hơn `general` (200/phút) để ngăn brute-force. |
| **FluentValidationActionFilter** | Chạy validator của từng DTO. Lỗi → `400 {"success":false,"errors":[{"field":"...","message":"..."}]}`. |
| **CurrentUserContext** | Implement `ICurrentUserContext`. Đọc claims từ `HttpContext.User`: `UserId`, `TenantId`, `Role`, `IsAllBranches`, `BranchIds[]`. |

---

## Format Response chuẩn

```jsonc
// Thành công
{ "success": true, "message": "...", "data": { ... }, "errors": [] }

// Lỗi
{ "success": false, "message": "...", "data": null, "errors": [{"field":"..","message":".."}], "traceId": "..." }
```

---

## Cơ chế bảo mật quan trọng

### Brute-force protection
- Sai mật khẩu ≥ **5 lần** liên tiếp → khóa tài khoản **15 phút**
- Columns: `failed_login_attempts`, `locked_until` trên bảng `users`

### Refresh token — O(1) lookup + BCrypt security
- `refresh_token_id` (12 ký tự đầu, plain) → dùng WHERE → tìm nhanh O(1)
- `refresh_token_hash` (BCrypt đầy đủ) → verify trên số lượng ít candidates

### Token revocation khi thay đổi quyền
Các thao tác sau tự động thu hồi refresh token:

| Endpoint | Lý do |
|---|---|
| `POST /logout` | Xóa session chủ động |
| `POST /change-password` | Bảo mật sau khi đổi mật khẩu |
| `PUT /users/{id}` | Admin thay đổi status/isAllBranches |
| `POST /users/{id}/branches` | Quyền chi nhánh thay đổi |
| `POST /users/{id}/roles` | Role thay đổi |

### JWT không stateful — invalidation qua revoke refresh
Access token JWT không thể invalidate sớm trước khi hết hạn (không có denylist). Khi refresh token bị thu hồi, user không thể lấy access token mới → access token cũ hết hạn sau tối đa **60 phút**.
