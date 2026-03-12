# POST /api/v1/purchase-orders/{id}/cancel — Hủy đơn đặt hàng

## Mô tả

Hủy PO. Yêu cầu quyền **Manager** hoặc **Admin**.

> Chỉ hủy được khi PO ở trạng thái **Draft** hoặc **Confirmed** và chưa có GoodsReceipt Confirmed.

## Request

```
POST /api/v1/purchase-orders/{id}/cancel
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn đặt hàng |

### Request body (tùy chọn)

```json
{
  "reason": "Nhà cung cấp không đáp ứng được yêu cầu"
}
```

## Response 200

```json
{
  "data": "Cancelled",
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | PO đã Cancelled hoặc đã có GoodsReceipt confirmed |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy đơn đặt hàng |
