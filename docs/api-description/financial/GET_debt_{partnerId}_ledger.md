# GET /api/v1/debt/{partnerId}/ledger

## Mô tả

Lấy sổ cái công nợ (lịch sử giao dịch) của một đối tác. Sắp xếp theo ngày giao dịch giảm dần.  
Dùng để xem toàn bộ biến động công nợ: phát sinh, thanh toán, số dư sau mỗi giao dịch.

---

## Request

```http
GET /api/v1/debt/550e8400-e29b-41d4-a716-446655440000/ledger?partnerType=0&page=1&pageSize=20
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `partnerId` | `Guid` | ID của khách hàng hoặc nhà cung cấp |

**Query params:**

| Param | Type | Bắt buộc | Mô tả |
|---|---|---|---|
| `partnerType` | `PartnerType` | Có | `0`=Customer, `1`=Supplier |
| `page` | `int` | Không | Default 1 |
| `pageSize` | `int` | Không | Default 20 |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "items": [
            {
                "id": "uuid",
                "partnerType": 0,
                "partnerId": "uuid",
                "referenceType": 10,
                "referenceId": "uuid",
                "debitAmount": 10000000.00,
                "creditAmount": 0.00,
                "balanceAfter": 10000000.00,
                "transactionDate": "2026-03-05T00:00:00Z",
                "description": "Bán hàng hóa đơn INV-20260305-001"
            },
            {
                "id": "uuid",
                "partnerType": 0,
                "partnerId": "uuid",
                "referenceType": 15,
                "referenceId": "uuid",
                "debitAmount": 0.00,
                "creditAmount": 5000000.00,
                "balanceAfter": 5000000.00,
                "transactionDate": "2026-03-10T00:00:00Z",
                "description": "Payment Receive"
            }
        ],
        "totalCount": 2,
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
1. debtService.GetLedgerAsync(partnerId, partnerType, page, pageSize, ct)
    ├── SELECT debt_ledgers
    │   WHERE partner_id = ? AND partner_type = ?
    │   ORDER BY transaction_date DESC
    │   SKIP (page-1)*pageSize TAKE pageSize
    └── Map → DebtLedgerDto[]
2. Return 200 PagedResult<DebtLedgerDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `debt_ledgers` | SELECT + COUNT | `partner_id`, `partner_type`, ORDER BY `transaction_date DESC` |
