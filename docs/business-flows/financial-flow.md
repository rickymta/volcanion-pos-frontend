# Luồng Tài chính & Kế toán (Financial Flow)

> **Liên quan:** [../api-description/financial/](../api-description/financial/) · [../api-description/reports/](../api-description/reports/)  
> **Database:** [../database/financial/](../database/financial/)

---

## 1. Tổng quan

Module tài chính bao gồm:

| Chức năng | Mục đích |
|---|---|
| **Payments** | Thu tiền AR (khách hàng) / Trả tiền AP (nhà cung cấp) |
| **Operating Expenses** | Ghi nhận chi phí vận hành (thuê mặt bằng, lương, v.v.) |
| **Debt Ledger** | Sổ theo dõi công nợ AR/AP |
| **Journal Entries** | Bảng bút toán kép — tự động tạo bởi hệ thống |
| **Chart of Accounts** | Hệ thống tài khoản kế toán (VAS) |
| **Reports** | P&L, Số dư tài khoản |

---

## 2. Thanh toán — Thu tiền AR (khách hàng) {#thanh-toán-ar}

### Điều kiện

- Invoice tồn tại và chưa thanh toán đủ (`RemainingAmount > 0`)
- `PaymentType = Receive`, `PartnerType = Customer`

### API Call

```
POST /api/v1/payments
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "invoiceId": 456,
  "partnerType": "Customer",
  "partnerId": 123,
  "paymentType": "Receive",
  "amount": 450000,
  "paymentMethod": "Cash",       // Cash / BankTransfer
  "paymentDate": "2024-01-15",
  "referenceNo": "PT-2024-001",
  "note": "Thu tiền đơn hàng 001"
}
```

### Logic xử lý

```
1. Invoice.PaidAmount += amount
2. Invoice.RemainingAmount -= amount
3. Nếu RemainingAmount <= 0: Invoice.Status = Completed

4. DebtLedger (append-only):
   { PartnerType=Customer, PartnerId, CreditAmount=amount,
     ReferenceType=Payment, ReferenceId=paymentId }
   → Số dư AR giảm (DebtBalance = Σ DebitAmount - Σ CreditAmount)

5. JournalEntry:
   DR 111 (Tiền mặt)    += amount   // nếu Cash
   DR 112 (Tiền gửi NH) += amount   // nếu BankTransfer
   CR 131 (Phải thu KH) += amount
```

**API:** [`POST /api/v1/payments`](../api-description/financial/POST_payments.md)

---

## 3. Thanh toán — Trả tiền AP (nhà cung cấp) {#thanh-toán-ap}

### Điều kiện

- Nhà cung cấp có công nợ dương (`DebtBalance > 0`)
- `PaymentType = Pay`, `PartnerType = Supplier`

### API Call

```
POST /api/v1/payments
{
  "partnerType": "Supplier",
  "partnerId": 50,
  "paymentType": "Pay",
  "amount": 4800000,
  "paymentMethod": "BankTransfer",
  "paymentDate": "2024-02-10",
  "referenceNo": "UNC-2024-0010"
}
```

### Logic xử lý

```
1. DebtLedger (append-only):
   { PartnerType=Supplier, PartnerId, DebitAmount=amount }
   → Số dư AP giảm

2. JournalEntry:
   DR 331 (Phải trả NCC)    += amount
   CR 112 (Tiền gửi NH)     += amount   // hoặc CR 111 nếu Cash
```

---

## 4. Xem công nợ đối tác

### Xem số dư công nợ

```
GET /api/v1/financial/debt/{partnerId}/balance
Query: ?partnerType=Customer   // hoặc Supplier

Response:
{
  "partnerId": 123,
  "partnerType": "Customer",
  "partnerName": "Công ty ABC",
  "totalDebit": 3000000,     // tổng phát sinh Nợ (AR)
  "totalCredit": 2500000,    // tổng phát sinh Có (thanh toán)
  "balance": 500000          // còn phải thu
}
```

**API:** [`GET /api/v1/financial/debt/{partnerId}/balance`](../api-description/financial/GET_debt_{partnerId}_balance.md)

### Xem sổ cái công nợ

```
GET /api/v1/financial/debt/{partnerId}/ledger
Query: ?partnerType=Customer&fromDate=2024-01-01&toDate=2024-01-31

Response: [
  {
    "date": "2024-01-10",
    "type": "Invoice",
    "referenceNo": "INV-001",
    "debitAmount": 1500000,   // tạo AR
    "creditAmount": 0,
    "runningBalance": 1500000
  },
  {
    "date": "2024-01-15",
    "type": "Payment",
    "referenceNo": "PT-001",
    "debitAmount": 0,
    "creditAmount": 1500000,  // thu tiền
    "runningBalance": 0
  }
]
```

**API:** [`GET /api/v1/financial/debt/{partnerId}/ledger`](../api-description/financial/GET_debt_{partnerId}_ledger.md)  
**Bảng:** [`DebtLedgers`](../database/financial/DebtLedgers.md) — append-only

---

## 5. Chi phí vận hành (Operating Expenses)

### 5.1 Tạo chi phí

```
POST /api/v1/financial/operating-expenses
{
  "expenseDate": "2024-01-31",
  "category": "Rent",           // Rent / Salary / Utilities / Marketing / Other
  "amount": 15000000,
  "description": "Tiền thuê mặt bằng tháng 1/2024",
  "branchId": 1
}
```

**Response:** `201 Created` — `OperatingExpense` với `Status = Draft`

**API:** [`POST /api/v1/financial/operating-expenses`](../api-description/financial/POST_operating-expenses.md)

### 5.2 Xác nhận chi phí

```
POST /api/v1/financial/operating-expenses/{id}/confirm
→ OperatingExpense.Status: Draft → Confirmed

JournalEntry:
  DR 642/641 (Chi phí quản lý/bán hàng) += amount
  CR 111/112 (Tiền)                      += amount
```

**API:** [`POST /api/v1/financial/operating-expenses/{id}/confirm`](../api-description/financial/POST_operating-expenses_{id}_confirm.md)

### 5.3 Phân bổ chi phí

```
POST /api/v1/financial/operating-expenses/allocate
{
  "expenseId": 800,
  "allocations": [
    { "branchId": 1, "amount": 8000000 },
    { "branchId": 2, "amount": 7000000 }
  ]
}
→ Phân bổ chi phí chung cho nhiều chi nhánh
```

**API:** [`POST /api/v1/financial/operating-expenses/allocate`](../api-description/financial/POST_operating-expenses_allocate.md)

---

## 6. Bút toán kế toán (Journal Entries)

Tất cả bút toán được hệ thống tự động tạo — **không nhập thủ công** (trong luồng cơ bản).

### Xem bút toán

```
GET /api/v1/financial/journal-entries
Query: ?fromDate=2024-01-01&toDate=2024-01-31
       &referenceType=Invoice    // Invoice / Payment / GoodsReceipt / ...
       &accountCode=131

Response: [
  {
    "id": 5001,
    "date": "2024-01-10",
    "description": "Bán hàng - SO #001",
    "referenceType": "Invoice",
    "referenceId": 456,
    "totalDebit": 1500000,
    "totalCredit": 1500000,
    "lines": [
      { "accountCode": "131", "accountName": "Phải thu KH", "debit": 1500000, "credit": 0 },
      { "accountCode": "511", "accountName": "Doanh thu", "debit": 0, "credit": 1363636 },
      { "accountCode": "3331", "accountName": "Thuế GTGT", "debit": 0, "credit": 136364 }
    ]
  }
]
```

**API:** [`GET /api/v1/financial/journal-entries`](../api-description/financial/GET_journal-entries.md)  
**Bảng:** [`JournalEntries`](../database/financial/JournalEntries.md) · [`JournalEntryLines`](../database/financial/JournalEntries.md)

### Bảng bút toán tự động theo sự kiện

| Sự kiện | Debit | Credit |
|---|---|---|
| SO.Confirm (bán hàng) | 131 (Phải thu KH) | 511 (Doanh thu) + 3331 (Thuế) |
| SO.Confirm (giá vốn) | 632 (COGS) | 156 (Hàng hóa) |
| Payment AR (tiền mặt) | 111 (Tiền mặt) | 131 (Phải thu KH) |
| Payment AR (chuyển khoản) | 112 (Tiền gửi NH) | 131 (Phải thu KH) |
| GR.Confirm | 156 (Hàng hóa) | 331 (Phải trả NCC) |
| Payment AP | 331 (Phải trả NCC) | 111/112 (Tiền) |
| SalesReturn | 511 (Doanh thu) | 131 (Phải thu KH) |
| SalesReturn (COGS) | 156 (Hàng hóa) | 632 (COGS) |
| PurchaseReturn | 331 (Phải trả NCC) | 156 (Hàng hóa) |
| OperatingExpense | 642/641 (Chi phí) | 111/112 (Tiền) |

---

## 7. Danh mục tài khoản kế toán

```
GET /api/v1/financial/accounts
→ Toàn bộ Chart of Accounts theo VAS

GET /api/v1/financial/accounts/{code}
→ Chi tiết tài khoản + số dư hiện tại
→ code = "131", "331", "156", ...
```

**API:** [`GET /api/v1/financial/accounts`](../api-description/financial/GET_accounts.md) · [`GET /api/v1/financial/accounts/{code}`](../api-description/financial/GET_accounts_{code}.md)  
**Bảng:** [`Accounts`](../database/financial/Accounts.md)

---

## 8. Báo cáo tài chính

### 8.1 Báo cáo lợi nhuận lỗ (P&L)

```
GET /api/v1/reports/profit-loss
Query: ?fromDate=2024-01-01&toDate=2024-01-31&branchId=1

Response:
{
  "period": "2024-01",
  "revenue": 85000000,
  "cogs": 52000000,
  "grossProfit": 33000000,
  "operatingExpenses": 15000000,
  "netProfit": 18000000
}
```

**API:** [`GET /api/v1/reports/profit-loss`](../api-description/reports/GET_reports_profit-loss.md)

### 8.2 Báo cáo số dư tài khoản

```
GET /api/v1/reports/account-balances
Query: ?asOfDate=2024-01-31

Response: [
  { "accountCode": "111", "accountName": "Tiền mặt", "balance": 12000000 },
  { "accountCode": "131", "accountName": "Phải thu KH", "balance": 8500000 },
  { "accountCode": "156", "accountName": "Hàng tồn kho", "balance": 45000000 },
  ...
]
```

**API:** [`GET /api/v1/reports/account-balances`](../api-description/reports/GET_reports_account-balances.md)

---

## 9. Xem danh sách thanh toán

```
GET /api/v1/payments               → Danh sách (filter: type, partner, date)
GET /api/v1/payments/{id}          → Chi tiết thanh toán
GET /api/v1/financial/operating-expenses          → Danh sách chi phí
GET /api/v1/financial/operating-expenses/{id}     → Chi tiết chi phí
```

---

## 10. Bảng dữ liệu liên quan

| Bảng | Vai trò |
|---|---|
| [`Payments`](../database/financial/Payments.md) | Phiếu thu/chi |
| [`DebtLedgers`](../database/financial/DebtLedgers.md) | Sổ cái công nợ (append-only) |
| [`Accounts`](../database/financial/Accounts.md) | Danh mục tài khoản kế toán |
| [`JournalEntries`](../database/financial/JournalEntries.md) | Phiếu bút toán |
| [`JournalEntryLines`](../database/financial/JournalEntries.md) | Chi tiết bút toán (Debit/Credit) |
