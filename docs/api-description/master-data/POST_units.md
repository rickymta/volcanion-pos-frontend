# POST /api/v1/units — Tạo đơn vị tính

## Mô tả

Tạo đơn vị tính mới. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/units
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "name": "Kilogram",
  "symbol": "kg",
  "isBaseUnit": true
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `name` | Bắt buộc, tối đa 100 ký tự |
| `symbol` | Bắt buộc, tối đa 20 ký tự |

## Response 201

Trả về `UnitDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
