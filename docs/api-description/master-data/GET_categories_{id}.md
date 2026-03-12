# GET /api/v1/categories/{id} — Chi tiết danh mục

## Mô tả

Lấy thông tin một danh mục theo ID.

## Request

```
GET /api/v1/categories/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID danh mục |

## Response 200

```json
{
  "data": {
    "id": "cat-uuid-2",
    "code": "CA-PHE",
    "name": "Cà phê",
    "description": null,
    "parentCategoryId": "cat-uuid-1",
    "children": []
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy danh mục |
