# POST /api/v1/purchase-orders/{id}/confirm — Xác nhận đơn đặt hàng

## Mô tả

Xác nhận PO, chuyển từ **Draft** → **Confirmed**. Yêu cầu quyền **Manager** hoặc **Admin**.

Sau khi xác nhận, PO có thể được dùng để tạo `GoodsReceipt`.

## Request

```
POST /api/v1/purchase-orders/{id}/confirm
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn đặt hàng |

## Response 200

Trả về `PurchaseOrderDto` đã cập nhật (status = `1` — Confirmed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | PO không ở trạng thái Draft |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy đơn đặt hàng |
