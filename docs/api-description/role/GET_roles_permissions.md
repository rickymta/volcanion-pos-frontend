# GET /api/v1/roles/permissions — Danh sách tất cả quyền hệ thống

## Mô tả

Trả về danh sách tất cả quyền (permissions) được định nghĩa trong hệ thống. Dùng để tra cứu các `permissionId` hợp lệ trước khi gán quyền cho vai trò.

## Request

```
GET /api/v1/roles/permissions
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

## Response 200

```json
{
  "data": [
    {
      "id": "perm-uuid-1",
      "code": "sales.view",
      "name": "Xem đơn bán hàng",
      "group": "Sales",
      "description": null
    },
    {
      "id": "perm-uuid-2",
      "code": "sales.confirm",
      "name": "Xác nhận đơn bán hàng",
      "group": "Sales",
      "description": null
    },
    {
      "id": "perm-uuid-3",
      "code": "report.view",
      "name": "Xem báo cáo",
      "group": "Reports",
      "description": null
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
