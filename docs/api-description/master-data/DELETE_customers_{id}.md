# DELETE /api/v1/customers/{id} — Xóa khách hàng

## Mô tả

Xóa khách hàng. Yêu cầu quyền **Admin**.

## Request

```
DELETE /api/v1/customers/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID khách hàng |

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
| 404 | Không tìm thấy khách hàng |
