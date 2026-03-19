# Blog Public API

> **Base URL:** `/api/v1`
> **Authentication:** Không yêu cầu (public API)
> **Rate Limit:** 120 requests/phút (limiter `public`), Contact form: 5 requests/phút (limiter `contact`)
> **Port mặc định:** `5003`
> **Response Caching:** Có — các endpoint read-only được cache phía server (60s – 600s tuỳ endpoint)

API công khai cho trang blog/landing page. Chỉ trả về dữ liệu đã publish/active.

---

## Mục lục

1. [Posts](#1-posts)
2. [Categories](#2-categories)
3. [Tags](#3-tags)
4. [Pricing Plans](#4-pricing-plans)
5. [Testimonials](#5-testimonials)
6. [FAQs](#6-faqs)
7. [Static Pages](#7-static-pages)
8. [Site Settings](#8-site-settings)
9. [Contact](#9-contact)
10. [Common Models](#10-common-models)

---

## 1. Posts

### GET `/posts`

Danh sách bài viết đã publish, phân trang.

**Cache:** 60 giây (vary by query keys)

**Query Parameters:**

| Param        | Type    | Default | Validation               | Mô tả                    |
|--------------|---------|---------|--------------------------|---------------------------|
| `page`       | int     | 1       | ≥ 1                      | Trang hiện tại            |
| `pageSize`   | int     | 20      | 1–100                    | Số item/trang             |
| `search`     | string? | null    | Max 200 ký tự            | Tìm theo title, excerpt   |
| `categoryId` | guid?   | null    |                          | Lọc theo category         |
| `tagSlug`    | string? | null    |                          | Lọc theo tag slug         |

> `status` và `isFeatured` không có tác dụng ở Blog API — chỉ trả về bài `Published`.

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Giới thiệu POS Pro",
      "slug": "gioi-thieu-pos-pro",
      "excerpt": "Hệ thống POS hiện đại cho cửa hàng bán lẻ...",
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

### GET `/posts/featured`

Danh sách bài viết nổi bật (đã publish, `IsFeatured = true`).

**Cache:** 120 giây

**Query Parameters:**

| Param  | Type | Default | Mô tả                        |
|--------|------|---------|-------------------------------|
| `limit`| int  | 6       | Số bài trả về (không phân trang) |

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "title": "Top 5 tính năng POS Pro",
    "slug": "top-5-tinh-nang-pos-pro",
    "excerpt": "Khám phá các tính năng...",
    "coverImageUrl": "/uploads/featured.jpg",
    "authorName": "CMS Administrator",
    "status": "Published",
    "isFeatured": true,
    "publishedAt": "2026-03-18T12:00:00Z",
    "viewCount": 320,
    "categorySlugs": ["san-pham"],
    "tagSlugs": ["pos", "features"]
  }
]
```

---

### GET `/posts/{slug}`

Chi tiết bài viết theo slug. Chỉ trả về bài đã publish. Tự động tăng `viewCount`.

**Cache:** 60 giây

**Path Parameters:** `slug` — chuỗi URL-friendly (vd: `gioi-thieu-pos-pro`)

**Response `200 OK`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Giới thiệu POS Pro",
  "slug": "gioi-thieu-pos-pro",
  "excerpt": "Hệ thống POS hiện đại...",
  "content": "<h2>POS Pro là gì?</h2><p>POS Pro là giải pháp...</p>",
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
  "viewCount": 151,
  "createdAt": "2026-03-18T08:00:00Z",
  "updatedAt": "2026-03-19T10:00:00Z",
  "categories": [
    {
      "id": "...",
      "name": "Tin tức",
      "slug": "tin-tuc",
      "description": null,
      "parentId": null,
      "sortOrder": 0,
      "isActive": true
    }
  ],
  "tags": [
    { "id": "...", "name": "POS", "slug": "pos" }
  ]
}
```

**Response `404 Not Found`** — slug không tồn tại hoặc bài viết chưa publish.

---

## 2. Categories

### GET `/categories`

Danh sách categories đang active.

**Cache:** 300 giây (5 phút)

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "name": "Tin tức",
    "slug": "tin-tuc",
    "description": "Tin tức mới nhất từ POS Pro",
    "parentId": null,
    "sortOrder": 0,
    "isActive": true
  },
  {
    "id": "...",
    "name": "Sản phẩm",
    "slug": "san-pham",
    "description": "Thông tin sản phẩm",
    "parentId": null,
    "sortOrder": 1,
    "isActive": true
  }
]
```

---

## 3. Tags

### GET `/tags`

Danh sách tất cả tags.

**Cache:** 300 giây (5 phút)

**Response `200 OK`:**

```json
[
  { "id": "...", "name": "POS", "slug": "pos" },
  { "id": "...", "name": "Retail", "slug": "retail" },
  { "id": "...", "name": "Cloud", "slug": "cloud" }
]
```

---

## 4. Pricing Plans

### GET `/pricing`

Danh sách gói giá đang active.

**Cache:** 300 giây (5 phút)

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
      { "text": "100 sản phẩm", "included": true },
      { "text": "Báo cáo nâng cao", "included": false }
    ],
    "badge": null,
    "ctaText": "Dùng thử",
    "ctaUrl": "/register?plan=basic",
    "sortOrder": 0,
    "isActive": true
  },
  {
    "id": "...",
    "name": "Pro",
    "monthlyPrice": 499000,
    "yearlyPrice": 4990000,
    "currency": "VND",
    "description": "Gói nâng cao cho chuỗi cửa hàng",
    "features": [
      { "text": "5 chi nhánh", "included": true },
      { "text": "Không giới hạn sản phẩm", "included": true },
      { "text": "Báo cáo nâng cao", "included": true }
    ],
    "badge": "Phổ biến",
    "ctaText": "Mua ngay",
    "ctaUrl": "/register?plan=pro",
    "sortOrder": 1,
    "isActive": true
  }
]
```

---

## 5. Testimonials

### GET `/testimonials`

Danh sách testimonials đang hiển thị (`isVisible = true`).

**Cache:** 300 giây (5 phút)

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "customerName": "Trần Thị B",
    "position": "Chủ cửa hàng",
    "company": "Shop ABC",
    "content": "Phần mềm rất dễ sử dụng, nhân viên nhanh chóng làm quen.",
    "avatarUrl": "/uploads/avatar.jpg",
    "rating": 5,
    "sortOrder": 0,
    "isVisible": true
  }
]
```

---

## 6. FAQs

### GET `/faqs`

Danh sách câu hỏi thường gặp đang active.

**Cache:** 300 giây (5 phút)

**Response `200 OK`:**

```json
[
  {
    "id": "...",
    "question": "Làm sao để cài đặt POS Pro?",
    "answer": "Bạn có thể tải ứng dụng từ trang chủ và làm theo hướng dẫn...",
    "category": "Cài đặt",
    "sortOrder": 0,
    "isActive": true
  },
  {
    "id": "...",
    "question": "Hệ thống hỗ trợ những phương thức thanh toán nào?",
    "answer": "POS Pro hỗ trợ tiền mặt, thẻ ngân hàng, QR code, ví điện tử...",
    "category": "Thanh toán",
    "sortOrder": 1,
    "isActive": true
  }
]
```

---

## 7. Static Pages

### GET `/pages/{slug}`

Lấy nội dung static page đã publish theo slug.

**Cache:** 120 giây

**Path Parameters:** `slug` — chuỗi URL-friendly (vd: `gioi-thieu`, `chinh-sach-bao-mat`)

**Response `200 OK`:**

```json
{
  "id": "...",
  "title": "Giới thiệu",
  "slug": "gioi-thieu",
  "content": "<h1>Về chúng tôi</h1><p>POS Pro được thành lập...</p>",
  "metaTitle": "Về chúng tôi - POS Pro",
  "metaDescription": "Tìm hiểu về POS Pro và sứ mệnh của chúng tôi",
  "status": "Published",
  "createdAt": "2026-03-01T08:00:00Z",
  "updatedAt": "2026-03-15T10:00:00Z"
}
```

**Response `404 Not Found`** — slug không tồn tại hoặc trang chưa publish.

---

## 8. Site Settings

### GET `/settings`

Lấy settings công khai (chỉ các group: `company`, `social`, `seo`, `announcement`).

**Cache:** 600 giây (10 phút)

**Response `200 OK`:**

```json
[
  { "key": "company.name", "group": "company", "valueJson": "\"POS Pro\"" },
  { "key": "company.phone", "group": "company", "valueJson": "\"0901234567\"" },
  { "key": "seo.defaultTitle", "group": "seo", "valueJson": "\"POS Pro - Phần mềm bán hàng\"" },
  { "key": "social.facebook", "group": "social", "valueJson": "\"https://facebook.com/pospro\"" },
  { "key": "announcement.text", "group": "announcement", "valueJson": "\"Ưu đãi 20% tháng 3!\"" }
]
```

> `valueJson` chứa giá trị JSON (string, number, object, array). Frontend cần `JSON.parse(valueJson)` để sử dụng.

---

## 9. Contact

### POST `/contact`

Gửi form liên hệ / yêu cầu hỗ trợ.

**Rate Limit:** `contact` (5 req/phút — giới hạn chặt hơn để chống spam)

**Request Body:**

| Field        | Type            | Required | Validation                                     |
|--------------|-----------------|----------|-------------------------------------------------|
| `fullName`   | string          | ✅       | Max 200 ký tự                                   |
| `email`      | string          | ✅       | Email hợp lệ                                    |
| `phone`      | string?         |          | Max 20 ký tự                                    |
| `type`       | ContactType     | ✅       | `General`, `Sales`, `Support`, `Partnership`    |
| `subject`    | string?         |          | Max 300 ký tự                                   |
| `message`    | string          | ✅       | Max 5000 ký tự, không rỗng                      |
| `priority`   | ContactPriority |          | `Normal`, `High`, `Urgent` (default: `Normal`)  |
| `tenantCode` | string?         |          | Mã tenant nếu đã là khách hàng                  |

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "a@example.com",
  "phone": "0901234567",
  "type": "Support",
  "subject": "Không đăng nhập được",
  "message": "Tôi không thể đăng nhập vào hệ thống POS từ chiều nay...",
  "priority": "High",
  "tenantCode": "SHOP001"
}
```

**Response `201 Created`:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fullName": "Nguyễn Văn A",
  "email": "a@example.com",
  "phone": "0901234567",
  "type": "Support",
  "subject": "Không đăng nhập được",
  "message": "Tôi không thể đăng nhập vào hệ thống POS từ chiều nay...",
  "priority": "High",
  "status": "New",
  "tenantCode": "SHOP001",
  "attachmentUrls": [],
  "internalNotes": null,
  "assignedToId": null,
  "assignedToName": null,
  "createdAt": "2026-03-19T14:30:00Z",
  "updatedAt": "2026-03-19T14:30:00Z"
}
```

**Response `422 Unprocessable Entity`:**

```json
{
  "title": "Validation failed",
  "status": 422,
  "errors": {
    "Email": ["'Email' is not a valid email address."],
    "Message": ["'Message' must not be empty."]
  }
}
```

**Response `429 Too Many Requests`** — vượt quá 5 requests/phút.

---

## 10. Common Models

### PostSummaryDto

| Field           | Type     | Mô tả                   |
|-----------------|----------|--------------------------|
| `id`            | guid     | ID bài viết              |
| `title`         | string   | Tiêu đề                 |
| `slug`          | string   | URL slug                 |
| `excerpt`       | string?  | Tóm tắt                 |
| `coverImageUrl` | string?  | Ảnh bìa                 |
| `authorName`    | string   | Tên tác giả             |
| `status`        | enum     | Trạng thái (luôn "Published" ở blog) |
| `isFeatured`    | bool     | Bài nổi bật             |
| `publishedAt`   | datetime?| Ngày xuất bản           |
| `viewCount`     | int      | Lượt xem                |
| `categorySlugs` | string[] | Danh sách slug categories |
| `tagSlugs`      | string[] | Danh sách slug tags      |

### PostDetailDto

| Field             | Type          | Mô tả              |
|-------------------|---------------|---------------------|
| `id`              | guid          | ID                  |
| `title`           | string        | Tiêu đề            |
| `slug`            | string        | URL slug            |
| `excerpt`         | string?       | Tóm tắt            |
| `content`         | string        | Nội dung HTML đầy đủ |
| `coverImageUrl`   | string?       | Ảnh bìa            |
| `author`          | CmsUserDto    | Tác giả             |
| `status`          | enum          | Trạng thái          |
| `isFeatured`      | bool          | Nổi bật             |
| `publishedAt`     | datetime?     | Ngày xuất bản       |
| `metaTitle`       | string?       | SEO title           |
| `metaDescription` | string?       | SEO description     |
| `ogImageUrl`      | string?       | Open Graph image    |
| `viewCount`       | int           | Lượt xem            |
| `createdAt`       | datetime      | Ngày tạo            |
| `updatedAt`       | datetime      | Ngày cập nhật       |
| `categories`      | CategoryDto[] | Danh sách categories |
| `tags`            | TagDto[]      | Danh sách tags       |

### CategoryDto

| Field         | Type    | Mô tả              |
|---------------|---------|---------------------|
| `id`          | guid    | ID                  |
| `name`        | string  | Tên category        |
| `slug`        | string  | URL slug            |
| `description` | string? | Mô tả               |
| `parentId`    | guid?   | Category cha        |
| `sortOrder`   | int     | Thứ tự sắp xếp     |
| `isActive`    | bool    | Trạng thái active   |

### TagDto

| Field  | Type   | Mô tả    |
|--------|--------|----------|
| `id`   | guid   | ID       |
| `name` | string | Tên tag  |
| `slug` | string | URL slug |

### PricingPlanDto

| Field          | Type                  | Mô tả                |
|----------------|-----------------------|-----------------------|
| `id`           | guid                  | ID                    |
| `name`         | string                | Tên gói               |
| `monthlyPrice` | decimal?              | Giá theo tháng        |
| `yearlyPrice`  | decimal?              | Giá theo năm          |
| `currency`     | string                | Đơn vị tiền tệ       |
| `description`  | string?               | Mô tả gói             |
| `features`     | PricingFeatureItem[]  | Danh sách tính năng   |
| `badge`        | string?               | Badge hiển thị        |
| `ctaText`      | string                | Text nút CTA          |
| `ctaUrl`       | string?               | Link nút CTA          |
| `sortOrder`    | int                   | Thứ tự                |
| `isActive`     | bool                  | Active                |

### PricingFeatureItem

| Field      | Type   | Mô tả                     |
|------------|--------|----------------------------|
| `text`     | string | Tên tính năng              |
| `included` | bool   | Có bao gồm trong gói không |

### TestimonialDto

| Field          | Type    | Mô tả            |
|----------------|---------|-------------------|
| `id`           | guid    | ID                |
| `customerName` | string  | Tên khách hàng    |
| `position`     | string? | Chức vụ           |
| `company`      | string? | Công ty           |
| `content`      | string  | Nội dung feedback |
| `avatarUrl`    | string? | Avatar            |
| `rating`       | int     | Đánh giá 1–5      |
| `sortOrder`    | int     | Thứ tự            |
| `isVisible`    | bool    | Đang hiển thị     |

### FaqDto

| Field      | Type    | Mô tả            |
|------------|---------|-------------------|
| `id`       | guid    | ID                |
| `question` | string  | Câu hỏi          |
| `answer`   | string  | Câu trả lời      |
| `category` | string? | Phân loại FAQ     |
| `sortOrder`| int     | Thứ tự            |
| `isActive` | bool    | Đang active       |

### StaticPageDto

| Field             | Type       | Mô tả           |
|-------------------|------------|------------------|
| `id`              | guid       | ID               |
| `title`           | string     | Tiêu đề trang   |
| `slug`            | string     | URL slug         |
| `content`         | string     | Nội dung HTML    |
| `metaTitle`       | string?    | SEO title        |
| `metaDescription` | string?    | SEO description  |
| `status`          | PageStatus | Trạng thái       |
| `createdAt`       | datetime   | Ngày tạo         |
| `updatedAt`       | datetime   | Ngày cập nhật    |

### SiteSettingDto

| Field      | Type   | Mô tả                    |
|------------|--------|---------------------------|
| `key`      | string | Setting key               |
| `group`    | string | Nhóm (company, social...) |
| `valueJson`| string | Giá trị dạng JSON string  |

### ContactRequestDto

| Field            | Type            | Mô tả                    |
|------------------|-----------------|---------------------------|
| `id`             | guid            | ID                        |
| `fullName`       | string          | Họ tên người gửi         |
| `email`          | string          | Email                     |
| `phone`          | string?         | Số điện thoại             |
| `type`           | ContactType     | Loại yêu cầu             |
| `subject`        | string?         | Tiêu đề                  |
| `message`        | string          | Nội dung                  |
| `priority`       | ContactPriority | Mức độ ưu tiên           |
| `status`         | ContactStatus   | Trạng thái (luôn "New")  |
| `tenantCode`     | string?         | Mã tenant                |
| `attachmentUrls` | string[]        | DS link đính kèm         |
| `internalNotes`  | string?         | Ghi chú nội bộ (null)    |
| `assignedToId`   | guid?           | Người phụ trách (null)   |
| `assignedToName` | string?         | Tên người phụ trách      |
| `createdAt`      | datetime        | Ngày tạo                 |
| `updatedAt`      | datetime        | Ngày cập nhật             |

### PagedResult\<T\>

| Field             | Type  | Mô tả              |
|-------------------|-------|---------------------|
| `items`           | T[]   | Danh sách items     |
| `totalCount`      | int   | Tổng số records     |
| `page`            | int   | Trang hiện tại      |
| `pageSize`        | int   | Số item/trang       |
| `totalPages`      | int   | Tổng số trang       |
| `hasNextPage`     | bool  | Có trang tiếp       |
| `hasPreviousPage` | bool  | Có trang trước       |

### Enums

| Enum              | Values                                      |
|-------------------|---------------------------------------------|
| `ContactType`     | `General` (0), `Sales` (1), `Support` (2), `Partnership` (3) |
| `ContactPriority` | `Normal` (0), `High` (1), `Urgent` (2)     |
| `ContactStatus`   | `New` (0), `InProgress` (1), `Resolved` (2), `Closed` (3) |
| `PostStatus`      | `Draft` (0), `Published` (1), `Archived` (2) |
| `PageStatus`      | `Draft` (0), `Published` (1)                |
| `CmsUserRole`     | `Admin` (0), `Editor` (1), `Support` (2)    |
| `CmsUserStatus`   | `Active` (0), `Inactive` (1)                |

> Enum values được serialized dạng string (vd: `"Published"`, `"Support"`) nhờ `JsonStringEnumConverter`.

---

## Response Caching Summary

| Endpoint             | Cache Duration | Ghi chú                     |
|----------------------|---------------|-----------------------------|
| `GET /posts`         | 60s           | Vary by query keys           |
| `GET /posts/featured`| 120s          | Vary by `limit`              |
| `GET /posts/{slug}`  | 60s           |                             |
| `GET /categories`    | 300s (5 min)  |                             |
| `GET /tags`          | 300s (5 min)  |                             |
| `GET /pricing`       | 300s (5 min)  |                             |
| `GET /testimonials`  | 300s (5 min)  |                             |
| `GET /faqs`          | 300s (5 min)  |                             |
| `GET /pages/{slug}`  | 120s          |                             |
| `GET /settings`      | 600s (10 min) |                             |
| `POST /contact`      | Không cache   | Write operation              |
