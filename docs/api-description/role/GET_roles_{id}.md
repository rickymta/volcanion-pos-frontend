# GET /api/v1/roles/{id} — Chi tiết vai trò

## Mô tả

Trả về thông tin chi tiết một vai trò bao gồm danh sách quyền đã gán.

## Request

```
GET /api/v1/roles/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `id` | guid | Có | ID vai trò |

## Response 200

```json
{
  "data": {
    "id": "role-uuid-1",
    "name": "Manager",
    "description": "Quản lý cửa hàng",
    "isSystemRole": false,
    "permissions": [
      {
        "id": "perm-uuid-1",
        "code": "sales.confirm",
        "name": "Xác nhận đơn bán hàng",
        "group": "Sales",
        "description": null
      },
      {
        "id": "perm-uuid-2",
        "code": "report.view",
        "name": "Xem báo cáo",
        "group": "Reports",
        "description": null
      }
    ]
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 403 | Không có quyền Admin |
| 404 | Không tìm thấy vai trò |
