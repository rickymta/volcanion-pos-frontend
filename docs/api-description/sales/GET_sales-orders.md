# GET /api/v1/sales-orders — Danh sách đơn bán hàng

## Request

```
GET /api/v1/sales-orders
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `customerId` | guid | Không | Lọc theo khách hàng |
| `status` | int | Không | `0`=Draft, `1`=Confirmed, `2`=Cancelled |
| `fromDate` | datetime | Không | Từ ngày đặt (UTC) |
| `toDate` | datetime | Không | Đến ngày đặt (UTC) |
| `branchId` | guid | Không | Lọc theo chi nhánh |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
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
