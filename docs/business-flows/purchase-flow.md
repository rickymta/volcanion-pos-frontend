# Luồng Mua hàng (Purchase Flow)

> **Liên quan:** [../api-description/purchase/](../api-description/purchase/) · [../api-description/financial/](../api-description/financial/)  
> **Database:** [../database/purchase/](../database/purchase/)

---

## 1. Tổng quan luồng

```
Tạo đơn mua        Xác nhận          Nhập kho              Thanh toán NCC
     │                  │                  │                      │
     ▼                  ▼                  ▼                      ▼
PurchaseOrder      PurchaseOrder       GoodsReceipt            Payment
(Draft)    ──────► (Confirmed) ────────► (Draft)    ───────►  (AP giảm)
                                            │
                                       Confirm GR
                                            │
                                     OnHand++  |  AP++
                                            │
                                    Đủ tất cả lines?
                                       Yes → PO.Completed
                                       No  → PO.PartialReceived
```

---

## 2. Bước 1 — Tạo đơn mua hàng

### Điều kiện tiên quyết

- Nhà cung cấp đã có trong danh mục (`POST /suppliers`)
- Sản phẩm đã có trong danh mục với đơn vị hợp lệ

### API Call

```
POST /api/v1/purchase-orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "supplierId": 50,
  "warehouseId": 1,
  "branchId": 1,
  "expectedDate": "2024-02-01",
  "note": "Đơn mua hàng tháng 2",
  "lines": [
    {
      "productId": 10,
      "unitId": 3,             // đơn vị mua (có thể khác BaseUnit)
      "quantity": 100,
      "unitCost": 80000,
      "discountAmount": 0
    }
  ]
}
```

**Response:** `201 Created` — `PurchaseOrder` với `Status = Draft`

**API:** [`POST /api/v1/purchase-orders`](../api-description/purchase/POST_purchase-orders.md)  
**Bảng:** [`PurchaseOrders`](../database/purchase/PurchaseOrders.md) · [`PurchaseOrderLines`](../database/purchase/PurchaseOrderLines.md)

### Tính giá

```
LineTotal  = Quantity × UnitCost − DiscountAmount
SubTotal   = Σ LineTotals
GrandTotal = SubTotal (không có VAT ở nhập hàng trong POC)
```

---

## 3. Bước 2 — Cập nhật đơn mua (tùy chọn)

```
PUT /api/v1/purchase-orders/{id}
→ Chỉ cập nhật được khi Status = Draft
→ Cập nhật lines, ghi chú, ngày dự kiến
```

**API:** [`PUT /api/v1/purchase-orders/{id}`](../api-description/purchase/PUT_purchase-orders_{id}.md)

---

## 4. Bước 3 — Xác nhận đơn mua

> **Yêu cầu quyền:** `RequireManager`

```
POST /api/v1/purchase-orders/{id}/confirm
→ PurchaseOrder.Status: Draft → Confirmed
→ Không có side-effect kho (chưa nhận hàng)
```

**API:** [`POST /api/v1/purchase-orders/{id}/confirm`](../api-description/purchase/POST_purchase-orders_{id}_confirm.md)

---

## 5. Bước 4 — Hủy đơn mua (nếu cần)

```
POST /api/v1/purchase-orders/{id}/cancel
→ Chỉ hủy được khi Status = Draft hoặc Confirmed
→ PurchaseOrder.Status → Cancelled
```

**API:** [`POST /api/v1/purchase-orders/{id}/cancel`](../api-description/purchase/POST_purchase-orders_{id}_cancel.md)

---

## 6. Bước 5 — Tạo phiếu nhập kho (GoodsReceipt)

Một PO có thể có **nhiều GoodsReceipt** (nhập nhiều lần — partial delivery).

```
POST /api/v1/goods-receipts
{
  "purchaseOrderId": 200,
  "warehouseId": 1,
  "receivedDate": "2024-02-05",
  "note": "Nhập lần 1 — 60/100 thùng",
  "lines": [
    {
      "purchaseOrderLineId": 301,
      "productId": 10,
      "unitId": 3,
      "quantityReceived": 60,   // nhập một phần
      "unitCost": 80000
    }
  ]
}
```

**Response:** `201 Created` — `GoodsReceipt` với `Status = Draft`

**API:** [`POST /api/v1/goods-receipts`](../api-description/purchase/POST_goods-receipts.md)  
**Bảng:** [`GoodsReceipts`](../database/purchase/GoodsReceipts.md) · [`GoodsReceiptLines`](../database/purchase/GoodsReceiptLines.md)

---

## 7. Bước 6 — Xác nhận phiếu nhập kho

```
POST /api/v1/goods-receipts/{id}/confirm
```

### Logic xử lý (trong Transaction)

```
Với mỗi GoodsReceiptLine:
  1. ConvertedQty = QuantityReceived × ConversionRate (→ BaseUnit)
  2. InventoryBalance.QuantityOnHand += ConvertedQty
  3. GoodsReceiptLine.ConvertedQuantity = ConvertedQty
  4. InventoryTransaction { Type=In, Reference=Purchase, Qty=ConvertedQty }

  5. PurchaseOrderLine.QuantityReceived += QuantityReceived
     Nếu QuantityReceived >= QuantityOrdered: Line.Status = FullyReceived
     Else: Line.Status = PartiallyReceived

5. GoodsReceipt.Status = Confirmed

6. Tạo DebtLedger (AP tăng):
   DebtLedger { PartnerType=Supplier, PartnerId, DebitAmount=TotalCost }

7. Kiểm tra PO hoàn thành:
   Nếu tất cả PurchaseOrderLines.Status = FullyReceived:
     PurchaseOrder.Status = Completed
   Else:
     PurchaseOrder.Status = PartiallyReceived

8. Tạo bút toán kế toán:
   DR 156 (Hàng tồn kho)     += TotalCost
   CR 331 (Phải trả NCC)     += TotalCost
```

**API:** [`POST /api/v1/goods-receipts/{id}/confirm`](../api-description/purchase/POST_goods-receipts_{id}_confirm.md)  
**Bảng cập nhật:** `GoodsReceipts`, `GoodsReceiptLines`, `PurchaseOrderLines`, `PurchaseOrders`, `InventoryBalances`, `InventoryTransactions`, `DebtLedgers`, `JournalEntries`, `JournalEntryLines`

---

## 8. Bước 7 — Hủy phiếu nhập kho

```
POST /api/v1/goods-receipts/{id}/cancel
→ Chỉ hủy được khi Status = Draft
→ GoodsReceipt.Status → Cancelled
→ Không có side-effect (chưa confirm)
```

**API:** [`POST /api/v1/goods-receipts/{id}/cancel`](../api-description/purchase/POST_goods-receipts_{id}_cancel.md)

---

## 9. Bước 8 — Thanh toán cho nhà cung cấp

Xem chi tiết tại [financial-flow.md](financial-flow.md#thanh-toán-ap).

```
POST /api/v1/payments
{
  "partnerType": "Supplier",
  "partnerId": 50,
  "paymentType": "Pay",
  "amount": 4800000,
  "paymentMethod": "BankTransfer",
  "paymentDate": "2024-02-10",
  "referenceNo": "TT-2024-0010"
}

Logic:
  DebtLedger { PartnerType=Supplier, CreditAmount=amount }  // giảm AP
  JournalEntry: DR 331 (Phải trả NCC) / CR 112 (Tiền gửi NH)
```

**API:** [`POST /api/v1/payments`](../api-description/financial/POST_payments.md)

---

## 10. Nhập kho nhiều lần (Partial Delivery)

```
PO 100 thùng
│
├─► GR #1: 60 thùng → Confirm → OnHand += 60; PO.PartiallyReceived
│
└─► GR #2: 40 thùng → Confirm → OnHand += 40; PO.Completed
```

Mỗi GoodsReceipt tạo một JournalEntry + DebtLedger riêng biệt.

---

## 11. Trạng thái (Status FSM)

### PurchaseOrder

```
Draft ──[confirm]──► Confirmed ──[1st GR confirmed]──► PartiallyReceived
  │                      │                                    │
  └──[cancel]──►Cancelled└──[cancel]──►Cancelled    [all GRs done]──► Completed
```

### GoodsReceipt

```
Draft ──[confirm]──► Confirmed
  │
  └──[cancel]──► Cancelled
```

---

## 12. Xem và tra cứu

```
GET /api/v1/purchase-orders           → Danh sách PO (filter: status, supplier, date)
GET /api/v1/purchase-orders/{id}      → Chi tiết + lines + GR liên quan
GET /api/v1/goods-receipts            → Danh sách phiếu nhập
GET /api/v1/goods-receipts/{id}       → Chi tiết phiếu nhập + lines
```

---

## 13. Bảng dữ liệu liên quan

| Bảng | Vai trò |
|---|---|
| [`PurchaseOrders`](../database/purchase/PurchaseOrders.md) | Đầu đơn mua hàng |
| [`PurchaseOrderLines`](../database/purchase/PurchaseOrderLines.md) | Chi tiết dòng mua |
| [`GoodsReceipts`](../database/purchase/GoodsReceipts.md) | Phiếu nhập kho |
| [`GoodsReceiptLines`](../database/purchase/GoodsReceiptLines.md) | Chi tiết dòng nhập |
| [`InventoryBalances`](../database/inventory/InventoryBalances.md) | Tồn kho (OnHand++) |
| [`InventoryTransactions`](../database/inventory/InventoryTransactions.md) | Lịch sử nhập kho |
| [`DebtLedgers`](../database/financial/DebtLedgers.md) | Công nợ NCC (AP) |
| [`Payments`](../database/financial/Payments.md) | Thanh toán NCC |
| [`JournalEntries`](../database/financial/JournalEntries.md) | Bút toán kế toán |
