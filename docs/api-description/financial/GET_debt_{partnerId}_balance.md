# GET /api/v1/debt/{partnerId}/balance

## Mô tả

Lấy số dư công nợ hiện tại của một đối tác.  
Trả về giá trị `balanceAfter` của giao dịch gần nhất trong sổ cái.

> **Quy ước số dư:**
> - **Customer:** dương (+) = khách hàng còn nợ; âm (-) = đã trả dư / hoàn tiền
> - **Supplier:** dương (+) = còn nợ nhà cung cấp; âm (-) = đã trả dư

---

## Request

```http
GET /api/v1/debt/550e8400-e29b-41d4-a716-446655440000/balance?partnerType=0
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `partnerId` | `Guid` | ID của đối tác |

**Query params:**

| Param | Type | Bắt buộc | Mô tả |
|---|---|---|---|
| `partnerType` | `PartnerType` | Có | `0`=Customer, `1`=Supplier |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": 5000000.00
}
```

> Trả về `0` nếu đối tác chưa có bất kỳ giao dịch nào.

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
1. debtService.GetBalanceAsync(partnerId, partnerType, ct)
    ├── SELECT TOP 1 FROM debt_ledgers
    │   WHERE partner_id = ? AND partner_type = ?
    │   ORDER BY transaction_date DESC
    └── Return last.BalanceAfter ?? 0
2. Return 200 decimal
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `debt_ledgers` | SELECT (TOP 1) | `partner_id`, `partner_type`, `balance_after`, ORDER BY `transaction_date DESC` |
