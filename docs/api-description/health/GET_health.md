# GET /api/health — Kiểm tra trạng thái hệ thống

## Mô tả

Trả về trạng thái hoạt động hiện tại của API. Không yêu cầu xác thực.

## Request

```
GET /api/health
```

## Response 200

```json
{
  "status": "Healthy",
  "timestamp": "2026-03-10T09:00:00Z"
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `status` | string | Luôn là `"Healthy"` khi server đang chạy |
| `timestamp` | datetime | Thời gian phản hồi theo UTC |

## Lỗi

Nếu server không phản hồi hoặc trả về HTTP 5xx, hệ thống đang có sự cố.
