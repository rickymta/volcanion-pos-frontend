# GET /api/v1/roles — Danh sách vai trò

## Mô tả

Trả về toàn bộ danh sách vai trò của tenant kèm các quyền đã gán.

## Request

```
GET /api/v1/roles
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

## Response 200

```json
{
  "data": [
    {
      "id": "role-uuid-1",
      "name": "Admin",
      "description": "Quản trị viên hệ thống",
      "isSystemRole": true,
      "permissions": [
        {
          "id": "perm-uuid-1",
          "code": "sales.view",
          "name": "Xem đơn bán hàng",
          "group": "Sales",
          "description": null
        }
      ]
    },
    {
      "id": "role-uuid-2",
      "name": "Cashier",
      "description": "Thu ngân",
      "isSystemRole": false,
      "permissions": []
    }
  ],
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 403 | Không có quyền Admin |
