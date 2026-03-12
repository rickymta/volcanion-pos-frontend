# POST /api/v1/customers — Tạo khách hàng

## Mô tả

Tạo khách hàng mới. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/customers
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "code": "KH001",
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "nva@example.com",
  "address": "123 Lê Lợi, Q1, TP.HCM",
  "taxCode": null,
  "creditLimit": 5000000,
  "paymentTermDays": 30,
  "openingBalance": 0
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 20 ký tự |
| `name` | Bắt buộc, tối đa 200 ký tự |
| `phone` | Tối đa 20 ký tự, chỉ chứa chữ số / `+` `-` `(` `)` `space` (nếu có) |
| `email` | Định dạng email hợp lệ (nếu có) |
| `taxCode` | Tối đa 20 ký tự (nếu có) |
| `creditLimit` | ≥ 0 |
| `paymentTermDays` | ≥ 0 |

## Response 201

Trả về `CustomerDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
