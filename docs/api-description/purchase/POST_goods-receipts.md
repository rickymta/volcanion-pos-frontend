# POST /api/v1/goods-receipts — Tạo phiếu nhập kho

## Mô tả

Tạo phiếu nhập kho ở trạng thái **Draft** dựa trên 1 PO đã Confirmed.  
Yêu cầu quyền **Manager** hoặc **Admin**.

> Có thể nhập một phần (số lượng < PO). Nhiều GoodsReceipt có thể liên kết 1 PO.

## Request

```
POST /api/v1/goods-receipts
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "purchaseOrderId": "po-uuid-1",
  "warehouseId": "wh-uuid-1",
  "receiptDate": "2026-03-10T14:00:00Z",
  "note": "Nhập lô 1",
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 80,
      "unitCost": 100000,
      "batchNumber": null,
      "expiryDate": null
    }
  ]
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `purchaseOrderId` | Bắt buộc |
| `warehouseId` | Bắt buộc |
| `receiptDate` | Bắt buộc |
| `note` | Tối đa 500 ký tự (nếu có) |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0 |
| `lines[].unitCost` | ≥ 0 |
| `lines[].batchNumber` | Tối đa 50 ký tự (nếu có) |
| `lines[].expiryDate` | Phải là ngày tương lai (nếu có) |

## Response 201

Trả về `GoodsReceiptDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ / PO chưa Confirmed |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
