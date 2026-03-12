# DELETE /api/v1/warehouses/{id} — Xóa kho hàng

## Mô tả

Xóa kho hàng. Yêu cầu quyền **Admin**.

## Request

```
DELETE /api/v1/warehouses/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID kho hàng |

## Response 200

```json
{
  "data": "Warehouse deleted",
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Admin) |
| 404 | Không tìm thấy kho hàng |
