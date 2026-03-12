# POST /api/v1/operating-expenses/allocate

## Mô tả

Phân bổ (toàn bộ hoặc một phần) chi phí hoạt động vào Giá vốn hàng bán (TK 632).  
Chỉ áp dụng cho chi phí ở trạng thái **Confirmed**.

Bút toán tạo ra:
```
DR 632 — Giá vốn hàng bán
CR 641/642 (expenseAccountCode) — Kết chuyển chi phí
```

Khi `AllocatedAmount` tích lũy = `Amount` → chi phí tự động chuyển sang trạng thái **Completed**.

---

## Request

```http
POST /api/v1/operating-expenses/allocate
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
Content-Type: application/json

{
    "operatingExpenseId": "uuid",
    "allocatedAmount": 1000000.00,
    "allocationDate": "2026-03-10T00:00:00Z",
    "note": "Phân bổ đợt 1"
}
```

**Validation (`AllocateCostRequestValidator`):**

| Field | Rule |
|---|---|
| `operatingExpenseId` | Required (NotEmpty) |
| `allocatedAmount` | GreaterThan(0) |
| `allocationDate` | Required |
| `note` | MaxLength 500 (nếu có) |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "code": "CA-20260310-XY5678",
        "operatingExpenseId": "uuid",
        "allocatedAmount": 1000000.00,
        "allocationDate": "2026-03-10T00:00:00Z",
        "note": "Phân bổ đợt 1"
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | Validation fail |
| `400` | Chi phí không ở trạng thái Confirmed (`"Chi co the phan bo chi phi da duoc xac nhan"`) |
| `400` | `allocatedAmount <= 0` |
| `400` | `allocatedAmount` vượt quá số tiền còn lại chưa phân bổ |
| `401` | Token không hợp lệ |
| `403` | Role không phải Admin hoặc Manager |
| `404` | Chi phí không tồn tại |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. accountingService.AllocateCostAsync(request, ct)
    ├── SELECT operating_expenses INCLUDE allocations WHERE id = ?
    │   → không có: NotFoundException 404
    ├── Kiểm tra status == Confirmed
    │   → không: throw AppException 400
    ├── remaining = expense.Amount - expense.AllocatedAmount
    ├── Kiểm tra allocatedAmount > 0 (AppException 400)
    ├── Kiểm tra allocatedAmount <= remaining (AppException 400)
    │
    ├── Tạo bút toán:
    │   allocationCode = "CA-{yyyyMMdd}-{6 ký tự random}"
    │   CreateFromLinesAsync(
    │     referenceType = Expense,
    │     referenceId = expense.Id,
    │     entryDate = allocationDate,
    │     lines = [
    │       ("632", debit=allocatedAmount, credit=0),         ← DR 632 Giá vốn
    │       (expenseAccountCode, debit=0, credit=allocatedAmount) ← CR 641/642
    │     ]
    │   )
    │
    ├── INSERT cost_allocations { code, operating_expense_id, allocated_amount, allocation_date, note }
    ├── expense.AllocatedAmount += allocatedAmount
    ├── Nếu expense.AllocatedAmount >= expense.Amount:
    │   expense.Status = Completed
    └── SaveChangesAsync()
2. Return 200 CostAllocationDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `operating_expenses` | SELECT + UPDATE | `id`, `allocated_amount`, `status` (→ Completed nếu đủ) |
| `cost_allocations` | INSERT | `id`, `code`, `operating_expense_id`, `allocated_amount`, `allocation_date`, `note` |
| `journal_entries` | INSERT | `code`, `reference_type=Expense`, `reference_id`, `entry_date` |
| `journal_entry_lines` | INSERT | `account_id=632`, `debit_amount`; `account_id=641/642`, `credit_amount` |
