# PUT /api/v1/sales-orders/{id} — Cập nhật đơn bán hàng

## Mô tả

Cập nhật đơn bán hàng. Chỉ cập nhật được khi đơn ở trạng thái **Draft**.  
Yêu cầu quyền: mọi role đăng nhập.

## Request

```
PUT /api/v1/sales-orders/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID đơn bán hàng |

### Request body

```json
{
  "customerId": "cust-uuid-1",
  "orderDate": "2026-03-10T10:00:00Z",
  "note": "Giao trước 6pm (sửa)",
  "branchId": "branch-uuid-1",
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-1",
      "quantity": 3,
      "unitPrice": 220000,
      "discountAmount": 10000,
      "vatRate": 10
    }
  ]
}
```

### Validation

Tương tự tạo mới (xem `POST /api/v1/sales-orders`).

## Response 200

Trả về `SalesOrderDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ / đơn không còn ở Draft |
| 401 | Chưa xác thực |
| 404 | Không tìm thấy đơn bán hàng |
