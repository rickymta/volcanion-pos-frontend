# POST /api/v1/purchase-orders — Tạo đơn đặt hàng

## Mô tả

Tạo đơn đặt hàng (PO) ở trạng thái **Draft**. Yêu cầu quyền: mọi role đăng nhập.

## Request

```
POST /api/v1/purchase-orders
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "supplierId": "sup-uuid-1",
  "orderDate": "2026-03-10T08:00:00Z",
  "note": "Đặt hàng tháng 3",
  "discountAmount": 500000,
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 100,
      "unitPrice": 100000,
      "vatRate": 10
    }
  ]
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `supplierId` | Bắt buộc |
| `orderDate` | Bắt buộc, không vượt quá 30 ngày trong tương lai |
| `note` | Tối đa 500 ký tự (nếu có) |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0 |
| `lines[].unitPrice` | ≥ 0 |
| `lines[].vatRate` | 0 – 100 |

## Logic

```
Tạo PO (status = Draft)
Tính totalAmount = Σ (quantity × unitPrice)
Tính vatAmount = Σ (quantity × unitPrice × vatRate / 100)
grandTotal = totalAmount + vatAmount - discountAmount
```

## Response 201

Trả về `PurchaseOrderDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
