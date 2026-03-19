# GET /api/v1/stock-transfers/{id} — Chi tiết phiếu chuyển kho

## Request

```
GET /api/v1/stock-transfers/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu chuyển kho |

## Response 200

```json
{
  "data": {
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
    "lines": [
      {
        "id": "stl-uuid-1",
        "productId": "prod-uuid-1",
        "productName": "Cà phê Arabica",
        "unitId": "unit-uuid-1",
        "unitName": "Kg",
        "quantity": 50,
        "convertedQuantity": 50000
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
| 404 | Không tìm thấy phiếu chuyển kho |
