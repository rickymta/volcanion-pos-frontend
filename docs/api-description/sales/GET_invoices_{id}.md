# GET /api/v1/invoices/{id} — Chi tiết hóa đơn

## Mô tả

Trả về thông tin chi tiết một hóa đơn bao gồm các dòng hàng.

## Request

```
GET /api/v1/invoices/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | guid | Có | ID hóa đơn |

## Response 200

```json
{
  "data": {
    "id": "inv-uuid-1",
    "code": "INV-20260310-001",
    "salesOrderId": "so-uuid-1",
    "customerId": "cust-uuid-1",
    "customerName": "Nguyễn Văn A",
    "invoiceType": 1,
    "invoiceDate": "2026-03-10T09:05:00Z",
    "status": 1,
    "totalAmount": 440000,
    "discountAmount": 0,
    "vatAmount": 44000,
    "grandTotal": 484000,
    "paidAmount": 200000,
    "remainingAmount": 284000,
    "paymentMethod": "Cash",
    "note": "Giao hàng buổi sáng",
    "lines": [
      {
        "id": "line-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê phin 500g",
        "unitId": "unit-uuid-1",
        "unitName": "Túi",
        "quantity": 2,
        "unitPrice": 220000,
        "discountAmount": 0,
        "vatRate": 10,
        "lineTotal": 440000
      }
    ]
  },
  "success": true,
  "message": null
}
```

## Các giá trị invoiceType

| Giá trị | Tên | Mô tả |
|---|---|---|
| `0` | Retail | Hóa đơn bán lẻ thông thường, không cần MST |
| `1` | Vat | Hóa đơn đỏ (VAT invoice) |
| `2` | Electronic | Hóa đơn điện tử theo quy định Bộ Tài chính |

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy hóa đơn |
