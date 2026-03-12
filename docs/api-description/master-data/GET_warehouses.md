# GET /api/v1/warehouses — Danh sách kho hàng

## Mô tả

Trả về danh sách kho hàng có lọc và phân trang.

## Request

```
GET /api/v1/warehouses
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `keyword` | string | Không | Tìm theo tên / mã kho |
| `status` | int | Không | `0` = Active, `1` = Inactive |
| `branchId` | guid | Không | Lọc theo chi nhánh |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "wh-uuid-1",
        "code": "KHO-HN01",
        "name": "Kho Hà Nội 01",
        "address": "KCN Bắc Thăng Long",
        "status": 0,
        "branchId": "branch-uuid-2",
        "branchName": "Chi nhánh Hà Nội"
      }
    ],
    "totalCount": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
