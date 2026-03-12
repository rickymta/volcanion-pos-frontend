# Nghiệp Vụ Thanh Toán & Công Nợ (Payment & Debt Flow)

> **Services:** `PaymentService`, `DebtService`  
> **Controller:** `FinancialControllers.cs`  
> **Validator:** `FinancialValidators.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Mô hình công nợ (DebtLedger)](#2-mô-hình-công-nợ-debtledger)
3. [Ghi nhận thanh toán (RecordPayment) ⭐](#3-ghi-nhận-thanh-toán-)
4. [Tra cứu công nợ](#4-tra-cứu-công-nợ)
5. [Danh sách thanh toán](#5-danh-sách-thanh-toán)
6. [Bảng DB tổng hợp](#6-bảng-db-tổng-hợp)
7. [Biến động công nợ theo nghiệp vụ](#7-biến-động-công-nợ-theo-nghiệp-vụ)

---

## 1. Tổng quan

Hai service tài chính:

| Service | Trách nhiệm |
|---|---|
| `DebtService` | Quản lý sổ cái công nợ — append-only, không sửa/xóa |
| `PaymentService` | Ghi nhận thu/chi tiền — tạo Payment + cập nhật DebtLedger + bút toán |

**Hai chiều công nợ:**

| Loại | Đối tác | Tăng khi | Giảm khi |
|---|---|---|---|
| AR (Phải thu) | Customer | SO Confirm | Payment Thu, SalesReturn |
| AP (Phải trả) | Supplier | GR Confirm | Payment Chi, PurchaseReturn |

---

## 2. Mô hình công nợ (DebtLedger)

`DebtLedger` là **sổ cái phụ append-only** — chỉ INSERT, không bao giờ UPDATE hay DELETE.

### Cấu trúc bảng

| Column | Kiểu | Mô tả |
|---|---|---|
| `PartnerType` | `int` (enum) | Customer(0) hoặc Supplier(1) |
| `PartnerId` | `uuid` | FK tới Customers hoặc Suppliers |
| `CustomerId` | `uuid?` | FK Customers (null nếu Supplier) |
| `SupplierId` | `uuid?` | FK Suppliers (null nếu Customer) |
| `ReferenceType` | `text` | Loại chứng từ: "SalesOrder", "GoodsReceipt", "Payment", "SalesReturn", "PurchaseReturn", "SalesReturnRefund" |
| `ReferenceId` | `uuid` | ID chứng từ gốc |
| `DebitAmount` | `numeric(18,2)` | Công nợ tăng |
| `CreditAmount` | `numeric(18,2)` | Công nợ giảm |
| `BalanceAfter` | `numeric(18,2)` | Số dư sau giao dịch này |
| `TransactionDate` | `timestamptz` | Thời điểm giao dịch |
| `Description` | `text?` | Mô tả |

### Công thức số dư

```
BalanceAfter = previousBalance + DebitAmount - CreditAmount

previousBalance = BalanceAfter của dòng gần nhất cùng (PartnerId, PartnerType)
                  = 0 nếu chưa có dòng nào
```

### Quy ước DR/CR trong DebtLedger

| Sự kiện | PartnerType | DebitAmount | CreditAmount | Ý nghĩa |
|---|---|---|---|---|
| SO Confirm | Customer | GrandTotal | 0 | AR TĂNG |
| Payment Thu | Customer | 0 | Amount | AR GIẢM |
| SalesReturn | Customer | 0 | TotalRefund | AR GIẢM |
| SalesReturnRefund | Customer | 0 | TotalRefund | AR GIẢM thêm |
| GR Confirm | Supplier | TotalCost | 0 | AP TĂNG |
| Payment Chi | Supplier | 0 | Amount | AP GIẢM |
| PurchaseReturn | Supplier | 0 | TotalReturn | AP GIẢM |

> **Lưu ý quy ước:** Với AR (Customer), Debit = tăng nợ phải thu. Với AP (Supplier), Debit cũng = tăng số dư (dùng thống nhất để tính BalanceAfter).

---

## 3. Ghi nhận thanh toán ⭐

**Endpoint:** `POST /api/payments`

### 3.1 Request Body

**Thu tiền từ khách (AR):**
```json
{
  "partnerType": 0,
  "partnerId": "uuid-customer",
  "paymentType": 0,
  "paymentDate": "2026-03-05T10:00:00Z",
  "amount": 1500000,
  "referenceType": "Invoice",
  "referenceId": "uuid-invoice",
  "paymentMethod": 1,
  "invoiceId": "uuid-invoice",
  "note": "Khách thanh toán đơn INV-..."
}
```

**Trả tiền cho NCC (AP):**
```json
{
  "partnerType": 1,
  "partnerId": "uuid-supplier",
  "paymentType": 1,
  "paymentDate": "2026-03-05",
  "amount": 2400000,
  "referenceType": "GoodsReceipt",
  "referenceId": "uuid-gr",
  "paymentMethod": 1,
  "note": "TT nhà cung cấp ABC"
}
```

### 3.2 Validation (FluentValidation)

| Field | Rule | Lỗi |
|---|---|---|
| `PartnerId` | `NotEmpty` | "Partner (customer or supplier) is required." |
| `PaymentDate` | `NotEmpty` | "Payment date is required." |
| `Amount` | `> 0` | "Payment amount must be greater than 0." |
| `ReferenceType` | `NotEmpty`, `MaxLength(50)` | required / too long |
| `ReferenceId` | `NotEmpty` | "Reference document is required." |
| `PaymentMethod` | `IsInEnum` (nếu có) | "Invalid payment method." |
| `Note` | `MaxLength(500)` (nếu có) | too long |

### 3.3 PaymentType xác định chiều

| Value | Name | Ý nghĩa |
|---|---|---|
| 0 | Receive | Thu tiền từ khách (Customer AR) |
| 1 | Pay | Trả tiền cho NCC (Supplier AP) |
| 2 | Refund | Hoàn tiền cho khách (từ SalesReturnRefund) |

### 3.4 Xử lý logic chi tiết

🔒 **Wrapped trong DB transaction**

```
1. Tạo Payment entity:
   PartnerType  = request.PartnerType
   PartnerId    = request.PartnerId
   PaymentType  = request.PaymentType
   Amount       = request.Amount
   PaymentMethod = request.PaymentMethod
   InvoiceId    = request.InvoiceId?

2. UPDATE INVOICE (nếu có InvoiceId):
   invoice = Load Invoice by InvoiceId
   invoice.PaidAmount += request.Amount
   ⚠️ Không validate đã overpaid — có thể PaidAmount > GrandTotal

3. 💰 CẬP NHẬT CÔNG NỢ:
   AppendEntryAsync(
     PartnerType   = request.PartnerType
     PartnerId     = request.PartnerId
     ReferenceType = request.ReferenceType
     ReferenceId   = request.ReferenceId
     DebitAmount   = 0             ← Payment luôn GIẢM số dư
     CreditAmount  = request.Amount
     BalanceAfter  = currentBalance - Amount
   )
   
   ⚠️ Không phân biệt Customer/Supplier trong DebtService.AppendEntry —
   chỉ cộng/trừ theo DebitAmount/CreditAmount.

4. 📒 TẠO BÚT TOÁN:
   cashAccount = (PaymentMethod == BankTransfer) ? "112" : "111"
   
   Nếu PartnerType == Customer (Thu tiền):
     DR {cashAccount} (111 hoặc 112)   = Amount
     CR 131 (Phải thu KH)              = Amount
   
   Nếu PartnerType == Supplier (Trả tiền):
     DR 331 (Phải trả NCC)             = Amount
     CR {cashAccount} (111 hoặc 112)   = Amount
   
   Validate: ΣDebit = ΣCredit

5. SaveChanges + Commit
```

### 3.5 Ánh xạ PaymentMethod → Tài khoản kế toán

| PaymentMethod | Value | Lưu DB | Tài khoản |
|---|---|---|---|
| Cash | 0 | `"Cash"` (varchar!) | TK 111 (Tiền mặt) |
| BankTransfer | 1 | `"BankTransfer"` (varchar!) | TK 112 (Tiền gửi NH) |

> ⚠️ **Quan trọng:** `Payment.PaymentMethod` được lưu dưới dạng **string** ("Cash"/"BankTransfer"), không phải integer.  
> EF configuration: `HasConversion<string>()` → `HasColumnType("varchar(50)")`

### 3.6 Bảng DB bị ảnh hưởng

**READ:**
- `Invoices` — update PaidAmount (nếu có InvoiceId)
- `DebtLedgers` — lấy current balance
- `Accounts` — lookup TK 111/112/131/331

**WRITE:**

| Bảng | Column | Giá trị | Ý nghĩa |
|---|---|---|---|
| `Payments` | `Id` | `Guid.NewGuid()` | Khóa chính |
| `Payments` | `PartnerType` | `0` hoặc `1` | Customer/Supplier |
| `Payments` | `PartnerId` | FK | Đối tác |
| `Payments` | `PaymentType` | `0/1/2` | Receive/Pay/Refund |
| `Payments` | `PaymentDate` | `timestamptz` | Ngày thanh toán |
| `Payments` | `Amount` | `numeric(18,2)` | Số tiền |
| `Payments` | `ReferenceType` | `text` | Loại chứng từ |
| `Payments` | `ReferenceId` | `uuid` | ID chứng từ |
| `Payments` | `PaymentMethod` | `"Cash"/"BankTransfer"` | Hình thức (stored as string!) |
| `Payments` | `InvoiceId` | `uuid?` | FK Invoice (nullable) |
| `Invoices` | `PaidAmount` | `+= Amount` | *Nếu InvoiceId có* |
| `DebtLedgers` | `CreditAmount` | `Amount` | Công nợ giảm |
| `DebtLedgers` | `BalanceAfter` | `prev - Amount` | Số dư mới |
| `JournalEntries` | `ReferenceType` | `"Payment"` | Bút toán thanh toán |
| `JournalEntryLines` | DR | `111/112` hoặc `331` | Tùy chiều |
| `JournalEntryLines` | CR | `131` hoặc `111/112` | Tùy chiều |

---

## 4. Tra cứu công nợ

### 4.1 Số dư công nợ hiện tại

**Endpoint:** `GET /api/debt/{partnerId}/balance?partnerType=0`

```
Query: DebtLedgers
  WHERE PartnerId = partnerId AND PartnerType = partnerType
  ORDER BY TransactionDate DESC
  LIMIT 1
  → return last.BalanceAfter (hoặc 0 nếu không có dòng nào)
```

**Response:**
```json
{
  "balance": 5750000.00
}
```

### 4.2 Lịch sử công nợ (phân trang)

**Endpoint:** `GET /api/debt/{partnerId}/ledger?partnerType=0&page=1&pageSize=20`

```
Query: DebtLedgers
  WHERE PartnerId = partnerId AND PartnerType = partnerType
  ORDER BY TransactionDate DESC
  SKIP/TAKE (pagination)
```

**Response fields:**

| Field | Cột DB | Ý nghĩa |
|---|---|---|
| `id` | `DebtLedgers.Id` | — |
| `partnerType` | `PartnerType` | Customer/Supplier |
| `referenceType` | `ReferenceType` | "SalesOrder", "Payment", v.v. |
| `referenceId` | `ReferenceId` | ID chứng từ gốc |
| `debitAmount` | `DebitAmount` | Công nợ tăng |
| `creditAmount` | `CreditAmount` | Công nợ giảm |
| `balanceAfter` | `BalanceAfter` | Số dư sau giao dịch |
| `transactionDate` | `TransactionDate` | Thời điểm |
| `description` | `Description` | Mô tả |

---

## 5. Danh sách thanh toán

**Endpoints:**
- `GET /api/payments` — paginated list
- `GET /api/payments/{id}` — chi tiết

**Filter params:**

| Param | Cột DB |
|---|---|
| `partnerId` | `Payments.PartnerId` |
| `partnerType` | `Payments.PartnerType` |
| `fromDate` | `Payments.PaymentDate` |
| `toDate` | `Payments.PaymentDate` |

**N+1 Prevention:** `GetListAsync` batch-load partner names (customers + suppliers) sau khi lấy page, tránh N+1:
```csharp
var customerIds = items.Where(p => PartnerType == Customer).Select(p.PartnerId).Distinct()
var customers = await db.Customers.Where(c => customerIds.Contains(c.Id))...ToDictionaryAsync(...)
```

---

## 6. Bảng DB Tổng Hợp

| Bảng | Vai trò |
|---|---|
| `Customers` | READ — partner name |
| `Suppliers` | READ — partner name |
| `Invoices` | WRITE — PaidAmount += Amount |
| `Payments` | WRITE — record thanh toán |
| `DebtLedgers` | READ + WRITE — append entry |
| `Accounts` | READ — lookup TK |
| `JournalEntries` | WRITE — bút toán |
| `JournalEntryLines` | WRITE — dòng bút toán |

---

## 7. Biến động công nợ theo nghiệp vụ

### AR — Phải thu khách hàng (Customer)

```
Khởi tạo: Balance = 0

[+] SO Confirm:
  AppendEntry(Customer, Debit=GrandTotal, Credit=0)
  Balance = 0 + GrandTotal = 5,500,000

[+] SO Confirm (đơn 2):
  Balance = 5,500,000 + 2,200,000 = 7,700,000

[-] Payment Thu:
  AppendEntry(Customer, Debit=0, Credit=3,000,000)
  Balance = 7,700,000 - 3,000,000 = 4,700,000

[-] SalesReturn:
  AppendEntry(Customer, Debit=0, Credit=500,000)
  Balance = 4,700,000 - 500,000 = 4,200,000

[-] IsRefunded=true → SalesReturnRefund:
  AppendEntry(Customer, Debit=0, Credit=500,000)
  Balance = 4,200,000 - 500,000 = 3,700,000

Kết quả: Khách còn nợ 3,700,000
```

### AP — Phải trả nhà cung cấp (Supplier)

```
Khởi tạo: Balance = 0

[+] GR Confirm:
  AppendEntry(Supplier, Debit=TotalCost, Credit=0)
  Balance = 0 + 10,000,000 = 10,000,000

[-] PurchaseReturn:
  AppendEntry(Supplier, Debit=0, Credit=1,000,000)
  Balance = 10,000,000 - 1,000,000 = 9,000,000

[-] Payment Chi:
  AppendEntry(Supplier, Debit=0, Credit=5,000,000)
  Balance = 9,000,000 - 5,000,000 = 4,000,000

Kết quả: Còn nợ NCC 4,000,000
```
