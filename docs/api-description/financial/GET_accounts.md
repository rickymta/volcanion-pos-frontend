# GET /api/v1/accounting/accounts

## Mô tả

Lấy danh sách tài khoản kế toán (VAS chart of accounts) của tenant, có phân trang.  
Tài khoản được sắp xếp theo mã (`code ASC`).

---

## Request

```http
GET /api/v1/accounting/accounts?page=1&pageSize=100
Authorization: Bearer {access_token}
X-Tenant-Id: {tenant_guid}
```

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | `int` | 1 | Số trang |
| `pageSize` | `int` | 100 | Số tài khoản mỗi trang |

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "data": {
        "items": [
            {
                "id": "uuid",
                "code": "111",
                "name": "Tiền mặt",
                "accountType": 0,
                "normalBalance": 0,
                "description": "Tiền mặt VNĐ",
                "parentAccountId": null,
                "parentAccountCode": null
            },
            {
                "id": "uuid",
                "code": "131",
                "name": "Phải thu khách hàng",
                "accountType": 0,
                "normalBalance": 0,
                "description": null,
                "parentAccountId": null,
                "parentAccountCode": null
            }
        ],
        "totalCount": 20,
        "page": 1,
        "pageSize": 100,
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
1. accountingService.GetAccountsAsync(page, pageSize, ct)
    ├── SELECT accounts WHERE tenant_id = ?
    │   ORDER BY code ASC
    │   SKIP + TAKE
    └── Map → AccountDto[]
2. Return 200 PagedResult<AccountDto>
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns |
|---|---|---|
| `accounts` | SELECT + COUNT | `tenant_id`, ORDER BY `code ASC` |
