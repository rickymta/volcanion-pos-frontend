# POST /api/v1/stock-transfers/{id}/confirm — Xác nhận chuyển kho

## Mô tả

Xác nhận phiếu chuyển kho, chuyển từ **Draft** → **Confirmed**. Yêu cầu quyền **Manager** hoặc **Admin**.

Khi xác nhận:
- Tồn kho kho nguồn bị **giảm** theo số lượng quy đổi.
- Tồn kho kho đích được **tăng** theo số lượng quy đổi.
- Giao dịch là atomic trong một database transaction.

## Request

```
POST /api/v1/stock-transfers/{id}/confirm
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu chuyển kho |

## Response 200

Trả về `StockTransferDto` đã cập nhật (status = `1` — Confirmed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Phiếu không ở trạng thái Draft / tồn kho không đủ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy phiếu chuyển kho |
