# DELETE /api/v1/units/{id} — Xóa đơn vị tính

## Mô tả

Xóa đơn vị tính. Yêu cầu quyền **Admin**.

## Request

```
DELETE /api/v1/units/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn vị tính |

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
| 404 | Không tìm thấy đơn vị tính |
