# POST /api/v1/inventory/opening-balance

## Mô tả

Nhập tồn kho **đầu kỳ** (opening balance) cho một sản phẩm trong một kho.  
Thao tác này **ghi đè tuyệt đối** số lượng hiện tại (không tính delta) và ghi một bản ghi transaction loại `OpeningBalance`.

> **Lưu ý:** Dùng endpoint này để thiết lập số lượng ban đầu khi mới onboard hệ thống. Sau khi hệ thống đi vào vận hành, dùng `POST /adjust` cho các điều chỉnh kiểm kê thông thường.

**Auth:** JWT + **RequireAdmin** (chỉ Admin).

---

## Request

```http
POST /api/v1/inventory/opening-balance
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "productId": "uuid",
    "warehouseId": "uuid",
    "quantity": 150.00,
    "unitCost": 45000.00,
    "note": "Tồn kho đầu kỳ tháng 1/2026"
}
```

**Validation (`SetOpeningBalanceRequestValidator`):**

| Field | Rule |
|---|---|
| `productId` | Required (NotEmpty) |
| `warehouseId` | Required (NotEmpty) |
| `quantity` | GreaterThanOrEqualTo(0) |
| `unitCost` | GreaterThanOrEqualTo(0) |
| `note` | MaxLength 500 (nếu có) |

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
        "transactionType": 3,
        "referenceType": 4,
        "referenceId": null,
        "quantity": 150.00,
        "unitCost": 45000.00,
        "batchNumber": null,
        "expiryDate": null,
        "note": "Tồn kho đầu kỳ tháng 1/2026",
        "createdAt": "2026-03-10T08:00:00Z"
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail |
| `400` | `quantity < 0` (`"Opening balance quantity cannot be negative"`) |
| `401` | Token không hợp lệ |
| `403` | Không có role Admin |
| `404` | Product hoặc Warehouse không tồn tại |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
Transaction BEGIN
├── Kiểm tra quantity >= 0 (AppException 400)
│
├── UPSERT inventory_balances:
│   ├── Nếu chưa có bản ghi: INSERT { quantity_on_hand=quantity, reserved=0 }
│   └── Nếu đã có: SET quantity_on_hand = quantity (ghi đè, không delta)
│       last_updated = UtcNow
│
├── RecordTransactionAsync:
│   INSERT inventory_transactions {
│     transaction_type = OpeningBalance,
│     reference_type = Adjustment,
│     quantity = request.Quantity,   ← giá trị tuyệt đối, không phải delta
│     unit_cost = request.UnitCost,
│     note = request.Note ?? "Opening balance"
│   }
│
├── SaveChangesAsync()
Transaction COMMIT

Load product + warehouse names
Return 200 InventoryTransactionDto
```

> **Khác biệt với `/adjust`:**
> - `/adjust`: delta = TargetQuantity − currentOnHand → cộng vào số dư hiện tại
> - `/opening-balance`: **set trực tiếp** `QuantityOnHand = request.Quantity` bất kể giá trị hiện tại

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `inventory_balances` | SELECT | `product_id`, `warehouse_id` |
| `inventory_balances` | INSERT hoặc UPDATE | `quantity_on_hand = quantity` (SET tuyệt đối), `last_updated` |
| `inventory_transactions` | INSERT | `id`, `product_id`, `warehouse_id`, `transaction_type=OpeningBalance`, `reference_type=Adjustment`, `quantity`, `unit_cost`, `note`, `transaction_date` |
| `products` | SELECT | Load `name` cho response |
| `warehouses` | SELECT | Load `name` cho response |
