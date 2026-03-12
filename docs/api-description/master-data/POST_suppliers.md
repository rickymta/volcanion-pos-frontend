# POST /api/v1/suppliers — Tạo nhà cung cấp

## Mô tả

Tạo nhà cung cấp mới. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/suppliers
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "code": "NCC001",
  "name": "Công ty TNHH ABC",
  "phone": "028-1111-2222",
  "email": "contact@abc.vn",
  "address": "KCN Tân Bình, TP.HCM",
  "taxCode": "0123456789",
  "openingBalance": 0,
  "paymentTermDays": 30,
  "creditLimit": 50000000
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 20 ký tự |
| `name` | Bắt buộc, tối đa 200 ký tự |
| `phone` | Tối đa 20 ký tự, ký tự hợp lệ (nếu có) |
| `email` | Định dạng email hợp lệ (nếu có) |
| `taxCode` | Tối đa 20 ký tự (nếu có) |

## Response 201

Trả về `SupplierDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
