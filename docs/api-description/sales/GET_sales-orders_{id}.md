# GET /api/v1/sales-orders/{id} — Chi tiết đơn bán hàng

## Request

```
GET /api/v1/sales-orders/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn bán hàng |

## Response 200

```json
{
  "data": {
    "id": "so-uuid-1",
    "code": "SO-20260310-001",
    "customerId": "cust-uuid-1",
    "customerName": "Nguyễn Văn A",
    "branchId": "branch-uuid-1",
    "orderDate": "2026-03-10T09:00:00Z",
    "status": 0,
    "note": null,
    "totalAmount": 440000,
    "discountAmount": 0,
    "vatAmount": 44000,
    "grandTotal": 484000,
    "lines": [
      {
        "id": "sol-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-1",
        "unitName": "Gói",
        "quantity": 2,
        "unitPrice": 220000,
        "discountAmount": 0,
        "vatRate": 10,
        "convertedQuantity": 2,
        "lineTotal": 484000
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
| 404 | Không tìm thấy đơn bán hàng |
