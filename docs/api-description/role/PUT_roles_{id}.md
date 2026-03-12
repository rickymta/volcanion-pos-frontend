# PUT /api/v1/roles/{id} — Cập nhật vai trò

## Mô tả

Cập nhật tên và mô tả của một vai trò. Không thể cập nhật vai trò hệ thống (`isSystemRole = true`).

## Request

```
PUT /api/v1/roles/{id}
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
  "name": "Senior Cashier",
  "description": "Thu ngân cấp cao"
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `name` | string | Có | Phải là duy nhất trong tenant |
| `description` | string | Không | |

## Response 200

```json
{
  "data": {
    "id": "role-uuid-1",
    "name": "Senior Cashier",
    "description": "Thu ngân cấp cao",
    "isSystemRole": false,
    "permissions": []
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Tên trùng hoặc cố sửa vai trò hệ thống |
| 401 | Chưa xác thực |
| 403 | Không có quyền Admin |
| 404 | Không tìm thấy vai trò |
