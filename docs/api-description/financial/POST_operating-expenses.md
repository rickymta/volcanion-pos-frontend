# POST /api/v1/operating-expenses

## Mô tả

Tạo khoản chi phí hoạt động mới với trạng thái **Draft**.  
Chi phí ở Draft chưa tạo bút toán kế toán — cần gọi `/confirm` để xác nhận.

---

## Request

```http
POST /api/v1/operating-expenses
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "expenseType": 0,
    "description": "Chi phí vận chuyển tháng 3",
    "amount": 2000000.00,
    "expenseDate": "2026-03-10T00:00:00Z",
    "expenseAccountCode": "641",
    "paymentAccountCode": "111"
}
```

**Validation (`CreateOperatingExpenseRequestValidator`):**

| Field | Rule |
|---|---|
| `description` | Required, maxLength 500 |
| `amount` | GreaterThan(0) |
| `expenseDate` | Required |
| `expenseAccountCode` | Required, chỉ `"641"` hoặc `"642"` |
| `paymentAccountCode` | Required, chỉ `"111"`, `"112"`, hoặc `"331"` |

**Tài khoản chi phí:**
- `641` — Chi phí bán hàng (Selling expenses)
- `642` — Chi phí quản lý doanh nghiệp (G&A expenses)

**Tài khoản thanh toán:**
- `111` — Tiền mặt
- `112` — Tiền gửi ngân hàng
- `331` — Phải trả nhà cung cấp (ghi nợ NCC)

---

## Response thành công — `201 Created`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "code": "EXP-20260310-AB1234",
        "expenseType": 0,
        "expenseTypeName": "SellingExpense",
        "description": "Chi phí vận chuyển tháng 3",
        "amount": 2000000.00,
        "allocatedAmount": 0.00,
        "remainingAmount": 2000000.00,
        "expenseDate": "2026-03-10T00:00:00Z",
        "expenseAccountCode": "641",
        "paymentAccountCode": "111",
        "status": 0,
        "allocations": []
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail |
| `400` | `expenseAccountCode` không phải 641/642 |
| `400` | `paymentAccountCode` không phải 111/112/331 |
| `400` | Mã tài khoản không tồn tại trong DB (`"Account code '...' not found"`) |
| `401` | Token không hợp lệ |
| `403` | Role không phải Admin hoặc Manager |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. accountingService.CreateExpenseAsync(request, ct)
    ├── Validate account codes tồn tại trong DB:
    │   SELECT code FROM accounts WHERE code IN (expenseAccountCode, paymentAccountCode)
    │   → thiếu: throw AppException 400
    ├── Tạo entity OperatingExpense:
    │   Code = "EXP-{yyyyMMdd}-{6ký tự random}"
    │   Status = Draft
    │   AllocatedAmount = 0
    ├── INSERT operating_expenses
    └── SaveChangesAsync()
2. Return 201 OperatingExpenseDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `accounts` | SELECT | Validate `expenseAccountCode` + `paymentAccountCode` tồn tại |
| `operating_expenses` | INSERT | `id`, `code`, `expense_type`, `description`, `amount`, `expense_date`, `expense_account_code`, `payment_account_code`, `status=Draft`, `allocated_amount=0` |
