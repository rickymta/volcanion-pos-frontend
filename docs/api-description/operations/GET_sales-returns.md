# GET /api/v1/sales-returns — Danh sách trả hàng bán

## Request

```
GET /api/v1/sales-returns
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `customerId` | guid | Không | Lọc theo khách hàng |
| `status` | int | Không | `0`=Draft, `1`=Confirmed, `2`=Cancelled |
| `fromDate` | datetime | Không | Từ ngày (UTC) |
| `toDate` | datetime | Không | Đến ngày (UTC) |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
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
