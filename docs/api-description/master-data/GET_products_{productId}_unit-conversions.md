# GET /api/v1/products/{productId}/unit-conversions — Danh sách quy đổi đơn vị

## Mô tả

Trả về tất cả quy đổi đơn vị tính của một sản phẩm.

## Request

```
GET /api/v1/products/{productId}/unit-conversions
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `productId` | guid | ID sản phẩm |

## Response 200

```json
{
  "data": [
    {
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
    }
  ],
  "success": true,
  "message": null
}
```

> `conversionRate` = số đơn vị đích tương đương với 1 đơn vị nguồn.  
> Ví dụ: 1 kg = 1000 g → `conversionRate = 1000`.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy sản phẩm |
