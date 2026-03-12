# GET /api/v1/operating-expenses

## Mô tả

Danh sách chi phí hoạt động (selling expenses, general & admin expenses) với phân trang và bộ lọc.

---

## Request

```http
GET /api/v1/operating-expenses?expenseType=0&status=0&fromDate=2026-01-01&page=1&pageSize=20
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `expenseType` | `ExpenseType?` | null | Loại chi phí (xem enum ExpenseType) |
| `status` | `DocumentStatus?` | null | `0`=Draft, `1`=Confirmed, `2`=Completed |
| `fromDate` | `DateTime?` | null | Từ ngày phát sinh |
| `toDate` | `DateTime?` | null | Đến ngày phát sinh |
| `page` | `int` | 1 | Số trang |
| `pageSize` | `int` | 20 | Số bản ghi mỗi trang |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "items": [
            {
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
        ],
        "totalCount": 5,
        "page": 1,
        "pageSize": 20,
        "totalPages": 1
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `403` | Role không phải Admin hoặc Manager |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. accountingService.GetExpensesAsync(filter, ct)
    ├── SELECT operating_expenses INCLUDE allocations
    │   WHERE (filters: expense_type, status, from_date, to_date)  
    │   ORDER BY expense_date DESC
    │   SKIP + TAKE
    └── Map → OperatingExpenseDto[] (kèm CostAllocationDto[])
2. Return 200 PagedResult<OperatingExpenseDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `operating_expenses` | SELECT + COUNT | `expense_type`, `status`, `expense_date` (ORDER BY DESC) |
| `cost_allocations` | JOIN (Include) | `operating_expense_id` |
