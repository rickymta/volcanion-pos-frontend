# GET /api/v1/units/{id} — Chi tiết đơn vị tính

## Request

```
GET /api/v1/units/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn vị tính |

## Response 200

```json
{
  "data": {
    "id": "unit-uuid-1",
    "name": "Kilogram",
    "symbol": "kg",
    "isBaseUnit": true
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy đơn vị tính |
