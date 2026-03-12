# DELETE /api/v1/products/{productId}/unit-conversions/{id} — Xóa quy đổi đơn vị

## Mô tả

Xóa quy đổi đơn vị. Yêu cầu quyền **Admin**.

## Request

```
DELETE /api/v1/products/{productId}/unit-conversions/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `productId` | guid | ID sản phẩm |
| `id` | guid | ID quy đổi đơn vị |

## Response 200

```json
{
  "data": "Deleted",
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Admin) |
| 404 | Không tìm thấy |
