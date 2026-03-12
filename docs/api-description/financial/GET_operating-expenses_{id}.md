# GET /api/v1/operating-expenses/{id}

## Mô tả

Lấy chi tiết một khoản chi phí hoạt động theo ID, bao gồm danh sách các lần phân bổ.

---

## Request

```http
GET /api/v1/operating-expenses/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `id` | `Guid` | ID của chi phí |

---

## Response thành công — `200 OK`

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
        "allocatedAmount": 1000000.00,
        "remainingAmount": 1000000.00,
        "expenseDate": "2026-03-10T00:00:00Z",
        "expenseAccountCode": "641",
        "paymentAccountCode": "111",
        "status": 1,
        "allocations": [
            {
                "id": "uuid",
                "code": "CA-20260310-XY5678",
                "operatingExpenseId": "uuid",
                "allocatedAmount": 1000000.00,
                "allocationDate": "2026-03-10T00:00:00Z",
                "note": "Phân bổ đợt 1"
            }
        ]
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `403` | Role không phải Admin hoặc Manager |
| `404` | Chi phí không tồn tại (`"OperatingExpense not found"`) |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. accountingService.GetExpenseByIdAsync(id, ct)
    ├── SELECT operating_expenses INCLUDE allocations
    │   WHERE id = ?
    │   → không có: throw NotFoundException 404
    └── Map → OperatingExpenseDto
2. Return 200 OperatingExpenseDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Điều kiện |
|---|---|---|
| `operating_expenses` | SELECT | `id = ?` |
| `cost_allocations` | JOIN (Include) | `operating_expense_id` |
