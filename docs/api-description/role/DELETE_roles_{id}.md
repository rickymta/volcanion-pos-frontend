# DELETE /api/v1/roles/{id} — Xóa vai trò

## Mô tả

Xóa mềm (soft-delete) một vai trò tùy chỉnh. Không thể xóa vai trò hệ thống (`isSystemRole = true`).

## Request

```
DELETE /api/v1/roles/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | guid | Có | ID vai trò |

## Response 204

Không có body.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Cố xóa vai trò hệ thống |
| 401 | Chưa xác thực |
| 403 | Không có quyền Admin |
| 404 | Không tìm thấy vai trò |
