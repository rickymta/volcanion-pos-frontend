# PUT /api/v1/products/{productId}/unit-conversions/{id} — Cập nhật quy đổi đơn vị

## Mô tả

Cập nhật tỷ lệ quy đổi. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
PUT /api/v1/products/{productId}/unit-conversions/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `productId` | guid | ID sản phẩm |
| `id` | guid | ID quy đổi đơn vị |

### Request body

```json
{
  "conversionRate": 1000.5
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `conversionRate` | > 0 |

## Response 200

Trả về `ProductUnitConversionDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy |
