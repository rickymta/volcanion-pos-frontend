# GET /api/v1/invoices — Danh sách hóa đơn

## Mô tả

Trả về danh sách hóa đơn. Hóa đơn được tạo tự động khi xác nhận đơn bán hàng.

## Request

```
GET /api/v1/invoices
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `customerId` | guid | Không | Lọc theo khách hàng |
| `status` | int | Không | `0`=Draft, `1`=Confirmed, `2`=Cancelled |
| `fromDate` | datetime | Không | Từ ngày hóa đơn (UTC) |
| `toDate` | datetime | Không | Đến ngày hóa đơn (UTC) |
| `branchId` | guid | Không | Lọc theo chi nhánh |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "inv-uuid-1",
        "code": "INV-20260310-001",
        "salesOrderId": "so-uuid-1",
        "customerId": "cust-uuid-1",
        "customerName": "Nguyễn Văn A",
        "invoiceType": 0,
        "invoiceDate": "2026-03-10T09:05:00Z",
        "status": 1,
        "totalAmount": 440000,
        "discountAmount": 0,
        "vatAmount": 44000,
        "grandTotal": 484000,
        "paidAmount": 0,
        "remainingAmount": 484000,
        "paymentMethod": null,
        "note": null,
        "lines": []
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
