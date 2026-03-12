# POST /api/v1/roles — Tạo vai trò mới

## Mô tả

Tạo một vai trò tùy chỉnh mới cho tenant. Vai trò mới tạo không có quyền nào; sử dụng `PUT /{id}/permissions` để gán quyền.

## Request

```
POST /api/v1/roles
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Body

```json
{
  "name": "Cashier",
  "description": "Thu ngân bán hàng"
}
```

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `name` | string | Có | Phải là duy nhất trong tenant |
| `description` | string | Không | |

## Response 201

```json
{
  "data": {
    "id": "role-uuid-new",
    "name": "Cashier",
    "description": "Thu ngân bán hàng",
    "isSystemRole": false,
    "permissions": []
  },
  "success": true,
  "message": null
}
```

Header `Location: /api/v1/roles/{newId}` được trả về kèm.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ (thiếu `name`, tên trùng) |
| 401 | Chưa xác thực |
| 403 | Không có quyền Admin |
