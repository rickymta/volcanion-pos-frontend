# Changelog

Tất cả thay đổi đáng chú ý của dự án được ghi lại tại đây.

Format dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Phiên bản theo [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Nút **Chỉnh sửa** tenant trên trang danh sách (`TenantsPage`) mở drawer cập nhật
- Edit drawer trên trang chi tiết tenant (`TenantDetailPage`)
- Các trường admin (`adminEmail`, `adminUsername`, `adminPassword`) trong form cập nhật tenant — tất cả optional, chỉ gửi khi có giá trị
- Trường `adminUsername` bắt buộc trong form tạo tenant mới
- Translation key `admin_username` cho cả `vi` và `en`
- Types `adminEmail?`, `adminUsername?`, `adminPassword?` trong `UpdateTenantRequest`
- Type `adminUsername: string` (required) trong `CreateTenantRequest`

---

## [0.1.0] — 2026-03-01

### Added

#### Hạ tầng & Monorepo
- Thiết lập pnpm monorepo với Turborepo
- 3 apps: `@pos/tenant` (:3000), `@pos/sysadmin` (:3001), `@pos/pos` (:3002)
- Shared packages: `@pos/ui`, `@pos/api-client`, `@pos/sysadmin-client`, `@pos/auth`, `@pos/i18n`, `@pos/utils`, `@pos/config`
- TypeScript 5.7, Vite 6, React 19
- ESLint + TypeScript strict config dùng chung

#### `@pos/ui` — Shared Component Library
- `DataTable` — bảng với phân trang và custom render columns
- `DrawerForm` — drawer form tái sử dụng có loading state
- `PageHeader` — header chuẩn với title, subtitle, actions slot
- `StatCard` — card thống kê dashboard
- `MoneyInput` — input tiền tệ có format
- `StatusBadge` — badge trạng thái động
- `EmptyState` — màn hình trạng thái trống
- `ErrorBoundary` — React error boundary
- `ProductSearch` — autocomplete tìm kiếm sản phẩm
- `openConfirm` — helper mở modal xác nhận (Mantine modals)
- Mantine theme tùy chỉnh

#### `@pos/auth`
- Zustand auth store với `login`, `logout`, `refreshToken` actions
- Tự động rehydrate từ localStorage

#### `@pos/api-client`
- Axios client với interceptor attach token và auto-refresh khi 401
- Typed endpoints: auth, sales, purchase, inventory, finance, master-data, delivery, reports, operations
- TypeScript DTOs và request interfaces

#### `@pos/sysadmin-client`
- Axios client riêng cho Sysadmin API
- Typed endpoints: tenants, system health, system config, background jobs, audit logs

#### `@pos/i18n`
- Cấu hình i18next với lazy namespace loading
- Bản dịch tiếng Việt và English cho tất cả namespaces

#### `@pos/utils`
- `formatDate`, `formatDateTime` dùng dayjs
- `formatMoney` với hỗ trợ đa tiền tệ

#### `@pos/tenant` — Ứng dụng quản lý
- **Auth**: Login page, RequireAuth guard, logout
- **Dashboard**: Thống kê tổng quan
- **Master data**: Sản phẩm (CRUD + ảnh), khách hàng, nhà cung cấp, kho hàng, chi nhánh, danh mục, đơn vị tính
- **Bán hàng**: Danh sách + tạo + xem đơn bán; danh sách + xem hóa đơn; trả hàng bán
- **Mua hàng**: Danh sách + tạo + xem đơn mua; nhập kho (goods receipt); trả hàng mua
- **Kho hàng**: Tồn kho theo kho, giao dịch kho, chuyển kho, kiểm kê (inventory adjust), tồn kho đầu kỳ
- **Tài chính**: Thanh toán (thu/chi), theo dõi công nợ (A/R & A/P), danh sách tài khoản kế toán, bút toán nhật ký, chi phí vận hành
- **Giao hàng**: Danh sách + chi tiết phiếu giao hàng
- **Báo cáo**: Báo cáo lãi/lỗ, số dư tài khoản
- **Cài đặt**: Quản lý người dùng, phân quyền theo vai trò, hồ sơ cá nhân, đổi mật khẩu
- **Error pages**: 404, 403, 500

#### `@pos/sysadmin` — Bảng điều khiển super-admin
- **Auth**: Đăng nhập riêng với super-admin credentials
- **Dashboard**: Thống kê tổng tenant, users, tenant hoạt động
- **Tenant management**: Danh sách, tạo mới (với đầy đủ thông tin công ty + tài khoản admin), xem chi tiết, seed dữ liệu mẫu
- **System health**: Giám sát database, Redis, version, environment
- **System config**: Cấu hình JWT/Refresh token expiry, max login attempts, rate limit, CORS origins
- **Background jobs**: Xem trạng thái Hangfire jobs
- **Audit logs**: Tìm kiếm, lọc theo thời gian/tenant/action

#### `@pos/pos` — POS Terminal
- **Auth**: Đăng nhập cashier
- **POS Terminal**: Giao diện bán hàng tối ưu cảm ứng — tìm sản phẩm, giỏ hàng, checkout
- **Order History**: Lịch sử đơn hàng trong ca
- **End of Shift**: Kết ca thanh toán

---

[Unreleased]: https://github.com/<owner>/frontend-react/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/<owner>/frontend-react/releases/tag/v0.1.0
