# GET /api/health/version — Phiên bản ứng dụng

## Mô tả

Trả về phiên bản hiện tại của ứng dụng. Không yêu cầu xác thực.

## Request

```
GET /api/health/version
```

## Response 200

```json
{
  "version": "1.0.0"
}
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `version` | string | Phiên bản semantic của ứng dụng (Major.Minor.Patch) |

## Lỗi

Không có — endpoint này chỉ đọc hằng số.
