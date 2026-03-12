# GET /api/v1/purchase-returns/{id} — Chi tiết phiếu trả hàng mua

## Request

```
GET /api/v1/purchase-returns/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu trả hàng |

## Response 200

```json
{
  "data": {
    "id": "pr-uuid-1",
    "code": "PR-20260310-001",
    "goodsReceiptId": "gr-uuid-1",
    "goodsReceiptCode": "GR-20260310-001",
    "supplierId": "sup-uuid-1",
    "supplierName": "Công ty TNHH ABC",
    "returnDate": "2026-03-10T15:00:00Z",
    "reason": "Hàng không đúng quy cách",
    "status": 0,
    "totalReturnAmount": 500000,
    "isRefunded": false,
    "lines": [
      {
        "id": "prl-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-kg",
        "unitName": "Kg",
        "quantity": 5,
        "convertedQuantity": 5000,
        "unitCost": 100000,
        "returnAmount": 500000
      }
    ]
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy phiếu trả hàng |
