# Kế hoạch triển khai Blog & Admin CMS — Chi tiết công việc

> **Ngày tạo:** 2026-03-18  
> **Tham chiếu:** [cms-blog-plan.md](cms-blog-plan.md) · [ARCHITECTURE.md](../ARCHITECTURE.md)  
> **Trạng thái:** Draft — chờ review trước khi triển khai

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Quyết định kỹ thuật cần thống nhất](#2-quyết-định-kỹ-thuật-cần-thống-nhất)
3. [Danh sách công việc — Hạ tầng chung](#3-danh-sách-công-việc--hạ-tầng-chung)
4. [Danh sách công việc — Blog (Next.js)](#4-danh-sách-công-việc--blog-nextjs)
5. [Danh sách công việc — Admin CMS (React.js)](#5-danh-sách-công-việc--admin-cms-reactjs)
6. [Danh sách công việc — Shared Packages](#6-danh-sách-công-việc--shared-packages)
7. [Thứ tự triển khai & Dependencies](#7-thứ-tự-triển-khai--dependencies)
8. [Phase 2 & Phase 3 (ghi nhận, chưa triển khai)](#8-phase-2--phase-3)

---

## 1. Tổng quan dự án

### Hai app cần tạo

| App | Thư mục | Công nghệ | Port | Mục đích |
|---|---|---|---|---|
| **Blog** | `apps/blog` | Next.js 15+ (App Router, SSR/ISR) | 3003 | Trang giới thiệu sản phẩm, bài viết, bảng giá, liên hệ, gửi yêu cầu hỗ trợ — phục vụ khách hàng tiềm năng |
| **Admin CMS** | `apps/cms-admin` | React 19 + Vite | 3004 | Quản lý nội dung blog, media, bảng giá, yêu cầu liên hệ, phân quyền — dùng nội bộ |

### Shared package bổ sung

| Package | Thư mục | Mục đích |
|---|---|---|
| **@pos/cms-client** | `packages/cms-client` | API client gọi đến POS.CMS.Api (5200), dùng chung cho cả Blog & Admin CMS |

### Backend phụ thuộc

Cả hai app đều gọi đến **POS.CMS.Api** (.NET 10, port 5200). Backend chưa có — cần triển khai riêng. Tài liệu này chỉ bao phủ phần **frontend**; các API endpoint được giả định sẵn sàng theo spec tại [cms-blog-plan.md § 7](cms-blog-plan.md#7-backend-api-design).

---

## 2. Quyết định kỹ thuật cần thống nhất

Monorepo hiện tại sử dụng **Mantine v7** cho UI, trong khi plan đề xuất **Tailwind CSS 4 + shadcn/ui** cho 2 app mới. Cần thống nhất trước khi bắt đầu.

| # | Vấn đề | Lựa chọn A | Lựa chọn B | Ghi chú |
|---|---|---|---|---|
| D1 | **UI Framework cho Blog** | Tailwind + shadcn/ui (theo plan) | Tailwind + shadcn/ui | Blog là site công khai, style riêng biệt, **nên dùng Tailwind + shadcn/ui** để tối ưu SEO/UX landing page. Không cần chung style với tenant app |
| D2 | **UI Framework cho Admin CMS** | Tailwind + shadcn/ui (theo plan) | Mantine v7 (thống nhất với tenant/sysadmin) | Nếu chọn B: tái dùng `@pos/ui`, giảm learning curve. Nếu chọn A: UI hiện đại hơn nhưng tách biệt |
| D3 | **Auth cho CMS** | Tạo `@pos/cms-auth` riêng (JWT key riêng) | Mở rộng `@pos/auth` hiện tại | Theo plan: JWT signing key riêng, CMS users tách biệt POS users → **nên tạo package riêng** |
| D4 | **Rich text editor** | TipTap (theo plan) | Mantine RichTextEditor (wrapper TipTap) | Cả hai đều dùng TipTap bên dưới. Nếu CMS dùng Mantine → chọn `@mantine/tiptap`. Nếu dùng shadcn → TipTap trực tiếp |
| D5 | **Tái sử dụng package** | `@pos/utils`, `@pos/config`, `@pos/i18n` | Tạo mới hoàn toàn | **Nên tái sử dụng** các package chung (utils, config, i18n). Chỉ tạo mới `@pos/cms-client` |

> **Khuyến nghị:** Blog dùng **Tailwind + shadcn/ui**, Admin CMS cũng dùng **Tailwind + shadcn/ui** để thống nhất style giữa 2 app mới (cả 2 hướng đến nhóm người dùng khác với tenant app). Tạo `@pos/cms-client` và `@pos/cms-auth` riêng.

---

## 3. Danh sách công việc — Hạ tầng chung

### 3.1 Cập nhật Monorepo

| # | Công việc | Chi tiết | File ảnh hưởng |
|---|---|---|---|
| I-01 | Cập nhật `pnpm-workspace.yaml` | Đảm bảo `apps/*` và `packages/*` đã bao phủ (đã có sẵn) | `pnpm-workspace.yaml` |
| I-02 | Cập nhật `turbo.json` | Thêm output `.next/**` cho blog (đã có sẵn). Thêm scripts `dev:blog`, `dev:cms` vào root `package.json` | `turbo.json`, `package.json` |
| I-03 | Cập nhật `ARCHITECTURE.md` | Bổ sung mục mô tả 2 app mới, port mapping, shared packages mới | `ARCHITECTURE.md` |

### 3.2 Tạo package `@pos/cms-client`

| # | Công việc | Chi tiết |
|---|---|---|
| I-04 | Khởi tạo package | `packages/cms-client/package.json`, `tsconfig.json`, `src/index.ts` |
| I-05 | Định nghĩa types — Posts | `PostDto`, `PostListParams`, `CreatePostRequest`, `UpdatePostRequest`, `PostStatus` enum |
| I-06 | Định nghĩa types — Categories | `CategoryDto`, `CreateCategoryRequest`, `UpdateCategoryRequest` |
| I-07 | Định nghĩa types — Tags | `TagDto`, `CreateTagRequest` |
| I-08 | Định nghĩa types — Media | `MediaDto`, `MediaListParams`, `UploadMediaResponse` |
| I-09 | Định nghĩa types — Pricing Plans | `PricingPlanDto`, `CreatePricingPlanRequest`, `UpdatePricingPlanRequest`, `PricingFeature` |
| I-10 | Định nghĩa types — Contact Requests | `ContactRequestDto`, `ContactListParams`, `CreateContactRequest`, `CreateSupportRequest`, `ContactStatus`, `ContactType`, `ContactPriority` enums |
| I-11 | Định nghĩa types — Testimonials | `TestimonialDto`, `CreateTestimonialRequest`, `UpdateTestimonialRequest` |
| I-12 | Định nghĩa types — Static Pages | `StaticPageDto`, `CreatePageRequest`, `UpdatePageRequest` |
| I-13 | Định nghĩa types — FAQ | `FaqDto`, `CreateFaqRequest`, `UpdateFaqRequest` |
| I-14 | Định nghĩa types — Site Settings | `SiteSettingDto`, `UpdateSettingsRequest`, `SettingGroup` |
| I-15 | Định nghĩa types — CMS Users | `CmsUserDto`, `CreateCmsUserRequest`, `UpdateCmsUserRequest`, `CmsRole` enum |
| I-16 | Tạo Axios instance | `createCmsApiClient()` — base URL `CMS_API_URL`, interceptors cho auth token refresh |
| I-17 | Tạo Public API functions | `publicApi`: `getPosts()`, `getPostBySlug()`, `getFeaturedPosts()`, `getCategories()`, `getTags()`, `getPricingPlans()`, `getTestimonials()`, `getFaqs()`, `getPageBySlug()`, `getSettings()`, `submitContact()`, `submitSupport()` |
| I-18 | Tạo Admin API functions — Posts | `adminPostsApi`: `list()`, `getById()`, `create()`, `update()`, `delete()`, `publish()`, `archive()` |
| I-19 | Tạo Admin API functions — Categories | `adminCategoriesApi`: CRUD |
| I-20 | Tạo Admin API functions — Tags | `adminTagsApi`: CRUD |
| I-21 | Tạo Admin API functions — Media | `adminMediaApi`: `list()`, `upload()`, `delete()` |
| I-22 | Tạo Admin API functions — Pricing | `adminPricingApi`: CRUD |
| I-23 | Tạo Admin API functions — Contacts | `adminContactsApi`: `list()`, `getById()`, `updateStatus()`, `addNotes()` |
| I-24 | Tạo Admin API functions — Testimonials | `adminTestimonialsApi`: CRUD |
| I-25 | Tạo Admin API functions — Pages | `adminPagesApi`: CRUD |
| I-26 | Tạo Admin API functions — FAQ | `adminFaqApi`: CRUD |
| I-27 | Tạo Admin API functions — Settings | `adminSettingsApi`: `getAll()`, `update()` |
| I-28 | Tạo Admin API functions — Users | `adminUsersApi`: CRUD |
| I-29 | Tạo Admin API functions — Auth | `cmsAuthApi`: `login()`, `refresh()`, `logout()`, `getMe()` |

### 3.3 Tạo package `@pos/cms-auth`

| # | Công việc | Chi tiết |
|---|---|---|
| I-30 | Khởi tạo package | `packages/cms-auth/package.json`, `tsconfig.json`, `src/index.ts` |
| I-31 | Tạo auth store | Zustand store: `accessToken`, `refreshToken`, `user` (CmsUserDto), `login()`, `logout()`, `refreshTokens()`. Persist vào localStorage |
| I-32 | Tạo auth hooks | `useCmsAuth()`, `useCmsRole()`, `useIsCmsAdmin()`, `useIsCmsEditor()`, `useIsCmsSupport()` |
| I-33 | Tạo auth types | `CmsAuthState`, `CmsTokenPayload`, `CmsLoginRequest`, `CmsLoginResponse` |
| I-34 | Tạo `RequireRole` guard component | HOC/wrapper kiểm tra role trước khi render route (Admin, Editor, Support) |

---

## 4. Danh sách công việc — Blog (Next.js)

### 4.1 Khởi tạo project

| # | Công việc | Chi tiết |
|---|---|---|
| B-01 | Khởi tạo Next.js app | `apps/blog/` — Next.js 15+, App Router, TypeScript strict, `package.json` tên `@pos/blog` |
| B-02 | Cấu hình TypeScript | `tsconfig.json` extends `packages/config/typescript`, path alias `@/` → `./src/` |
| B-03 | Cấu hình Next.js | `next.config.ts`: images domains, rewrite `/api` → CMS API, env vars |
| B-04 | Cài đặt Tailwind CSS 4 | `tailwind.config.ts`, `globals.css`, PostCSS config |
| B-05 | Cài đặt shadcn/ui | `components.json`, cài Radix primitives, cấu hình theme colors |
| B-06 | Tạo CMS API lib | `src/lib/cms-api.ts` — wrapper gọi `@pos/cms-client` public API với Next.js `fetch` cache + ISR revalidation |
| B-07 | Tạo base components | `Header`, `Footer`, `Container`, `Section` — layout primitives dùng chung |
| B-08 | Tạo root layout | `app/layout.tsx`: HTML lang="vi", fonts (Inter/Noto Sans), global providers, Header + Footer |

### 4.2 Landing Page (Trang chủ)

| # | Công việc | Chi tiết | Strategy |
|---|---|---|---|
| B-09 | Hero Section | Slogan, mô tả ngắn, 2 CTA buttons ("Dùng thử miễn phí", "Liên hệ tư vấn"), hero image/illustration | ISR 300s |
| B-10 | Feature Highlights | Grid 3–6 tính năng nổi bật (icon + title + description). Dữ liệu có thể hardcode hoặc từ CMS settings | ISR 300s |
| B-11 | Testimonials Section | Carousel/grid testimonials từ API `getTestimonials()` | ISR 300s |
| B-12 | Partners / Clients logos | Logo grid — ảnh lấy từ CMS media hoặc static | ISR 300s |
| B-13 | CTA cuối trang | Form đăng ký dùng thử nhanh hoặc CTA liên hệ | ISR 300s |

### 4.3 Trang giới thiệu tính năng

| # | Công việc | Chi tiết | Strategy |
|---|---|---|---|
| B-14 | Trang tổng quan tính năng | `/features` — danh sách tính năng chính + hình minh họa, lấy từ static pages hoặc hardcode | ISR 300s |
| B-15 | Trang chi tiết tính năng | `/features/[slug]` — dynamic route, nội dung từ CMS static pages | ISR 300s |

### 4.4 Bảng giá (Pricing)

| # | Công việc | Chi tiết | Strategy |
|---|---|---|---|
| B-16 | Pricing Cards | `/pricing` — 3 cards (Starter, Professional, Enterprise), dữ liệu từ `getPricingPlans()` | ISR 300s |
| B-17 | Toggle tháng/năm | Client-side toggle chuyển đổi hiển thị `monthlyPrice` / `yearlyPrice` | Client |
| B-18 | Feature comparison table | Bảng so sánh chi tiết tính năng giữa các gói lấy từ `features` JSON | ISR 300s |
| B-19 | FAQ giá cả | Accordion FAQ lọc theo category "Giá cả" từ `getFaqs()` | ISR 300s |

### 4.5 Blog / Tin tức

| # | Công việc | Chi tiết | Strategy |
|---|---|---|---|
| B-20 | Danh sách bài viết | `/blog` — grid/list view, phân trang, lọc theo category + tag, search. Gọi `getPosts()` | ISR 60s |
| B-21 | Card bài viết | Component `PostCard`: ảnh bìa, title, excerpt, date, category badges, author | — |
| B-22 | Bài viết chi tiết | `/blog/[slug]` — nội dung Markdown/HTML render, ảnh bìa, tác giả, ngày đăng. Gọi `getPostBySlug()` | ISR 60s |
| B-23 | Markdown renderer | Component render content Markdown dùng `react-markdown` + `rehype-highlight` (syntax highlighting) | — |
| B-24 | Bài viết liên quan | Sidebar/bottom section: 3–5 bài cùng category | ISR 60s |
| B-25 | Bài viết theo danh mục | `/blog/category/[slug]` — lọc posts theo category slug | ISR 60s |
| B-26 | Bài viết theo tag | `/blog/tag/[slug]` — lọc posts theo tag slug | ISR 60s |
| B-27 | Chia sẻ MXH | Share buttons: Facebook, Twitter/X, LinkedIn, Zalo (sử dụng share URL scheme) | Client |

### 4.6 Liên hệ & Hỗ trợ

| # | Công việc | Chi tiết | Strategy |
|---|---|---|---|
| B-28 | Trang liên hệ | `/contact` — thông tin công ty (từ settings), bản đồ Google Maps embed | SSR |
| B-29 | Form liên hệ | React Hook Form + Zod validation: họ tên, email, SĐT, loại yêu cầu (dropdown), nội dung. Submit → `submitContact()` | Client |
| B-30 | Trang gửi hỗ trợ | `/support` — form mở rộng: tên, email, SĐT, mã tenant, mô tả vấn đề, mức độ ưu tiên | SSR |
| B-31 | File upload (support) | Cho phép đính kèm file (ảnh, PDF). Upload lên CMS API, trả về URL | Client |
| B-32 | Trang FAQ | `/faq` — accordion list grouped by category, dữ liệu từ `getFaqs()` | ISR 300s |

### 4.7 Trang tĩnh

| # | Công việc | Chi tiết | Strategy |
|---|---|---|---|
| B-33 | Catch-all page | `/[slug]` — render static page từ `getPageBySlug()` (about, terms, privacy) | ISR 600s |

### 4.8 SEO & Performance

| # | Công việc | Chi tiết |
|---|---|---|
| B-34 | Dynamic metadata | `generateMetadata()` cho mọi page: title, description, OG tags, Twitter Card |
| B-35 | Sitemap | `app/sitemap.ts` — dynamic sitemap gồm posts, categories, pages, pricing, features |
| B-36 | Robots.txt | `app/robots.ts` — cho phép crawl public routes, chặn admin |
| B-37 | JSON-LD structured data | Schema.org: `Article` (blog posts), `FAQPage` (FAQ), `Organization` (trang chủ), `Product` (pricing) |
| B-38 | Image optimization | Sử dụng `next/image` cho tất cả ảnh, cấu hình domains cho CMS media URL |
| B-39 | Analytics | Tích hợp Google Analytics 4 hoặc Plausible (cấu hình qua env var) |

---

## 5. Danh sách công việc — Admin CMS (React.js)

### 5.1 Khởi tạo project

| # | Công việc | Chi tiết |
|---|---|---|
| C-01 | Khởi tạo React + Vite app | `apps/cms-admin/` — Vite 6, React 19, TypeScript strict, `package.json` tên `@pos/cms-admin` |
| C-02 | Cấu hình TypeScript | `tsconfig.json` extends shared config, path alias `@/` → `./src/` |
| C-03 | Cấu hình Vite | `vite.config.ts`: port 3004, proxy `/api` → CMS API (5200), alias `@/` |
| C-04 | Cài đặt Tailwind CSS 4 | `tailwind.config.ts`, `globals.css`, PostCSS |
| C-05 | Cài đặt shadcn/ui | `components.json`, cài Radix primitives |
| C-06 | Cấu hình React Router 7 | `src/routes/` — route definitions, lazy loading per feature |
| C-07 | Tạo HTTP client | Axios instance với interceptors: auto attach JWT, auto refresh on 401, error formatting |
| C-08 | Tạo auth flow | Login page → `cmsAuthApi.login()` → store tokens → redirect. Refresh interceptor. Logout. |
| C-09 | Tạo layout chính | `AdminLayout.tsx`: Sidebar (collapsible) + Header (user menu, notifications) + Main content area |
| C-10 | Tạo route guards | `ProtectedRoute` component check auth. `RoleRoute` component check role (Admin/Editor/Support) |
| C-11 | Tạo shared UI components | `DataTable` (TanStack Table v8 + pagination + sorting), `PageHeader`, `FormSection`, `StatusBadge`, `ConfirmDialog` |

### 5.2 Đăng nhập

| # | Công việc | Chi tiết |
|---|---|---|
| C-12 | Login page | `/login` — email + password form, submit → JWT auth, redirect `/` |
| C-13 | Auth guard redirect | Chưa login → redirect `/login`. Đã login → redirect khỏi `/login` |

### 5.3 Dashboard

| # | Công việc | Chi tiết |
|---|---|---|
| C-14 | Dashboard page | `/` — layout grid widgets |
| C-15 | Widget: Thống kê bài viết | Card: Tổng bài / Published / Draft counts |
| C-16 | Widget: Yêu cầu mới | Card: Số contact requests status=New |
| C-17 | Widget: Bài viết gần đây | List 5 bài mới nhất (title, status, date) |
| C-18 | Widget: Hoạt động gần đây | Timeline log (nếu API hỗ trợ, nếu không → bỏ qua phase 1) |

### 5.4 Quản lý bài viết (Posts)

| # | Công việc | Chi tiết |
|---|---|---|
| C-19 | Posts list page | `/posts` — DataTable: title, status badge, category, author, date, actions. Lọc status, search. Phân trang |
| C-20 | Post create page | `/posts/new` — form layout 2 cột (editor bên trái, sidebar metadata bên phải) |
| C-21 | Tích hợp TipTap editor | Rich text editor: heading, bold, italic, link, image (insert từ media library), table, code block, quote, embed video, Markdown shortcuts |
| C-22 | Post edit page | `/posts/:id/edit` — load data → populate form, cho phép update |
| C-23 | SEO fields panel | Sidebar: slug (auto-generate từ title, cho sửa), meta title, meta description, OG image (chọn từ media) |
| C-24 | Category & Tag picker | Sidebar: checkbox list categories, tag input (auto-suggest từ existing tags) |
| C-25 | Featured toggle & Schedule | Sidebar: checkbox `isFeatured`, DateTimePicker cho `publishedAt` (lên lịch) |
| C-26 | Post status actions | Buttons: Lưu nháp, Publish, Archive. Confirm modal cho Publish/Archive |
| C-27 | Post preview | Mở tab mới preview bài viết (hoặc modal), render như blog front-end |
| C-28 | Post delete | Soft delete với confirm dialog |

### 5.5 Quản lý danh mục (Categories)

| # | Công việc | Chi tiết |
|---|---|---|
| C-29 | Categories list page | `/categories` — DataTable: name, slug, parent, sort order, status, actions |
| C-30 | Category form (drawer/modal) | Tạo/sửa: name, slug (auto), description, parent category (dropdown), sort order, active toggle |
| C-31 | Category delete | Soft delete với confirm, kiểm tra có bài viết liên quan |

### 5.6 Quản lý Tags

| # | Công việc | Chi tiết |
|---|---|---|
| C-32 | Tags list page | `/tags` — DataTable: name, slug, post count, actions |
| C-33 | Tag form (drawer/modal) | Tạo/sửa: name, slug (auto) |
| C-34 | Tag delete | Delete với confirm |

### 5.7 Thư viện Media

| # | Công việc | Chi tiết |
|---|---|---|
| C-35 | Media library page | `/media` — Grid view thumbnails, search theo tên, filter theo type |
| C-36 | Upload component | Drag & drop zone (React Dropzone), multi-file upload, progress indicator |
| C-37 | Media detail modal | Click thumbnail → popup: preview, filename, size, dimensions, URL copy, delete button |
| C-38 | Media picker component | Reusable component dùng trong Post editor & SEO fields: mở modal media library, chọn ảnh → return URL |
| C-39 | Media delete | Delete với confirm |

### 5.8 Quản lý bảng giá (Pricing Plans)

| # | Công việc | Chi tiết |
|---|---|---|
| C-40 | Pricing plans list | `/pricing` — DataTable/cards: name, monthly price, yearly price, badge, sort order, status |
| C-41 | Pricing form page | Tạo/sửa: name, monthly price (nullable = "Liên hệ"), yearly price, currency, description, features list (dynamic array: text + included toggle), badge, CTA text + URL, sort order, active toggle |
| C-42 | Pricing delete | Delete với confirm |

### 5.9 Quản lý Testimonials

| # | Công việc | Chi tiết |
|---|---|---|
| C-43 | Testimonials list | `/testimonials` — DataTable: customer name, company, rating stars, sort order, visible toggle |
| C-44 | Testimonial form (drawer) | Tạo/sửa: customer name, position, company, content, avatar (media picker), rating (1-5), sort order, visible toggle |
| C-45 | Testimonial delete | Delete với confirm |

### 5.10 Quản lý liên hệ & hỗ trợ (Contact Requests)

| # | Công việc | Chi tiết |
|---|---|---|
| C-46 | Contact list page | `/contacts` — DataTable: full name, email, type badge, subject, priority badge, status badge, date. Lọc status/type/priority, search, phân trang |
| C-47 | Contact detail page | `/contacts/:id` — thông tin đầy đủ, file đính kèm (download links), internal notes section |
| C-48 | Status update | Dropdown đổi trạng thái: New → InProgress → Resolved → Closed |
| C-49 | Internal notes | Textarea thêm ghi chú nội bộ, hiển thị lịch sử notes |

### 5.11 Quản lý trang tĩnh (Static Pages)

| # | Công việc | Chi tiết |
|---|---|---|
| C-50 | Pages list | `/pages` — DataTable: title, slug, status, updated date |
| C-51 | Page create | `/pages/new` — form: title, slug (auto), content (TipTap editor), meta title, meta description, status (Draft/Published) |
| C-52 | Page edit | `/pages/:id/edit` — load & edit |
| C-53 | Page delete | Soft delete với confirm |

### 5.12 Quản lý FAQ

| # | Công việc | Chi tiết |
|---|---|---|
| C-54 | FAQ list page | `/faq` — DataTable grouped by category: question, category, sort order, active toggle |
| C-55 | FAQ form (drawer/modal) | Tạo/sửa: question, answer (Markdown textarea), category (dropdown: Giá cả, Kỹ thuật, Chung…), sort order, active toggle |
| C-56 | FAQ delete | Delete với confirm |

### 5.13 Cấu hình chung (Site Settings)

| # | Công việc | Chi tiết |
|---|---|---|
| C-57 | Settings page | `/settings` — tabbed form hoặc accordion sections |
| C-58 | Tab: Thông tin công ty | Company name, address, phone, email, logo (media picker), favicon (media picker) |
| C-59 | Tab: Mạng xã hội | Links: Facebook, YouTube, Zalo, LinkedIn |
| C-60 | Tab: SEO mặc định | Default meta title, description, OG image (media picker) |
| C-61 | Tab: Announcement banner | Top bar config: text, link URL, active toggle |
| C-62 | Settings save | Batch update settings API call |

### 5.14 Quản lý Users CMS

| # | Công việc | Chi tiết |
|---|---|---|
| C-63 | Users list | `/users` — DataTable: name, email, role badge, status, actions |
| C-64 | User form (drawer/modal) | Tạo: email, full name, password, role (Admin/Editor/Support). Sửa: full name, role, status |
| C-65 | User delete/deactivate | Deactivate với confirm |

### 5.15 Sidebar Navigation

| # | Công việc | Chi tiết |
|---|---|---|
| C-66 | Sidebar component | Collapsible sidebar, grouped menu items, active state highlight, role-based visibility |
| C-67 | Menu structure | **Nội dung:** Bài viết, Danh mục, Tags, Media, Trang tĩnh, FAQ. **Kinh doanh:** Bảng giá, Testimonials. **Hỗ trợ:** Liên hệ & yêu cầu. **Hệ thống:** Cấu hình, Người dùng |

---

## 6. Danh sách công việc — Shared Packages

### 6.1 Cập nhật `@pos/config`

| # | Công việc | Chi tiết |
|---|---|---|
| S-01 | Thêm TypeScript config cho Next.js | `packages/config/typescript/nextjs.json` — extends base, thêm Next.js-specific options |
| S-02 | Thêm ESLint config cho Next.js | `packages/config/eslint/nextjs.js` — extends base + `next/core-web-vitals` |

### 6.2 Cập nhật `@pos/i18n` (nếu cần)

| # | Công việc | Chi tiết |
|---|---|---|
| S-03 | Thêm CMS namespace translations | Translations cho CMS admin UI (vi/en): labels, error messages, status names |
| S-04 | Thêm Blog namespace translations | Translations cho blog public UI (vi/en): buttons, form labels, messages |

---

## 7. Thứ tự triển khai & Dependencies

### Dependency graph

```
┌──────────────┐     ┌───────────────┐     ┌───────────────┐
│ @pos/config  │────>│ @pos/cms-auth │────>│ cms-admin     │
│   (S-01,02)  │     │  (I-30..34)   │     │  (C-01..67)   │
└──────┬───────┘     └───────────────┘     └───────┬───────┘
       │                                           │
       │             ┌───────────────┐             │
       └────────────>│@pos/cms-client│<────────────┘
                     │  (I-04..29)   │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │    blog       │
                     │  (B-01..39)   │
                     └───────────────┘
```

### Sprint breakdown đề xuất (Phase 1)

#### Sprint 1 — Foundation (Tuần 1–2)

| Nhóm | Tasks | Mục tiêu |
|---|---|---|
| Hạ tầng | I-01 → I-03 | Monorepo sẵn sàng cho 2 app mới |
| CMS Client | I-04 → I-18 | Types + Public API functions hoàn chỉnh |
| CMS Auth | I-30 → I-34 | Auth package sẵn sàng |
| Config | S-01, S-02 | Shared configs cho Next.js |
| Blog init | B-01 → B-08 | Blog project chạy được, có layout base |
| CMS init | C-01 → C-13 | CMS project chạy được, có login + layout |

**Milestone:** Cả 2 app khởi động được (`pnpm dev:blog`, `pnpm dev:cms`), CMS có thể login.

#### Sprint 2 — Content Core (Tuần 3–4)

| Nhóm | Tasks | Mục tiêu |
|---|---|---|
| CMS Client | I-18 → I-29 | Admin API functions hoàn chỉnh |
| Blog | B-09 → B-13 | Landing page hoàn chỉnh |
| Blog | B-20 → B-24 | Blog list + detail pages |
| CMS | C-14 → C-18 | Dashboard |
| CMS | C-19 → C-28 | Post CRUD + TipTap editor |
| CMS | C-35 → C-39 | Media library |

**Milestone:** Tạo bài viết từ CMS → hiển thị trên Blog.

#### Sprint 3 — Feature Complete (Tuần 5–6)

| Nhóm | Tasks | Mục tiêu |
|---|---|---|
| Blog | B-14 → B-19 | Features + Pricing pages |
| Blog | B-25 → B-33 | Category/tag pages, Contact, Support, FAQ, Static pages |
| Blog | B-34 → B-39 | SEO + performance |
| CMS | C-29 → C-34 | Categories + Tags CRUD |
| CMS | C-40 → C-45 | Pricing + Testimonials |
| CMS | C-46 → C-56 | Contacts, Pages, FAQ |
| CMS | C-57 → C-67 | Settings, Users, Sidebar |

**Milestone:** Phase 1 feature-complete, sẵn sàng test end-to-end.

---

## 8. Phase 2 & Phase 3

Các tính năng sau **không nằm trong scope Phase 1**, ghi nhận để triển khai sau.

### Phase 2

| Hạng mục | Ghi chú |
|---|---|
| Email notifications | Gửi email khi có yêu cầu hỗ trợ mới, khi trạng thái thay đổi. Cần SMTP config |
| Contact assignment | `assignedTo` field, phân công yêu cầu cho nhân viên cụ thể |
| Analytics dashboard | Thống kê lượt xem bài viết, sources, popular posts (cần view tracking API) |
| S3/MinIO storage | Chuyển media storage sang S3-compatible. Đổi `IMediaStorageService` implementation |
| CDN integration | Serve static assets & images qua Cloudflare / CloudFront |
| Full-text search | PostgreSQL `tsvector` hoặc Elasticsearch cho search bài viết |
| Audit log | Ghi log mọi thao tác admin, hiển thị timeline trên Dashboard |
| Multi-language | i18n cho Blog (Vietnamese + English), language switcher |

### Phase 3

| Hạng mục | Ghi chú |
|---|---|
| Live chat | Tawk.to / Crisp widget integration |
| Newsletter | Thu thập email + gửi newsletter (Mailchimp API hoặc tự build) |
| A/B testing | Thử nghiệm landing page variants |
| Comments | Hệ thống bình luận bài viết (moderated) |
| CMS workflow | Draft → Review → Approve → Publish (multi-editor approval) |
| Auto SEO suggestions | AI-powered meta title/description suggestions |

---

## Tổng hợp số lượng

| Nhóm | Số task |
|---|---|
| Hạ tầng chung (I-xx) | 34 tasks |
| Blog (B-xx) | 39 tasks |
| Admin CMS (C-xx) | 67 tasks |
| Shared packages (S-xx) | 4 tasks |
| **Tổng Phase 1** | **144 tasks** |

> **Lưu ý:** Tất cả task đều giả định **backend CMS API đã sẵn sàng** hoặc được phát triển song song. Nếu backend chưa có, cần tạo mock API / MSW (Mock Service Worker) để phát triển frontend song song — thêm ~5 tasks setup mock.
