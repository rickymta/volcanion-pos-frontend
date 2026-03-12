# Nghiệp Vụ Kế Toán Tự Động (Accounting Flow)

> **Service:** `AccountingService`  
> **Controller:** `FinancialControllers.cs`  
> **Validator:** `FinancialValidators.cs`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Hệ thống tài khoản (Chart of Accounts)](#2-hệ-thống-tài-khoản)
3. [Tạo bút toán kép (JournalEntry)](#3-tạo-bút-toán-kép)
4. [Bút toán tự động theo sự kiện](#4-bút-toán-tự-động-theo-sự-kiện)
5. [Query sổ nhật ký](#5-query-sổ-nhật-ký)
6. [Báo cáo kế toán](#6-báo-cáo-kế-toán)
7. [Bảng DB tổng hợp](#7-bảng-db-tổng-hợp)

---

## 1. Tổng quan

`AccountingService` tự động tạo bút toán kép theo chuẩn VAS (Việt Nam Accounting Standards).  
Service này **không được gọi trực tiếp từ client** đối với việc tạo bút toán nghiệp vụ —  
các service khác (SalesOrderService, GoodsReceiptService, v.v.) inject và gọi `CreateFromLinesAsync`.

**Tất cả bút toán** được validate nguyên tắc kép: `ΣDebit = ΣCredit`.

---

## 2. Hệ thống tài khoản

### Danh sách tài khoản được seed sẵn

| Mã | Tên | Loại | ParentCode |
|---|---|---|---|
| **111** | Tiền mặt | Asset | *(root)* |
| **112** | Tiền gửi ngân hàng | Asset | *(root)* |
| **131** | Phải thu khách hàng | Asset | *(root)* |
| **156** | Hàng hóa | Asset | *(root)* |
| **331** | Phải trả nhà cung cấp | Liability | *(root)* |
| **3331** | Thuế GTGT đầu ra | Liability | 331 |
| **3333** | Thuế TNDN | Liability | 331 |
| **511** | Doanh thu bán hàng | Revenue | *(root)* |
| **632** | Giá vốn hàng bán | Expense | *(root)* |

### Cấu trúc Account

```
Accounts
  Id          uuid PK
  Code        text UNIQUE (per tenant)  ← "111", "131", "3331"
  Name        text
  AccountType int  (Asset=0, Liability=1, Equity=2, Revenue=3, Expense=4)
  ParentAccountId  uuid? FK (self-reference)
```

---

## 3. Tạo bút toán kép

### 3.1 Method nội bộ: CreateFromLinesAsync

Được gọi bởi tất cả service nghiệp vụ:

```csharp
await accountingSvc.CreateFromLinesAsync(
    referenceType: "GoodsReceipt",
    referenceId: gr.Id,
    entryDate: DateTime.UtcNow,
    description: "Nhập kho GR-...",
    lines: [
        ("156", debit: totalCost, credit: 0,         lineDesc: "Nhập kho"),
        ("331", debit: 0,         credit: totalCost,  lineDesc: "Phải trả NCC")
    ]
)
```

### 3.2 GenerateJournalEntryAsync — logic chi tiết

```
1. Đọc danh sách AccountCode từ lines
2. Batch-load tất cả Account từ DB:
   SELECT * FROM Accounts WHERE Code IN ('156', '331', ...) AND TenantId = @tenantId
   → Dictionary<code, Account>
   
3. Validate: mỗi AccountCode phải tồn tại trong dictionary
   Nếu không: throw AppException("Account code '{code}' not found")

4. Validate nguyên tắc kép:
   totalDebit  = Σ line.DebitAmount
   totalCredit = Σ line.CreditAmount
   Nếu totalDebit != totalCredit:
     throw AppException("Journal entry is unbalanced: debit {x} ≠ credit {y}")

5. Sinh Code bút toán:
   JE-{yyyyMMdd-HHmmss}-{6 ký tự hex random}
   Ví dụ: "JE-20260301-143022-A3F2C1"

6. Tạo JournalEntry:
   Code          = entryCode
   ReferenceType = referenceType    ← "SalesOrder", "GoodsReceipt", etc.
   ReferenceId   = referenceId      ← ID chứng từ gốc
   EntryDate     = entryDate
   Description   = description

7. Tạo JournalEntryLines:
   Với mỗi (AccountCode, Debit, Credit, LineDesc):
     AccountId   = accounts[code].Id
     DebitAmount  = line.Debit
     CreditAmount = line.Credit
     Description  = lineDesc

8. db.JournalEntries.Add(entry)
   (SaveChanges do caller chịu trách nhiệm)
```

### 3.3 API tạo bút toán thủ công

**Endpoint:** `POST /api/accounting/journal-entries`

```json
{
  "referenceType": "Manual",
  "referenceId": "uuid",
  "entryDate": "2026-03-01",
  "description": "Điều chỉnh kế toán cuối kỳ",
  "lines": [
    {
      "accountCode": "156",
      "debitAmount": 1500000,
      "creditAmount": 0,
      "description": "Hàng tồn kho điều chỉnh"
    },
    {
      "accountCode": "331",
      "debitAmount": 0,
      "creditAmount": 1500000,
      "description": "Nợ NCC"
    }
  ]
}
```

**Validation mỗi JournalEntryLine:**

| Rule | Lỗi |
|---|---|
| `AccountCode` NotEmpty, MaxLength(20) | required / too long |
| `DebitAmount >= 0` | "Debit amount must be non-negative." |
| `CreditAmount >= 0` | "Credit amount must be non-negative." |
| `DebitAmount > 0 OR CreditAmount > 0` | "Each journal line must have a non-zero debit or credit amount." |
| NOT (Debit > 0 AND Credit > 0) | "A journal line cannot have both a debit and a credit amount." |

**Validation tổng:**

| Rule | Lỗi |
|---|---|
| `Lines` NotEmpty | "Journal entry must have at least one line." |
| `|ΣDebit - ΣCredit| < 0.001` | "Journal entry is not balanced: total debits must equal total credits." |

---

## 4. Bút toán tự động theo sự kiện

### 4.1 GoodsReceipt Confirm — Nhập kho

**Trigger:** `GoodsReceiptService.ConfirmAsync`

```
ReferenceType = "GoodsReceipt"
ReferenceId   = gr.Id
EntryDate     = DateTime.UtcNow
Description   = "Nhập kho {gr.Code}"

Lines:
  DR 156 (Hàng hóa)          totalCost   ← hàng tồn kho tăng
  CR 331 (Phải trả NCC)      totalCost   ← nợ NCC tăng

totalCost = Σ (line.ConvertedQuantity × line.UnitCost)
```

---

### 4.2 SalesOrder Confirm — Bán hàng

**Trigger:** `SalesOrderService.ConfirmAsync`

```
ReferenceType = "SalesOrder"
ReferenceId   = order.Id
Description   = "Bán hàng {order.Code}"

Lines:
  DR 131 (Phải thu KH)       GrandTotal                    ← AR tăng
  CR 511 (Doanh thu)         TotalAmount - DiscountAmount  ← doanh thu thực
  CR 3331 (Thuế GTGT)        VatAmount                     ← VAT đầu ra
  DR 632 (Giá vốn)           cogs                          ← COGS xuất kho
  CR 156 (Hàng hóa)          cogs                          ← tồn kho giảm

Validate:
  ΣDebit  = GrandTotal + cogs
  ΣCredit = (TotalAmount - Discount) + VatAmount + cogs
          = GrandTotal + cogs  ✓

cogs = Σ (line.ConvertedQuantity × product.CostPrice)
```

---

### 4.3 Payment Thu — Khách thanh toán

**Trigger:** `PaymentService.RecordPaymentAsync` (PartnerType=Customer)

```
ReferenceType = "Payment"
ReferenceId   = payment.Id
Description   = "Thu tiền khách hàng"

Nếu PaymentMethod = Cash:
  DR 111 (Tiền mặt)          Amount  ← tiền vào két
  CR 131 (Phải thu KH)       Amount  ← AR giảm

Nếu PaymentMethod = BankTransfer:
  DR 112 (Tiền gửi NH)       Amount  ← tiền vào tài khoản NH
  CR 131 (Phải thu KH)       Amount  ← AR giảm
```

---

### 4.4 Payment Chi — Trả tiền NCC

**Trigger:** `PaymentService.RecordPaymentAsync` (PartnerType=Supplier)

```
Description = "Thanh toán nhà cung cấp"

Nếu PaymentMethod = Cash:
  DR 331 (Phải trả NCC)      Amount  ← AP giảm
  CR 111 (Tiền mặt)          Amount  ← tiền rời két

Nếu PaymentMethod = BankTransfer:
  DR 331 (Phải trả NCC)      Amount  ← AP giảm
  CR 112 (Tiền gửi NH)       Amount  ← tiền rời NH
```

---

### 4.5 SalesReturn Confirm — Trả hàng bán

**Trigger:** `SalesReturnService.ConfirmAsync` — tạo **2 bút toán** (Journal 1 + Journal 2)

```
Journal 1 (luôn tạo):
  ReferenceType = "SalesReturn"
  Description   = "Sales return {ret.Code}"
  
  DR 511 (Doanh thu)         TotalRefundAmount  ← doanh thu đảo ngược
  CR 131 (Phải thu KH)       TotalRefundAmount  ← AR giảm

Journal 2 (chỉ khi cogs > 0):
  ReferenceType = "SalesReturn"
  Description   = "COGS reversal {ret.Code}"
  
  DR 156 (Hàng hóa)          cogs  ← hàng quay về kho
  CR 632 (Giá vốn)           cogs  ← COGS đảo ngược

Journal 3 (chỉ khi IsRefunded = true):
  ReferenceType = "SalesReturnRefund"
  Description   = "Cash refund {ret.Code}"
  
  DR 131 (Phải thu KH)       TotalRefundAmount  ← AR giảm (xóa khoản phải thu)
  CR 111 (Tiền mặt)          TotalRefundAmount  ← tiền rời két
```

---

### 4.6 PurchaseReturn Confirm — Trả hàng NCC

**Trigger:** `PurchaseReturnService.ConfirmAsync`

```
ReferenceType = "PurchaseReturn"
Description   = "Trả hàng NCC {ret.Code}"

DR 331 (Phải trả NCC)      totalReturnAmount  ← AP giảm
CR 156 (Hàng hóa)          totalReturnAmount  ← tồn kho giảm
```

---

### 4.7 Bảng tổng hợp toàn bộ bút toán

| Sự kiện | DR | CR | Số tiền |
|---|---|---|---|
| GR Confirm | **156** Hàng hóa | **331** Phải trả NCC | totalCost |
| SO Confirm | **131** Phải thu KH | **511** Doanh thu | TotalAmount - Disc |
| SO Confirm | — | **3331** Thuế GTGT | VatAmount |
| SO Confirm | **632** Giá vốn | **156** Hàng hóa | cogs |
| Payment Thu (Cash) | **111** Tiền mặt | **131** Phải thu KH | Amount |
| Payment Thu (Bank) | **112** Tiền gửi NH | **131** Phải thu KH | Amount |
| Payment Chi (Cash) | **331** Phải trả NCC | **111** Tiền mặt | Amount |
| Payment Chi (Bank) | **331** Phải trả NCC | **112** Tiền gửi NH | Amount |
| SalesReturn | **511** Doanh thu | **131** Phải thu KH | TotalRefund |
| SalesReturn COGS | **156** Hàng hóa | **632** Giá vốn | cogs |
| SalesReturn Refund | **131** Phải thu KH | **111** Tiền mặt | TotalRefund |
| PurchaseReturn | **331** Phải trả NCC | **156** Hàng hóa | totalReturn |

---

## 5. Query sổ nhật ký

**Endpoints:**
- `GET /api/accounting/journal-entries` — paginated list
- `GET /api/accounting/accounts` — danh sách tài khoản
- `GET /api/accounting/accounts/{code}` — chi tiết tài khoản

**Filter params cho journal-entries:**

| Param | Cột DB |
|---|---|
| `referenceType` | `JournalEntries.ReferenceType` |
| `referenceId` | `JournalEntries.ReferenceId` |
| `fromDate` | `JournalEntries.EntryDate` |
| `toDate` | `JournalEntries.EntryDate` |

**Include navigation:** `JournalEntries.Lines.Account`

---

## 6. Báo cáo kế toán

Hai báo cáo sử dụng **Dapper** (raw SQL) để hiệu năng cao:

### 6.1 Báo cáo Lãi/Lỗ

**Endpoint:** `GET /api/reports/profit-loss?fromDate=2026-01-01&toDate=2026-03-31`

**Logic (Dapper SQL):**
```sql
-- Doanh thu = Σ CreditAmount của TK 511 trong khoảng thời gian
SELECT SUM(jel.CreditAmount) AS Revenue
FROM JournalEntryLines jel
JOIN Accounts a ON a.Id = jel.AccountId
JOIN JournalEntries je ON je.Id = jel.JournalEntryId
WHERE a.Code = '511'
  AND je.EntryDate BETWEEN @from AND @to
  AND a.TenantId = @tenantId

-- Giá vốn = Σ DebitAmount của TK 632
-- Lợi nhuận = Revenue - COGS
```

### 6.2 Số dư tài khoản

**Endpoint:** `GET /api/reports/account-balances`

```sql
-- Với mỗi tài khoản:
-- Balance = Σ DebitAmount - Σ CreditAmount  (tài khoản Asset/Expense)
-- Balance = Σ CreditAmount - Σ DebitAmount  (tài khoản Liability/Revenue)
```

---

## 7. Bảng DB Tổng Hợp

| Bảng | Vai trò |
|---|---|
| `Accounts` | READ — lookup TK theo Code |
| `JournalEntries` | WRITE — một bút toán cho mỗi sự kiện |
| `JournalEntryLines` | WRITE — mỗi dòng DR/CR |

### Cấu trúc JournalEntry

```
JournalEntries
  Id            uuid PK
  Code          text  "JE-YYYYMMDD-HHmmss-XXXXXX"
  ReferenceType text  "SalesOrder" | "GoodsReceipt" | "Payment" | "SalesReturn" | "PurchaseReturn" | "SalesReturnRefund"
  ReferenceId   uuid  ID chứng từ gốc
  EntryDate     timestamptz
  Description   text

JournalEntryLines
  Id            uuid PK
  JournalEntryId uuid FK (CASCADE DELETE)
  AccountId     uuid FK → Accounts
  DebitAmount   numeric(18,2)
  CreditAmount  numeric(18,2)
  Description   text?
```

### Số bút toán per nghiệp vụ

| Sự kiện | Số JournalEntry | Số JournalEntryLines |
|---|---|---|
| GR Confirm | 1 | 2 |
| SO Confirm | 1 | 5 |
| Payment | 1 | 2 |
| SalesReturn (không refund, có cogs) | 2 | 2 + 2 = 4 |
| SalesReturn (có refund, có cogs) | 3 | 2 + 2 + 2 = 6 |
| PurchaseReturn | 1 | 2 |
