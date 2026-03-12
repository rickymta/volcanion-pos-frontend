# POST /api/v1/delivery-orders/{id}/start — Bắt đầu giao hàng

## Mô tả

Chuyển trạng thái đơn giao từ **Pending** → **InTransit**. Không cần request body.

Yêu cầu quyền: mọi role đăng nhập (Staff, Manager, Admin).

## Request

```
POST /api/v1/delivery-orders/{id}/start
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn giao hàng |

## Logic

```
Kiểm tra đơn giao tồn tại
Kiểm tra status == Pending → nếu không: BadRequest
Cập nhật status = InTransit
```

## Response 200

Trả về `DeliveryOrderDto` đã cập nhật (status = `1` — InTransit).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Đơn không ở trạng thái Pending |
| 401 | Chưa xác thực |
| 404 | Không tìm thấy đơn giao hàng |
