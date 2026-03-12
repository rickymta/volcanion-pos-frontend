# Operations — Tổng quan

## Các controller trong nhóm

| Controller | Route prefix | Mô tả |
|---|---|---|
| DeliveryOrdersController | `/api/v1/delivery-orders` | Quản lý đơn giao hàng |
| SalesReturnsController | `/api/v1/sales-returns` | Trả hàng bán |
| StockTransfersController | `/api/v1/stock-transfers` | Chuyển kho nội bộ |

## Xác thực & phân quyền

- Tất cả endpoint đều yêu cầu `[Authorize]` (Bearer JWT + `X-Tenant-Id` header).
- **GET / POST tạo / POST action cơ bản**: mọi role đăng nhập.
- **POST `/fail`, `/cancel` (delivery)**: `RequireManager` = Admin hoặc Manager.
- **POST `/confirm` (sales-returns, stock-transfers)**: `RequireManager`.

## Rate limit

200 req/phút (general limiter).

## Trạng thái DeliveryStatus

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Pending | Đang chờ giao |
| `1` — InTransit | Đang giao |
| `2` — Completed | Giao thành công |
| `3` — Failed | Giao thất bại |
| `4` — Cancelled | Đã hủy |

## Trạng thái DocumentStatus

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Draft | Nháp |
| `1` — Confirmed | Đã xác nhận |
| `2` — Cancelled | Đã hủy |
