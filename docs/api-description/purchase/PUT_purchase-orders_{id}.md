# PUT /api/v1/purchase-orders/{id} — Cập nhật đơn đặt hàng

## Mô tả

Cập nhật đơn đặt hàng. Chỉ cập nhật được khi PO ở trạng thái **Draft**.  
Yêu cầu quyền: mọi role đăng nhập.

## Request

```
PUT /api/v1/purchase-orders/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn đặt hàng |

### Request body

```json
{
  "supplierId": "sup-uuid-1",
  "orderDate": "2026-03-11T08:00:00Z",
  "note": "Đặt hàng tháng 3 (sửa)",
  "discountAmount": 600000,
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 120,
      "unitPrice": 100000,
      "vatRate": 10
    }
  ]
}
```

### Validation

Tương tự tạo mới (xem `POST /api/v1/purchase-orders`).

## Response 200

Trả về `PurchaseOrderDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ / PO không còn ở Draft |
| 401 | Chưa xác thực |
| 404 | Không tìm thấy đơn đặt hàng |
