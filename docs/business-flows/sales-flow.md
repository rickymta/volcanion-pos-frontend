# Luồng Bán hàng (Sales Flow)

> **Liên quan:** [../api-description/sales/](../api-description/sales/) · [../api-description/operations/](../api-description/operations/) · [../api-description/financial/](../api-description/financial/)  
> **Database:** [../database/sales/](../database/sales/) · [../database/operations/DeliveryOrders.md](../database/operations/DeliveryOrders.md)

---

## 1. Tổng quan luồng

```
Tạo đơn hàng        Xác nhận          Giao hàng              Thanh toán
     │                  │                  │                      │
     ▼                  ▼                  ▼                      ▼
SalesOrder         SalesOrder          DeliveryOrder          Payment
(Draft)    ──────► (Confirmed) ──────► (Pending)    ──────►  (Invoice)
                        │               │    │
                        │            Start  Cancel
                        │               │
                   Invoice             Complete ──────► SO.Completed
                   (Confirmed)         Fail ──────────► OnHand hoàn lại
```

---

## 2. Bước 1 — Tạo đơn bán hàng

### Điều kiện tiên quyết

- Khách hàng đã tồn tại (tùy chọn — có thể bán lẻ không cần customer)
- Sản phẩm đã có trong danh mục
- Có tồn kho khả dụng (AvailableQty = OnHand − Reserved)

### API Call

```
POST /api/v1/sales-orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "customerId": 123,           // tùy chọn
  "warehouseId": 1,
  "branchId": 1,
  "note": "Ghi chú đơn hàng",
  "lines": [
    {
      "productId": 10,
      "unitId": 5,             // đơn vị bán
      "quantity": 3,
      "unitPrice": 150000,
      "discountAmount": 0
    }
  ]
}
```

**Response:** `201 Created` — `SalesOrder` với `Status = Draft`

**API:** [`POST /api/v1/sales-orders`](../api-description/sales/POST_sales-orders.md)  
**Bảng:** [`SalesOrders`](../database/sales/SalesOrders.md) · [`SalesOrderLines`](../database/sales/SalesOrderLines.md)

### Logic tính giá

```
LineTotal = Quantity × UnitPrice − DiscountAmount
SubTotal  = Σ LineTotals
GrandTotal = SubTotal − OrderDiscountAmount
```

> **Unit Conversion:** Nếu đơn vị bán ≠ BaseUnit, hệ thống quy đổi qua graph `ProductUnitConversions` (BFS) để kiểm tra tồn kho theo BaseUnit.

---

## 3. Bước 2 — Xác nhận đơn hàng

> **Yêu cầu quyền:** `RequireManager` (Manager hoặc Admin)

### API Call

```
POST /api/v1/sales-orders/{id}/confirm
Authorization: Bearer {accessToken}
```

### Logic xử lý (trong Transaction)

```
Với mỗi SalesOrderLine:
  1. ConvertedQty = Quantity × ConversionRate (→ BaseUnit)
  2. Kiểm tra: InventoryBalance.AvailableQty >= ConvertedQty
     → Nếu không đủ: throw InsufficientStockException
  3. InventoryBalance.QuantityReserved += ConvertedQty
  4. SalesOrderLine.ConvertedQuantity = ConvertedQty

Sau khi xử lý tất cả lines:
  5. SalesOrder.Status = Confirmed

Tự động tạo Invoice:
  6. Invoice { SalesOrderId, CustomerId, GrandTotal, Status=Confirmed
               PaidAmount=0, RemainingAmount=GrandTotal }
  7. InvoiceLines (copy từ SalesOrderLines)

Tự động tạo DeliveryOrder:
  8. DeliveryOrder { SalesOrderId, InvoiceId, WarehouseId, Status=Pending }

Tạo bút toán kế toán (JournalEntry):
  9. DR 131 (Phải thu KH)    += GrandTotal
     CR 511 (Doanh thu)      += SubTotal
     CR 3331 (Thuế GTGT)     += TaxAmount   [nếu có]
     DR 632 (Giá vốn)        += COGS
     CR 156 (Hàng hóa)       += COGS
```

**API:** [`POST /api/v1/sales-orders/{id}/confirm`](../api-description/sales/POST_sales-orders_{id}_confirm.md)  
**Bảng cập nhật:** `SalesOrders`, `InventoryBalances`, `Invoices`, `InvoiceLines`, `DeliveryOrders`, `JournalEntries`, `JournalEntryLines`

---

## 4. Bước 3 — Hủy đơn hàng (nếu cần)

```
POST /api/v1/sales-orders/{id}/cancel
→ Chỉ hủy được khi Status = Draft hoặc Confirmed (trước khi giao)
→ Nếu đã Confirmed: InventoryBalance.QuantityReserved -= ConvertedQty (hoàn reserve)
→ SalesOrder.Status = Cancelled
→ Invoice, DeliveryOrder (nếu có) → Status = Cancelled
```

**API:** [`POST /api/v1/sales-orders/{id}/cancel`](../api-description/sales/POST_sales-orders_{id}_cancel.md)

---

## 5. Bước 4 — Bắt đầu giao hàng

```
POST /api/v1/delivery-orders/{id}/start
→ DeliveryOrder.Status: Pending → InProgress

Logic:
  Với mỗi line:
    InventoryBalance.QuantityOnHand     -= ConvertedQty
    InventoryBalance.QuantityReserved   -= ConvertedQty
    → InventoryTransaction { Type=Out, Reference=Sale }
```

**API:** [`POST /api/v1/delivery-orders/{id}/start`](../api-description/operations/POST_delivery-orders_{id}_start.md)  
**Bảng:** [`DeliveryOrders`](../database/operations/DeliveryOrders.md) · [`InventoryBalances`](../database/inventory/InventoryBalances.md) · [`InventoryTransactions`](../database/inventory/InventoryTransactions.md)

---

## 6. Bước 5a — Hoàn thành giao hàng

```
POST /api/v1/delivery-orders/{id}/complete
→ DeliveryOrder.Status: InProgress → Completed
→ SalesOrder.Status: Confirmed → Completed
→ Invoice.Status → Completed (nếu đã thanh toán đủ)
```

**API:** [`POST /api/v1/delivery-orders/{id}/complete`](../api-description/operations/POST_delivery-orders_{id}_complete.md)

---

## 7. Bước 5b — Giao hàng thất bại

```
POST /api/v1/delivery-orders/{id}/fail
Body: { reason: "Khách không nhận" }
→ DeliveryOrder.Status: InProgress → Failed
→ Hoàn kho:
    InventoryBalance.QuantityOnHand += ConvertedQty
    → InventoryTransaction { Type=In, Reference=SaleReturn/Restock }
→ SalesOrder.Status → CancelledDelivery (tùy impl)
```

**API:** [`POST /api/v1/delivery-orders/{id}/fail`](../api-description/operations/POST_delivery-orders_{id}_fail.md)

---

## 8. Bước 6 — Thanh toán đơn hàng

Xem chi tiết tại [financial-flow.md](financial-flow.md#thanh-toán-ar).

```
POST /api/v1/payments
{
  "invoiceId": 456,
  "partnerType": "Customer",
  "partnerId": 123,
  "paymentType": "Receive",
  "amount": 450000,
  "paymentMethod": "Cash",    // Cash / BankTransfer
  "paymentDate": "2024-01-15"
}

Logic:
  Invoice.PaidAmount += amount
  Invoice.RemainingAmount -= amount
  Nếu RemainingAmount = 0: Invoice.Status = Completed

  DebtLedger { PartnerType=Customer, PartnerId, CreditAmount=amount }
  JournalEntry: DR 111/112 (Tiền mặt/Ngân hàng) / CR 131 (Phải thu KH)
```

**API:** [`POST /api/v1/payments`](../api-description/financial/POST_payments.md)

---

## 9. Xem và tra cứu đơn hàng

```
GET /api/v1/sales-orders               → Danh sách (filter: status, date, customer)
GET /api/v1/sales-orders/{id}          → Chi tiết đơn + lines + trạng thái
GET /api/v1/invoices                   → Danh sách hóa đơn (filter: status, paid)
GET /api/v1/invoices/{id}              → Chi tiết hóa đơn + lines + payments
```

---

## 10. Trạng thái (Status FSM)

### SalesOrder

```
Draft ──[confirm]──► Confirmed ──[delivery complete]──► Completed
  │                      │
  └──[cancel]──► Cancelled └──[cancel]──► Cancelled
```

### DeliveryOrder

```
Pending ──[start]──► InProgress ──[complete]──► Completed
                          │
                          └──[fail]──► Failed
                          └──[cancel]──► Cancelled
```

### Invoice

```
Confirmed ──[partial payment]──► Confirmed (PaidAmount > 0)
          ──[full payment]────► Completed
```

---

## 11. Bảng dữ liệu liên quan

| Bảng | Vai trò |
|---|---|
| [`SalesOrders`](../database/sales/SalesOrders.md) | Đầu đơn bán hàng |
| [`SalesOrderLines`](../database/sales/SalesOrderLines.md) | Chi tiết dòng sản phẩm |
| [`Invoices`](../database/sales/Invoices.md) | Hóa đơn bán hàng (auto-tạo) |
| [`InvoiceLines`](../database/sales/InvoiceLines.md) | Chi tiết dòng hóa đơn |
| [`DeliveryOrders`](../database/operations/DeliveryOrders.md) | Lệnh giao hàng (auto-tạo) |
| [`InventoryBalances`](../database/inventory/InventoryBalances.md) | Tồn kho (Reserved, OnHand) |
| [`InventoryTransactions`](../database/inventory/InventoryTransactions.md) | Lịch sử xuất nhập kho |
| [`Payments`](../database/financial/Payments.md) | Thanh toán |
| [`DebtLedgers`](../database/financial/DebtLedgers.md) | Sổ công nợ khách hàng |
| [`JournalEntries`](../database/financial/JournalEntries.md) | Bút toán kế toán |
