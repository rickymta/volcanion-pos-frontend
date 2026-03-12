# GET /api/v1/purchase-orders/{id} — Chi tiết đơn đặt hàng

## Request

```
GET /api/v1/purchase-orders/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn đặt hàng |

## Response 200

```json
{
  "data": {
    "id": "po-uuid-1",
    "code": "PO-20260310-001",
    "supplierId": "sup-uuid-1",
    "supplierName": "Công ty TNHH ABC",
    "orderDate": "2026-03-10T08:00:00Z",
    "status": 0,
    "note": "Đặt hàng tháng 3",
    "totalAmount": 10000000,
    "discountAmount": 500000,
    "vatAmount": 950000,
    "grandTotal": 10450000,
    "lines": [
      {
        "id": "pol-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-kg",
        "unitName": "Kg",
        "quantity": 100,
        "unitPrice": 100000,
        "vatRate": 10,
        "convertedQuantity": 100000,
        "lineTotal": 11000000
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
| 404 | Không tìm thấy đơn đặt hàng |
