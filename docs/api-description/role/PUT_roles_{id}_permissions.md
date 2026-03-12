# PUT /api/v1/roles/{id}/permissions — Gán quyền cho vai trò

## Mô tả

Thay thế toàn bộ danh sách quyền của một vai trò. Danh sách quyền mới **ghi đè hoàn toàn** danh sách cũ (không phải append). Để xóa hết quyền, truyền mảng rỗng.

## Request

```
PUT /api/v1/roles/{id}/permissions
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | guid | Có | ID vai trò |

### Body

```json
{
  "permissionIds": [
    "perm-uuid-1",
    "perm-uuid-2",
    "perm-uuid-3"
  ]
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `permissionIds` | guid[] | Có | Danh sách ID quyền. Mảng rỗng = xóa hết quyền. |

## Response 200

```json
{
  "data": {
    "id": "role-uuid-1",
    "name": "Manager",
    "description": "Quản lý",
    "isSystemRole": false,
    "permissions": [
      {
        "id": "perm-uuid-1",
        "code": "sales.confirm",
        "name": "Xác nhận đơn bán hàng",
        "group": "Sales",
        "description": null
      }
    ]
  },
  "success": true,
  "message": null
}
```

## Lưu ý

Sử dụng `GET /api/v1/roles/permissions` để lấy danh sách tất cả Permission ID hợp lệ trước khi gán.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | ID quyền không hợp lệ hoặc không tồn tại |
| 401 | Chưa xác thực |
| 403 | Không có quyền Admin |
| 404 | Không tìm thấy vai trò |
