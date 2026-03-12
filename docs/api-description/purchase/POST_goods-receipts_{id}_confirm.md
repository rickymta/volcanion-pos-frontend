# POST /api/v1/goods-receipts/{id}/confirm — Xác nhận phiếu nhập kho

## Mô tả

Xác nhận phiếu nhập kho, chuyển từ **Draft** → **Confirmed**.  
Yêu cầu quyền **Manager** hoặc **Admin**.

Khi xác nhận:
- Hàng tồn kho tại `warehouseId` được **tăng** theo `convertedQuantity` của từng dòng.
- Công nợ nhà cung cấp tăng (`DR 156 CR 331`).
- Giá vốn nhập kho được cập nhật theo `CostingMethod` của sản phẩm (Average / FIFO).

## Request

```
POST /api/v1/goods-receipts/{id}/confirm
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu nhập kho |

## Response 200

Trả về `GoodsReceiptDto` đã cập nhật (status = `1` — Confirmed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Phiếu không ở trạng thái Draft |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy phiếu nhập kho |
