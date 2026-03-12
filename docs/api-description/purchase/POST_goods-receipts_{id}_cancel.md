# POST /api/v1/goods-receipts/{id}/cancel — Hủy phiếu nhập kho

## Mô tả

Hủy phiếu nhập kho. Yêu cầu quyền **Manager** hoặc **Admin**.

> Chỉ hủy được khi phiếu ở trạng thái **Draft**. Không thể hủy phiếu đã Confirmed.

## Request

```
POST /api/v1/goods-receipts/{id}/cancel
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu nhập kho |

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
| 400 | Phiếu đã Confirmed không thể hủy |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy phiếu nhập kho |
