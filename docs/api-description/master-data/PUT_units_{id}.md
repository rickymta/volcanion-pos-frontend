# PUT /api/v1/units/{id} — Cập nhật đơn vị tính

## Mô tả

Cập nhật đơn vị tính. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
PUT /api/v1/units/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn vị tính |

### Request body

```json
{
  "name": "Kilogram",
  "symbol": "KG",
  "isBaseUnit": true
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `name` | Bắt buộc, tối đa 100 ký tự |
| `symbol` | Bắt buộc, tối đa 20 ký tự |

## Response 200

Trả về `UnitDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy đơn vị tính |
