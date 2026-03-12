# PUT /api/v1/products/{id} — Cập nhật sản phẩm

## Mô tả

Cập nhật thông tin sản phẩm. Yêu cầu quyền **Manager** hoặc **Admin**.

> Lưu ý: Trường `code` không được phép cập nhật sau khi tạo.

## Request

```
PUT /api/v1/products/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID sản phẩm |

### Request body

```json
{
  "name": "Cà phê Arabica Premium",
  "description": "Cà phê hạt nguyên chất loại 1",
  "categoryId": "a1b2c3d4-...",
  "purchaseUnitId": "u5u6u7u8-...",
  "salesUnitId": "u9uAuBuC-...",
  "costPrice": 160000,
  "salePrice": 230000,
  "vatRate": 10,
  "isBatchManaged": false,
  "isExpiryManaged": true,
  "costingMethod": 0,
  "status": 0
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `name` | Bắt buộc, tối đa 200 ký tự |
| `categoryId` | Bắt buộc |
| `costPrice` | ≥ 0 |
| `salePrice` | ≥ 0 |
| `vatRate` | 0 – 100 |

## Response 200

Trả về `ProductDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy sản phẩm |
