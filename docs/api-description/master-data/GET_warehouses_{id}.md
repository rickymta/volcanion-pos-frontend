# GET /api/v1/warehouses/{id} — Chi tiết kho hàng

## Request

```
GET /api/v1/warehouses/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID kho hàng |

## Response 200

```json
{
  "data": {
    "id": "wh-uuid-1",
    "code": "KHO-HN01",
    "name": "Kho Hà Nội 01",
    "address": "KCN Bắc Thăng Long",
    "status": 0,
    "branchId": "branch-uuid-2",
    "branchName": "Chi nhánh Hà Nội"
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy kho hàng |
