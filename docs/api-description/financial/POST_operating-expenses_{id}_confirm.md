# POST /api/v1/operating-expenses/{id}/confirm

## Mô tả

Xác nhận khoản chi phí từ trạng thái **Draft → Confirmed**.  
Khi xác nhận, hệ thống tự động tạo bút toán kế toán:

```
DR expenseAccountCode (641/642) — Ghi nhận chi phí
CR paymentAccountCode (111/112/331) — Ghi nhận thanh toán
```

> Chỉ chi phí ở trạng thái **Draft** mới có thể confirm. Các trạng thái khác sẽ trả về 400.

---

## Request

```http
POST /api/v1/operating-expenses/550e8400-e29b-41d4-a716-446655440000/confirm
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Body:** _(không có)_

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "code": "EXP-20260310-AB1234",
        "expenseType": 0,
        "description": "Chi phí vận chuyển tháng 3",
        "amount": 2000000.00,
        "allocatedAmount": 0.00,
        "remainingAmount": 2000000.00,
        "expenseDate": "2026-03-10T00:00:00Z",
        "expenseAccountCode": "641",
        "paymentAccountCode": "111",
        "status": 1,
        "allocations": []
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Chi phí không ở trạng thái Draft (`"Only Draft expenses can be confirmed. Current status: ..."`) |
| `401` | Token không hợp lệ |
| `403` | Role không phải Admin hoặc Manager |
| `404` | Chi phí không tồn tại |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. accountingService.ConfirmExpenseAsync(id, ct)
    ├── SELECT operating_expenses INCLUDE allocations WHERE id = ?
    │   → không có: NotFoundException 404
    ├── Kiểm tra status == Draft
    │   → không phải Draft: throw AppException 400
    ├── Tạo bút toán:
    │   CreateFromLinesAsync(
    │     referenceType = Expense,
    │     referenceId = expense.Id,
    │     entryDate = expense.ExpenseDate,
    │     lines = [
    │       (expenseAccountCode, debit=amount, credit=0),   ← DR 641/642
    │       (paymentAccountCode, debit=0, credit=amount)    ← CR 111/112/331
    │     ]
    │   )
    ├── expense.Status = Confirmed
    └── SaveChangesAsync()
2. Return 200 OperatingExpenseDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `operating_expenses` | SELECT + UPDATE | `id`, `status = Confirmed` |
| `journal_entries` | INSERT | `code`, `reference_type=Expense`, `reference_id`, `entry_date`, `description` |
| `journal_entry_lines` | INSERT | `account_id`, `debit_amount`, `credit_amount` |
