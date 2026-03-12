# PUT /api/v1/warehouses/{id} — Cập nhật kho hàng

## Mô tả

Cập nhật thông tin kho hàng. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
PUT /api/v1/warehouses/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID kho hàng |

### Request body

```json
{
  "name": "Kho Hà Nội 01 (updated)",
  "address": "KCN Nội Bài, Hà Nội",
  "status": 0,
  "branchId": "branch-uuid-2"
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `name` | Bắt buộc, tối đa 100 ký tự |

## Response 200

Trả về `WarehouseDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy kho hàng |
