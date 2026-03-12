# GET /api/v1/suppliers — Danh sách nhà cung cấp

## Request

```
GET /api/v1/suppliers
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `keyword` | string | Không | Tìm theo tên / mã |
| `status` | int | Không | `0` = Active, `1` = Inactive |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "sup-uuid-1",
        "code": "NCC001",
        "name": "Công ty TNHH ABC",
        "phone": "028-1111-2222",
        "email": "contact@abc.vn",
        "address": "KCN Tân Bình, TP.HCM",
        "taxCode": "0123456789",
        "openingBalance": 0,
        "paymentTermDays": 30,
        "creditLimit": 50000000,
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
