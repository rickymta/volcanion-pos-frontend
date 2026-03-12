# POST /api/v1/stock-transfers — Tạo phiếu chuyển kho

## Mô tả

Tạo phiếu chuyển kho nội bộ ở trạng thái **Draft**. Yêu cầu quyền: mọi role đăng nhập.

> Tồn kho chưa thay đổi cho đến khi **Confirm**.

## Request

```
POST /api/v1/stock-transfers
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "fromWarehouseId": "wh-uuid-1",
  "toWarehouseId": "wh-uuid-2",
  "transferDate": "2026-03-10T08:00:00Z",
  "note": "Điều chuyển tháng 3",
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 50
    }
  ]
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `fromWarehouseId` | Bắt buộc |
| `toWarehouseId` | Bắt buộc, phải khác `fromWarehouseId` |
| `transferDate` | Bắt buộc, không vượt quá 7 ngày trong tương lai |
| `note` | Tối đa 500 ký tự (nếu có) |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0 |

## Response 201

Trả về `StockTransferDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ / cùng kho nguồn và đích |
| 401 | Chưa xác thực |
