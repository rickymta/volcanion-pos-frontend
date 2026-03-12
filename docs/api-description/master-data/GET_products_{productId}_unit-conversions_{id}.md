# GET /api/v1/products/{productId}/unit-conversions/{id} — Chi tiết quy đổi đơn vị

## Request

```
GET /api/v1/products/{productId}/unit-conversions/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `productId` | guid | ID sản phẩm |
| `id` | guid | ID quy đổi đơn vị |

## Response 200

```json
{
  "data": {
    "id": "conv-uuid-1",
    "productId": "prod-uuid-1",
    "productName": "Cà phê Arabica",
    "fromUnitId": "unit-uuid-kg",
    "fromUnitName": "Kilogram",
    "fromUnitSymbol": "kg",
    "toUnitId": "unit-uuid-g",
    "toUnitName": "Gram",
    "toUnitSymbol": "g",
    "conversionRate": 1000
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy |
