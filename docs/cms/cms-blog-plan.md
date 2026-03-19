# Phương án Blog & CMS — Giới thiệu sản phẩm POS

> **Ngày tạo:** 2026-03-18  
> **Trạng thái:** Draft — chờ review  
> **Liên quan:** [ARCHITECTURE.md](../ARCHITECTURE.md) · [docker-compose.yml](../docker-compose.yml)

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Nghiệp vụ — Trang Blog](#2-nghiệp-vụ--trang-blog)
3. [Nghiệp vụ — Admin CMS](#3-nghiệp-vụ--admin-cms)
4. [Kiến trúc hệ thống](#4-kiến-trúc-hệ-thống)
5. [Tech Stack](#5-tech-stack)
6. [Database Design](#6-database-design)
7. [Backend API Design](#7-backend-api-design)
8. [Blog Frontend — Next.js](#8-blog-frontend--nextjs)
9. [Admin CMS Frontend — React.js](#9-admin-cms-frontend--reactjs)
10. [SEO & Performance](#10-seo--performance)
11. [Bảo mật](#11-bảo-mật)
12. [Triển khai & Hạ tầng](#12-triển-khai--hạ-tầng)
13. [Phân chia giai đoạn](#13-phân-chia-giai-đoạn)

---

## 1. Tổng quan

### Mục tiêu

Xây dựng **2 ứng dụng** phục vụ marketing & hỗ trợ khách hàng cho sản phẩm POS SaaS:

| Ứng dụng | Mục đích | Người dùng | Công nghệ |
|---|---|---|---|
| **Blog / Landing page** | Giới thiệu sản phẩm, bảng giá, tin bài, liên hệ, gửi yêu cầu hỗ trợ | Khách hàng tiềm năng, công chúng | **Next.js** (SSR/SSG) |
| **Admin CMS** | Quản lý nội dung, đăng bài, quản lý liên hệ & yêu cầu hỗ trợ | Nhân viên nội bộ (Marketing, Support) | **React.js** (SPA) |

### Quan hệ với hệ thống hiện tại

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HỆ THỐNG HIỆN TẠI                                │
│                                                                         │
│  POS.Api (8080)         POS.SysAdmin.Api (5100)                         │
│  └─ Tenant CRUD/RBAC   └─ Super admin                                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        BỔ SUNG MỚI                                      │
│                                                                         │
│  CMS Blog API (5003)   ← .NET 10 — Public API cho Blog (không auth)     │
│       └───► Blog (Next.js :3003)  ← Public — SSR/SSG, SEO tối ưu        │
│                                                                         │
│  CMS Admin API (5002)  ← .NET 10 — Admin API cho CMS (JWT auth)         │
│       └───► Admin CMS (React :3004) ← Internal — SPA, xác thực JWT      │
│                                                                         │
│  Shared: PostgreSQL (pos_cms DB), Redis, Observability stack            │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Database riêng** `pos_cms` — không chia sẻ dữ liệu với tenant DB, tránh coupling.
- **Shared infrastructure**: PostgreSQL server, Redis, Grafana stack (Loki, Tempo, Prometheus).
- **Tách biệt deploy**: Blog & CMS là ứng dụng độc lập, có thể deploy/scale riêng.

---

## 2. Nghiệp vụ — Trang Blog

### 2.1 Trang chủ (Landing Page)

| Thành phần | Mô tả |
|---|---|
| **Hero section** | Slogan, mô tả ngắn, CTA "Dùng thử miễn phí" / "Liên hệ tư vấn" |
| **Điểm nổi bật** | 3–6 feature highlights (icon + tiêu đề + mô tả ngắn) |
| **Testimonials** | Đánh giá từ khách hàng (quản lý qua CMS) |
| **Đối tác / Khách hàng** | Logo grid |
| **CTA cuối trang** | Form đăng ký dùng thử / liên hệ nhanh |

### 2.2 Giới thiệu sản phẩm

| Thành phần | Mô tả |
|---|---|
| **Tổng quan tính năng** | Danh sách tính năng chính với hình minh họa |
| **Trang chi tiết tính năng** | Mỗi tính năng lớn có 1 trang riêng (dynamic route) |
| **So sánh gói** | Bảng so sánh tính năng giữa các gói |
| **Video demo** | Embed video giới thiệu (YouTube / tự host) |

### 2.3 Bảng giá (Pricing)

| Thành phần | Mô tả |
|---|---|
| **Pricing cards** | Hiển thị các gói dịch vụ (Starter, Professional, Enterprise) |
| **Toggle tháng/năm** | Chuyển đổi chu kỳ thanh toán |
| **Feature comparison** | Bảng chi tiết tính năng theo gói |
| **CTA** | "Đăng ký ngay" → form liên hệ hoặc link đến trang đăng ký |
| **FAQ** | Câu hỏi thường gặp về giá & thanh toán |

> **Lưu ý:** Giá cả được quản lý qua CMS, không hardcode. Hỗ trợ hiển thị "Liên hệ" thay vì giá cụ thể cho gói Enterprise.

### 2.4 Blog / Tin tức

| Thành phần | Mô tả |
|---|---|
| **Danh sách bài viết** | Grid/list view, phân trang, lọc theo danh mục + tag |
| **Bài viết chi tiết** | Nội dung Markdown/HTML, ảnh bìa, tác giả, ngày đăng, bài liên quan |
| **Danh mục** | Phân loại: Tin tức, Hướng dẫn, Cập nhật sản phẩm, Case study |
| **Tìm kiếm** | Full-text search bài viết |
| **Chia sẻ MXH** | Share buttons (Facebook, Twitter/X, LinkedIn, Zalo) |

### 2.5 Liên hệ & Hỗ trợ

| Thành phần | Mô tả |
|---|---|
| **Thông tin liên hệ** | Địa chỉ, SĐT, email, bản đồ (Google Maps embed) |
| **Form liên hệ/hỗ trợ hợp nhất** | Họ tên, email, SĐT, loại yêu cầu (General/Sales/Support/Partnership), tiêu đề, nội dung, mức độ ưu tiên (Normal/High/Urgent), mã tenant (nếu có) |
| **FAQ** | Danh sách câu hỏi thường gặp (quản lý qua CMS) |
| **Chatbot / Live chat** | Tích hợp Tawk.to hoặc tương đương (phase 2) |

> **Lưu ý:** Backend chỉ có 1 endpoint `POST /api/v1/contact` dùng chung cho mọi loại yêu cầu. Trường `type` (enum) phân biệt loại: General, Sales, Support, Partnership. Không có upload file đính kèm ở form công khai — chỉ quản lý attachments qua Admin.

### 2.6 Trang tĩnh bổ sung

- Điều khoản sử dụng
- Chính sách bảo mật
- Về chúng tôi

---

## 3. Nghiệp vụ — Admin CMS

### 3.1 Quản lý bài viết (Posts)

| Chức năng | Mô tả |
|---|---|
| **CRUD bài viết** | Tạo, sửa, xóa bài viết |
| **Rich text editor** | WYSIWYG editor (TipTap hoặc TinyMCE) hỗ trợ Markdown, embed media |
| **Trạng thái bài viết** | Draft → Published → Archived |
| **Lên lịch đăng** | Đặt `publishedAt` trong tương lai → tự động publish |
| **SEO fields** | Meta title, meta description, OG image, canonical URL, slug tùy chỉnh |
| **Danh mục & Tags** | Gán nhiều danh mục + tags cho mỗi bài |
| **Bài viết nổi bật** | Đánh dấu `isFeatured` để hiển thị ở vị trí đặc biệt |
| **Preview** | Xem trước bài viết trước khi publish |

### 3.2 Quản lý danh mục (Categories)

| Chức năng | Mô tả |
|---|---|
| **CRUD danh mục** | Tên, slug, mô tả, thứ tự hiển thị |
| **Phân cấp** | Hỗ trợ danh mục cha-con (1 cấp) |
| **Trạng thái** | Active / Inactive |

### 3.3 Quản lý Tags

| Chức năng | Mô tả |
|---|---|
| **CRUD tags** | Tên, slug |
| **Auto-suggest** | Gợi ý tag đã có khi gắn tag cho bài viết |

### 3.4 Quản lý Media (Ảnh / File)

| Chức năng | Mô tả |
|---|---|
| **Upload** | Kéo thả hoặc chọn file, hỗ trợ multi-upload |
| **Thư viện** | Grid view tất cả media đã upload, tìm kiếm theo tên |
| **Tối ưu ảnh** | Server-side resize + WebP conversion (via ImageSharp) |
| **Quota** | Giới hạn tổng dung lượng (cấu hình) |
| **Storage** | Local disk (dev) / S3-compatible (production) — MinIO hoặc AWS S3 |

### 3.5 Quản lý Bảng giá (Pricing Plans)

| Chức năng | Mô tả |
|---|---|
| **CRUD gói giá** | Tên, giá tháng, giá năm, mô tả, danh sách tính năng, thứ tự, badge ("Phổ biến nhất"), trạng thái |
| **Feature list** | Mảng JSON: `[{ "text": "Tối đa 1 chi nhánh", "included": true }]` |
| **CTA config** | Nút CTA tùy chỉnh: text + URL (hoặc "Liên hệ") |

### 3.6 Quản lý Liên hệ & Yêu cầu hỗ trợ

| Chức năng | Mô tả |
|---|---|
| **Xem danh sách** | Lọc theo trạng thái, loại, ngày, tìm kiếm |
| **Chi tiết** | Xem thông tin liên hệ + file đính kèm |
| **Trạng thái** | New → InProgress → Resolved → Closed |
| **Ghi chú nội bộ** | Nhân viên thêm note cho mỗi yêu cầu |
| **Phân công** | Gán yêu cầu cho nhân viên (phase 2) |
| **Email thông báo** | Gửi email khi có yêu cầu mới (phase 2) |

### 3.7 Quản lý Testimonials

| Chức năng | Mô tả |
|---|---|
| **CRUD** | Tên khách hàng, chức vụ, công ty, nội dung đánh giá, avatar, rating (1–5) |
| **Thứ tự** | `sortOrder` để sắp xếp trên Landing page |
| **Hiển thị/ẩn** | Toggle `isVisible` |

### 3.8 Quản lý Pages tĩnh

| Chức năng | Mô tả |
|---|---|
| **CRUD** | Tiêu đề, slug, nội dung HTML/Markdown |
| **SEO fields** | Meta title, description |
| **Trạng thái** | Draft / Published |

### 3.9 Cấu hình chung (Site Settings)

| Chức năng | Mô tả |
|---|---|
| **Thông tin công ty** | Tên, địa chỉ, SĐT, email, logo, favicon |
| **Mạng xã hội** | Links Facebook, YouTube, Zalo, LinkedIn |
| **SEO mặc định** | Default meta title, description, OG image |
| **Banner / Announcement** | Top bar thông báo (text + link + trạng thái) |

### 3.10 Quản lý FAQ

| Chức năng | Mô tả |
|---|---|
| **CRUD** | Câu hỏi, câu trả lời (Markdown), danh mục, thứ tự |
| **Nhóm** | Nhóm theo danh mục (Giá cả, Kỹ thuật, Chung…) |

### 3.11 Phân quyền CMS

| Role | Quyền |
|---|---|
| **Admin** | Toàn quyền: quản lý users, settings, tất cả nội dung |
| **Editor** | CRUD bài viết, media, categories, tags. Không truy cập settings / users |
| **Support** | Chỉ xem & xử lý yêu cầu hỗ trợ, liên hệ |

---

## 4. Kiến trúc hệ thống

### 4.1 Sơ đồ tổng thể

```
                    ┌────────────────────────────────────────┐
                    │            PUBLIC INTERNET             │
                    └────────┬──────────────┬────────────────┘
                             │              │
                         HTTPS          HTTPS
                             │              │
                    ┌────────▼───────┐  ┌───▼────────────────┐
                    │  Blog (Next.js)│  │  Admin CMS (React) │
                    │  SSR/SSG       │  │  SPA               │
                    │  Port 3003     │  │  Port 3004         │
                    └────────┬───────┘  └───┬────────────────┘
                             │              │
                             │    REST API  │
                             ▼              ▼
                    ┌───────────────────┐┌───────────────────┐
                    │  CMS Blog API    ││  CMS Admin API    │
                    │  (.NET 10)       ││  (.NET 10)        │
                    │  Port 5003       ││  Port 5002        │
                    │                  ││                   │
                    │  Public          ││  Admin (JWT Auth) │
                    │  Endpoints       ││  Endpoints        │
                    │  (no auth)       ││                   │
                    │  120 req/min     ││  300 req/min      │
                    └────────┬─────────┘└───┬───────────────┘
                             │              │
                    ┌────────▼──────────────▼────────────────┐
                    │     CMS Service Layer                  │
                    │  PostService, MediaService,            │
                    │  ContactService, SettingService        │
                    │                                        │
                    │  ┌──────────────────────────────────┐  │
                    │  │     CmsDbContext (EF Core 10)    │  │
                    │  │     Database: pos_cms            │  │
                    │  └──────────────┬───────────────────┘  │
                    └─────────────────┼──────────────────────┘
                                      │
                    ┌─────────────────▼──────────────────────┐
                    │  PostgreSQL     │  Redis    │ S3/MinIO │
                    │  (pos_cms DB)   │  (cache)  │ (media)  │
                    └────────────────────────────────────────┘
```

### 4.2 Project Structure (.NET)

```
src/
  POS.CMS.Blog.Api/         ← ASP.NET Core Web API — Public (port 5003, no auth)
    Controllers/
      PostsController.cs
      CategoriesController.cs
      TagsController.cs
      PricingController.cs
      TestimonialsController.cs
      FaqsController.cs
      PagesController.cs
      SettingsController.cs
      ContactController.cs

  POS.CMS.Admin.Api/        ← ASP.NET Core Web API — Admin (port 5002, JWT auth)
    Controllers/
      AuthController.cs
      DashboardController.cs
      PostsController.cs
      CategoriesController.cs
      TagsController.cs
      MediaController.cs
      PricingController.cs
      TestimonialsController.cs
      ContactsController.cs
      PagesController.cs
      FaqsController.cs
      SettingsController.cs
      UsersController.cs
    Middleware/
    Authorization/
    Program.cs

  POS.CMS.Core/             ← Domain: entities, DTOs, interfaces, enums
    Entities/
    DTOs/
    Interfaces/
    Enums/

  POS.CMS.Data/             ← EF Core DbContext, migrations
    CmsDbContext.cs
    Migrations/

  POS.CMS.Services/         ← Business logic
    PostService.cs
    CategoryService.cs
    MediaService.cs
    ContactService.cs
    PricingPlanService.cs
    TestimonialService.cs
    PageService.cs
    FaqService.cs
    SiteSettingService.cs
    CmsUserService.cs
```

### 4.3 Frontend Structure

```
apps/
  blog/                      ← Next.js (SSR/SSG)
    src/
      app/                   ← App Router
        page.tsx             ← Landing page
        blog/
          page.tsx           ← Danh sách bài viết
          [slug]/page.tsx    ← Chi tiết bài viết
        pricing/page.tsx
        features/
          page.tsx
          [slug]/page.tsx
        contact/page.tsx
        faq/page.tsx
        [slug]/page.tsx      ← Trang tĩnh (about, terms, privacy)
      components/
      lib/                   ← API client, utils
    public/
    next.config.ts

  cms-admin/                 ← React.js (Vite + React Router)
    src/
      pages/
        Dashboard.tsx
        posts/
        categories/
        media/
        pricing/
        contacts/
        testimonials/
        pages/
        faq/
        settings/
        users/
      components/
      hooks/
      lib/                   ← API client, auth
      layouts/
    vite.config.ts
```

---

## 5. Tech Stack

### 5.1 Backend — POS.CMS (Blog API + Admin API)

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| **Runtime** | .NET 10 | Đồng bộ với POS.Api hiện tại |
| **Framework** | ASP.NET Core 10 Minimal/Controller API | Controller-based để thống nhất |
| **ORM** | EF Core 10 + Npgsql | Migration riêng cho `pos_cms` |
| **Database** | PostgreSQL 17 | Dùng chung PostgreSQL server, DB riêng `pos_cms` |
| **Cache** | Redis | Cache bài viết, settings, pricing plans |
| **Auth** | JWT Bearer | Signing key riêng cho CMS, tách biệt POS JWT |
| **Validation** | FluentValidation 12 | Thống nhất pattern |
| **Image processing** | SixLabors.ImageSharp | Resize, crop, convert WebP |
| **File storage** | Local (dev) / S3 via `AWSSDK.S3` hoặc MinIO | Abstraction: `IMediaStorageService` |
| **Email** | MailKit / SmtpClient | Gửi thông báo yêu cầu hỗ trợ (phase 2) |
| **Logging** | Serilog → Loki + Elasticsearch | Tái sử dụng `POS.Observability` |
| **Tracing** | OpenTelemetry → Tempo | Tái sử dụng `POS.Observability` |
| **API Docs** | Swagger / OpenAPI 3 | `/swagger` |
| **Rate Limiting** | ASP.NET Core Rate Limiting | `public` 120/min (blog), `contact` 5/min, `admin` 300/min, `auth` 10/min |

### 5.2 Blog — Next.js

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| **Framework** | Next.js 15+ (App Router) | SSR + ISR cho SEO tối ưu |
| **Language** | TypeScript | Strict mode |
| **Styling** | Tailwind CSS 4 | Utility-first, responsive |
| **UI Components** | shadcn/ui | Headless, accessible, customizable |
| **State** | React Server Components + `nuqs` (URL state) | Minimal client state |
| **Data fetching** | `fetch` + Next.js cache | ISR: revalidate mỗi 60s cho bài viết |
| **Form handling** | React Hook Form + Zod | Client validation |
| **SEO** | Next.js Metadata API | Dynamic meta tags, sitemap.xml, robots.txt |
| **Analytics** | Google Analytics 4 / Plausible | Privacy-friendly option |
| **Markdown** | `react-markdown` + `rehype-highlight` | Render bài viết Markdown |
| **Image** | `next/image` | Auto optimize, lazy loading, WebP |

### 5.3 Admin CMS — React.js

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| **Build tool** | Vite 6 | Fast HMR |
| **Framework** | React 19 | |
| **Language** | TypeScript | Strict mode |
| **Routing** | React Router 7 | Nested routes, lazy loading |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Thống nhất với Blog |
| **State management** | TanStack Query (React Query) v5 | Server state caching, optimistic updates |
| **Form** | React Hook Form + Zod | |
| **Rich text editor** | TipTap | Headless, extensible, Markdown support |
| **Table** | TanStack Table v8 | Sorting, filtering, pagination |
| **File upload** | React Dropzone | Drag & drop, multi-file |
| **Date picker** | date-fns + shadcn date picker | |
| **Auth** | JWT (access + refresh token) | Stored in httpOnly cookie hoặc memory |
| **HTTP client** | Axios + interceptors | Auto refresh token, error handling |
| **Toast** | Sonner | Notification |
| **Icons** | Lucide React | Consistent icon set |

---

## 6. Database Design

### 6.1 ERD tổng quan

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  cms_users   │     │     posts        │────>│  categories │
│              │────>│                  │     └─────────────┘
│ id           │     │ id               │
│ email        │     │ title            │     ┌─────────────┐
│ passwordHash │     │ slug (UNIQUE)    │────>│    tags     │
│ fullName     │     │ content          │     │             │
│ role         │     │ excerpt          │     │ id          │
│ status       │     │ coverImageUrl    │     │ name        │
│ ...          │     │ authorId → users │     │ slug        │
└──────────────┘     │ status           │     └─────────────┘
                     │ isFeatured       │          ▲
                     │ publishedAt      │          │
                     │ metaTitle        │     ┌────┴────────┐
                     │ metaDescription  │     │  post_tags  │
                     │ ...              │     │ postId      │
                     └──────────────────┘     │ tagId       │
                                              └─────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐
│  pricing_plans   │  │   testimonials   │  │   contact_requests│
│                  │  │                  │  │                   │
│ id               │  │ id               │  │ id                │
│ name             │  │ customerName     │  │ fullName          │
│ monthlyPrice     │  │ position         │  │ email             │
│ yearlyPrice      │  │ company          │  │ phone             │
│ description      │  │ content          │  │ type (enum)       │
│ features (JSON)  │  │ avatarUrl        │  │ subject           │
│ badge            │  │ rating           │  │ message           │
│ ctaText          │  │ sortOrder        │  │ priority          │
│ ctaUrl           │  │ isVisible        │  │ status (enum)     │
│ sortOrder        │  │ ...              │  │ tenantCode        │
│ isActive         │  └──────────────────┘  │ attachmentUrls    │
│ ...              │                        │ internalNotes     │
└──────────────────┘  ┌──────────────────┐  │ assignedTo        │
                      │   static_pages   │  │ ...               │
┌──────────────────┐  │                  │  └───────────────────┘
│     media        │  │ id               │
│                  │  │ title            │  ┌───────────────────┐
│ id               │  │ slug (UNIQUE)    │  │   faqs            │
│ fileName         │  │ content          │  │                   │
│ originalName     │  │ metaTitle        │  │ id                │
│ mimeType         │  │ metaDescription  │  │ question          │
│ fileSize         │  │ status           │  │ answer            │
│ url              │  │ ...              │  │ category          │
│ thumbnailUrl     │  └──────────────────┘  │ sortOrder         │
│ width            │                        │ isActive          │
│ height           │  ┌──────────────────┐  │ ...               │
│ uploadedBy       │  │  site_settings   │  └───────────────────┘
│ ...              │  │                  │
└──────────────────┘  │ id               │  ┌───────────────────┐
                      │ key (UNIQUE)     │  │  post_categories  │
                      │ valueJson (text) │  │                   │
                      │ group            │  │ postId            │
                      │ ...              │  │ categoryId        │
                      └──────────────────┘  └───────────────────┘
```

### 6.2 Entity chi tiết

#### `posts`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | UUID (PK) | |
| `title` | varchar(300) | Tiêu đề bài viết |
| `slug` | varchar(300) UNIQUE | URL-friendly, auto-generate từ title |
| `excerpt` | varchar(500) | Tóm tắt ngắn |
| `content` | text | Nội dung Markdown / HTML |
| `cover_image_url` | varchar(500) | Ảnh bìa |
| `author_id` | UUID (FK → cms_users) | Tác giả |
| `status` | smallint | 0=Draft, 1=Published, 2=Archived |
| `is_featured` | boolean | Bài nổi bật |
| `published_at` | timestamptz | Thời điểm publish (hỗ trợ lên lịch) |
| `meta_title` | varchar(200) | SEO title |
| `meta_description` | varchar(400) | SEO description |
| `og_image_url` | varchar(500) | Open Graph image |
| `view_count` | int | Lượt xem (increment async) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `is_deleted` | boolean | Soft delete |

#### `categories`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | varchar(100) | Tên danh mục |
| `slug` | varchar(100) UNIQUE | |
| `description` | varchar(500) | |
| `parent_id` | UUID (FK → categories, nullable) | Danh mục cha |
| `sort_order` | int | Thứ tự hiển thị |
| `is_active` | boolean | |
| `created_at` | timestamptz | |

#### `contact_requests`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | UUID (PK) | |
| `full_name` | varchar(200) | |
| `email` | varchar(200) | |
| `phone` | varchar(20) | |
| `type` | smallint | 0=General, 1=Sales, 2=Support, 3=Partnership |
| `subject` | varchar(300) | |
| `message` | text | |
| `priority` | smallint | 0=Normal, 1=High, 2=Urgent |
| `status` | smallint | 0=New, 1=InProgress, 2=Resolved, 3=Closed |
| `tenant_code` | varchar(50) | Mã tenant (nếu là yêu cầu hỗ trợ từ KH hiện tại) |
| `attachment_urls` | jsonb | Danh sách URL file đính kèm |
| `internal_notes` | text | Ghi chú nội bộ |
| `assigned_to` | UUID (FK → cms_users, nullable) | Nhân viên phụ trách |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `pricing_plans`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | varchar(100) | Tên gói |
| `monthly_price` | decimal(18,2) nullable | null = "Liên hệ" |
| `yearly_price` | decimal(18,2) nullable | |
| `currency` | varchar(10) | VND, USD |
| `description` | varchar(500) | |
| `features` | jsonb | `[{ "text": "...", "included": true }]` |
| `badge` | varchar(50) nullable | "Phổ biến nhất", "Mới" |
| `cta_text` | varchar(100) | Text nút CTA |
| `cta_url` | varchar(500) | URL nút CTA |
| `sort_order` | int | |
| `is_active` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `site_settings`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | UUID (PK) | |
| `key` | varchar(100) UNIQUE | Ví dụ: `company.name`, `social.facebook`, `seo.defaultTitle` |
| `value_json` | text | Giá trị JSON dưới dạng string — cần `JSON.parse()` khi sử dụng |
| `group` | varchar(50) | Nhóm: `company`, `social`, `seo`, `announcement` |
| `updated_at` | timestamptz | |

---

## 7. Backend API Design

### 7.1 Public API (Blog — không cần auth)

Base path: `/api/v1` · Port: `5003` · Rate limit: 120 req/min (public), 5 req/min (contact)

| Method | Endpoint | Mô tả | Cache |
|---|---|---|---|
| GET | `/posts` | Danh sách bài viết (published, phân trang, lọc category/tag, search) | 60s |
| GET | `/posts/featured` | Bài viết nổi bật (`?limit=6`) | 120s |
| GET | `/posts/{slug}` | Chi tiết bài viết theo slug (tự tăng viewCount) | 60s |
| GET | `/categories` | Danh sách danh mục (active) | 300s |
| GET | `/tags` | Danh sách tags | 300s |
| GET | `/pricing` | Danh sách gói giá (active, sorted) | 300s |
| GET | `/testimonials` | Danh sách testimonials (visible, sorted) | 300s |
| GET | `/faqs` | Danh sách FAQ (active) | 300s |
| GET | `/pages/{slug}` | Nội dung trang tĩnh (published) | 120s |
| GET | `/settings` | Site settings public (company, social, seo, announcement) | 600s |
| POST | `/contact` | Gửi form liên hệ/hỗ trợ (type: General/Sales/Support/Partnership) | — |

> **Lưu ý:**
> - Response dạng `PostSummaryDto` trả `categorySlugs: string[]` và `tagSlugs: string[]` (không phải ID).
> - `PostDetailDto` trả `categories: CategoryDto[]` và `tags: TagDto[]` (full object).
> - Settings trả `valueJson` (string JSON) — frontend cần `JSON.parse(valueJson)`.
> - Pricing endpoint là `/pricing` (không phải `/pricing-plans`).
> - Không có endpoint `/support` riêng — dùng chung `/contact` với `type` = "Support".

### 7.2 Admin API (CMS — yêu cầu JWT)

Base path: `/api/v1/admin` · Port: `5002` · Rate limit: 300 req/min (admin), 10 req/min (auth)

| Method | Endpoint | Mô tả | Authorization |
|---|---|---|---|
| **Auth** | | | |
| POST | `/auth/login` | Đăng nhập CMS | — |
| POST | `/auth/refresh` | Refresh token | — |
| POST | `/auth/logout` | Đăng xuất | Any |
| GET | `/auth/me` | Profile hiện tại | Any |
| **Dashboard** | | | |
| GET | `/dashboard` | Thống kê tổng quan (totalPosts, publishedPosts, draftPosts, newContactRequests, recentPosts) | Any |
| **Posts** | | | |
| GET | `/posts` | Danh sách (bao gồm Draft, filter by status/isFeatured) | EditorPlus |
| GET | `/posts/{id}` | Chi tiết theo ID | EditorPlus |
| POST | `/posts` | Tạo bài viết | EditorPlus |
| PUT | `/posts/{id}` | Cập nhật | EditorPlus |
| DELETE | `/posts/{id}` | Xóa (soft delete) | AdminOnly |
| POST | `/posts/{id}/publish` | Publish bài viết | EditorPlus |
| POST | `/posts/{id}/archive` | Archive bài viết | EditorPlus |
| **Categories** | | | |
| GET | `/categories` | Danh sách (bao gồm inactive) | EditorPlus |
| GET | `/categories/{id}` | Chi tiết | EditorPlus |
| POST | `/categories` | Tạo danh mục | EditorPlus |
| PUT | `/categories/{id}` | Cập nhật | EditorPlus |
| DELETE | `/categories/{id}` | Xóa | AdminOnly |
| **Tags** | | | |
| GET | `/tags` | Danh sách | EditorPlus |
| GET | `/tags/{id}` | Chi tiết | EditorPlus |
| POST | `/tags` | Tạo tag | EditorPlus |
| PUT | `/tags/{id}` | Cập nhật | EditorPlus |
| DELETE | `/tags/{id}` | Xóa | AdminOnly |
| **Media** | | | |
| GET | `/media` | Danh sách media (pageSize mặc định: 30) | EditorPlus |
| POST | `/media/upload` | Upload file (multipart, max 20MB) | EditorPlus |
| DELETE | `/media/{id}` | Xóa media | AdminOnly |
| **Pricing Plans** | | | |
| GET | `/pricing` | Danh sách (bao gồm inactive) | AdminOnly |
| GET | `/pricing/{id}` | Chi tiết | AdminOnly |
| POST | `/pricing` | Tạo gói giá | AdminOnly |
| PUT | `/pricing/{id}` | Cập nhật | AdminOnly |
| DELETE | `/pricing/{id}` | Xóa | AdminOnly |
| **Testimonials** | | | |
| GET | `/testimonials` | Danh sách (bao gồm hidden) | AdminOnly |
| GET | `/testimonials/{id}` | Chi tiết | AdminOnly |
| POST | `/testimonials` | Tạo | AdminOnly |
| PUT | `/testimonials/{id}` | Cập nhật | AdminOnly |
| DELETE | `/testimonials/{id}` | Xóa | AdminOnly |
| **Contact Requests** | | | |
| GET | `/contacts` | Danh sách yêu cầu (filter by type, status) | SupportPlus |
| GET | `/contacts/{id}` | Chi tiết | SupportPlus |
| PATCH | `/contacts/{id}/status` | Cập nhật trạng thái (New/InProgress/Resolved/Closed) | SupportPlus |
| PATCH | `/contacts/{id}/notes` | Cập nhật ghi chú nội bộ (`internalNotes`) | SupportPlus |
| **Pages** | | | |
| GET | `/pages` | Danh sách trang tĩnh | EditorPlus |
| GET | `/pages/{id}` | Chi tiết | EditorPlus |
| POST | `/pages` | Tạo trang | EditorPlus |
| PUT | `/pages/{id}` | Cập nhật | EditorPlus |
| DELETE | `/pages/{id}` | Xóa | AdminOnly |
| **FAQ** | | | |
| GET | `/faqs` | Danh sách (bao gồm inactive) | EditorPlus |
| GET | `/faqs/{id}` | Chi tiết | EditorPlus |
| POST | `/faqs` | Tạo | EditorPlus |
| PUT | `/faqs/{id}` | Cập nhật | EditorPlus |
| DELETE | `/faqs/{id}` | Xóa | AdminOnly |
| **Settings** | | | |
| GET | `/settings` | Lấy tất cả settings (bao gồm internal) | AdminOnly |
| PUT | `/settings` | Cập nhật settings (batch upsert, `settings: [{key, valueJson}]`) | AdminOnly |
| **Users** | | | |
| GET | `/users` | Danh sách CMS users | AdminOnly |
| GET | `/users/{id}` | Chi tiết | AdminOnly |
| POST | `/users` | Tạo user (password ≥ 8 ký tự, chữ hoa+thường+số) | AdminOnly |
| PUT | `/users/{id}` | Cập nhật (fullName, role, status) | AdminOnly |
| DELETE | `/users/{id}` | Xóa (không thể tự xóa) | AdminOnly |

> **Authorization Policies:**
> | Policy | Roles | Áp dụng cho |
> |---|---|---|
> | `AdminOnly` | Admin | Users, Settings, Pricing, Testimonials, Delete operations |
> | `EditorPlus` | Admin, Editor | Posts, Categories, Tags, Media, Pages, FAQs |
> | `SupportPlus` | Admin, Editor, Support | Contacts |
>
> **Validation errors:** Trả `422 Unprocessable Entity` với `ValidationProblemDetails { title, status, errors }`.
> **Auth errors:** Trả `401 Unauthorized` với `{ message }`.
> **Server errors:** Trả `500` với `{ success: false, message }`.

### 7.3 Caching Strategy

| Resource | TTL | Invalidation |
|---|---|---|
| Published posts list | 60s | Khi publish/unpublish/update bài viết |
| Post detail | 60s | Khi update bài viết |
| Featured posts | 120s | Khi update `isFeatured` hoặc publish/archive |
| Categories & Tags | 300s (5 phút) | Khi CRUD |
| Pricing plans | 300s (5 phút) | Khi CRUD |
| Testimonials | 300s (5 phút) | Khi CRUD |
| FAQ | 300s (5 phút) | Khi CRUD |
| Static pages | 120s | Khi update page |
| Site settings | 600s (10 phút) | Khi update settings |

**Pattern:** Cache-aside (Redis). Blog Public API đọc Redis trước → miss → query DB → set cache. Admin API write → invalidate cache key. Vary by query params cho posts list.

---

## 8. Blog Frontend — Next.js

### 8.1 Rendering Strategy

| Trang | Strategy | Revalidate | Lý do |
|---|---|---|---|
| Landing page | ISR | 120s | Testimonials, featured posts cache 120s |
| Danh sách bài viết | ISR | 60s | Thường xuyên thêm bài mới |
| Chi tiết bài viết | ISR | 60s | SEO quan trọng, nội dung ít thay đổi |
| Pricing | ISR | 300s | Cache 300s ở backend |
| Trang tĩnh | ISR | 120s | Cache 120s ở backend |
| Contact | SSR | — | Form submission, dynamic |
| FAQ | ISR | 300s | Cache 300s ở backend |

### 8.2 SEO Implementation

```typescript
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      images: [post.ogImageUrl || post.coverImageUrl],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.authorName],
    },
  };
}
```

### 8.3 Sitemap & Robots

- `app/sitemap.ts` — dynamic sitemap từ API (posts, pages, categories)
- `app/robots.ts` — cấu hình crawl rules
- Structured data (JSON-LD) cho Article, FAQ, Organization

### 8.4 Route Map

| Route | Trang | API Endpoint |
|---|---|---|
| `/` | Landing page | `/posts/featured`, `/testimonials`, `/settings` |
| `/blog` | Danh sách bài viết | `/posts` |
| `/blog/[slug]` | Chi tiết bài viết | `/posts/{slug}` |
| `/blog/category/[slug]` | Bài viết theo danh mục | `/posts?categoryId={id}` |
| `/blog/tag/[slug]` | Bài viết theo tag | `/posts?tagSlug={slug}` |
| `/pricing` | Bảng giá | `/pricing` |
| `/features` | Tổng quan tính năng | Static / CMS page |
| `/features/[slug]` | Chi tiết tính năng | Static / CMS page |
| `/contact` | Liên hệ & Hỗ trợ (form hợp nhất) | `POST /contact` |
| `/faq` | Câu hỏi thường gặp | `/faqs` |
| `/[slug]` | Trang tĩnh (about, terms, privacy) | `/pages/{slug}` |

---

## 9. Admin CMS Frontend — React.js

### 9.1 Route Map

| Route | Trang | Authorization |
|---|---|---|
| `/login` | Đăng nhập | — |
| `/` | Dashboard (thống kê tổng quan) | Any |
| `/posts` | Danh sách bài viết | EditorPlus |
| `/posts/new` | Tạo bài viết (editor) | EditorPlus |
| `/posts/:id/edit` | Sửa bài viết | EditorPlus |
| `/categories` | Quản lý danh mục | EditorPlus |
| `/tags` | Quản lý tags | EditorPlus |
| `/media` | Thư viện media | EditorPlus |
| `/pricing` | Quản lý bảng giá | AdminOnly |
| `/testimonials` | Quản lý testimonials | AdminOnly |
| `/contacts` | Danh sách yêu cầu liên hệ / hỗ trợ | SupportPlus |
| `/contacts/:id` | Chi tiết yêu cầu | SupportPlus |
| `/pages` | Quản lý trang tĩnh | EditorPlus |
| `/pages/new` | Tạo trang | EditorPlus |
| `/pages/:id/edit` | Sửa trang | EditorPlus |
| `/faq` | Quản lý FAQ | EditorPlus |
| `/settings` | Cấu hình chung | AdminOnly |
| `/users` | Quản lý users CMS | AdminOnly |

### 9.2 Dashboard Widgets

Dựa trên `GET /api/v1/admin/dashboard` response:

| Widget | Dữ liệu từ API | Hiển thị |
|---|---|---|
| **Tổng bài viết** | `totalPosts` | Stat card |
| **Bài đã xuất bản** | `publishedPosts` | Stat card |
| **Bài nháp** | `draftPosts` | Stat card |
| **Yêu cầu mới** | `newContactRequests` | Stat card (badge số lượng) |
| **Bài viết gần đây** | `recentPosts: PostSummaryDto[]` | Table 5 bài mới nhất |

### 9.3 Post Editor UI

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Quay lại    Tạo bài viết mới             [Lưu nháp] [Publish]│
├─────────────────────────────────────┬───────────────────────────┤
│                                     │                           │
│  Tiêu đề: [____________________]    │  Trạng thái: ● Draft      │
│                                     │  Tác giả: Nguyễn A        │
│  ┌───────────────────────────────┐  │                           │
│  │                               │  │  Danh mục:                │
│  │    TipTap Rich Text Editor    │  │  ☑ Tin tức               │
│  │                               │  │  ☐ Hướng dẫn             │
│  │    Hỗ trợ:                    │  │                           │
│  │    - Heading, Bold, Italic    │  │  Tags:                    │
│  │    - Link, Image, Table       │  │  [pos] [saas] [+]         │
│  │    - Code block, Quote        │  │                           │
│  │    - Embed video              │  │  Ảnh bìa:                 │
│  │    - Markdown shortcuts       │  │  [📷 Chọn ảnh]           │
│  │                               │  │                           │
│  │                               │  │  ☐ Bài viết nổi bật      │
│  │                               │  │                           │
│  └───────────────────────────────┘  │  Lên lịch:                │
│                                     │  [📅 ___________]         │
│  Tóm tắt:                          │                            │
│  [____________________________]    │  ─── SEO ───────           │
│                                     │  Meta title:              │
│                                     │  [________________]       │
│                                     │  Meta description:        │
│                                     │  [________________]       │
│                                     │  Slug: /blog/[_________]  │
│                                     │  OG Image: [📷 Chọn]     │
└─────────────────────────────────────┴───────────────────────────┘
```

---

## 10. SEO & Performance

### 10.1 SEO Checklist

| Hạng mục | Giải pháp |
|---|---|
| **Server-side rendering** | Next.js SSR/ISR cho mọi trang public |
| **Meta tags** | Dynamic `<title>`, `<meta description>`, Open Graph, Twitter Card |
| **Sitemap.xml** | Auto-generated từ API, cập nhật khi publish bài |
| **Robots.txt** | Cho phép crawl public, chặn admin routes |
| **Canonical URL** | Tự động set, hỗ trợ override qua CMS |
| **Structured data** | JSON-LD: Article, FAQ, Organization, Product, BreadcrumbList |
| **Hình ảnh** | Alt text bắt buộc, lazy loading, WebP format, next/image |
| **URL structure** | Clean slug: `/blog/huong-dan-su-dung-pos` |
| **Internal linking** | Bài viết liên quan, breadcrumb |
| **Page speed** | Target Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1 |
| **Mobile responsive** | Tailwind responsive utilities, test trên thiết bị thực |

### 10.2 Performance Optimization

| Kỹ thuật | Chi tiết |
|---|---|
| **ISR (Incremental Static Regeneration)** | Trang được pre-render tại build time, revalidate theo interval |
| **Redis cache** | Public API cache response ở Redis, giảm tải DB |
| **CDN** | Serve static assets + ảnh qua CDN (Cloudflare / CloudFront) |
| **Image optimization** | Server-side resize + WebP, next/image client-side lazy load |
| **Code splitting** | Tự động bởi Next.js (page-level) và Vite (route-level lazy) |
| **Gzip / Brotli** | Compression middleware |
| **Database indexes** | `slug`, `status`, `published_at`, `category_id`, full-text trên `title` + `content` |
| **Connection pooling** | PgBouncer (dùng chung với POS) |

---

## 11. Bảo mật

| Hạng mục | Giải pháp |
|---|---|
| **Authentication** | JWT (access 60m + refresh 30d), BCrypt password hashing |
| **Admin route protection** | React Router guard + server-side JWT validation |
| **CORS** | Chỉ cho phép domain Blog + CMS Admin |
| **Rate limiting** | Blog Public API: 120 req/min. Admin API: 300 req/min. Contact form: 5 req/min. Auth: 10 req/min |
| **Input validation** | FluentValidation (server) + Zod (client) |
| **XSS prevention** | Sanitize HTML content (server-side), CSP headers |
| **CSRF** | SameSite cookie + custom header check |
| **File upload** | Whitelist MIME types (image/jpeg, png, gif, webp, svg, pdf, mp4, webm), max 20MB/file |
| **SQL injection** | EF Core parameterized queries, không raw SQL |
| **Dependency audit** | Renovate / Dependabot cho cả .NET và npm packages |
| **HTTPS** | Enforce everywhere |
| **Secrets** | Environment variables, không hardcode |

---

## 12. Triển khai & Hạ tầng

### 12.1 Docker Compose bổ sung

```yaml
# Thêm vào docker-compose.yml hiện tại

  # ── CMS Admin API ──────────────────────────────────────────────────────
  cms-admin-api:
    build:
      context: .
      dockerfile: Dockerfile.cms-admin
      target: runtime
    container_name: pos-cms-admin-api
    ports:
      - "5002:5002"
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: "http://+:5002"
      ConnectionStrings__CmsConnection: "Host=pgbouncer;Port=6432;Database=pos_cms;..."
      ConnectionStrings__Redis: "pos-redis:6379"
      Jwt__SecretKey: "${CMS_JWT_SECRET}"
      Media__StorageType: "S3"
      Media__S3Endpoint: "http://minio:9000"
    depends_on:
      - pgbouncer
      - redis
    networks:
      - pos-network
    restart: unless-stopped

  # ── CMS Blog API ──────────────────────────────────────────────────────
  cms-blog-api:
    build:
      context: .
      dockerfile: Dockerfile.cms-blog
      target: runtime
    container_name: pos-cms-blog-api
    ports:
      - "5003:5003"
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ASPNETCORE_URLS: "http://+:5003"
      ConnectionStrings__CmsConnection: "Host=pgbouncer;Port=6432;Database=pos_cms;..."
      ConnectionStrings__Redis: "pos-redis:6379"
    depends_on:
      - pgbouncer
      - redis
    networks:
      - pos-network
    restart: unless-stopped

  # ── Blog (Next.js) ────────────────────────────────────────────────────
  blog:
    build:
      context: ./apps/blog
      dockerfile: Dockerfile
    container_name: pos-blog
    ports:
      - "3003:3003"
    environment:
      CMS_API_URL: "http://cms-blog-api:5003"
      NEXT_PUBLIC_CMS_API_URL: "https://api-blog.example.com"
    depends_on:
      - cms-blog-api
    networks:
      - pos-network
    restart: unless-stopped

  # ── CMS Admin (React) ─────────────────────────────────────────────────
  cms-admin:
    build:
      context: ./apps/cms-admin
      dockerfile: Dockerfile
    container_name: pos-cms-admin
    ports:
      - "3004:80"
    environment:
      VITE_CMS_ADMIN_API_URL: "https://api-cms.example.com"
    networks:
      - pos-network
    restart: unless-stopped

  # ── MinIO (S3-compatible storage) ─────────────────────────────────────
  minio:
    image: minio/minio:latest
    container_name: pos-minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    networks:
      - pos-network
    restart: unless-stopped
```

### 12.2 Repository & Monorepo Structure

```
14.pos/
  backend-services/          ← Hiện tại (POS.Api, POS.SysAdmin.Api)
  cms-backend/               ← MỚI: .NET solution cho CMS
    src/
      POS.CMS.Blog.Api/     ← Public API — port 5003, no auth
      POS.CMS.Admin.Api/    ← Admin API — port 5002, JWT auth
      POS.CMS.Core/
      POS.CMS.Data/
      POS.CMS.Services/
    tests/
    cms-backend.slnx
  apps/                      ← MỚI: Frontend monorepo
    blog/                    ← Next.js — port 3003
    cms-admin/               ← React + Vite — port 3004
    package.json             ← Workspace root (pnpm workspaces)
    pnpm-workspace.yaml
```

> **Lý do tách 2 API:** Blog Public API không cần auth, rate limit thấp hơn (120 req/min). Admin API yêu cầu JWT, rate limit cao hơn (300 req/min). Tách để scale, deploy và bảo mật độc lập.

### 12.3 CI/CD Pipeline

```
Push to main
    │
    ├─ cms-blog-api  → dotnet build → dotnet test → docker build → push image → deploy (port 5003)
    ├─ cms-admin-api → dotnet build → dotnet test → docker build → push image → deploy (port 5002)
    ├─ blog          → pnpm install → pnpm build → docker build → push image → deploy (port 3003)
    └─ cms-admin     → pnpm install → pnpm build → docker build → push image → deploy (port 3004)
```

### 12.4 Domain & Reverse Proxy

| Domain | Service | Port | Mô tả |
|---|---|---|---|
| `example.com` | Blog (Next.js) | 3003 | Trang chủ & blog công khai |
| `admin-cms.example.com` | CMS Admin (React) | 3004 | Quản trị nội dung |
| `api-blog.example.com` | CMS Blog API (.NET) | 5003 | Public API (Blog) |
| `api-cms.example.com` | CMS Admin API (.NET) | 5002 | Admin API (CMS) |
| `app.example.com` | POS.Api | 8080 | Ứng dụng POS (tenant) |
| `sysadmin.example.com` | POS.SysAdmin.Api | 5100 | Quản trị hệ thống |

Reverse proxy: **Nginx** hoặc **Caddy** (auto HTTPS via Let's Encrypt).

---

## 13. Phân chia giai đoạn

### Phase 1 — MVP (4–6 tuần)

| Tuần | Backend (.NET) | Blog (Next.js :3003) | Admin CMS (React :3004) |
|---|---|---|---|
| **1–2** | Setup project (2 API projects: Blog API 5003, Admin API 5002). DB schema, migrations. CRUD Posts, Categories, Tags. Auth (login/refresh/logout/me). Media upload (local storage). Dashboard endpoint | Setup project, Landing page layout, Header/Footer. Blog list + detail page (ISR). Categories/Tags filter | Setup project, Login page, Layout (sidebar + header). Dashboard page (stats từ API). Posts list + CRUD |
| **3–4** | Pricing Plans CRUD. Contact API (single endpoint with type). Static Pages CRUD. Site Settings API (valueJson). FAQs CRUD. Public API endpoints + caching (Redis) | Pricing page. Contact form (với type dropdown). Static pages. SEO (meta, sitemap, robots) | Post editor (TipTap). Categories & Tags CRUD. Media library (upload + gallery, max 20MB). Pricing Plans CRUD |
| **5–6** | Testimonials CRUD. Rate limiting (public: 120/min, admin: 300/min, auth: 10/min, contact: 5/min). Users CRUD. Testing | FAQ page. Testimonials section on landing. Polish & responsive | Contacts management (filter by type/status, notes). Testimonials, FAQ CRUD. Pages CRUD. Site Settings page (batch update). Users management. Testing & polish |

### Phase 2 — Enhancement (3–4 tuần)

| Hạng mục | Mô tả |
|---|---|
| **Email notifications** | Gửi email khi có yêu cầu hỗ trợ mới, khi trạng thái thay đổi |
| **Contact assignment** | Phân công yêu cầu cho nhân viên cụ thể |
| **Analytics dashboard** | Thống kê lượt xem bài viết, sources, popular posts |
| **S3/MinIO storage** | Chuyển media storage sang S3-compatible |
| **CDN integration** | Serve static assets & images qua CDN |
| **Full-text search** | PostgreSQL `tsvector` / Elasticsearch cho search bài viết |
| **Audit log** | Ghi log mọi thao tác admin |
| **Multi-language** | i18n cho Blog (Vietnamese + English) |

### Phase 3 — Advanced (tùy nhu cầu)

| Hạng mục | Mô tả |
|---|---|
| **Live chat** | Tawk.to / Crisp integration |
| **Newsletter** | Thu thập email + gửi newsletter (Mailchimp API hoặc tự build) |
| **A/B testing** | Thử nghiệm landing page variants |
| **Comments** | Hệ thống bình luận bài viết (moderated) |
| **CMS workflow** | Draft → Review → Approve → Publish (multi-editor approval) |
| **Auto SEO suggestions** | AI-powered meta title/description suggestions |

---

## Tổng kết quyết định kỹ thuật

| Quyết định | Lý do |
|---|---|
| **DB riêng `pos_cms`** | Tách biệt life-cycle, backup, migration. Không ảnh hưởng tenant data |
| **2 API riêng (Blog 5003 + Admin 5002)** | Tách public (không auth, 120 req/min) và admin (JWT, 300 req/min). Scale & bảo mật độc lập |
| **Next.js cho Blog** | SSR/ISR tối ưu SEO. React Server Components giảm JS bundle. Image optimization built-in |
| **React SPA cho Admin** | Trải nghiệm mượt cho admin (không cần SSR). TipTap editor chạy tốt trong SPA |
| **Tailwind + shadcn/ui chung** | Thiết kế thống nhất giữa Blog & Admin. shadcn/ui accessible, customizable |
| **TipTap thay vì TinyMCE** | Open source, headless, hỗ trợ Markdown, extensible. Không cần API key |
| **Redis cache** | Đã có sẵn infrastructure. Cache public API giảm tải DB (60s–600s tuỳ resource) |
| **JWT tách biệt POS** | CMS users khác POS users. Signing key riêng, không lẫn lộn permission scope |
| **Contact form hợp nhất** | 1 endpoint `POST /contact` với `type` enum thay vì tách riêng contact + support |
| **Settings dùng `valueJson`** | Giá trị lưu dạng JSON string, linh hoạt cho nhiều kiểu data (string, number, object, array) |
