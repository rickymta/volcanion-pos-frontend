# POST /api/v1/products/{productId}/unit-conversions — Tạo quy đổi đơn vị

## Mô tả

Thêm quy đổi đơn vị cho sản phẩm. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/products/{productId}/unit-conversions
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `productId` | guid | ID sản phẩm (được inject tự động vào body) |

### Request body

```json
{
  "fromUnitId": "unit-uuid-kg",
  "toUnitId": "unit-uuid-g",
  "conversionRate": 1000
}
```

> `productId` được lấy từ route parameter, không cần truyền trong body.

### Validation

| Trường | Quy tắc |
|---|---|
| `fromUnitId` | Bắt buộc |
| `toUnitId` | Bắt buộc, phải khác `fromUnitId` |
| `conversionRate` | > 0 |

## Response 201

Trả về `ProductUnitConversionDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ / `fromUnitId` == `toUnitId` |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy sản phẩm |
