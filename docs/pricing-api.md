# Pricing Plan API

Tài liệu mô tả đầy đủ các API liên quan đến Pricing Plan — bao gồm API công khai (Blog) và API quản trị (CMS Admin).

---

## Tổng quan

Hệ thống Pricing Plan theo mô hình **2 lớp**:

```
Property Definitions (schema toàn cục)
  └── Mỗi plan có thể gán giá trị riêng cho từng property
```

| Khái niệm | Mô tả |
|-----------|-------|
| **Pricing Plan** | Gói dịch vụ (Basic, Pro, Enterprise...) với giá tháng/năm, tính năng, CTA button |
| **Property Definition** | Schema của một thuộc tính (ví dụ: `max_users`, `custom_domain`) — dùng chung cho tất cả plan |
| **Property Value** | Giá trị cụ thể của một thuộc tính trên một plan cụ thể |
| **Feature Item** | Dòng text "Có/Không" trong danh sách tính năng của plan (free-form, lưu dạng JSON) |
| **Add-on** | Gói bổ sung (module/tính năng) bán riêng ngoài gói base |

### Đa ngôn ngữ (i18n)

Hỗ trợ **Tiếng Việt** (mặc định) và **Tiếng Anh** (tùy chọn). Các trường đa ngôn ngữ có hậu tố `En` (ví dụ: `name` / `nameEn`). Trường `*En` luôn **nullable** — nếu không cần bản tiếng Anh thì bỏ trống hoặc gửi `null`.

### Kiểu dữ liệu Property (`valueType`)

| Giá trị | Tên | Trường dùng | Ví dụ |
|---------|-----|-------------|-------|
| `0` | Boolean | `boolValue` | Custom domain: `true`/`false` |
| `1` | Number | `numberValue` | Số user tối đa: `50`, Dung lượng: `100` GB |
| `2` | Text | `textValue` / `textValueEn` | SLA cam kết: `"99.9% uptime"` |

---

## Public Blog API

> **Base URL:** `http://localhost:5003/api/v1`  
> **Authentication:** Không yêu cầu  
> **Rate Limit:** 120 req/phút (limiter `public`)  
> **Cache:** 300 giây (5 phút)

### GET `/pricing`

Danh sách các gói giá đang kích hoạt (`isActive = true`), sắp xếp theo `sortOrder` tăng dần.

Mỗi plan trả về kèm `properties` — **chỉ những property đã được gán giá trị** cho plan đó.

#### Response `200 OK`

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Cơ bản",
    "nameEn": "Basic",
    "monthlyPrice": 199000,
    "yearlyPrice": 1990000,
    "currency": "VND",
    "description": "Gói cơ bản cho cửa hàng nhỏ",
    "descriptionEn": "Basic plan for small shops",
    "features": [
      { "text": "1 chi nhánh", "included": true },
      { "text": "100 sản phẩm", "included": true },
      { "text": "Báo cáo nâng cao", "included": false }
    ],
    "featuresEn": [
      { "text": "1 branch", "included": true },
      { "text": "100 products", "included": true },
      { "text": "Advanced reports", "included": false }
    ],
    "badge": null,
    "badgeEn": null,
    "ctaText": "Dùng thử",
    "ctaTextEn": "Try free",
    "ctaUrl": "/register?plan=basic",
    "sortOrder": 0,
    "isActive": true,
    "properties": [
      {
        "propertyId": "a1b2c3d4-1111-1111-1111-000000000001",
        "key": "max_users",
        "displayName": "Số người dùng tối đa",
        "displayNameEn": "Max users",
        "valueType": 1,
        "unit": "người",
        "unitEn": "users",
        "group": "Giới hạn",
        "groupEn": "Limits",
        "boolValue": null,
        "numberValue": 5,
        "textValue": null,
        "textValueEn": null
      },
      {
        "propertyId": "a1b2c3d4-1111-1111-1111-000000000002",
        "key": "custom_domain",
        "displayName": "Tên miền riêng",
        "displayNameEn": "Custom Domain",
        "valueType": 0,
        "unit": null,
        "unitEn": null,
        "group": "Tính năng",
        "groupEn": "Features",
        "boolValue": false,
        "numberValue": null,
        "textValue": null,
        "textValueEn": null
      },
      {
        "propertyId": "a1b2c3d4-1111-1111-1111-000000000003",
        "key": "storage_gb",
        "displayName": "Dung lượng lưu trữ",
        "displayNameEn": "Storage",
        "valueType": 1,
        "unit": "GB",
        "unitEn": "GB",
        "group": "Giới hạn",
        "groupEn": "Limits",
        "boolValue": null,
        "numberValue": 5,
        "textValue": null,
        "textValueEn": null
      }
    ]
  },
  {
    "id": "4fb96a75-6828-5673-c4ad-3d074a77bab7",
    "name": "Nâng cao",
    "nameEn": "Pro",
    "monthlyPrice": 499000,
    "yearlyPrice": 4990000,
    "currency": "VND",
    "description": "Gói nâng cao cho chuỗi cửa hàng",
    "descriptionEn": "Advanced plan for chain stores",
    "features": [
      { "text": "5 chi nhánh", "included": true },
      { "text": "Không giới hạn sản phẩm", "included": true },
      { "text": "Báo cáo nâng cao", "included": true }
    ],
    "featuresEn": [
      { "text": "5 branches", "included": true },
      { "text": "Unlimited products", "included": true },
      { "text": "Advanced reports", "included": true }
    ],
    "badge": "Phổ biến",
    "badgeEn": "Popular",
    "ctaText": "Mua ngay",
    "ctaTextEn": "Buy now",
    "ctaUrl": "/register?plan=pro",
    "sortOrder": 1,
    "isActive": true,
    "properties": [
      {
        "propertyId": "a1b2c3d4-1111-1111-1111-000000000001",
        "key": "max_users",
        "displayName": "Số người dùng tối đa",
        "displayNameEn": "Max users",
        "valueType": 1,
        "unit": "người",
        "unitEn": "users",
        "group": "Giới hạn",
        "groupEn": "Limits",
        "boolValue": null,
        "numberValue": 50,
        "textValue": null,
        "textValueEn": null
      },
      {
        "propertyId": "a1b2c3d4-1111-1111-1111-000000000002",
        "key": "custom_domain",
        "displayName": "Tên miền riêng",
        "displayNameEn": "Custom Domain",
        "valueType": 0,
        "unit": null,
        "unitEn": null,
        "group": "Tính năng",
        "groupEn": "Features",
        "boolValue": true,
        "numberValue": null,
        "textValue": null,
        "textValueEn": null
      },
      {
        "propertyId": "a1b2c3d4-1111-1111-1111-000000000003",
        "key": "storage_gb",
        "displayName": "Dung lượng lưu trữ",
        "displayNameEn": "Storage",
        "valueType": 1,
        "unit": "GB",
        "unitEn": "GB",
        "group": "Giới hạn",
        "groupEn": "Limits",
        "boolValue": null,
        "numberValue": 100,
        "textValue": null,
        "textValueEn": null
      }
    ]
  }
]
```

#### Ghi chú

- `properties` chỉ chứa những property **đã được admin gán giá trị** cho plan đó. Các property chưa được gán sẽ không xuất hiện.
- Property definition bị `isActive = false` sẽ không xuất hiện trong response.
- Đúng một trong `boolValue` / `numberValue` / `textValue` có giá trị; hai trường còn lại là `null`.
- `properties` sắp xếp theo `sortOrder` của definition, sau đó `displayName`.
- Các trường `*En` (`nameEn`, `descriptionEn`, `featuresEn`, `badgeEn`, `ctaTextEn`, …) có thể là `null` nếu admin chưa nhập bản tiếng Anh.

---

### GET `/addons`

Danh sách các **gói bổ sung** (add-on) đang hoạt động (`isActive = true`), sắp xếp theo `sortOrder`.

**Response `200 OK`:** `PricingAddonDto[]`

```json
[
  {
    "id": "uuid",
    "key": "accounting",
    "name": "Kế toán nâng cao",
    "nameEn": "Advanced Accounting",
    "category": "Tài chính",
    "categoryEn": "Finance",
    "description": "Tự động hóa bút toán kép, báo cáo lãi lỗ, bảng cân đối kế toán.",
    "descriptionEn": "Automate double-entry bookkeeping, P&L reports, and balance sheets.",
    "iconUrl": "https://cdn.example.com/icons/accounting.svg",
    "monthlyPrice": 299000,
    "yearlyPrice": 2990000,
    "currency": "VND",
    "features": [
      { "text": "Bút toán kép tự động", "included": true },
      { "text": "Báo cáo lãi/lỗ theo kỳ", "included": true },
      { "text": "Xuất sổ kế toán PDF", "included": true }
    ],
    "featuresEn": [
      { "text": "Automatic double-entry", "included": true },
      { "text": "Periodic P&L reports", "included": true },
      { "text": "Export ledger to PDF", "included": true }
    ],
    "badge": "Phổ biến",
    "badgeEn": "Popular",
    "ctaText": "Thêm vào gói",
    "ctaTextEn": "Add to plan",
    "ctaUrl": null,
    "sortOrder": 1,
    "isActive": true
  }
]
```

#### Ghi chú

- Chỉ trả về add-on có `isActive = true`.
- Sắp xếp theo `sortOrder` ASC, sau đó `name` ASC.
- Cache phía client: `Cache-Control: max-age=300` (5 phút).

---

## CMS Admin API

> **Base URL:** `http://localhost:5200/api/v1/admin`  
> **Authentication:** JWT Bearer Token — `Authorization: Bearer <token>`  
> **Authorization:** Policy `AdminOnly` (role `Admin`)  
> **Rate Limit:** 300 req/phút (limiter `admin`)

---

### Pricing Plans

#### GET `/pricing`

Danh sách **tất cả** plans (kể cả inactive), kèm `properties`.

**Response `200 OK`:** `PricingPlanDto[]`

---

#### GET `/pricing/{id}`

Chi tiết một plan.

**Response `200 OK`:** `PricingPlanDto`  
**Response `404 Not Found`**

---

#### POST `/pricing`

Tạo pricing plan mới. Properties sẽ là `[]` khi mới tạo — gán giá trị qua `PUT /{id}/properties`.

**Request Body — `CreatePricingPlanRequest`:**

| Field          | Type                 | Required | Ghi chú                            |
|----------------|----------------------|----------|------------------------------------|
| `name`         | string               | ✅       | Tên tiếng Việt, max 100 ký tự      |
| `nameEn`       | string?              | ❌       | Tên tiếng Anh, max 100 ký tự       |
| `monthlyPrice` | decimal?             | ❌       | Giá theo tháng                     |
| `yearlyPrice`  | decimal?             | ❌       | Giá theo năm                       |
| `currency`     | string               | ✅       | Mặc định `"VND"`, max 3 ký tự      |
| `description`  | string?              | ❌       | Mô tả tiếng Việt, max 500 ký tự    |
| `descriptionEn`| string?              | ❌       | Mô tả tiếng Anh, max 500 ký tự     |
| `features`     | FeatureItem[]        | ✅       | Tính năng tiếng Việt, có thể rỗng   |
| `featuresEn`   | FeatureItem[]?       | ❌       | Tính năng tiếng Anh                 |
| `badge`        | string?              | ❌       | Nhãn nổi bật (VI), max 50 ký tự    |
| `badgeEn`      | string?              | ❌       | Nhãn nổi bật (EN), max 50 ký tự    |
| `ctaText`      | string               | ✅       | Nút CTA (VI), max 100 ký tự        |
| `ctaTextEn`    | string?              | ❌       | Nút CTA (EN), max 100 ký tự        |
| `ctaUrl`       | string?              | ❌       | URL nút đăng ký                    |
| `sortOrder`    | int                  | ❌       | Default `0`                        |

**FeatureItem:** `{ "text": string, "included": bool }`

```json
{
  "name": "Doanh nghiệp",
  "nameEn": "Enterprise",
  "monthlyPrice": 999000,
  "yearlyPrice": 9990000,
  "currency": "VND",
  "description": "Gói doanh nghiệp — không giới hạn",
  "descriptionEn": "Enterprise plan — unlimited everything",
  "features": [
    { "text": "Không giới hạn chi nhánh", "included": true },
    { "text": "API tích hợp", "included": true }
  ],
  "featuresEn": [
    { "text": "Unlimited branches", "included": true },
    { "text": "Integration API", "included": true }
  ],
  "badge": "Doanh nghiệp",
  "badgeEn": "Enterprise",
  "ctaText": "Liên hệ",
  "ctaTextEn": "Contact us",
  "ctaUrl": "/contact?plan=enterprise",
  "sortOrder": 2
}
```

**Response `201 Created`:** `PricingPlanDto`

---

#### PUT `/pricing/{id}`

Cập nhật plan. Giống `POST` + thêm `isActive`.

| Field      | Type | Required |
|------------|------|----------|
| `isActive` | bool | ✅       |

**Response `200 OK`:** `PricingPlanDto`  
**Response `404 Not Found`**

---

#### DELETE `/pricing/{id}`

Xóa plan và **cascade** xóa toàn bộ property values của plan đó.

**Response `204 No Content`**  
**Response `404 Not Found`**

---

### Plan Property Values

Quản lý giá trị các properties cho từng plan cụ thể.

#### GET `/pricing/{planId}/properties`

Lấy danh sách **tất cả active property definitions** kèm giá trị hiện tại của plan.  
Khác với `GET /pricing/{id}` (chỉ trả về những property đã có giá trị), endpoint này trả về **toàn bộ** definitions — kể cả những property chưa được set (giá trị = `null`). Dùng để render form chỉnh sửa ở admin UI.

**Response `200 OK`:** `PricingPlanPropertyValueDto[]`

```json
[
  {
    "propertyId": "a1b2c3d4-1111-1111-1111-000000000001",
    "key": "max_users",
    "displayName": "Số người dùng tối đa",
    "displayNameEn": "Max users",
    "valueType": 1,
    "unit": "người",
    "unitEn": "users",
    "group": "Giới hạn",
    "groupEn": "Limits",
    "boolValue": null,
    "numberValue": 50,
    "textValue": null,
    "textValueEn": null
  },
  {
    "propertyId": "a1b2c3d4-1111-1111-1111-000000000002",
    "key": "custom_domain",
    "displayName": "Tên miền riêng",
    "displayNameEn": "Custom Domain",
    "valueType": 0,
    "unit": null,
    "unitEn": null,
    "group": "Tính năng",
    "groupEn": "Features",
    "boolValue": null,
    "numberValue": null,
    "textValue": null,
    "textValueEn": null
  }
]
```

> `custom_domain` chưa được set (`boolValue = null`) — admin cần gán giá trị qua `PUT`.

---

#### PUT `/pricing/{planId}/properties`

Upsert giá trị cho một hoặc nhiều properties của plan. Chỉ các `propertyId` được gửi lên mới bị cập nhật; các property khác không thay đổi.

Quy tắc khi set giá trị:
- Boolean property → chỉ điền `boolValue`, đặt `numberValue` và `textValue` = `null`
- Number property → chỉ điền `numberValue`
- Text property → điền `textValue` (VI) và `textValueEn` (EN, tùy chọn)

**Request Body:**

```json
{
  "values": [
    {
      "propertyId": "a1b2c3d4-1111-1111-1111-000000000001",
      "boolValue": null,
      "numberValue": 100,
      "textValue": null,
      "textValueEn": null
    },
    {
      "propertyId": "a1b2c3d4-1111-1111-1111-000000000002",
      "boolValue": true,
      "numberValue": null,
      "textValue": null,
      "textValueEn": null
    },
    {
      "propertyId": "a1b2c3d4-1111-1111-1111-000000000004",
      "boolValue": null,
      "numberValue": null,
      "textValue": "99.9% uptime SLA",
      "textValueEn": "99.9% uptime SLA"
    }
  ]
}
```

**Response `204 No Content`** — cập nhật thành công  
**Response `404 Not Found`** — `planId` không tồn tại

---

### Property Definitions

Quản lý **schema** của các property — dùng chung cho tất cả plan.

#### GET `/pricing/property-definitions`

Tất cả property definitions, sắp xếp theo `sortOrder` rồi `displayName`.

**Response `200 OK`:** `PricingPropertyDefinitionDto[]`

```json
[
  {
    "id": "a1b2c3d4-1111-1111-1111-000000000001",
    "key": "max_users",
    "displayName": "Số người dùng tối đa",
    "displayNameEn": "Max users",
    "valueType": 1,
    "unit": "người",
    "unitEn": "users",
    "group": "Giới hạn",
    "groupEn": "Limits",
    "description": "Số tài khoản nhân viên được tạo trong hệ thống",
    "descriptionEn": "Number of staff accounts allowed in the system",
    "sortOrder": 0,
    "isActive": true
  },
  {
    "id": "a1b2c3d4-1111-1111-1111-000000000002",
    "key": "custom_domain",
    "displayName": "Tên miền riêng",
    "displayNameEn": "Custom Domain",
    "valueType": 0,
    "unit": null,
    "unitEn": null,
    "group": "Tính năng",
    "groupEn": "Features",
    "description": "Cho phép trỏ domain riêng",
    "descriptionEn": "Allow custom domain mapping",
    "sortOrder": 1,
    "isActive": true
  },
  {
    "id": "a1b2c3d4-1111-1111-1111-000000000003",
    "key": "storage_gb",
    "displayName": "Dung lượng lưu trữ",
    "displayNameEn": "Storage",
    "valueType": 1,
    "unit": "GB",
    "unitEn": "GB",
    "group": "Giới hạn",
    "groupEn": "Limits",
    "description": null,
    "descriptionEn": null,
    "sortOrder": 2,
    "isActive": true
  },
  {
    "id": "a1b2c3d4-1111-1111-1111-000000000004",
    "key": "sla",
    "displayName": "SLA cam kết",
    "displayNameEn": "SLA commitment",
    "valueType": 2,
    "unit": null,
    "unitEn": null,
    "group": "Hỗ trợ",
    "groupEn": "Support",
    "description": "Mức cam kết uptime",
    "descriptionEn": "Uptime commitment level",
    "sortOrder": 3,
    "isActive": true
  }
]
```

---

#### GET `/pricing/property-definitions/{propId}`

**Response `200 OK`:** `PricingPropertyDefinitionDto`  
**Response `404 Not Found`**

---

#### POST `/pricing/property-definitions`

Tạo property definition mới. Sau khi tạo, admin có thể gán giá trị cho từng plan qua `PUT /{planId}/properties`.

**Request Body — `CreatePricingPropertyDefinitionRequest`:**

| Field           | Type       | Required | Ghi chú                                            |
|-----------------|------------|----------|-----------------------------------------------------|
| `key`           | string     | ✅       | Unique, khuyến nghị `snake_case`, max 100 ký tự     |
| `displayName`   | string     | ✅       | Tên hiển thị (VI), max 200 ký tự                    |
| `displayNameEn` | string?    | ❌       | Tên hiển thị (EN), max 200 ký tự                    |
| `valueType`     | int        | ✅       | `0` = Boolean, `1` = Number, `2` = Text             |
| `unit`          | string?    | ❌       | Đơn vị (VI), max 50 ký tự                           |
| `unitEn`        | string?    | ❌       | Đơn vị (EN), max 50 ký tự                           |
| `group`         | string?    | ❌       | Nhóm hiển thị (VI), max 100 ký tự                   |
| `groupEn`       | string?    | ❌       | Nhóm hiển thị (EN), max 100 ký tự                   |
| `description`   | string?    | ❌       | Mô tả nội bộ (VI), max 300 ký tự                    |
| `descriptionEn` | string?    | ❌       | Mô tả nội bộ (EN), max 300 ký tự                    |
| `sortOrder`     | int        | ❌       | Thứ tự sắp xếp, default `0`                         |

```json
{
  "key": "api_calls_per_month",
  "displayName": "Số API call/tháng",
  "displayNameEn": "API calls per month",
  "valueType": 1,
  "unit": "lượt",
  "unitEn": "calls",
  "group": "Giới hạn",
  "groupEn": "Limits",
  "description": "Giới hạn số lần gọi API tích hợp mỗi tháng",
  "descriptionEn": "Monthly integration API call limit",
  "sortOrder": 4
}
```

**Response `201 Created`:** `PricingPropertyDefinitionDto`

---

#### PUT `/pricing/property-definitions/{propId}`

Cập nhật definition. Giống `POST` + thêm `isActive`.

| Field      | Type | Required | Ghi chú                                                   |
|------------|------|----------|-----------------------------------------------------------|
| `isActive` | bool | ✅       | `false` → ẩn khỏi mọi response kể cả public blog API     |

**Response `200 OK`:** `PricingPropertyDefinitionDto`  
**Response `404 Not Found`**

---

#### DELETE `/pricing/property-definitions/{propId}`

Xóa definition và **cascade** xóa toàn bộ giá trị của property này trên mọi plan.

> ⚠️ Thao tác không thể phục hồi. Nên dùng `isActive = false` để ẩn thay vì xóa nếu đã có dữ liệu.

**Response `204 No Content`**  
**Response `404 Not Found`**

---

### Add-on Packages

> Route base: `api/v1/admin/pricing/addons`

Add-on là các module/tính năng bán riêng ngoài gói base, ví dụ: kế toán, audit log, đa kho, tích hợp thương mại điện tử.

#### GET `/pricing/addons`

Danh sách **tất cả** add-on (kể cả inactive).

**Response `200 OK`:** `PricingAddonDto[]`

---

#### GET `/pricing/addons/{addonId}`

Chi tiết một add-on.

**Response `200 OK`:** `PricingAddonDto`  
**Response `404 Not Found`**

---

#### POST `/pricing/addons`

Tạo add-on mới.

**Request Body — `CreatePricingAddonRequest`:**

| Field           | Type                          | Required | Ghi chú                                       |
|-----------------|-------------------------------|----------|------------------------------------------------|
| `key`           | string (max 100)              | ✅       | Unique, machine-readable, e.g. `"accounting"`  |
| `name`          | string (max 200)              | ✅       | Tên hiển thị (VI)                               |
| `nameEn`        | string? (max 200)             | ❌       | Tên hiển thị (EN)                               |
| `category`      | string? (max 100)             | ❌       | Nhóm (VI), e.g. `"Tài chính"`                  |
| `categoryEn`    | string? (max 100)             | ❌       | Nhóm (EN), e.g. `"Finance"`                    |
| `description`   | string? (max 1000)            | ❌       | Mô tả (VI)                                     |
| `descriptionEn` | string? (max 1000)            | ❌       | Mô tả (EN)                                     |
| `iconUrl`       | string? (max 500)             | ❌       | Icon URL                                        |
| `monthlyPrice`  | decimal?                      | ❌       | Giá tháng                                       |
| `yearlyPrice`   | decimal?                      | ❌       | Giá năm                                         |
| `currency`      | string (max 3)                | ✅       | Mặc định `"VND"`                                |
| `features`      | `PricingFeatureItem[]`        | ✅       | Tính năng (VI) kèm `included`                   |
| `featuresEn`    | `PricingFeatureItem[]?`       | ❌       | Tính năng (EN)                                   |
| `badge`         | string? (max 50)              | ❌       | Nhãn badge (VI), e.g. `"Phổ biến"`              |
| `badgeEn`       | string? (max 50)              | ❌       | Nhãn badge (EN), e.g. `"Popular"`                |
| `ctaText`       | string (max 100)              | ✅       | Nút CTA (VI)                                    |
| `ctaTextEn`     | string? (max 100)             | ❌       | Nút CTA (EN)                                    |
| `ctaUrl`        | string? (max 500)             | ❌       | Link CTA tùy chỉnh                              |
| `sortOrder`     | int                           | ❌       | Mặc định `0`                                    |

**Response `201 Created`:** `PricingAddonDto`

---

#### PUT `/pricing/addons/{addonId}`

Cập nhật add-on. Tất cả field giống `CreatePricingAddonRequest` cộng thêm `isActive`.

| Field      | Type | Required | Ghi chú                                     |
|------------|------|----------|---------------------------------------------|
| `isActive` | bool | ✅       | `false` → ẩn khỏi public Blog API `/addons` |

**Response `200 OK`:** `PricingAddonDto`  
**Response `404 Not Found`**

---

#### DELETE `/pricing/addons/{addonId}`

Xóa vĩnh viễn add-on.

> ⚠️ Nên dùng `isActive = false` thay vì xóa để tránh mất lịch sử.

**Response `204 No Content`**  
**Response `404 Not Found`**

---

## Data Models Reference

### `PricingPlanDto`

```json
{
  "id": "uuid",
  "name": "string",
  "nameEn": "string | null",
  "monthlyPrice": "decimal | null",
  "yearlyPrice": "decimal | null",
  "currency": "string",
  "description": "string | null",
  "descriptionEn": "string | null",
  "features": "PricingFeatureItem[]",
  "featuresEn": "PricingFeatureItem[] | null",
  "badge": "string | null",
  "badgeEn": "string | null",
  "ctaText": "string",
  "ctaTextEn": "string | null",
  "ctaUrl": "string | null",
  "sortOrder": "int",
  "isActive": "bool",
  "properties": "PricingPlanPropertyValueDto[]"
}
```

### `PricingFeatureItem`

```json
{
  "text": "string",
  "included": "bool"
}
```

### `PricingPlanPropertyValueDto`

```json
{
  "propertyId": "uuid",
  "key": "string",
  "displayName": "string",
  "displayNameEn": "string | null",
  "valueType": "int (0|1|2)",
  "unit": "string | null",
  "unitEn": "string | null",
  "group": "string | null",
  "groupEn": "string | null",
  "boolValue": "bool | null",
  "numberValue": "decimal | null",
  "textValue": "string | null",
  "textValueEn": "string | null"
}
```

### `PricingPropertyDefinitionDto`

```json
{
  "id": "uuid",
  "key": "string",
  "displayName": "string",
  "displayNameEn": "string | null",
  "valueType": "int (0|1|2)",
  "unit": "string | null",
  "unitEn": "string | null",
  "group": "string | null",
  "groupEn": "string | null",
  "description": "string | null",
  "descriptionEn": "string | null",
  "sortOrder": "int",
  "isActive": "bool"
}
```

### `PricingAddonDto`

```json
{
  "id": "uuid",
  "key": "string",
  "name": "string",
  "nameEn": "string | null",
  "category": "string | null",
  "categoryEn": "string | null",
  "description": "string | null",
  "descriptionEn": "string | null",
  "iconUrl": "string | null",
  "monthlyPrice": "decimal | null",
  "yearlyPrice": "decimal | null",
  "currency": "string",
  "features": "PricingFeatureItem[]",
  "featuresEn": "PricingFeatureItem[] | null",
  "badge": "string | null",
  "badgeEn": "string | null",
  "ctaText": "string",
  "ctaTextEn": "string | null",
  "ctaUrl": "string | null",
  "sortOrder": "int",
  "isActive": "bool"
}
```

### `SetPlanPropertyValuesRequest`

```json
{
  "values": [
    {
      "propertyId": "uuid",
      "boolValue": "bool | null",
      "numberValue": "decimal | null",
      "textValue": "string | null",
      "textValueEn": "string | null"
    }
  ]
}
```

---

## Quy trình sử dụng điển hình

### Thiết lập ban đầu (admin)

```
1. POST /pricing/property-definitions  →  tạo các property (VI + EN)
   (max_users, storage_gb, custom_domain, sla, ...)

2. POST /pricing  →  tạo các plan (VI + EN)

3. PUT /pricing/{basicId}/properties  →  gán giá trị cho Basic
4. PUT /pricing/{proId}/properties    →  gán giá trị cho Pro
5. PUT /pricing/{entId}/properties    →  gán giá trị cho Enterprise

6. POST /pricing/addons  →  tạo add-on nếu cần (VI + EN)
```

### Hiển thị trang pricing (frontend)

```
GET /api/v1/pricing
→ Lấy tất cả active plans kèm properties đã gán
→ Frontend chọn hiển thị name hoặc nameEn tùy ngôn ngữ user
→ Render bảng so sánh theo group / groupEn

GET /api/v1/addons
→ Lấy add-on kèm features / featuresEn
```

### Chỉnh sửa giá trị property của một plan (admin UI)

```
GET /api/v1/admin/pricing/{planId}/properties
→ Lấy tất cả active definitions + giá trị hiện tại (null = chưa set)
→ Hiện form với đúng input type (checkbox / number / text)
→ Text property hiện 2 ô: textValue (VI) + textValueEn (EN)

PUT /api/v1/admin/pricing/{planId}/properties
→ Submit form → upsert giá trị
```

### Thêm property mới vào tất cả plan

```
POST /api/v1/admin/pricing/property-definitions  →  tạo definition (VI + EN)
→ Mặc định tất cả plan chưa có giá trị cho property mới này
→ Admin vào từng plan để gán giá trị qua PUT /{planId}/properties
```
