# DELETE /api/v1/branches/{id} — Xóa chi nhánh

## Mô tả

Xóa chi nhánh. Yêu cầu quyền **Admin**.

> Lưu ý: Xóa thất bại nếu chi nhánh còn chi nhánh con hoặc liên kết với người dùng / kho hàng.

## Request

```
DELETE /api/v1/branches/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID chi nhánh |

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
| 400 | Chi nhánh còn phụ thuộc |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Admin) |
| 404 | Không tìm thấy chi nhánh |
