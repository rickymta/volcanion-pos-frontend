# DELETE /api/v1/categories/{id} — Xóa danh mục

## Mô tả

Xóa danh mục. Yêu cầu quyền **Admin**.

> Lưu ý: Xóa thất bại nếu danh mục còn sản phẩm hoặc danh mục con.

## Request

```
DELETE /api/v1/categories/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID danh mục |

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
| 400 | Danh mục còn sản phẩm / danh mục con |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Admin) |
| 404 | Không tìm thấy danh mục |
