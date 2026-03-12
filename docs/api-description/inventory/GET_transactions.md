# GET /api/v1/inventory/transactions

## Mô tả

Xem lịch sử giao dịch kho (nhập, xuất, điều chỉnh, v.v.) theo bộ lọc tùy chọn.

**Auth:** JWT hợp lệ (bất kỳ role nào).

---

## Request

```http
GET /api/v1/inventory/transactions?productId={guid}&warehouseId={guid}&transactionType=0&fromDate=2026-01-01&page=1&pageSize=50
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `productId` | `Guid?` | null | Lọc theo sản phẩm |
| `warehouseId` | `Guid?` | null | Lọc theo kho |
| `transactionType` | `InventoryTransactionType?` | null | `0`=In, `1`=Out, `2`=Adjust, `3`=OpeningBalance |
| `fromDate` | `DateTime?` | null | Từ ngày giao dịch |
| `toDate` | `DateTime?` | null | Đến ngày giao dịch |
| `page` | `int` | 1 | Số trang |
| `pageSize` | `int` | 50 | Số bản ghi mỗi trang |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "items": [
            {
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
        ],
        "totalCount": 25,
        "page": 1,
        "pageSize": 50,
        "totalPages": 1
    }
}
```

> `quantity` dương (+) = nhập kho; âm (-) = xuất kho.

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. inventoryService.GetTransactionsAsync(filter, ct)
    ├── SELECT inventory_transactions
    │   INCLUDE product (Name)
    │   INCLUDE warehouse (Name)
    │   WHERE (product_id, warehouse_id, transaction_type, from_date, to_date filters)
    │   ORDER BY transaction_date DESC
    │   SKIP + TAKE
    └── Map → InventoryTransactionDto[]
2. Return 200 PagedResult<InventoryTransactionDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `inventory_transactions` | SELECT + COUNT | `product_id`, `warehouse_id`, `transaction_type`, `transaction_date` (ORDER BY DESC) |
| `products` | JOIN (Include) | `name` |
| `warehouses` | JOIN (Include) | `name` |
