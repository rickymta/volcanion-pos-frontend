# GET /api/v1/delivery-orders — Danh sách đơn giao hàng

## Mô tả

Trả về danh sách đơn giao hàng với lọc và phân trang. Đơn giao hàng được tạo tự động khi xác nhận hóa đơn bán hàng.

## Request

```
GET /api/v1/delivery-orders
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `salesOrderId` | guid | Không | Lọc theo đơn bán hàng |
| `status` | int | Không | `0`=Pending, `1`=InTransit, `2`=Completed, `3`=Failed, `4`=Cancelled |
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
        "id": "do-uuid-1",
        "code": "DO-20260310-001",
        "salesOrderId": "so-uuid-1",
        "salesOrderCode": "SO-20260310-001",
        "warehouseId": "wh-uuid-1",
        "warehouseName": "Kho chính",
        "deliveryDate": null,
        "status": 0,
        "shipperName": "Nguyễn Giao Hàng",
        "receiverName": "Trần Văn B",
        "receiverPhone": "0912345678",
        "deliveryAddress": "123 Lê Lợi, Q1, TP.HCM",
        "proofImageUrl": null,
        "codAmount": 500000,
        "isCodCollected": false,
        "note": null
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
