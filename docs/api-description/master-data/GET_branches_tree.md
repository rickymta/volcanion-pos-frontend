# GET /api/v1/branches/tree — Cây chi nhánh

## Mô tả

Trả về toàn bộ cây chi nhánh (nested tree).

## Request

```
GET /api/v1/branches/tree
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

## Response 200

```json
{
  "data": [
    {
      "id": "branch-uuid-1",
      "code": "HQ",
      "name": "Trụ sở chính",
      "address": "123 Nguyễn Huệ, Q1, TP.HCM",
      "phone": "028 1234 5678",
      "parentBranchId": null,
      "parentBranchCode": null,
      "status": 0,
      "subBranches": [
        {
          "id": "branch-uuid-2",
          "code": "HN01",
          "name": "Chi nhánh Hà Nội",
          "address": "45 Hoàn Kiếm, Hà Nội",
          "phone": "024 9876 5432",
          "parentBranchId": "branch-uuid-1",
          "parentBranchCode": "HQ",
          "status": 0,
          "subBranches": []
        }
      ]
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
