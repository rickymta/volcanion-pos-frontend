# POST /api/v1/sales-orders/{id}/confirm — Xác nhận đơn bán hàng

## Mô tả

Xác nhận đơn bán hàng, chuyển từ **Draft** → **Confirmed**. Yêu cầu quyền **Manager** hoặc **Admin**.

Khi xác nhận:
1. **Invoice** được tạo tự động (1 invoice / 1 sales order).
2. **DeliveryOrder** được tạo tự động liên kết với invoice vừa tạo (nếu chỉ định warehouse).
3. Tồn kho được **đặt giữ** (reserved) tại warehouse được chỉ định.
4. Bút toán kế toán được ghi (`DR 131 CR 511`, `DR 632 CR 156`).

## Request

```
POST /api/v1/sales-orders/{id}/confirm
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn bán hàng |

### Request body (tùy chọn)

```json
{
  "warehouseId": "wh-uuid-1"
}
```

> `warehouseId` = `null` → hệ thống tự chọn kho hoạt động đầu tiên.

## Logic

```
Kiểm tra đơn ở trạng thái Draft
Tạo Invoice (type mặc định = Retail)
Tạo DeliveryOrder gắn với invoice
Giảm tồn kho tại warehouseId
Ghi journal entries
Cập nhật SalesOrder status = Confirmed
```

## Response 200

Trả về `SalesOrderDto` đã cập nhật (status = `1` — Confirmed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Đơn không ở Draft / tồn kho không đủ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy đơn bán hàng / warehouse |
