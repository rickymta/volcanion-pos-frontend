# POS Frontend — React Monorepo

Frontend cho hệ thống quản lý bán hàng đa chi nhánh, xây dựng bằng React 19 + Vite + Mantine UI theo kiến trúc **pnpm monorepo + Turborepo**.

## Tổng quan

Dự án gồm **3 ứng dụng** độc lập phục vụ 3 nhóm người dùng khác nhau, chia sẻ code qua các **shared packages**.

| App | Port | Mô tả |
|-----|------|--------|
| `@pos/tenant` | 3000 | Ứng dụng quản lý chính — dành cho nhân viên/quản lý của từng tenant |
| `@pos/sysadmin` | 3001 | Bảng điều khiển super-admin — quản lý toàn bộ tenant trên hệ thống |
| `@pos/pos` | 3002 | Giao diện bán hàng tại quầy (POS terminal) |

## Yêu cầu

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- Backend API đang chạy (xem `docs/api.md`)

## Cài đặt

```bash
# Clone repo
git clone <repo-url>
cd frontend-react

# Cài đặt dependencies toàn bộ monorepo
pnpm install
```

## Chạy môi trường dev

```bash
# Chạy tất cả apps cùng lúc
pnpm dev

# Chạy từng app riêng
pnpm dev:tenant    # http://localhost:3000
pnpm dev:sysadmin  # http://localhost:3001
pnpm dev:pos       # http://localhost:3002
```

## Build

```bash
# Build toàn bộ
pnpm build

# Build từng app
pnpm --filter @pos/tenant build
pnpm --filter @pos/sysadmin build
pnpm --filter @pos/pos build
```

## Các lệnh khác

```bash
pnpm lint         # ESLint toàn bộ workspace
pnpm type-check   # TypeScript type-check toàn bộ workspace
pnpm clean        # Xóa build artifacts và node_modules
```

## Cấu trúc thư mục

```
frontend-react/
├── apps/
│   ├── tenant/        # Ứng dụng quản lý tenant (:3000)
│   ├── sysadmin/      # Ứng dụng super-admin (:3001)
│   └── pos/           # Giao diện POS terminal (:3002)
├── packages/
│   ├── ui/            # Component library dùng chung (Mantine-based)
│   ├── api-client/    # Axios client + typed endpoints cho tenant API
│   ├── sysadmin-client/ # Axios client + typed endpoints cho sysadmin API
│   ├── auth/          # Auth store (Zustand) + logic token refresh
│   ├── i18n/          # Cấu hình i18next + các file dịch (vi/en)
│   ├── utils/         # Helpers: formatDate, formatMoney, zod schemas…
│   └── config/        # Cấu hình ESLint + TypeScript dùng chung
├── docs/              # Tài liệu API, luồng nghiệp vụ
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Tính năng chính

### `@pos/tenant` — Quản lý doanh nghiệp
- **Dashboard** tổng quan doanh thu, tồn kho, công nợ
- **Master data**: Sản phẩm, khách hàng, nhà cung cấp, kho hàng, chi nhánh, danh mục, đơn vị tính
- **Mua hàng**: Đơn mua hàng, nhập kho (goods receipt), trả hàng nhà cung cấp
- **Bán hàng**: Đơn bán hàng, hóa đơn, trả hàng khách
- **Kho hàng**: Tồn kho, giao dịch kho, chuyển kho, kiểm kê, tồn kho đầu kỳ
- **Tài chính**: Thanh toán, công nợ, tài khoản kế toán, bút toán, chi phí vận hành
- **Giao hàng**: Quản lý phiếu giao hàng
- **Báo cáo**: Báo cáo lãi/lỗ, số dư tài khoản
- **Cài đặt**: Quản lý người dùng, phân quyền, hồ sơ, đổi mật khẩu

### `@pos/sysadmin` — Quản trị hệ thống
- **Tenant management**: Tạo, chỉnh sửa, xem chi tiết từng tenant (bao gồm cập nhật thông tin admin)
- **System health**: Giám sát trạng thái database, Redis, các service
- **System config**: Cấu hình JWT expiry, rate limit, CORS
- **Background jobs**: Theo dõi Hangfire jobs
- **Audit logs**: Nhật ký hoạt động toàn hệ thống

### `@pos/pos` — POS Terminal
- Giao diện bán hàng tại quầy tối ưu cho màn hình cảm ứng
- Tìm kiếm sản phẩm, thêm vào giỏ, xử lý thanh toán
- Lịch sử đơn hàng ca làm việc
- Kết ca (end of shift)

## Stack công nghệ

- **React 19** + **TypeScript 5.7**
- **Vite 6** — build tool
- **Mantine 7** — UI component library
- **TanStack Query 5** — server state management
- **Zustand 5** — client state (auth)
- **React Router 7** — routing
- **Axios** — HTTP client với interceptor tự động refresh token
- **i18next** — đa ngôn ngữ (Tiếng Việt + English)
- **Zod** — schema validation
- **Turbo** — task orchestration trong monorepo

## Tài liệu

- [`docs/api.md`](docs/api.md) — Tổng hợp API endpoints
- [`docs/business-flow.md`](docs/business-flow.md) — Luồng nghiệp vụ
- [`docs/authorization-guide.md`](docs/authorization-guide.md) — Phân quyền
- [`docs/database-description.md`](docs/database-description.md) — Mô tả database
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — Kiến trúc chi tiết
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Hướng dẫn đóng góp
- [`CHANGELOG.md`](CHANGELOG.md) — Lịch sử thay đổi

## License

[MIT](LICENSE)
