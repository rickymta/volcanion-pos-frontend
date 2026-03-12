# Master Data — Tổng quan

## Các controller trong nhóm

| Controller | Route prefix | Mô tả |
|---|---|---|
| ProductsController | `/api/v1/products` | Quản lý sản phẩm |
| CategoriesController | `/api/v1/categories` | Danh mục sản phẩm (cây phân cấp) |
| BranchesController | `/api/v1/branches` | Chi nhánh (cây phân cấp) |
| WarehousesController | `/api/v1/warehouses` | Kho hàng |
| CustomersController | `/api/v1/customers` | Khách hàng |
| SuppliersController | `/api/v1/suppliers` | Nhà cung cấp |
| UnitsController | `/api/v1/units` | Đơn vị tính |
| ProductUnitConversionsController | `/api/v1/products/{productId}/unit-conversions` | Quy đổi đơn vị sản phẩm |

## Xác thực & phân quyền

- Tất cả endpoint đều yêu cầu `[Authorize]` (Bearer JWT + `X-Tenant-Id` header).
- **GET** (xem danh sách / chi tiết): mọi role đăng nhập.
- **POST / PUT** (tạo / cập nhật): `RequireManager` = Admin hoặc Manager.
- **DELETE**: `RequireAdmin` = chỉ Admin.
- **Ngoại lệ — Branches**: POST / PUT / DELETE đều yêu cầu `RequireAdmin`.

## Rate limit

200 req/phút (general limiter).

## Phân trang chuẩn

Các endpoint GET list trả về `PagedResult<T>`:

```json
{
  "data": {
    "items": [...],
    "totalCount": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "success": true,
  "message": null
}
```

## Trạng thái EntityStatus

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Active | Đang hoạt động |
| `1` — Inactive | Đã ngừng |

## CostingMethod (Phương pháp tính giá vốn)

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Average | Giá vốn bình quân gia quyền |
| `1` — FIFO | Nhập trước xuất trước |
