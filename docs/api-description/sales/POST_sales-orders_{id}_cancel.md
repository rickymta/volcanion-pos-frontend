# POST /api/v1/sales-orders/{id}/cancel — Hủy đơn bán hàng

## Mô tả

Hủy đơn bán hàng. Yêu cầu quyền **Manager** hoặc **Admin**.

> Chỉ hủy được khi đơn ở trạng thái **Draft**. Đơn đã Confirmed không thể hủy trực tiếp (cần thực hiện SalesReturn).

## Request

```
POST /api/v1/sales-orders/{id}/cancel
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
  "reason": "Khách hàng đổi ý"
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
| 400 | Đơn đã Confirmed / đã Cancelled |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy đơn bán hàng |
