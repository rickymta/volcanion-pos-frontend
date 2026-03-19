# POST /api/v1/sales-returns — Tạo phiếu trả hàng bán

## Mô tả

Tạo phiếu trả hàng bán ở trạng thái **Draft**. Yêu cầu quyền: mọi role đăng nhập.

## Request

```
POST /api/v1/sales-returns
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "invoiceId": "inv-uuid-1",
  "customerId": "cust-uuid-1",
  "returnDate": "2026-03-10T10:00:00Z",
  "reason": "Hàng lỗi",
  "isRefunded": false,
  "branchId": "branch-uuid-1",
  "lines": [
    {
      "productId": "prod-uuid-1",
      "unitId": "unit-uuid-1",
      "quantity": 1,
      "unitPrice": 220000
    }
  ]
}
```

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `invoiceId` | ✔ | Hóa đơn gốc cần trả |
| `customerId` | Không | Khách hàng (có thể null cho walk-in) |
| `returnDate` | ✔ | Ngày trả hàng |
| `reason` | Không | Lý do trả hàng |
| `isRefunded` | ✔ | Đã hoàn tiền ngay chưa |
| `lines` | ✔ | Danh sách sản phẩm trả (≥ 1 dòng) |
| `branchId` | Không | GUID chi nhánh phát sinh. Backend validate quyền truy cập |

## Logic

```
Tạo SalesReturn (status = Draft)
Tính totalRefundAmount = Σ (quantity × unitPrice)
```

> Hàng tồn kho chỉ được cộng lại khi **Confirm**.

## Response 201

Trả về `SalesReturnDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ / hóa đơn không tồn tại |
| 401 | Chưa xác thực |
