# PUT /api/v1/customers/{id} — Cập nhật khách hàng

## Mô tả

Cập nhật thông tin khách hàng. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
PUT /api/v1/customers/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID khách hàng |

### Request body

```json
{
  "name": "Nguyễn Văn A (updated)",
  "phone": "0907654321",
  "email": "updated@example.com",
  "address": "456 Lê Lợi, Q1, TP.HCM",
  "taxCode": null,
  "creditLimit": 10000000,
  "paymentTermDays": 45,
  "status": 0
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `name` | Bắt buộc, tối đa 200 ký tự |
| `phone` | Tối đa 20 ký tự, ký tự hợp lệ (nếu có) |
| `email` | Định dạng email hợp lệ (nếu có) |
| `creditLimit` | ≥ 0 |
| `paymentTermDays` | ≥ 0 |

## Response 200

Trả về `CustomerDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy khách hàng |
