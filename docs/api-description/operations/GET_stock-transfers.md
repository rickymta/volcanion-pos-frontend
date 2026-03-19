# GET /api/v1/stock-transfers — Danh sách phiếu chuyển kho

## Request

```
GET /api/v1/stock-transfers
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `fromWarehouseId` | guid | Không | Kho nguồn |
| `toWarehouseId` | guid | Không | Kho đích |
| `status` | int | Không | `0`=Draft, `1`=Confirmed, `2`=Cancelled |
| `fromDate` | datetime | Không | Từ ngày (UTC) |
| `toDate` | datetime | Không | Đến ngày (UTC) |
| `branchId` | guid | Không | Lọc theo chi nhánh |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "st-uuid-1",
        "code": "ST-20260310-001",
        "fromWarehouseId": "wh-uuid-1",
        "fromWarehouseName": "Kho Hà Nội",
        "toWarehouseId": "wh-uuid-2",
        "toWarehouseName": "Kho TP.HCM",
        "branchId": "branch-uuid-1",
        "transferDate": "2026-03-10T08:00:00Z",
        "status": 0,
        "note": "Điều chuyển tháng 3",
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
