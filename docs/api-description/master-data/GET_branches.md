# GET /api/v1/branches — Danh sách chi nhánh

## Mô tả

Trả về danh sách chi nhánh dạng bảng phẳng (flat list) có phân trang.

## Request

```
GET /api/v1/branches
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `keyword` | string | Không | Tìm theo tên hoặc mã chi nhánh |
| `status` | int | Không | `0` = Active, `1` = Inactive |
| `page` | int | Không | Mặc định: 1 |
| `pageSize` | int | Không | Mặc định: 20 |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "branch-uuid-1",
        "code": "HQ",
        "name": "Trụ sở chính",
        "address": "123 Nguyễn Huệ, Q1, TP.HCM",
        "phone": "028 1234 5678",
        "parentBranchId": null,
        "parentBranchCode": null,
        "status": 0
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
