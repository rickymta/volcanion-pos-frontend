# POST /api/v1/payments

## Mô tả

Ghi nhận một phiếu thanh toán (thu tiền từ khách hàng hoặc trả tiền cho nhà cung cấp).  
Tự động:
- Cập nhật `PaidAmount` trên Invoice (nếu `invoiceId` được cung cấp)
- Ghi bút toán công nợ (credit = giảm nợ)
- Tạo bút toán kế toán (double-entry)

Endpoint chạy trong **DB transaction**.

---

## Request

```http
POST /api/v1/payments
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "partnerType": 0,
    "partnerId": "uuid-customer",
    "paymentType": 0,
    "paymentDate": "2026-03-10T08:00:00Z",
    "amount": 5000000.00,
    "referenceType": 10,
    "referenceId": "uuid-invoice",
    "paymentMethod": 0,
    "note": "Thu tiền tháng 3",
    "invoiceId": "uuid-invoice"
}
```

**Validation (`RecordPaymentRequestValidator`):**

| Field | Rule |
|---|---|
| `partnerId` | Required (NotEmpty) |
| `paymentDate` | Required (NotEmpty) |
| `amount` | GreaterThan(0) |
| `referenceType` | IsInEnum (required) |
| `referenceId` | Required (NotEmpty) |
| `paymentMethod` | IsInEnum (nếu có) |
| `note` | MaxLength 500 (nếu có) |

**`paymentMethod` → tài khoản kế toán:**
- `0` Cash → TK **111** (Tiền mặt)
- `1` BankTransfer → TK **112** (Tiền gửi ngân hàng)

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "partnerType": 0,
        "partnerId": "uuid",
        "partnerName": "Nguyễn Văn A",
        "paymentType": 0,
        "paymentDate": "2026-03-10T08:00:00Z",
        "amount": 5000000.00,
        "referenceType": 10,
        "referenceId": "uuid",
        "paymentMethod": 0,
        "note": "Thu tiền tháng 3",
        "invoiceId": "uuid"
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail |
| `400` | `amount` vượt quá số dư còn lại của invoice (`"Payment amount exceeds remaining invoice balance"`) |
| `401` | Token không hợp lệ |
| `403` | Role không phải Admin hoặc Manager |
| `404` | Invoice không tồn tại (khi `invoiceId` được cung cấp) |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
Transaction BEGIN
├── INSERT payments
│
├── Nếu invoiceId có:
│   ├── SELECT invoices WHERE id = ?  → 404 nếu không có
│   ├── Kiểm tra amount <= invoice.GrandTotal - invoice.PaidAmount
│   │   → vượt quá: throw AppException 400
│   └── invoice.PaidAmount += amount
│       UPDATE invoices
│
├── debtService.AppendEntryAsync(...)
│   ├── pg_advisory_xact_lock(partnerId) — ngăn race condition
│   ├── Lấy currentBalance từ debt_ledgers (latest)
│   ├── newBalance = currentBalance + 0 - amount  (credit = giảm nợ)
│   └── INSERT debt_ledgers
│
├── accountingService.CreateFromLinesAsync(journal lines):
│   ├── Customer payment (Thu tiền):
│   │   DR 111/112 (cashAccount) / CR 131 (phải thu)
│   └── Supplier payment (Trả tiền):
│       DR 331 (phải trả) / CR 111/112 (cashAccount)
│
├── SaveChangesAsync()
Transaction COMMIT

Return 200 PaymentDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `payments` | INSERT | `id`, `partner_type`, `partner_id`, `payment_type`, `payment_date`, `amount`, `reference_type`, `reference_id`, `payment_method`, `note`, `invoice_id` |
| `invoices` | SELECT + UPDATE | `grand_total`, `paid_amount` |
| `debt_ledgers` | INSERT | `partner_type`, `partner_id`, `reference_type`, `reference_id`, `debit_amount=0`, `credit_amount`, `balance_after`, `transaction_date` |
| `journal_entries` | INSERT | `code`, `reference_type`, `reference_id`, `entry_date`, `description` |
| `journal_entry_lines` | INSERT | `account_id`, `debit_amount`, `credit_amount` |
