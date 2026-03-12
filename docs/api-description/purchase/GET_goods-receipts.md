# GET /api/v1/goods-receipts — Danh sách phiếu nhập kho

## Mô tả

Trả về danh sách phiếu nhập kho. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
GET /api/v1/goods-receipts
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `purchaseOrderId` | guid | Không | Lọc theo PO |
| `warehouseId` | guid | Không | Lọc theo kho nhập |
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
        "id": "gr-uuid-1",
        "code": "GR-20260310-001",
        "purchaseOrderId": "po-uuid-1",
        "purchaseOrderCode": "PO-20260310-001",
        "warehouseId": "wh-uuid-1",
        "warehouseName": "Kho chính",
        "receiptDate": "2026-03-10T14:00:00Z",
        "status": 0,
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
| 403 | Không đủ quyền (< Manager) |
