# POST /api/v1/inventory/adjust

## Mô tả

Điều chỉnh số lượng tồn kho của một sản phẩm trong một kho về **số lượng mục tiêu cụ thể**.  
Service tự tính delta: `delta = TargetQuantity − currentOnHand`.

- delta > 0 → nhập thêm hàng vào kho
- delta < 0 → xuất bớt hàng ra khỏi kho
- delta = 0 → không thay đổi, vẫn ghi transaction

**Auth:** JWT + **RequireAdmin** (chỉ Admin).

---

## Request

```http
POST /api/v1/inventory/adjust
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "productId": "uuid",
    "warehouseId": "uuid",
    "targetQuantity": 100.00,
    "unitCost": 50000.00,
    "note": "Kiểm kê định kỳ tháng 3"
}
```

**Validation (`AdjustInventoryRequestValidator`):**

| Field | Rule |
|---|---|
| `productId` | Required (NotEmpty) |
| `warehouseId` | Required (NotEmpty) |
| `targetQuantity` | GreaterThanOrEqualTo(0) |
| `unitCost` | GreaterThanOrEqualTo(0) |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Sản phẩm A",
        "warehouseId": "uuid",
        "warehouseName": "Kho Hà Nội",
        "transactionType": 2,
        "referenceType": 4,
        "referenceId": null,
        "quantity": 10.00,
        "unitCost": 50000.00,
        "batchNumber": null,
        "expiryDate": null,
        "note": "Inventory adjustment: 90 → 100",
        "createdAt": "2026-03-10T08:00:00Z"
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail |
| `400` | `QuantityOnHand` sẽ âm sau khi áp dụng delta (`"Inventory balance cannot be negative"`) |
| `401` | Token không hợp lệ |
| `403` | Không có role Admin |
| `404` | Product hoặc Warehouse không tồn tại |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
Transaction BEGIN
├── currentOnHand = SELECT quantity_on_hand FROM inventory_balances WHERE product=? AND warehouse=?
│   (= 0 nếu chưa có bản ghi)
├── delta = targetQuantity - currentOnHand
│
├── UpdateBalanceAsync(productId, warehouseId, delta):
│   ├── Nếu bản ghi chưa tồn tại: INSERT { quantity_on_hand=delta>0?delta:0, reserved=0 }
│   ├── Nếu tồn tại: balance.QuantityOnHand += delta
│   │   → âm: throw AppException 400
│   └── balance.LastUpdated = UtcNow
│
├── RecordTransactionAsync:
│   INSERT inventory_transactions {
│     transaction_type = Adjust,
│     reference_type = Adjustment,
│     quantity = delta,
│     unit_cost = request.UnitCost,
│     note = request.Note ?? "Inventory adjustment: {currentOnHand} → {targetQuantity}"
│   }
│
├── SaveChangesAsync()
Transaction COMMIT

Load product + warehouse names
Return 200 InventoryTransactionDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `inventory_balances` | SELECT | `product_id`, `warehouse_id`, `quantity_on_hand` |
| `inventory_balances` | INSERT hoặc UPDATE | `quantity_on_hand`, `last_updated` |
| `inventory_transactions` | INSERT | `id`, `product_id`, `warehouse_id`, `transaction_type=Adjust`, `reference_type=Adjustment`, `quantity=delta`, `unit_cost`, `note`, `transaction_date` |
| `products` | SELECT | Load `name` cho response |
| `warehouses` | SELECT | Load `name` cho response |
