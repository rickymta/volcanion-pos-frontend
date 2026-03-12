# POST /api/v1/warehouses — Tạo kho hàng

## Mô tả

Tạo kho hàng mới. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/warehouses
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "code": "KHO-HN01",
  "name": "Kho Hà Nội 01",
  "address": "KCN Bắc Thăng Long",
  "branchId": "branch-uuid-2"
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 20 ký tự |
| `name` | Bắt buộc, tối đa 100 ký tự |

## Response 201

Trả về `WarehouseDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
