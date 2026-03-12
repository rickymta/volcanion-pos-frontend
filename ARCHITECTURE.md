# Architecture

Tài liệu mô tả kiến trúc kỹ thuật của dự án **POS Frontend** (React monorepo).

---

## 1. Tổng quan kiến trúc

```
┌──────────────────────────────────────────────────────────────┐
│                        pnpm Monorepo                         │
│                     (Turborepo pipeline)                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  @pos/tenant │  │ @pos/sysadmin│  │    @pos/pos      │   │
│  │   :3000      │  │   :3001      │  │    :3002         │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                    │             │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐  │
│  │              Shared Packages                            │  │
│  │  @pos/ui  @pos/api-client  @pos/auth  @pos/i18n  …    │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
              │                         │
      ┌───────▼──────┐         ┌────────▼───────┐
      │   Tenant API  │         │  Sysadmin API  │
      │  :5000/v1/…  │         │ :5100/super/v1/│
      └──────────────┘         └────────────────┘
```

---

## 2. Monorepo & Build Pipeline

### pnpm Workspaces
`pnpm-workspace.yaml` khai báo hai nhóm package:
- `apps/*` — các ứng dụng cuối (deployable)
- `packages/*` — shared libraries (không deployable độc lập)

### Turborepo
`turbo.json` định nghĩa pipeline với dependency graph:
- `build` phụ thuộc vào `^build` — packages phải build trước apps
- `lint`, `type-check` cũng phụ thuộc `^build`
- `dev` là persistent task, không cache

### Shared Packages — không compile trước
Tất cả packages xuất trực tiếp từ `src/index.ts` (không qua `dist/`). Vite trong từng app xử lý transpile khi build, giúp giảm thời gian dev và tránh vòng lặp build phức tạp.

---

## 3. Shared Packages

### `@pos/ui`
Component library dùng chung trên cả 3 apps, xây trên Mantine v7:

| Component | Mô tả |
|-----------|-------|
| `DataTable` | Bảng dữ liệu có phân trang, sort, custom render |
| `DrawerForm` | Drawer-based form với loading state |
| `PageHeader` | Header chuẩn cho trang (title + subtitle + actions) |
| `StatCard` | Card thống kê (dashboard) |
| `MoneyInput` | Input số tiền có format |
| `StatusBadge` | Badge trạng thái có màu |
| `EmptyState` | Trạng thái rỗng |
| `ErrorBoundary` | Error boundary React |
| `ProductSearch` | Autocomplete tìm kiếm sản phẩm |
| `ConfirmModal` | Modal xác nhận hành động nguy hiểm (`openConfirm`) |
| `MantineProvider` | Provider bao gồm theme, notifications, modals |

### `@pos/api-client`
Axios client kết nối tới **Tenant API** (`/v1/…`). Bao gồm:
- `client.ts` — cấu hình base URL, interceptors (attach access token, auto-refresh khi 401)
- `endpoints/` — typed API functions cho từng domain (sales, purchase, inventory…)
- `types/` — TypeScript interfaces cho request/response

### `@pos/sysadmin-client`
Tương tự `api-client` nhưng kết nối tới **Sysadmin API** (`/super/v1/…`). Dùng riêng cho `@pos/sysadmin` app.

### `@pos/auth`
Auth state management bằng **Zustand 5**:
- Lưu `accessToken`, `refreshToken`, thông tin user và permissions
- Action `login`, `logout`, `refreshToken`
- `useAuthStore` hook

### `@pos/i18n`
Cấu hình i18next với namespace:
- `vi/` và `en/` cho mỗi namespace: `common`, `auth`, `sysadmin`, `pos`, `sales`, `purchase`, `inventory`, `finance`, `delivery`, `master`, `reports`
- `useTranslation(namespace)` pattern trong từng feature

### `@pos/utils`
Pure utility functions:
- `formatDate(date)`, `formatDateTime(date)` — dùng dayjs
- `formatMoney(amount, currency?)` — format tiền tệ
- Zod schemas tái sử dụng

### `@pos/config`
- ESLint config dùng chung (`eslint/`)
- TypeScript base config (`typescript/tsconfig.base.json`)

---

## 4. Cấu trúc trong mỗi App

```
apps/<app>/src/
├── main.tsx              # Entry point — khởi tạo React, QueryClient, i18n
├── features/             # Feature-sliced modules
│   └── <feature>/
│       ├── pages/        # Route-level components (lazy loaded)
│       ├── components/   # Sub-components của feature
│       └── hooks/        # useQuery/useMutation hooks
├── layouts/              # Shell layouts (AppLayout, AuthLayout)
├── routes/               # React Router config (lazy imports)
├── lib/                  # App-level setup (queryClient, i18n init)
└── stores/               # Zustand stores app-level (nếu có)
```

### Feature-Sliced Design
Mỗi feature là một thư mục khép kín. Route-level pages được **lazy load** bằng `React.lazy()` + `Suspense` để code-split tự động.

---

## 5. Data Fetching — TanStack Query

- Toàn bộ server state được quản lý bởi **TanStack Query v5**
- Convention query key: `['resource', params]` — ví dụ `['tenants', { page, search }]`
- Mutations dùng `useMutation`, sau thành công gọi `queryClient.invalidateQueries`
- Lỗi API hiển thị qua `@mantine/notifications`

---

## 6. Authentication Flow

```
App khởi động
    │
    ▼
useAuthStore.rehydrate() — đọc token từ localStorage
    │
    ├─ [có token] → RequireAuth pass → vào app
    │
    └─ [không token] → redirect /login
           │
           ▼
        LoginPage → POST /auth/login
           │
           ▼
        Lưu accessToken + refreshToken vào store + localStorage
           │
           ▼
        Mỗi request: interceptor attach Authorization: Bearer <token>
           │
           ▼
        401 response → thử POST /auth/refresh
           │
           ├─ [thành công] → retry request gốc
           └─ [thất bại]  → logout + redirect /login
```

---

## 7. Routing

Mỗi app dùng `createBrowserRouter` (React Router v7). Cấu trúc route lồng nhau:

```
/             → RequireAuth → AppLayout
├── /         → DashboardPage
├── /sales    → SalesOrderListPage
│   ├── /new  → SalesOrderFormPage
│   └── /:id  → SalesOrderDetailPage
│       └── /edit → SalesOrderFormPage
├── /purchase → …
├── /inventory → …
├── /finance  → …
└── …

/login        → AuthLayout → LoginPage
```

---

## 8. Internationalization

- Ngôn ngữ mặc định: **Tiếng Việt** (`vi`)
- Hỗ trợ thêm: **English** (`en`)
- Chuyển ngôn ngữ: `i18n.changeLanguage('en')`
- Translation files: `packages/i18n/src/vi/<namespace>.json`
- Mỗi feature dùng namespace riêng: `useTranslation('sales')`, `useTranslation('sysadmin')`, …

---

## 9. Styling

- **Mantine v7** toàn bộ UI — không dùng CSS module hay Tailwind
- Theme tùy chỉnh trong `@pos/ui/src/theme.ts`
- Responsive breakpoints theo Mantine mặc định
- Dark mode hỗ trợ qua `useMantineColorScheme`

---

## 10. Environment Variables

Mỗi app có file `.env` hoặc `.env.local`:

```env
# apps/tenant/.env
VITE_API_BASE_URL=http://localhost:5000

# apps/sysadmin/.env
VITE_API_BASE_URL=http://localhost:5100

# apps/pos/.env
VITE_API_BASE_URL=http://localhost:5000
```

---

## 11. Deployment

Mỗi app build thành static files trong `dist/`, có thể deploy lên:
- **Nginx** / **Caddy** — serve static + proxy API
- **Docker** — mỗi app là một container riêng
- **CDN** (Cloudflare Pages, Vercel, Netlify)

Vì mỗi app là SPA, web server cần cấu hình fallback về `index.html` cho mọi route.
