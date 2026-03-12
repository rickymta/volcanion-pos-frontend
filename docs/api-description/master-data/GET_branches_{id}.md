# GET /api/v1/branches/{id} — Chi tiết chi nhánh

## Mô tả

Lấy thông tin chi tiết một chi nhánh theo ID.

## Request

```
GET /api/v1/branches/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID chi nhánh |

## Response 200

```json
{
  "data": {
    "id": "branch-uuid-1",
    "code": "HQ",
    "name": "Trụ sở chính",
    "address": "123 Nguyễn Huệ, Q1, TP.HCM",
    "phone": "028 1234 5678",
    "parentBranchId": null,
    "parentBranchCode": null,
    "status": 0
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 404 | Không tìm thấy chi nhánh |
