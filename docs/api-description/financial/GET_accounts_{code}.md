# GET /api/v1/accounting/accounts/{code}

## Mô tả

Lấy chi tiết một tài khoản kế toán theo mã tài khoản VAS (ví dụ: `111`, `131`, `331`).

---

## Request

```http
GET /api/v1/accounting/accounts/111
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Path params:**

| Param | Type | Mô tả |
|---|---|---|
| `code` | `string` | Mã tài khoản (ví dụ: "111", "131", "641") |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "code": "111",
        "name": "Tiền mặt",
        "accountType": 0,
        "normalBalance": 0,
        "description": "Tiền mặt VNĐ",
        "parentAccountId": null,
        "parentAccountCode": null
    }
}
```

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `401` | Token không hợp lệ |
| `403` | Role không phải Admin hoặc Manager |
| `404` | Tài khoản không tồn tại với mã này (`"Account not found"`) |
| `429` | Vượt quá 200 requests/phút |

---

## Logic xử lý

```
1. accountingService.GetAccountByCodeAsync(code, ct)
    ├── SELECT accounts WHERE code = ?
    │   → không có: throw NotFoundException 404
    └── Map → AccountDto
2. Return 200 AccountDto
```

---

## Thao tác với Database

| Bảng | Thao tác | Điều kiện |
|---|---|---|
| `accounts` | SELECT | `code = ?` |
