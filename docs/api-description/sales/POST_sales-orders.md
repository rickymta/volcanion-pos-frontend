# POST /api/v1/sales-orders — Tạo đơn bán hàng

## Mô tả

Tạo đơn bán hàng ở trạng thái **Draft**. Yêu cầu quyền: mọi role đăng nhập.

> Hàng tồn kho chưa bị ảnh hưởng cho đến khi **Confirm**.

## Request

```
POST /api/v1/sales-orders
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "customerId": "cust-uuid-1",
  "orderDate": "2026-03-10T09:00:00Z",
  "note": "Giao trước 5pm",
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-1",
      "quantity": 2,
      "unitPrice": 220000,
      "discountAmount": 0,
      "vatRate": 10
    }
  ]
}
```

> `customerId` = `null` → khách lẻ (walk-in), không cần đăng ký.

### Validation

| Trường | Quy tắc |
|---|---|
| `orderDate` | Bắt buộc |
| `note` | Tối đa 500 ký tự (nếu có) |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0 |
| `lines[].unitPrice` | ≥ 0 |
| `lines[].discountAmount` | ≥ 0 |
| `lines[].vatRate` | 0 – 100 |

## Logic

```
Tạo SalesOrder (status = Draft)
totalAmount = Σ (quantity × unitPrice - discountAmount)
vatAmount   = Σ (quantity × unitPrice × vatRate / 100)
grandTotal  = totalAmount + vatAmount
```

## Response 201

Trả về `SalesOrderDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
