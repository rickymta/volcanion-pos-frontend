# GET /api/v1/payments

## Mô tả

Danh sách phiếu thanh toán trong tenant, có phân trang và lọc theo đối tác / loại / khoảng ngày.

---

## Request

```http
GET /api/v1/payments?partnerId={guid}&partnerType=0&fromDate=2026-01-01&page=1&pageSize=20
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `partnerId` | `Guid?` | null | Lọc theo ID đối tác |
| `partnerType` | `PartnerType?` | null | `0`=Customer, `1`=Supplier |
| `fromDate` | `DateTime?` | null | Từ ngày thanh toán |
| `toDate` | `DateTime?` | null | Đến ngày thanh toán |
| `page` | `int` | 1 | Số trang |
| `pageSize` | `int` | 20 | Số bản ghi mỗi trang |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "items": [
            {
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
                "note": null,
                "invoiceId": "uuid"
            }
        ],
        "totalCount": 50,
        "page": 1,
        "pageSize": 20,
        "totalPages": 3
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ / hết hạn |
| `403` | Role không phải Admin hoặc Manager |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. authService.GetListAsync(filter, ct)
    ├── SELECT payments WHERE (filters)
    │   ORDER BY payment_date DESC
    │   SKIP + TAKE theo phân trang
    ├── Batch-load partner names (tránh N+1):
    │   ├── customerIds từ items → SELECT id, name FROM customers WHERE id IN (...)
    │   └── supplierIds từ items → SELECT id, name FROM suppliers WHERE id IN (...)
    └── Map → PaymentDto[]
2. Return 200 PagedResult<PaymentDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Mô tả |
|---|---|---|
| `payments` | SELECT + COUNT | Lọc, phân trang, ORDER BY payment_date DESC |
| `customers` | SELECT (batch) | Load tên khách hàng theo IDs |
| `suppliers` | SELECT (batch) | Load tên nhà cung cấp theo IDs |
