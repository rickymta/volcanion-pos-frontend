# POST /api/v1/delivery-orders/{id}/cancel — Hủy đơn giao hàng

## Mô tả

Hủy đơn giao hàng. Yêu cầu quyền **Manager** hoặc **Admin**.

> Chỉ hủy được khi đơn ở trạng thái **Pending** hoặc **InTransit**.

## Request

```
POST /api/v1/delivery-orders/{id}/cancel
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
  "reason": "Khách hàng hủy đơn"
}
```

> Body có thể `null`.

## Response 200

Trả về `DeliveryOrderDto` đã cập nhật (status = `4` — Cancelled).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Đơn đã hoàn thành hoặc đã bị hủy |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy đơn giao hàng |
