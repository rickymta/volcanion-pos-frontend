# DELETE /api/v1/products/{id} — Xóa sản phẩm

## Mô tả

Xóa sản phẩm. Yêu cầu quyền **Admin**.

## Request

```
DELETE /api/v1/products/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID sản phẩm |

## Response 200

```json
{
  "data": "Deleted",
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Admin) |
| 404 | Không tìm thấy sản phẩm |
