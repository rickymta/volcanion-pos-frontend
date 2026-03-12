# POST /api/v1/purchase-returns/{id}/confirm — Xác nhận trả hàng mua

## Mô tả

Xác nhận phiếu trả hàng mua, chuyển từ **Draft** → **Confirmed**.  
Yêu cầu quyền **Manager** hoặc **Admin**.

Khi xác nhận:
- Tồn kho tại kho gốc (kho của GoodsReceipt) được **giảm** theo `convertedQuantity`.
- Công nợ nhà cung cấp giảm (`DR 331 CR 156`).
- Nếu `isRefunded = true`: ghi nhận tiền đã nhận lại từ NCC.

## Request

```
POST /api/v1/purchase-returns/{id}/confirm
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu trả hàng |

## Response 200

Trả về `PurchaseReturnDto` đã cập nhật (status = `1` — Confirmed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Phiếu không ở trạng thái Draft / tồn kho không đủ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy phiếu trả hàng |
