# GET /api/v1/goods-receipts/{id} — Chi tiết phiếu nhập kho

## Mô tả

Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
GET /api/v1/goods-receipts/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu nhập kho |

## Response 200

```json
{
  "data": {
    "id": "gr-uuid-1",
    "code": "GR-20260310-001",
    "purchaseOrderId": "po-uuid-1",
    "purchaseOrderCode": "PO-20260310-001",
    "warehouseId": "wh-uuid-1",
    "warehouseName": "Kho chính",
    "receiptDate": "2026-03-10T14:00:00Z",
    "status": 0,
    "note": null,
    "lines": [
      {
        "id": "grl-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-kg",
        "unitName": "Kg",
        "quantity": 80,
        "convertedQuantity": 80000,
        "unitCost": 100000,
        "batchNumber": null,
        "expiryDate": null
      }
    ]
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
| 404 | Không tìm thấy phiếu nhập kho |
