# PUT /api/v1/suppliers/{id} — Cập nhật nhà cung cấp

## Mô tả

Cập nhật thông tin nhà cung cấp. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
PUT /api/v1/suppliers/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID nhà cung cấp |

### Request body

```json
{
  "name": "Công ty TNHH ABC (updated)",
  "phone": "028-9999-8888",
  "email": "new@abc.vn",
  "address": "KCN Tân Bình (mới), TP.HCM",
  "taxCode": "0123456789",
  "status": 0,
  "paymentTermDays": 45,
  "creditLimit": 100000000
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `name` | Bắt buộc, tối đa 200 ký tự |
| `phone` | Tối đa 20 ký tự (nếu có) |
| `email` | Định dạng email hợp lệ (nếu có) |

## Response 200

Trả về `SupplierDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy nhà cung cấp |
