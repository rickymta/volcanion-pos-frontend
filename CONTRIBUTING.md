# Contributing

Cảm ơn bạn đã muốn đóng góp cho dự án! Hướng dẫn này giúp bạn bắt đầu nhanh.

---

## Yêu cầu môi trường

| Công cụ | Phiên bản |
|---------|-----------|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |
| Git | ≥ 2.x |

## Thiết lập môi trường

```bash
# 1. Fork và clone
git clone https://github.com/<your-username>/frontend-react.git
cd frontend-react

# 2. Cài đặt dependencies
pnpm install

# 3. Tạo file môi trường (copy từ example nếu có)
cp apps/tenant/.env.example apps/tenant/.env.local
cp apps/sysadmin/.env.example apps/sysadmin/.env.local
cp apps/pos/.env.example apps/pos/.env.local

# 4. Chạy dev server
pnpm dev
```

---

## Workflow

### 1. Tạo branch

Đặt tên branch theo pattern:

```
feat/<tên-tính-năng>       # tính năng mới
fix/<tên-bug>               # sửa lỗi
refactor/<tên-phần>         # cải tổ code
docs/<tên-tài-liệu>         # cập nhật docs
chore/<tên-nhiệm-vụ>        # việc lặt vặt (deps, config…)
```

Ví dụ:
```bash
git checkout -b feat/tenant-edit-admin
```

### 2. Phát triển

- Luôn chạy `pnpm type-check` và `pnpm lint` trước khi commit
- Không bỏ qua TypeScript errors bằng `@ts-ignore` (chỉ dùng `@ts-expect-error` có lý do)
- Không commit mà có `console.log` thừa

### 3. Commit

Dùng **Conventional Commits**:

```
<type>(<scope>): <mô tả ngắn>

[body tùy chọn]

[footer tùy chọn]
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `test`, `perf`

**Scope** là tên app hoặc package:

```
feat(tenant): thêm trang báo cáo lãi lỗ theo ngày
fix(sysadmin): sửa lỗi không hiển thị tenant status
refactor(ui): tách DataTable thành sub-components
docs: cập nhật ARCHITECTURE.md
chore(deps): nâng cấp mantine lên 7.16.1
```

### 4. Kiểm tra trước khi push

```bash
pnpm type-check   # không có TypeScript error
pnpm lint         # không có ESLint warning/error
pnpm build        # build thành công
```

### 5. Tạo Pull Request

- Title theo format Conventional Commits
- Mô tả rõ **vấn đề** và **giải pháp**
- Đính kèm screenshot nếu thay đổi UI
- Liên kết issue liên quan (`Closes #123`)

---

## Quy tắc code

### TypeScript
- Luôn khai báo kiểu tường minh cho function parameters và return type
- Ưu tiên `interface` cho object shapes, `type` cho unions/intersections
- Không dùng `any` — dùng `unknown` nếu chưa biết kiểu và narrow down sau

### React
- Function components + hooks — không dùng class components
- Lazy load tất cả route-level pages bằng `React.lazy()`
- Props interface đặt ngay trước component, đặt tên `<ComponentName>Props`
- Tránh prop drilling quá 2 cấp — dùng TanStack Query hoặc Zustand

### Naming
| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Component | PascalCase | `SalesOrderForm` |
| Hook | camelCase + `use` prefix | `useOrderDetail` |
| Utility function | camelCase | `formatMoney` |
| Constant | SCREAMING_SNAKE_CASE | `PAGE_SIZE` |
| Type/Interface | PascalCase | `TenantDto`, `CreateTenantRequest` |

### API & Data Fetching
- Mọi API call đều thông qua functions trong `packages/api-client` hoặc `packages/sysadmin-client`
- Không gọi `axios` trực tiếp trong components
- Query key phải nhất quán: `['resource']` hoặc `['resource', id]` hoặc `['resource', params]`

### Thêm tính năng mới

**Thêm một trang mới vào `@pos/tenant`:**
1. Tạo page component trong `apps/tenant/src/features/<feature>/pages/`
2. Thêm lazy import và route trong `apps/tenant/src/routes/index.tsx`
3. Thêm menu item trong `apps/tenant/src/layouts/AppLayout.tsx` (nếu cần)
4. Thêm translation keys vào `packages/i18n/src/vi/<namespace>.json` và `en/`

**Thêm API endpoint mới:**
1. Thêm function vào `packages/api-client/src/endpoints/<domain>.ts`
2. Thêm types vào `packages/api-client/src/types/<domain>.ts`
3. Export từ `packages/api-client/src/index.ts`

**Thêm shared component:**
1. Tạo thư mục trong `packages/ui/src/components/<ComponentName>/`
2. Export từ `packages/ui/src/index.ts`

---

## Cấu trúc file mới

```
packages/ui/src/components/MyComponent/
├── MyComponent.tsx       # component chính
├── MyComponent.types.ts  # types (nếu dài)
└── index.ts              # re-export
```

---

## Báo lỗi (Bug Report)

Khi tạo issue báo lỗi, hãy cung cấp:
1. App bị lỗi (`tenant` / `sysadmin` / `pos`)
2. Các bước tái hiện lỗi
3. Kết quả thực tế vs kết quả mong đợi
4. Screenshot / console error (nếu có)
5. Trình duyệt + phiên bản OS

---

## Câu hỏi

Mở issue với label `question` hoặc liên hệ maintainer trực tiếp.
