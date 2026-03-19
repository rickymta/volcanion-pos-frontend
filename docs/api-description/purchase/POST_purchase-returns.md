# POST /api/v1/purchase-returns — Tạo phiếu trả hàng mua

## Mô tả

Tạo phiếu trả hàng mua ở trạng thái **Draft**. Yêu cầu quyền: mọi role đăng nhập.

> Tồn kho chỉ giảm và công nợ NCC chỉ được ghi nhận sau khi **Confirm**.

## Request

```
POST /api/v1/purchase-returns
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "goodsReceiptId": "gr-uuid-1",
  "supplierId": "sup-uuid-1",
  "returnDate": "2026-03-10T15:00:00Z",
  "reason": "Hàng không đúng quy cách",
  "isRefunded": false,
  "branchId": "branch-uuid-1",
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-kg",
      "quantity": 5,
      "unitCost": 100000
    }
  ]
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `goodsReceiptId` | Bắt buộc |
| `supplierId` | Bắt buộc |
| `returnDate` | Bắt buộc, không được ở tương lai |
| `reason` | Tối đa 500 ký tự (nếu có) |
| `lines` | ≥ 1 dòng |
| `lines[].productId` | Bắt buộc |
| `lines[].unitId` | Bắt buộc |
| `lines[].quantity` | > 0 |
| `lines[].unitCost` | ≥ 0 |
| `branchId` | Không bắt buộc, GUID chi nhánh phát sinh. Backend validate quyền truy cập |

## Response 201

Trả về `PurchaseReturnDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ / GoodsReceipt chưa Confirmed |
| 401 | Chưa xác thực |
