# CMS Admin API

> **Base URL:** `/api/v1/admin`
> **Authentication:** JWT Bearer Token (header `Authorization: Bearer <token>`)
> **Default Rate Limit:** 300 requests/phút (limiter `admin`), Auth endpoints: 10 requests/phút (limiter `auth`)
> **Port mặc định:** `5002`

Tất cả endpoint (trừ `login`, `refresh`) yêu cầu JWT hợp lệ. Response lỗi validation trả `422 Unprocessable Entity` với `ValidationProblemDetails`.

---

## Mục lục

1. [Authentication](#1-authentication)
2. [Posts](#2-posts)
3. [Categories](#3-categories)
4. [Tags](#4-tags)
5. [Media](#5-media)
6. [Contacts](#6-contacts)
7. [Static Pages](#7-static-pages)
8. [FAQs](#8-faqs)
9. [Pricing Plans](#9-pricing-plans)
10. [Testimonials](#10-testimonials)
11. [Site Settings](#11-site-settings)
12. [Users](#12-users)
13. [Dashboard](#13-dashboard)
14. [Enums Reference](#14-enums-reference)
15. [Common Models](#15-common-models)

---

## 1. Authentication

### POST `/auth/login`

Đăng nhập CMS, không cần JWT.

**Rate Limit:** `auth` (10 req/phút)

**Request Body:**

| Field      | Type   | Required | Validation          |
|------------|--------|----------|---------------------|
| `email`    | string | ✅       | Email hợp lệ        |
| `password` | string | ✅       | Tối thiểu 6 ký tự   |

```json
{
  "email": "admin@cms.local",
  "password": "Admin@123"
}
```

**Response `200 OK`:**

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "dG9rZW4xMjM0NTY3ODk...",
  "expiresAt": "2026-03-19T15:00:00Z",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "admin@cms.local",
    "fullName": "CMS Administrator",
    "role": "Admin",
    "status": "Active"
  }
}
```

**Response `401 Unauthorized`:**

```json
{ "message": "Invalid email or password." }
```

---

### POST `/auth/refresh`

Làm mới access token bằng refresh token, không cần JWT.

**Rate Limit:** `auth` (10 req/phút)

**Request Body:**

| Field          | Type   | Required | Validation           |
|----------------|--------|----------|----------------------|
| `refreshToken` | string | ✅       | Tối thiểu 12 ký tự   |

```json
{
  "refreshToken": "dG9rZW4xMjM0NTY3ODk..."
}
```

**Response `200 OK`:** Giống response của `/auth/login`.

**Response `401 Unauthorized`:**

```json
{ "message": "Invalid or expired refresh token." }
```

---

### POST `/auth/logout`

Xoá refresh token phía server. Yêu cầu JWT.

**Request Body:** Không có.

**Response `204 No Content`**

---

### GET `/auth/me`

Lấy thông tin user đang đăng nhập. Yêu cầu JWT.

**Response `200 OK`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "admin@cms.local",
  "fullName": "CMS Administrator",
  "role": "Admin",
  "status": "Active"
}
```

**Response `401 Unauthorized`** — token không hợp lệ hoặc user không tồn tại.

---

## 2. Posts

> **Authorization:** `EditorPlus` (Admin, Editor) — riêng Delete yêu cầu `AdminOnly`

### GET `/posts`

Danh sách bài viết (tất cả trạng thái), phân trang.

**Query Parameters:**

| Param        | Type    | Default | Validation               | Mô tả                    |
|--------------|---------|---------|--------------------------|---------------------------|
| `page`       | int     | 1       | ≥ 1                      | Trang hiện tại            |
| `pageSize`   | int     | 20      | 1–100                    | Số item/trang             |
| `search`     | string? | null    | Max 200 ký tự            | Tìm theo title, excerpt   |
| `categoryId` | guid?   | null    |                          | Lọc theo category         |
| `tagSlug`    | string? | null    |                          | Lọc theo tag slug         |
| `status`     | enum?   | null    | `Draft`, `Published`, `Archived` | Lọc theo trạng thái |
| `isFeatured` | bool?   | null    |                          | Lọc bài nổi bật           |

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "...",
      "title": "Giới thiệu POS Pro",
      "slug": "gioi-thieu-pos-pro",
      "excerpt": "Hệ thống POS hiện đại...",
      "coverImageUrl": "/uploads/cover.jpg",
      "authorName": "CMS Administrator",
      "status": "Published",
      "isFeatured": true,
      "publishedAt": "2026-03-19T10:00:00Z",
      "viewCount": 150,
      "categorySlugs": ["tin-tuc", "san-pham"],
      "tagSlugs": ["pos", "retail"]
    }
  ],
  "totalCount": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

---

### GET `/posts/{id}`

Chi tiết bài viết theo ID (bao gồm cả draft, archived).

**Path Parameters:** `id` — GUID

**Response `200 OK`:**

```json
{
  "id": "...",
  "title": "Giới thiệu POS Pro",
  "slug": "gioi-thieu-pos-pro",
  "excerpt": "Hệ thống POS hiện đại...",
  "content": "<p>Nội dung chi tiết bài viết...</p>",
  "coverImageUrl": "/uploads/cover.jpg",
  "author": {
    "id": "...",
    "email": "admin@cms.local",
    "fullName": "CMS Administrator",
    "role": "Admin",
    "status": "Active"
  },
  "status": "Published",
  "isFeatured": true,
  "publishedAt": "2026-03-19T10:00:00Z",
  "metaTitle": "POS Pro - Giải pháp bán hàng",
  "metaDescription": "Khám phá POS Pro...",
  "ogImageUrl": "/uploads/og.jpg",
  "viewCount": 150,
  "createdAt": "2026-03-18T08:00:00Z",
  "updatedAt": "2026-03-19T10:00:00Z",
  "categories": [
    { "id": "...", "name": "Tin tức", "slug": "tin-tuc", "description": null, "parentId": null, "sortOrder": 0, "isActive": true }
  ],
  "tags": [
    { "id": "...", "name": "POS", "slug": "pos" }
  ]
}
```

**Response `404 Not Found`**

---

### POST `/posts`

Tạo bài viết mới.

**Request Body:**

| Field            | Type           | Required | Validation              |
|------------------|----------------|----------|-------------------------|
| `title`          | string         | ✅       | Max 300 ký tự            |
| `slug`           | string?        |          | Max 300, auto-gen nếu rỗng |
| `excerpt`        | string?        |          | Max 500 ký tự            |
| `content`        | string         | ✅       | Không rỗng               |
| `coverImageUrl`  | string?        |          |                         |
| `status`         | PostStatus     | ✅       | `Draft`, `Published`, `Archived` |
| `isFeatured`     | bool           | ✅       |                         |
| `publishedAt`    | datetime?      |          |                         |
| `metaTitle`      | string?        |          | Max 200 ký tự            |
| `metaDescription`| string?        |          | Max 400 ký tự            |
| `ogImageUrl`     | string?        |          |                         |
| `categoryIds`    | guid[]         | ✅       | Không null               |
| `tagIds`         | guid[]         | ✅       | Không null               |

```json
{
  "title": "Bài viết mới",
  "slug": null,
  "excerpt": "Tóm tắt nội dung...",
  "content": "<p>Nội dung đầy đủ...</p>",
  "coverImageUrl": "/uploads/cover.jpg",
  "status": "Draft",
  "isFeatured": false,
  "publishedAt": null,
  "metaTitle": null,
  "metaDescription": null,
  "ogImageUrl": null,
  "categoryIds": ["3fa85f64-..."],
  "tagIds": ["7ca85f64-..."]
}
```

**Response `201 Created`:** Trả về `PostDetailDto` (giống GET `/posts/{id}`).

---

### PUT `/posts/{id}`

Cập nhật bài viết.

**Request Body:** Giống `CreatePostRequest` (cùng validation).

**Response `200 OK`:** Trả về `PostDetailDto`.

**Response `404 Not Found`**

---

### DELETE `/posts/{id}`

Soft-delete bài viết (đánh dấu `IsDeleted = true`).

**Authorization:** `AdminOnly`

**Response `204 No Content`**

**Response `404 Not Found`**

---

### POST `/posts/{id}/publish`

Chuyển bài viết sang trạng thái Published.

**Request Body:** Không có.

**Response `204 No Content`**

**Response `404 Not Found`**

---

### POST `/posts/{id}/archive`

Chuyển bài viết sang trạng thái Archived.

**Request Body:** Không có.

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 3. Categories

> **Authorization:** `EditorPlus` — riêng Delete yêu cầu `AdminOnly`

### GET `/categories`

Danh sách tất cả categories (bao gồm inactive).

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "name": "Tin tức",
    "slug": "tin-tuc",
    "description": "Tin tức mới nhất",
    "parentId": null,
    "sortOrder": 0,
    "isActive": true
  }
]
```

---

### GET `/categories/{id}`

**Response `200 OK`:** Trả về `CategoryDto`.

**Response `404 Not Found`**

---

### POST `/categories`

**Request Body:**

| Field         | Type    | Required | Validation          |
|---------------|---------|----------|---------------------|
| `name`        | string  | ✅       | Max 100 ký tự        |
| `slug`        | string? |          | Max 100, auto-gen    |
| `description` | string? |          | Max 500 ký tự        |
| `parentId`    | guid?   |          | Category cha         |
| `sortOrder`   | int     |          | ≥ 0, default 0       |

```json
{
  "name": "Sản phẩm",
  "slug": null,
  "description": "Danh mục sản phẩm",
  "parentId": null,
  "sortOrder": 1
}
```

**Response `201 Created`:** Trả về `CategoryDto`.

---

### PUT `/categories/{id}`

**Request Body:**

| Field         | Type    | Required | Validation          |
|---------------|---------|----------|---------------------|
| `name`        | string  | ✅       | Max 100 ký tự        |
| `slug`        | string? |          | Max 100, auto-gen    |
| `description` | string? |          | Max 500 ký tự        |
| `parentId`    | guid?   |          |                     |
| `sortOrder`   | int     | ✅       | ≥ 0                  |
| `isActive`    | bool    | ✅       |                     |

**Response `200 OK`:** Trả về `CategoryDto`.

**Response `404 Not Found`**

---

### DELETE `/categories/{id}`

**Authorization:** `AdminOnly`

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 4. Tags

> **Authorization:** `EditorPlus` — riêng Delete yêu cầu `AdminOnly`

### GET `/tags`

Danh sách tất cả tags.

**Response `200 OK`:**

```json
[
  { "id": "...", "name": "POS", "slug": "pos" }
]
```

---

### GET `/tags/{id}`

**Response `200 OK`:** Trả về `TagDto`.

**Response `404 Not Found`**

---

### POST `/tags`

**Request Body:**

| Field  | Type    | Required | Validation         |
|--------|---------|----------|--------------------|
| `name` | string  | ✅       | Max 100 ký tự       |
| `slug` | string? |          | Max 100, auto-gen   |

```json
{ "name": "Retail", "slug": null }
```

**Response `201 Created`:** Trả về `TagDto`.

---

### PUT `/tags/{id}`

**Request Body:** Giống `CreateTagRequest`.

**Response `200 OK`:** Trả về `TagDto`.

**Response `404 Not Found`**

---

### DELETE `/tags/{id}`

**Authorization:** `AdminOnly`

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 5. Media

> **Authorization:** `EditorPlus` — riêng Delete yêu cầu `AdminOnly`

### GET `/media`

Danh sách media, phân trang.

**Query Parameters:**

| Param      | Type    | Default | Validation    |
|------------|---------|---------|---------------|
| `page`     | int     | 1       | ≥ 1           |
| `pageSize` | int     | 30      | 1–100         |
| `search`   | string? | null    |               |

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "...",
      "fileName": "a1b2c3d4.jpg",
      "originalName": "banner.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 245760,
      "url": "/uploads/a1b2c3d4.jpg",
      "thumbnailUrl": null,
      "width": null,
      "height": null,
      "createdAt": "2026-03-19T08:00:00Z"
    }
  ],
  "totalCount": 15,
  "page": 1,
  "pageSize": 30,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

---

### POST `/media/upload`

Upload file. Gửi dạng `multipart/form-data`.

**Size Limit:** 20 MB

**Allowed File Types:**

| MIME Type           | Extensions       |
|---------------------|------------------|
| `image/jpeg`        | `.jpg`, `.jpeg`  |
| `image/png`         | `.png`           |
| `image/gif`         | `.gif`           |
| `image/webp`        | `.webp`          |
| `image/svg+xml`     | `.svg`           |
| `application/pdf`   | `.pdf`           |
| `video/mp4`         | `.mp4`           |
| `video/webm`        | `.webm`          |

**Request:** `multipart/form-data` với field `file`.

**Response `200 OK`:** Trả về `MediaDto`.

**Response `400 Bad Request`:**

```json
{ "message": "File extension '.exe' is not allowed." }
```

---

### DELETE `/media/{id}`

**Authorization:** `AdminOnly`

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 6. Contacts

> **Authorization:** `SupportPlus` (Admin, Editor, Support)

### GET `/contacts`

Danh sách yêu cầu liên hệ, phân trang.

**Query Parameters:**

| Param      | Type           | Default | Validation              |
|------------|----------------|---------|-------------------------|
| `page`     | int            | 1       | ≥ 1                     |
| `pageSize` | int            | 20      | 1–100                   |
| `search`   | string?        | null    | Tìm theo name, email    |
| `type`     | ContactType?   | null    | Lọc theo loại           |
| `status`   | ContactStatus? | null    | Lọc theo trạng thái     |

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "...",
      "fullName": "Nguyễn Văn A",
      "email": "a@example.com",
      "phone": "0901234567",
      "type": "Support",
      "subject": "Cần hỗ trợ cài đặt",
      "message": "Tôi cần giúp đỡ...",
      "priority": "Normal",
      "status": "New",
      "tenantCode": "SHOP001",
      "attachmentUrls": [],
      "internalNotes": null,
      "assignedToId": null,
      "assignedToName": null,
      "createdAt": "2026-03-19T08:00:00Z",
      "updatedAt": "2026-03-19T08:00:00Z"
    }
  ],
  "totalCount": 5,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

---

### GET `/contacts/{id}`

**Response `200 OK`:** Trả về `ContactRequestDto`.

**Response `404 Not Found`**

---

### PATCH `/contacts/{id}/status`

Cập nhật trạng thái contact.

**Request Body:**

| Field    | Type          | Required | Validation                             |
|----------|---------------|----------|----------------------------------------|
| `status` | ContactStatus | ✅       | `New`, `InProgress`, `Resolved`, `Closed` |

```json
{ "status": "InProgress" }
```

**Response `204 No Content`**

**Response `404 Not Found`**

---

### PATCH `/contacts/{id}/notes`

Cập nhật ghi chú nội bộ.

**Request Body:**

| Field           | Type    | Required |
|-----------------|---------|----------|
| `internalNotes` | string? |          |

```json
{ "internalNotes": "Đã liên hệ qua điện thoại" }
```

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 7. Static Pages

> **Authorization:** `EditorPlus` — riêng Delete yêu cầu `AdminOnly`

### GET `/pages`

Danh sách tất cả static pages.

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "title": "Giới thiệu",
    "slug": "gioi-thieu",
    "content": "<p>Nội dung trang giới thiệu...</p>",
    "metaTitle": "Về chúng tôi",
    "metaDescription": "Thông tin về công ty",
    "status": "Published",
    "createdAt": "2026-03-18T08:00:00Z",
    "updatedAt": "2026-03-19T10:00:00Z"
  }
]
```

---

### GET `/pages/{id}`

**Response `200 OK`:** Trả về `StaticPageDto`.

**Response `404 Not Found`**

---

### POST `/pages`

**Request Body:**

| Field             | Type       | Required | Validation                |
|-------------------|------------|----------|---------------------------|
| `title`           | string     | ✅       | Max 300 ký tự              |
| `slug`            | string?    |          | Max 300, auto-gen          |
| `content`         | string     | ✅       | Không rỗng                 |
| `metaTitle`       | string?    |          | Max 200 ký tự              |
| `metaDescription` | string?    |          | Max 400 ký tự              |
| `status`          | PageStatus |          | `Draft`, `Published` (default: Draft) |

```json
{
  "title": "Chính sách bảo mật",
  "slug": null,
  "content": "<p>Nội dung chính sách...</p>",
  "metaTitle": null,
  "metaDescription": null,
  "status": "Draft"
}
```

**Response `201 Created`:** Trả về `StaticPageDto`.

---

### PUT `/pages/{id}`

**Request Body:**

| Field             | Type       | Required | Validation          |
|-------------------|------------|----------|---------------------|
| `title`           | string     | ✅       | Max 300 ký tự        |
| `slug`            | string?    |          | Max 300              |
| `content`         | string     | ✅       | Không rỗng           |
| `metaTitle`       | string?    |          | Max 200 ký tự        |
| `metaDescription` | string?    |          | Max 400 ký tự        |
| `status`          | PageStatus | ✅       | `Draft`, `Published` |

**Response `200 OK`:** Trả về `StaticPageDto`.

**Response `404 Not Found`**

---

### DELETE `/pages/{id}`

**Authorization:** `AdminOnly`

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 8. FAQs

> **Authorization:** `EditorPlus` — riêng Delete yêu cầu `AdminOnly`

### GET `/faqs`

Danh sách tất cả FAQs (bao gồm inactive).

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "question": "Làm sao để cài đặt POS?",
    "answer": "Bạn có thể tải ứng dụng...",
    "category": "Cài đặt",
    "sortOrder": 0,
    "isActive": true
  }
]
```

---

### GET `/faqs/{id}`

**Response `200 OK`:** Trả về `FaqDto`.

**Response `404 Not Found`**

---

### POST `/faqs`

**Request Body:**

| Field      | Type    | Required | Validation          |
|------------|---------|----------|---------------------|
| `question` | string  | ✅       | Max 500 ký tự        |
| `answer`   | string  | ✅       | Max 5000 ký tự       |
| `category` | string? |          | Max 100 ký tự        |
| `sortOrder`| int     |          | ≥ 0, default 0       |

```json
{
  "question": "Hệ thống hỗ trợ những phương thức thanh toán nào?",
  "answer": "POS Pro hỗ trợ tiền mặt, thẻ, chuyển khoản...",
  "category": "Thanh toán",
  "sortOrder": 0
}
```

**Response `201 Created`:** Trả về `FaqDto`.

---

### PUT `/faqs/{id}`

**Request Body:**

| Field      | Type    | Required | Validation          |
|------------|---------|----------|---------------------|
| `question` | string  | ✅       | Max 500 ký tự        |
| `answer`   | string  | ✅       | Max 5000 ký tự       |
| `category` | string? |          | Max 100 ký tự        |
| `sortOrder`| int     | ✅       | ≥ 0                  |
| `isActive` | bool    | ✅       |                     |

**Response `200 OK`:** Trả về `FaqDto`.

**Response `404 Not Found`**

---

### DELETE `/faqs/{id}`

**Authorization:** `AdminOnly`

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 9. Pricing Plans

> **Authorization:** `AdminOnly`

### GET `/pricing`

Danh sách tất cả pricing plans (bao gồm inactive).

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "name": "Basic",
    "monthlyPrice": 199000,
    "yearlyPrice": 1990000,
    "currency": "VND",
    "description": "Gói cơ bản cho cửa hàng nhỏ",
    "features": [
      { "text": "1 chi nhánh", "included": true },
      { "text": "Báo cáo nâng cao", "included": false }
    ],
    "badge": "Phổ biến",
    "ctaText": "Dùng thử",
    "ctaUrl": "/register?plan=basic",
    "sortOrder": 0,
    "isActive": true
  }
]
```

---

### GET `/pricing/{id}`

**Response `200 OK`:** Trả về `PricingPlanDto`.

**Response `404 Not Found`**

---

### POST `/pricing`

**Request Body:**

| Field          | Type                  | Required | Validation          |
|----------------|-----------------------|----------|---------------------|
| `name`         | string                | ✅       | Max 200 ký tự        |
| `monthlyPrice` | decimal?              |          | ≥ 0                  |
| `yearlyPrice`  | decimal?              |          | ≥ 0                  |
| `currency`     | string                | ✅       | Max 10 ký tự         |
| `description`  | string?               |          |                     |
| `features`     | PricingFeatureItem[]  | ✅       | Không null           |
| `badge`        | string?               |          |                     |
| `ctaText`      | string                | ✅       | Max 100 ký tự        |
| `ctaUrl`       | string?               |          |                     |
| `sortOrder`    | int                   |          | ≥ 0, default 0       |

**PricingFeatureItem:**

| Field      | Type   | Required |
|------------|--------|----------|
| `text`     | string | ✅       |
| `included` | bool   | ✅       |

```json
{
  "name": "Pro",
  "monthlyPrice": 499000,
  "yearlyPrice": 4990000,
  "currency": "VND",
  "description": "Gói nâng cao",
  "features": [
    { "text": "5 chi nhánh", "included": true },
    { "text": "Báo cáo nâng cao", "included": true }
  ],
  "badge": null,
  "ctaText": "Mua ngay",
  "ctaUrl": "/register?plan=pro",
  "sortOrder": 1
}
```

**Response `201 Created`:** Trả về `PricingPlanDto`.

---

### PUT `/pricing/{id}`

**Request Body:** Giống `CreatePricingPlanRequest` + thêm `isActive` (bool, required).

**Response `200 OK`:** Trả về `PricingPlanDto`.

**Response `404 Not Found`**

---

### DELETE `/pricing/{id}`

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 10. Testimonials

> **Authorization:** `AdminOnly`

### GET `/testimonials`

Danh sách tất cả testimonials (bao gồm hidden).

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "customerName": "Trần Thị B",
    "position": "Chủ cửa hàng",
    "company": "Shop ABC",
    "content": "Phần mềm rất dễ sử dụng...",
    "avatarUrl": "/uploads/avatar.jpg",
    "rating": 5,
    "sortOrder": 0,
    "isVisible": true
  }
]
```

---

### GET `/testimonials/{id}`

**Response `200 OK`:** Trả về `TestimonialDto`.

**Response `404 Not Found`**

---

### POST `/testimonials`

**Request Body:**

| Field          | Type    | Required | Validation          |
|----------------|---------|----------|---------------------|
| `customerName` | string  | ✅       | Max 200 ký tự        |
| `position`     | string? |          |                     |
| `company`      | string? |          |                     |
| `content`      | string  | ✅       | Max 2000 ký tự       |
| `avatarUrl`    | string? |          |                     |
| `rating`       | int     | ✅       | 1–5                  |
| `sortOrder`    | int     |          | ≥ 0, default 0       |

```json
{
  "customerName": "Nguyễn Văn C",
  "position": "Quản lý",
  "company": "Nhà hàng XYZ",
  "content": "Hệ thống hoạt động ổn định, nhân viên nhanh chóng làm quen.",
  "avatarUrl": null,
  "rating": 4,
  "sortOrder": 1
}
```

**Response `201 Created`:** Trả về `TestimonialDto`.

---

### PUT `/testimonials/{id}`

**Request Body:** Giống `CreateTestimonialRequest` + thêm `isVisible` (bool, required).

**Response `200 OK`:** Trả về `TestimonialDto`.

**Response `404 Not Found`**

---

### DELETE `/testimonials/{id}`

**Response `204 No Content`**

**Response `404 Not Found`**

---

## 11. Site Settings

> **Authorization:** `AdminOnly`

### GET `/settings`

Danh sách tất cả settings (bao gồm cả internal).

**Response `200 OK`:**

```json
[
  { "key": "company.name", "group": "company", "valueJson": "\"POS Pro\"" },
  { "key": "seo.defaultTitle", "group": "seo", "valueJson": "\"POS Pro - Phần mềm bán hàng\"" },
  { "key": "social.facebook", "group": "social", "valueJson": "\"https://facebook.com/pospro\"" }
]
```

---

### PUT `/settings`

Cập nhật nhiều settings cùng lúc (upsert).

**Request Body:**

| Field      | Type              | Required | Validation                        |
|------------|-------------------|----------|-----------------------------------|
| `settings` | SiteSettingItem[] | ✅       | Không rỗng, key max 100, valueJson max 10000 |

**SiteSettingItem:**

| Field      | Type   | Required |
|------------|--------|----------|
| `key`      | string | ✅       |
| `valueJson`| string | ✅       |

```json
{
  "settings": [
    { "key": "company.name", "valueJson": "\"POS Pro v2\"" },
    { "key": "company.phone", "valueJson": "\"0901234567\"" }
  ]
}
```

**Response `204 No Content`**

---

## 12. Users

> **Authorization:** `AdminOnly`

### GET `/users`

Danh sách tất cả CMS users.

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "email": "admin@cms.local",
    "fullName": "CMS Administrator",
    "role": "Admin",
    "status": "Active"
  }
]
```

---

### GET `/users/{id}`

**Response `200 OK`:** Trả về `CmsUserDto`.

**Response `404 Not Found`**

---

### POST `/users`

Tạo user CMS mới.

**Request Body:**

| Field      | Type        | Required | Validation                                  |
|------------|-------------|----------|---------------------------------------------|
| `email`    | string      | ✅       | Email hợp lệ                                |
| `password` | string      | ✅       | ≥ 8 ký tự, chứa chữ hoa + chữ thường + số  |
| `fullName` | string      | ✅       | Max 200 ký tự                                |
| `role`     | CmsUserRole | ✅       | `Admin`, `Editor`, `Support`                 |

```json
{
  "email": "editor@company.com",
  "password": "Editor@123",
  "fullName": "Biên tập viên",
  "role": "Editor"
}
```

**Response `201 Created`:** Trả về `CmsUserDto`.

---

### PUT `/users/{id}`

**Request Body:**

| Field      | Type          | Required | Validation                   |
|------------|---------------|----------|------------------------------|
| `fullName` | string        | ✅       | Max 200 ký tự                 |
| `role`     | CmsUserRole   | ✅       | `Admin`, `Editor`, `Support`  |
| `status`   | CmsUserStatus | ✅       | `Active`, `Inactive`          |

```json
{
  "fullName": "Biên tập viên Senior",
  "role": "Editor",
  "status": "Active"
}
```

**Response `200 OK`:** Trả về `CmsUserDto`.

**Response `404 Not Found`**

---

### DELETE `/users/{id}`

Xoá user. Không thể tự xoá chính mình.

**Response `204 No Content`**

**Response `400 Bad Request`:**

```json
{ "message": "Cannot delete your own account." }
```

**Response `404 Not Found`**

---

## 13. Dashboard

> **Authorization:** Bất kỳ user đã đăng nhập

### GET `/dashboard`

Thống kê tổng quan cho CMS admin.

**Response `200 OK`:**

```json
{
  "totalPosts": 42,
  "publishedPosts": 35,
  "draftPosts": 7,
  "newContactRequests": 3,
  "recentPosts": [
    {
      "id": "...",
      "title": "Bài viết mới nhất",
      "slug": "bai-viet-moi-nhat",
      "excerpt": "...",
      "coverImageUrl": null,
      "authorName": "CMS Administrator",
      "status": "Published",
      "isFeatured": false,
      "publishedAt": "2026-03-19T10:00:00Z",
      "viewCount": 10,
      "categorySlugs": [],
      "tagSlugs": []
    }
  ]
}
```

---

## 14. Enums Reference

### PostStatus

| Value       | Int | Mô tả             |
|-------------|-----|--------------------|
| `Draft`     | 0   | Bản nháp           |
| `Published` | 1   | Đã xuất bản        |
| `Archived`  | 2   | Đã lưu trữ         |

### ContactType

| Value         | Int | Mô tả             |
|---------------|-----|--------------------|
| `General`     | 0   | Liên hệ chung     |
| `Sales`       | 1   | Bán hàng           |
| `Support`     | 2   | Hỗ trợ kỹ thuật   |
| `Partnership` | 3   | Hợp tác            |

### ContactPriority

| Value    | Int | Mô tả             |
|----------|-----|--------------------|
| `Normal` | 0   | Bình thường        |
| `High`   | 1   | Cao                |
| `Urgent` | 2   | Khẩn cấp          |

### ContactStatus

| Value        | Int | Mô tả             |
|--------------|-----|--------------------|
| `New`        | 0   | Mới                |
| `InProgress` | 1   | Đang xử lý        |
| `Resolved`   | 2   | Đã giải quyết      |
| `Closed`     | 3   | Đã đóng            |

### CmsUserRole

| Value     | Int | Mô tả                             |
|-----------|-----|------------------------------------|
| `Admin`   | 0   | Toàn quyền                         |
| `Editor`  | 1   | Quản lý nội dung (post, page, ...) |
| `Support` | 2   | Xử lý contact requests             |

### CmsUserStatus

| Value      | Int | Mô tả          |
|------------|-----|-----------------|
| `Active`   | 0   | Đang hoạt động  |
| `Inactive` | 1   | Đã vô hiệu hoá |

### PageStatus

| Value       | Int | Mô tả         |
|-------------|-----|----------------|
| `Draft`     | 0   | Bản nháp       |
| `Published` | 1   | Đã xuất bản    |

---

## 15. Common Models

### PagedResult\<T\>

```json
{
  "items": [],
  "totalCount": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

### ValidationProblemDetails (422)

Trả về khi validation thất bại:

```json
{
  "title": "Validation failed",
  "status": 422,
  "errors": {
    "Title": ["'Title' must not be empty."],
    "Content": ["'Content' must not be empty."]
  }
}
```

### Error Response (401 / 400)

```json
{ "message": "Error description here." }
```

### Error Response (500)

```json
{
  "success": false,
  "message": "An unexpected error occurred."
}
```

---

## Authorization Policies

| Policy        | Roles cho phép           | Áp dụng cho                           |
|---------------|--------------------------|---------------------------------------|
| `AdminOnly`   | Admin                    | Users, Settings, Pricing, Testimonials, Delete operations |
| `EditorPlus`  | Admin, Editor            | Posts, Categories, Tags, Media, Pages, FAQs |
| `SupportPlus` | Admin, Editor, Support   | Contacts                              |
