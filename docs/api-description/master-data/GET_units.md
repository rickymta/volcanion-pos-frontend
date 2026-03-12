# GET /api/v1/units — Danh sách đơn vị tính

## Request

```
GET /api/v1/units
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `keyword` | string | Không | Tìm theo tên / ký hiệu |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "unit-uuid-1",
        "name": "Kilogram",
        "symbol": "kg",
        "isBaseUnit": true
      },
      {
        "id": "unit-uuid-2",
        "name": "Gram",
        "symbol": "g",
        "isBaseUnit": false
      }
    ],
    "totalCount": 2,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
