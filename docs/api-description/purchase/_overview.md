# Purchase — Tổng quan

## Các controller trong nhóm

| Controller | Route prefix | Mô tả |
|---|---|---|
| PurchaseOrdersController | `/api/v1/purchase-orders` | Đơn đặt hàng nhà cung cấp (PO) |
| GoodsReceiptsController | `/api/v1/goods-receipts` | Phiếu nhập kho theo PO |
| PurchaseReturnsController | `/api/v1/purchase-returns` | Trả hàng mua |

## Xác thực & phân quyền

| Nhóm | GET | POST tạo mới | PUT cập nhật | POST action (confirm/cancel) |
|---|---|---|---|---|
| PurchaseOrders | Mọi role | Mọi role | Mọi role | RequireManager |
| GoodsReceipts | **RequireManager** | **RequireManager** | — | **RequireManager** |
| PurchaseReturns | Mọi role | Mọi role | — | RequireManager |

> `GoodsReceiptsController` có decorator `[Authorize(Policy = Policies.RequireManager)]` ở cấp controller → toàn bộ endpoint trong controller yêu cầu Manager+.

## Rate limit

200 req/phút (general limiter).

## Luồng mua hàng chuẩn

```
1. Tạo PO (Draft)
2. Confirm PO → status = Confirmed
3. Tạo GoodsReceipt (chọn PO đã confirmed, chọn kho)
4. Confirm GoodsReceipt → hàng được nhập kho, công nợ NCC tăng
5. (Tuỳ chọn) Tạo PurchaseReturn → Confirm → hàng giảm kho, công nợ NCC giảm
```

## DocumentStatus

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Draft | Nháp |
| `1` — Confirmed | Đã xác nhận |
| `2` — Cancelled | Đã hủy |
