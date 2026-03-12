# POST /api/v1/sales-returns/{id}/confirm — Xác nhận trả hàng bán

## Mô tả

Xác nhận phiếu trả hàng, chuyển từ **Draft** → **Confirmed**. Yêu cầu quyền **Manager** hoặc **Admin**.

Khi xác nhận:
- Hàng tồn kho được cộng lại vào kho gốc.
- Bút toán kế toán được ghi (DR 331 / CR 131, DR hàng tồn kho CR giá vốn).

## Request

```
POST /api/v1/sales-returns/{id}/confirm
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID phiếu trả hàng |

## Response 200

Trả về `SalesReturnDto` đã cập nhật (status = `1` — Confirmed).

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Phiếu không ở trạng thái Draft |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy phiếu trả hàng |
