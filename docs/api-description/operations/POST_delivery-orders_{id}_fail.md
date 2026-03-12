# POST /api/v1/delivery-orders/{id}/fail — Đánh dấu giao hàng thất bại

## Mô tả

Chuyển trạng thái đơn giao sang **Failed**. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/delivery-orders/{id}/fail
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn giao hàng |

### Request body (tùy chọn)

```json
{
  "reason": "Người nhận không có mặt"
}
```

> Body có thể `null` nếu không cần ghi lý do.

## Response 200

Trả về `DeliveryOrderDto` đã cập nhật (status = `3` — Failed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Trạng thái không hợp lệ để fail |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy đơn giao hàng |
