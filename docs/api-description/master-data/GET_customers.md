# GET /api/v1/customers — Danh sách khách hàng

## Request

```
GET /api/v1/customers
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `keyword` | string | Không | Tìm theo tên / mã / số điện thoại |
| `status` | int | Không | `0` = Active, `1` = Inactive |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "cust-uuid-1",
        "code": "KH001",
        "name": "Nguyễn Văn A",
        "phone": "0901234567",
        "email": "nva@example.com",
        "address": "123 Lê Lợi, Q1, TP.HCM",
        "taxCode": null,
        "creditLimit": 5000000,
        "paymentTermDays": 30,
        "openingBalance": 0,
        "status": 0
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
