# Health API — Tổng quan

## Mô tả

Endpoint kiểm tra trạng thái hoạt động của hệ thống. Không yêu cầu xác thực — phù hợp cho load balancer, uptime monitoring, và deployment health check.

## Base URL

```
/api/health
```

> **Lưu ý:** Nhóm endpoint này **không theo phiên bản** (`/api/health`, không phải `/api/v1/health`).

## Xác thực

- **Không yêu cầu** — `[AllowAnonymous]`
- Không cần token, không cần `X-Tenant-Id`

## Danh sách endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/health` | Kiểm tra trạng thái hệ thống |
| GET | `/api/health/version` | Phiên bản ứng dụng |
