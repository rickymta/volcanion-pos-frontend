# GET /api/v1/suppliers/{id} — Chi tiết nhà cung cấp

## Request

```
GET /api/v1/suppliers/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID nhà cung cấp |

## Response 200

```json
{
  "data": {
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
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy nhà cung cấp |
