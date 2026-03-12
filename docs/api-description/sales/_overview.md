# Sales — Tổng quan

## Các controller trong nhóm

| Controller | Route prefix | Mô tả |
|---|---|---|
| SalesOrdersController | `/api/v1/sales-orders` | Đơn bán hàng |
| InvoicesController | `/api/v1/invoices` | Hóa đơn (tạo tự động khi confirm đơn hàng) |

## Xác thực & phân quyền

| Endpoint | Quyền |
|---|---|
| GET list / GET by id | Mọi role đăng nhập |
| POST tạo mới | Mọi role đăng nhập |
| PUT cập nhật | Mọi role đăng nhập |
| POST `/confirm` | RequireManager (Admin hoặc Manager) |
| POST `/cancel` | RequireManager |

## Rate limit

200 req/phút (general limiter).

## Luồng bán hàng chuẩn

```
1. Tạo SalesOrder (Draft)
2. (Tuỳ chọn) Cập nhật SalesOrder khi còn Draft
3. Confirm SalesOrder →
   a. Tạo Invoice tự động
   b. Tạo DeliveryOrder tự động (nếu có warehouse)
   c. Tồn kho được đặt giữ
4. Thanh toán: gọi POST /payments để ghi nhận payment cho invoice
```

## DocumentStatus

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Draft | Nháp |
| `1` — Confirmed | Đã xác nhận, đã tạo invoice |
| `2` — Cancelled | Đã hủy |

## InvoiceType

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Retail | Hóa đơn bán lẻ thông thường |
| `1` — Vat | Hóa đơn GTGT (có MST người mua) |
| `2` — Electronic | Hóa đơn điện tử (ký số) |

## PaymentMethod

| Giá trị | Ý nghĩa |
|---|---|
| `0` — Cash | Tiền mặt |
| `1` — BankTransfer | Chuyển khoản |
| `2` — Card | Thẻ |
| `3` — Mixed | Hỗn hợp |
