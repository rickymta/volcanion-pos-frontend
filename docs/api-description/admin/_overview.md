# AdminController — Tổng quan

> **Base route:** `POST /api/v1/admin`
> **Authentication:** JWT Bearer (required)
> **Authorization:** `[Authorize(Roles = "Admin")]`
> **Rate limiter:** `general` — 200 requests/phút (fixed window)

---

## Danh sách endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/admin/seed` | Seed dữ liệu mặc định cho tenant |

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
[4] Authentication (JWT Bearer)        — validate access token, load Claims
    ↓
[5] Authorization                      — kiểm tra Roles = "Admin"
    ↓
[6] RateLimitingMiddleware (general)   — 200 req/min fixed window
    ↓
[7] FluentValidationActionFilter       — validate request body DTO
    ↓
[8] Controller Action
```

### Chi tiết middleware

| Middleware | Hành vi |
|---|---|
| **ExceptionHandlingMiddleware** | Bắt `AppException` → 4xx; `NotFoundException` → 404; `ForbiddenException` → 403; `ValidationException` → 400 kèm `errors[]`; Exception khác → 500. Response luôn kèm `traceId`. |
| **RequestResponseLoggingMiddleware** | Log Serilog với `TraceId`, `TenantId`, `ClientIp`. Không log `Authorization`, `Cookie` header. Bỏ qua `/health`, `/swagger`, `/hangfire`. |
| **TenantMiddleware** | Đọc `X-Tenant-Id: {guid}` vào `TenantContext`. Nếu request có `Authorization` mà **không** có `X-Tenant-Id` → `400`. |
| **JWT Bearer** | Validate `iss`, `aud`, HS256 signature. Trích claims: `sub`(userId), `tenant_id`, `role`, `branch_id`, `all_branches`. Hết hạn → 401. |
| **Authorization** | Yêu cầu `role=Admin`. Không đủ quyền → 403. |
| **RateLimiter (general)** | 200 requests/phút per IP, QueueLimit = 0. Vượt quá → `429`. |
| **FluentValidationActionFilter** | Chạy validator của từng DTO. Lỗi → `400 {"success":false,"errors":[{"field":"...","message":"..."}]}`. |

---

## Format Response chuẩn

```jsonc
// Thành công
{ "success": true, "message": "...", "data": { ... }, "errors": [] }

// Lỗi
{ "success": false, "message": "...", "data": null, "errors": [{"field":"..","message":".."}], "traceId": "..." }
```
