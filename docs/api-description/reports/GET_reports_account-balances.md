# GET /api/v1/reports/account-balances — Số dư tài khoản kế toán

## Mô tả

Trả về số dư của tất cả tài khoản kế toán tại một thời điểm xác định. Số liệu tổng hợp từ tất cả bút toán từ đầu đến `asOf`.

## Request

```
GET /api/v1/reports/account-balances?asOf={asOf}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `asOf` | datetime | Có | Thời điểm lấy số dư (UTC) |

## Response 200

```json
{
  "data": [
    {
      "accountCode": "111",
      "accountName": "Tiền mặt",
      "accountType": 0,
      "balance": 15000000
    },
    {
      "accountCode": "131",
      "accountName": "Phải thu khách hàng",
      "accountType": 0,
      "balance": 8500000
    },
    {
      "accountCode": "331",
      "accountName": "Phải trả người bán",
      "accountType": 2,
      "balance": -4200000
    },
    {
      "accountCode": "4111",
      "accountName": "Vốn đầu tư",
      "accountType": 3,
      "balance": -50000000
    }
  ],
  "success": true,
  "message": null
}
```

## Quy ước số dư

| Giá trị | Ý nghĩa | Loại tài khoản điển hình |
|---|---|---|
| `balance > 0` | Số dư bên Nợ | Tài sản (Assets), Chi phí (Expenses) |
| `balance < 0` | Số dư bên Có | Nợ phải trả (Liabilities), Vốn chủ sở hữu (Equity), Doanh thu (Revenue) |
| `balance = 0` | Không có số dư | — |

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | `asOf` bị thiếu |
| 401 | Chưa xác thực |
| 403 | Không có quyền Manager |
