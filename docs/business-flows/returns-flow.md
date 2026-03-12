# Luồng Trả hàng (Returns Flow)

> **Liên quan:** [../api-description/operations/](../api-description/operations/) · [../api-description/purchase/](../api-description/purchase/)  
> **Database:** [../database/sales/SalesReturns.md](../database/sales/SalesReturns.md) · [../database/purchase/PurchaseReturns.md](../database/purchase/PurchaseReturns.md)

---

## 1. Tổng quan

Hệ thống hỗ trợ 2 luồng trả hàng:

| Loại | Chiều | Tham chiếu | Tác động kho | Tác động kế toán |
|---|---|---|---|---|
| **Sales Return** | Khách → Kho | Từ Invoice | OnHand++ | AR giảm, COGS phục hồi |
| **Purchase Return** | Kho → NCC | Từ GoodsReceipt | OnHand-- | AP giảm |

---

## 2. Trả hàng bán (Sales Return)

### 2.1 Điều kiện

- Invoice phải ở trạng thái `Confirmed` hoặc `Completed`
- Số lượng trả ≤ số lượng đã giao

### 2.2 Tạo phiếu trả hàng

```
POST /api/v1/sales-returns
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "invoiceId": 456,
  "warehouseId": 1,
  "returnDate": "2024-02-10",
  "reason": "Hàng bị lỗi kỹ thuật",
  "isRefunded": true,            // true = hoàn tiền; false = ghi nợ KH
  "refundMethod": "Cash",        // Cash / BankTransfer (nếu isRefunded=true)
  "lines": [
    {
      "invoiceLineId": 789,
      "productId": 10,
      "unitId": 5,
      "quantityReturned": 1,
      "unitPrice": 150000
    }
  ]
}
```

**Response:** `201 Created` — `SalesReturn` với `Status = Draft`

**API:** [`POST /api/v1/sales-returns`](../api-description/operations/POST_sales-returns.md)  
**Bảng:** [`SalesReturns`](../database/sales/SalesReturns.md) · [`SalesReturnLines`](../database/sales/SalesReturnLines.md)

### 2.3 Xác nhận phiếu trả hàng bán

```
POST /api/v1/sales-returns/{id}/confirm
```

### Logic xử lý (trong Transaction)

```
Với mỗi SalesReturnLine:
  1. ConvertedQty = QuantityReturned × ConversionRate (→ BaseUnit)
  2. InventoryBalance.QuantityOnHand += ConvertedQty   // nhập lại kho
  3. InventoryTransaction { Type=In, Reference=SalesReturn }

4. SalesReturn.Status = Confirmed

5. DebtLedger giảm AR:
   DebtLedger { PartnerType=Customer, PartnerId, CreditAmount=ReturnTotal }
   Invoice.PaidAmount -= ReturnTotal  (nếu đã thu tiền)
   Invoice.RemainingAmount += ReturnTotal

6. Bút toán kế toán (reverse doanh thu + COGS):
   DR 511 (Doanh thu bán hàng)      += ReturnTotal   // giảm doanh thu
   CR 131 (Phải thu khách hàng)     += ReturnTotal   // giảm AR
   DR 156 (Hàng hóa)                += COGS          // phục hồi giá vốn
   CR 632 (Giá vốn hàng bán)        += COGS

7. Nếu IsRefunded = true:
   Tạo Payment { Type=Refund, Amount=ReturnTotal }
   DR 131 (Phải thu KH)  += RefundAmount   // hoàn tiền
   CR 111/112 (Tiền)     += RefundAmount
```

**API:** [`POST /api/v1/sales-returns/{id}/confirm`](../api-description/operations/POST_sales-returns_{id}_confirm.md)

---

## 3. Trả hàng mua (Purchase Return)

### 3.1 Điều kiện

- GoodsReceipt phải ở trạng thái `Confirmed`
- Số lượng trả ≤ số lượng đã nhận trước đó

### 3.2 Tạo phiếu trả hàng mua

```
POST /api/v1/purchase-returns
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "goodsReceiptId": 301,
  "supplierId": 50,
  "warehouseId": 1,
  "returnDate": "2024-02-12",
  "reason": "Hàng không đúng chủng loại",
  "lines": [
    {
      "goodsReceiptLineId": 601,
      "productId": 10,
      "unitId": 3,
      "quantityReturned": 10,
      "unitCost": 80000
    }
  ]
}
```

**Response:** `201 Created` — `PurchaseReturn` với `Status = Draft`

**API:** [`POST /api/v1/purchase-returns`](../api-description/purchase/POST_purchase-returns.md)  
**Bảng:** [`PurchaseReturns`](../database/purchase/PurchaseReturns.md) · [`PurchaseReturnLines`](../database/purchase/PurchaseReturnLines.md)

### 3.3 Xác nhận phiếu trả hàng mua

```
POST /api/v1/purchase-returns/{id}/confirm
```

### Logic xử lý (trong Transaction)

```
Với mỗi PurchaseReturnLine:
  1. ConvertedQty = QuantityReturned × ConversionRate (→ BaseUnit)
  2. InventoryBalance.QuantityOnHand -= ConvertedQty   // xuất kho trả NCC
  3. InventoryTransaction { Type=Out, Reference=PurchaseReturn }

4. PurchaseReturn.Status = Confirmed

5. DebtLedger giảm AP:
   DebtLedger { PartnerType=Supplier, PartnerId, DebitAmount=ReturnTotal }
   // AP giảm = số tiền còn nợ NCC giảm đi

6. Bút toán kế toán:
   DR 331 (Phải trả NCC)      += ReturnTotal   // giảm AP
   CR 156 (Hàng hóa)          += ReturnTotal   // xuất kho
```

**API:** [`POST /api/v1/purchase-returns/{id}/confirm`](../api-description/purchase/POST_purchase-returns_{id}_confirm.md)

---

## 4. Trạng thái (Status FSM)

### SalesReturn / PurchaseReturn

```
Draft ──[confirm]──► Confirmed
```

> Lưu ý: Không có trạng thái `Cancelled` sau khi đã `Confirmed` — đây là chứng từ kế toán.

---

## 5. Xem và tra cứu

```
GET /api/v1/sales-returns           → Danh sách trả hàng bán
GET /api/v1/sales-returns/{id}      → Chi tiết phiếu trả hàng bán + lines
GET /api/v1/purchase-returns        → Danh sách trả hàng mua
GET /api/v1/purchase-returns/{id}   → Chi tiết phiếu trả hàng mua + lines
```

---

## 6. So sánh tác động tồn kho & kế toán

| Sự kiện | OnHand | AR (131) | AP (331) | Doanh thu (511) | Giá vốn (632) | Tiền (111/112) |
|---|---|---|---|---|---|---|
| SO Confirm | Reserved++ | DR | — | CR | DR | — |
| DO Start | OnHand-- | — | — | — | — | — |
| Payment (AR) | — | CR | — | — | — | DR |
| Sales Return | OnHand++ | CR | — | DR (reverse) | CR (reverse) | DR (if refund) |
| GR Confirm | OnHand++ | — | CR | — | — | — |
| Payment (AP) | — | — | DR | — | — | CR |
| Purchase Return | OnHand-- | — | DR | — | — | — |

---

## 7. Bảng dữ liệu liên quan

| Bảng | Vai trò |
|---|---|
| [`SalesReturns`](../database/sales/SalesReturns.md) | Phiếu trả hàng bán |
| [`SalesReturnLines`](../database/sales/SalesReturnLines.md) | Chi tiết dòng trả hàng bán |
| [`PurchaseReturns`](../database/purchase/PurchaseReturns.md) | Phiếu trả hàng mua |
| [`PurchaseReturnLines`](../database/purchase/PurchaseReturnLines.md) | Chi tiết dòng trả hàng mua |
| [`InventoryBalances`](../database/inventory/InventoryBalances.md) | Tồn kho |
| [`InventoryTransactions`](../database/inventory/InventoryTransactions.md) | Lịch sử xuất nhập kho |
| [`DebtLedgers`](../database/financial/DebtLedgers.md) | Công nợ AR/AP |
| [`JournalEntries`](../database/financial/JournalEntries.md) · [`JournalEntryLines`](../database/financial/JournalEntries.md) | Bút toán kế toán |
