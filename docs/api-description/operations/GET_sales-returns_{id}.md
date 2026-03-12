# GET /api/v1/sales-returns/{id} — Chi tiết trả hàng bán

## Request

```
GET /api/v1/sales-returns/{id}
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
    "id": "sr-uuid-1",
    "code": "SR-20260310-001",
    "invoiceId": "inv-uuid-1",
    "invoiceCode": "INV-20260310-001",
    "customerId": "cust-uuid-1",
    "customerName": "Nguyễn Văn A",
    "returnDate": "2026-03-10T10:00:00Z",
    "reason": "Hàng lỗi",
    "status": 0,
    "totalRefundAmount": 220000,
    "isRefunded": false,
    "lines": [
      {
        "id": "srl-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-1",
        "unitName": "Gói",
        "quantity": 1,
        "convertedQuantity": 1,
        "unitPrice": 220000,
        "refundAmount": 220000
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
