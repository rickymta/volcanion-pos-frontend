# GET /api/v1/accounting/journal-entries

## Mô tả

Lấy danh sách bút toán kế toán (journal entries) với bộ lọc linh hoạt.  
Mỗi bút toán bao gồm nhiều dòng (lines) thể hiện cặp Nợ/Có cân bằng (double-entry).

---

## Request

```http
GET /api/v1/accounting/journal-entries?referenceType=10&referenceId={uuid}&fromDate=2026-01-01&page=1&pageSize=20
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `referenceType` | `DocumentReferenceType?` | null | Loại chứng từ nguồn (Invoice=10, Payment=15, GoodsReceipt, Expense…) |
| `referenceId` | `Guid?` | null | ID chứng từ nguồn cụ thể |
| `fromDate` | `DateTime?` | null | Từ ngày ghi sổ |
| `toDate` | `DateTime?` | null | Đến ngày ghi sổ |
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
                "code": "JE-20260310-143022-ABC123",
                "referenceType": 15,
                "referenceId": "uuid",
                "entryDate": "2026-03-10T08:00:00Z",
                "description": "Thu tien khach hang",
                "lines": [
                    {
                        "id": "uuid",
                        "accountId": "uuid",
                        "accountCode": "111",
                        "accountName": "Tiền mặt",
                        "debitAmount": 5000000.00,
                        "creditAmount": 0.00,
                        "description": null
                    },
                    {
                        "id": "uuid",
                        "accountId": "uuid",
                        "accountCode": "131",
                        "accountName": "Phải thu khách hàng",
                        "debitAmount": 0.00,
                        "creditAmount": 5000000.00,
                        "description": null
                    }
                ]
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
1. accountingService.GetJournalEntriesAsync(filter, ct)
    ├── SELECT journal_entries
    │   INCLUDE lines → accounts
    │   WHERE (filters: reference_type, reference_id, from_date, to_date)
    │   ORDER BY entry_date DESC
    │   SKIP + TAKE
    └── Map → JournalEntryDto[] (kèm JournalEntryLineDto[])
2. Return 200 PagedResult<JournalEntryDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `journal_entries` | SELECT + COUNT | `reference_type`, `reference_id`, `entry_date` (ORDER BY DESC) |
| `journal_entry_lines` | JOIN (Include) | `journal_entry_id`, `account_id`, `debit_amount`, `credit_amount` |
| `accounts` | JOIN (Include) | `id`, `code`, `name` |
