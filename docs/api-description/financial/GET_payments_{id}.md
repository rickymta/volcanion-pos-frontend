# GET /api/v1/payments/{id}

## Mô tả

Lấy chi tiết một phiếu thanh toán theo ID.

---

## Request

```http
GET /api/v1/payments/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | `Guid` | ID của phiếu thanh toán |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "partnerType": 0,
        "partnerId": "uuid",
        "partnerName": "Nguyễn Văn A",
        "paymentType": 0,
        "paymentDate": "2026-03-10T08:00:00Z",
        "amount": 5000000.00,
        "referenceType": 10,
        "referenceId": "uuid",
        "paymentMethod": 0,
        "note": "Thu tiền đơn hàng tháng 3",
        "invoiceId": "uuid"
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ / hết hạn |
| `403` | Role không phải Admin hoặc Manager |
| `404` | Phiếu thanh toán không tồn tại (`"Payment not found"`) |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. paymentService.GetByIdAsync(id, ct)
    ├── SELECT payments WHERE id = ?
    │   → không có: throw NotFoundException 404
    └── Load partner name (1 query: customers hoặc suppliers)
2. Return 200 PaymentDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Điều kiện |
|---|---|---|
| `payments` | SELECT | `id = ?` |
| `customers` hoặc `suppliers` | SELECT | Load tên theo `partner_id` |
