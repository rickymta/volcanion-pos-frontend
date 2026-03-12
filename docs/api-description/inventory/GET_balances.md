# GET /api/v1/inventory/balances

## Mô tả

Xem số dư tồn kho hiện tại theo sản phẩm và kho hàng.  
Trả về `QuantityOnHand`, `QuantityReserved`, `QuantityAvailable` (= OnHand − Reserved).

**Auth:** JWT hợp lệ (bất kỳ role nào).

---

## Request

```http
GET /api/v1/inventory/balances?productId={guid}&warehouseId={guid}&onlyPositive=true&page=1&pageSize=50
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `productId` | `Guid?` | null | Lọc theo sản phẩm |
| `warehouseId` | `Guid?` | null | Lọc theo kho |
| `onlyPositive` | `bool` | false | Nếu `true`, chỉ trả về bản ghi có `QuantityOnHand > 0` |
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
                "productId": "uuid",
                "productCode": "SP001",
                "productName": "Sản phẩm A",
                "warehouseId": "uuid",
                "warehouseName": "Kho Hà Nội",
                "quantityOnHand": 100.00,
                "quantityReserved": 20.00,
                "quantityAvailable": 80.00,
                "lastUpdated": "2026-03-10T08:00:00Z"
            }
        ],
        "totalCount": 10,
        "page": 1,
        "pageSize": 50,
        "totalPages": 1
    }
}
```

> Tất cả số lượng tính theo **đơn vị cơ sở** (base unit) của sản phẩm.

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. inventoryService.GetBalancesAsync(filter, ct)
    ├── SELECT inventory_balances
    │   INCLUDE product (Code, Name)
    │   INCLUDE warehouse (Name)
    │   WHERE (product_id, warehouse_id, onlyPositive filters)
    │   ORDER BY product.Name ASC
    │   SKIP + TAKE
    └── Map → InventoryBalanceDto[]
2. Return 200 PagedResult<InventoryBalanceDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `inventory_balances` | SELECT + COUNT | `product_id`, `warehouse_id`, `quantity_on_hand`, `quantity_reserved`, `last_updated` |
| `products` | JOIN (Include) | `code`, `name` (ORDER BY) |
| `warehouses` | JOIN (Include) | `name` |
