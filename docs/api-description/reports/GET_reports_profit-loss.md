# GET /api/v1/reports/profit-loss — Báo cáo lãi/lỗ

## Mô tả

Trả về báo cáo lãi/lỗ (Profit & Loss) trong một khoảng thời gian, bao gồm doanh thu, giá vốn, lợi nhuận gộp, chi phí vận hành và lợi nhuận ròng. Số liệu tổng hợp từ các bút toán kế toán.

## Request

```
GET /api/v1/reports/profit-loss?fromDate={fromDate}&toDate={toDate}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `fromDate` | datetime | Có | Từ ngày (UTC) |
| `toDate` | datetime | Có | Đến ngày (UTC) |

## Response 200

```json
{
  "data": {
    "fromDate": "2026-01-01T00:00:00Z",
    "toDate": "2026-03-31T23:59:59Z",
    "totalRevenue": 50000000,
    "totalCogs": 30000000,
    "grossProfit": 20000000,
    "totalOperatingExpenses": 5000000,
    "netProfit": 15000000,
    "rows": [
      {
        "accountCode": "511",
        "accountName": "Doanh thu bán hàng",
        "accountType": 4,
        "totalDebit": 0,
        "totalCredit": 50000000
      },
      {
        "accountCode": "632",
        "accountName": "Giá vốn hàng bán",
        "accountType": 5,
        "totalDebit": 30000000,
        "totalCredit": 0
      },
      {
        "accountCode": "642",
        "accountName": "Chi phí quản lý",
        "accountType": 5,
        "totalDebit": 5000000,
        "totalCredit": 0
      }
    ]
  },
  "success": true,
  "message": null
}
```

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | `fromDate` hoặc `toDate` bị thiếu / `toDate` < `fromDate` |
| 401 | Chưa xác thực |
| 403 | Không có quyền Manager |
