# GET /api/v1/purchase-returns — Danh sách phiếu trả hàng mua

## Request

```
GET /api/v1/purchase-returns
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `supplierId` | guid | Không | Lọc theo nhà cung cấp |
| `goodsReceiptId` | guid | Không | Lọc theo phiếu nhập kho gốc |
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
        "id": "pr-uuid-1",
        "code": "PR-20260310-001",
        "goodsReceiptId": "gr-uuid-1",
        "goodsReceiptCode": "GR-20260310-001",
        "supplierId": "sup-uuid-1",
        "supplierName": "Công ty TNHH ABC",
        "returnDate": "2026-03-10T15:00:00Z",
        "reason": "Hàng không đúng quy cách",
        "status": 0,
        "totalReturnAmount": 500000,
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
