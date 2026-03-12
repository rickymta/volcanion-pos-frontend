# GET /api/v1/customers/{id} — Chi tiết khách hàng

## Request

```
GET /api/v1/customers/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID khách hàng |

## Response 200

```json
{
  "data": {
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
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy khách hàng |
