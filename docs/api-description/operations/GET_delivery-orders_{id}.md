# GET /api/v1/delivery-orders/{id} — Chi tiết đơn giao hàng

## Request

```
GET /api/v1/delivery-orders/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn giao hàng |

## Response 200

```json
{
  "data": {
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
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy đơn giao hàng |
