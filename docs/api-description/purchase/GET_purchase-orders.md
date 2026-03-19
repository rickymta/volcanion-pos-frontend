# GET /api/v1/purchase-orders — Danh sách đơn đặt hàng

## Request

```
GET /api/v1/purchase-orders
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `supplierId` | guid | Không | Lọc theo nhà cung cấp |
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
        "id": "po-uuid-1",
        "code": "PO-20260310-001",
        "supplierId": "sup-uuid-1",
        "supplierName": "Công ty TNHH ABC",
        "branchId": "branch-uuid-1",
        "orderDate": "2026-03-10T08:00:00Z",
        "status": 0,
        "note": "Đặt hàng tháng 3",
        "totalAmount": 10000000,
        "discountAmount": 500000,
        "vatAmount": 950000,
        "grandTotal": 10450000,
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
