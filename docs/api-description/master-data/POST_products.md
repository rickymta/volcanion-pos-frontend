# POST /api/v1/products — Tạo sản phẩm

## Mô tả

Tạo mới sản phẩm. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/products
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "code": "SP001",
  "name": "Cà phê Arabica",
  "description": "Cà phê hạt nguyên chất",
  "categoryId": "a1b2c3d4-...",
  "baseUnitId": "u1u2u3u4-...",
  "purchaseUnitId": "u5u6u7u8-...",
  "salesUnitId": "u9uAuBuC-...",
  "costPrice": 150000,
  "salePrice": 220000,
  "vatRate": 10,
  "isBatchManaged": false,
  "isExpiryManaged": true,
  "costingMethod": 0
}
```

### Validation (FluentValidation)

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 50 ký tự |
| `name` | Bắt buộc, tối đa 200 ký tự |
| `description` | Tối đa 500 ký tự (nếu có) |
| `categoryId` | Bắt buộc |
| `baseUnitId` | Bắt buộc |
| `purchaseUnitId` | Bắt buộc |
| `salesUnitId` | Bắt buộc |
| `costPrice` | ≥ 0 |
| `salePrice` | ≥ 0 |
| `vatRate` | 0 – 100 (ví dụ: 10 = 10%) |

## Response 201

```json
{
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "code": "SP001",
    "name": "Cà phê Arabica",
    ...
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
