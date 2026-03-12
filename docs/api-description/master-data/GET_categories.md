# GET /api/v1/categories — Danh mục (cây phân cấp)

## Mô tả

Trả về toàn bộ cây danh mục sản phẩm (nested tree).

## Request

```
GET /api/v1/categories
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

## Response 200

```json
{
  "data": [
    {
      "id": "cat-uuid-1",
      "code": "THUC-UONG",
      "name": "Thức uống",
      "description": null,
      "parentCategoryId": null,
      "children": [
        {
          "id": "cat-uuid-2",
          "code": "CA-PHE",
          "name": "Cà phê",
          "description": null,
          "parentCategoryId": "cat-uuid-1",
          "children": []
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
