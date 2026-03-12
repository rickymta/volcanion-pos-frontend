# POST /api/v1/delivery-orders/{id}/complete — Hoàn thành giao hàng

## Mô tả

Chuyển trạng thái đơn giao từ **InTransit** → **Completed**. Ghi nhận bằng chứng giao hàng.

Yêu cầu quyền: mọi role đăng nhập (Staff, Manager, Admin).

## Request

```
POST /api/v1/delivery-orders/{id}/complete
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn giao hàng |

### Request body

```json
{
  "proofImageUrl": "https://cdn.example.com/proof/do-001.jpg",
  "isCodCollected": true,
  "receiverName": "Trần Văn B"
}
```

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `proofImageUrl` | string | Không | URL ảnh xác nhận giao hàng |
| `isCodCollected` | bool | Không | Đã thu COD chưa (mặc định: false) |
| `receiverName` | string | Không | Tên người nhận thực tế |

## Logic

```
Kiểm tra đơn giao tồn tại
Kiểm tra status == InTransit → nếu không: BadRequest
Cập nhật status = Completed, ghi nhận proof / COD / receiverName
Cập nhật deliveryDate = UtcNow
```

## Response 200

Trả về `DeliveryOrderDto` đã cập nhật (status = `2` — Completed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Đơn không ở trạng thái InTransit |
| 401 | Chưa xác thực |
| 404 | Không tìm thấy đơn giao hàng |
