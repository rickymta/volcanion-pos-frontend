# GET /api/v1/products/{id} — Chi tiết sản phẩm

## Mô tả

Lấy thông tin chi tiết một sản phẩm theo ID.

## Request

```
GET /api/v1/products/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID sản phẩm |

## Response 200

```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "code": "SP001",
    "name": "Cà phê Arabica",
    "description": "Cà phê hạt nguyên chất",
    "categoryId": "a1b2c3d4-...",
    "categoryName": "Cà phê",
    "baseUnitId": "u1u2u3u4-...",
    "baseUnitName": "Gram",
    "purchaseUnitId": "u5u6u7u8-...",
    "purchaseUnitName": "Kg",
    "salesUnitId": "u9uAuBuC-...",
    "salesUnitName": "Gói",
    "costPrice": 150000,
    "salePrice": 220000,
    "vatRate": 10,
    "isBatchManaged": false,
    "isExpiryManaged": true,
    "costingMethod": 0,
    "status": 0
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy sản phẩm |
