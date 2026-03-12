# Public API — Tổng quan

> **Base route:** `/api/v1/public`  
> **Auth:** Tất cả endpoint trong nhóm này là **AllowAnonymous** — không yêu cầu JWT và không yêu cầu `X-Tenant-Id`.  
> **Mục đích:** Các endpoint phục vụ client trước khi xác thực danh tính tenant/user.

---

## Danh sách endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/public/tenants/by-slug/{slug}` | Resolve tenant slug → tenantId (dùng cho subdomain-based routing) |

---

## Rate Limiting

Nhóm `public` dùng chính sách riêng biệt với `auth` và `general`:

| Chính sách | Giá trị |
|---|---|
| Window | 1 phút (fixed window) |
| Limit | 30 requests/phút per IP |
| Queue | 0 |

---

## Middleware Pipeline

```
Client Request
    ↓
[1] ExceptionHandlingMiddleware
    ↓
[2] RequestResponseLoggingMiddleware
    ↓
[3] TenantMiddleware          — bỏ qua (excluded path)
    ↓
[4] Authentication            — bỏ qua ([AllowAnonymous])
    ↓
[5] RateLimitingMiddleware (public) — 30 req/min
    ↓
[6] FluentValidationActionFilter
    ↓
[7] Controller Action
```
