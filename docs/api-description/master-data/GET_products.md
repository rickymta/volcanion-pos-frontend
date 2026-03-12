# GET /api/v1/products — Danh sách sản phẩm

## Mô tả

Trả về danh sách sản phẩm có hỗ trợ lọc và phân trang.

## Request

```
GET /api/v1/products
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `keyword` | string | Không | Tìm theo tên hoặc mã sản phẩm |
| `categoryId` | guid | Không | Lọc theo danh mục |
| `status` | int | Không | `0` = Active, `1` = Inactive |
| `page` | int | Không | Trang hiện tại (mặc định: 1) |
| `pageSize` | int | Không | Số bản ghi/trang (mặc định: 20) |

## Response 200

```json
{
  "data": {
    "items": [
      {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "code": "SP001",
        "name": "Cà phê Arabica",
        "description": "Cà phê hạt nguyên chất",
        "categoryId": "a1b2c3d4-...",
        "categoryName": "Cà phê",
        "baseUnitId": "u1u2u3u4-...",
        "baseUnitName": "Gram",
        "purchaseUnitId": "u5u6u7u8-...",
        "purchaseUnitName": "Kg",
        "salesUnitId": "u9uAuBuC-...",
        "salesUnitName": "Gói",
        "costPrice": 150000,
        "salePrice": 220000,
        "vatRate": 10,
        "isBatchManaged": false,
        "isExpiryManaged": true,
        "costingMethod": 0,
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
