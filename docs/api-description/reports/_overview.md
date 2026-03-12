# Reports API — Tổng quan

## Mô tả

Cung cấp các báo cáo tài chính tổng hợp được tính toán từ sổ kế toán dựa trên hệ thống bút toán kép (double-entry accounting).

## Base URL

```
/api/v1/reports
```

## Xác thực

- **Bắt buộc:** `Authorization: Bearer {token}`
- **Bắt buộc:** `X-Tenant-Id: {tenantId}`
- **Quyền yêu cầu:** `RequireManager` — Admin và Manager

## Danh sách endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/reports/profit-loss` | Báo cáo lãi/lỗ theo kỳ |
| GET | `/api/v1/reports/account-balances` | Số dư tài khoản kế toán tại thời điểm |

## Quy ước số dư

- Số dư **dương** (`balance > 0`): tài khoản có số dư bên Nợ (tài sản, chi phí).
- Số dư **âm** (`balance < 0`): tài khoản có số dư bên Có (nợ phải trả, vốn chủ sở hữu, doanh thu).
