# GET /api/v1/public/tenants/by-slug/{slug}

## Mô tả

Resolve tenant slug thành `tenantId` và thông tin cơ bản của tenant.  
Endpoint này là **AllowAnonymous**, **không yêu cầu JWT và không yêu cầu `X-Tenant-Id`**.

**Mục đích:** Frontend `apps/tenant` gọi endpoint này ngay khi khởi động để xác định tenant từ subdomain.  
Ví dụ: user truy cập `http://tenant-a.localhost:3000` → app đọc slug `"tenant-a"` từ hostname → gọi API này → nhận `tenantId` → đính kèm `X-Tenant-Id` vào mọi request sau đó.

---

## Request

```http
GET /api/v1/public/tenants/by-slug/demo
```

**Path parameter:**

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `slug` | string | ✅ | Slug định danh của tenant (lowercase, chỉ chứa `a-z`, `0-9`, `-`) |

**Không cần header `X-Tenant-Id` hay `Authorization`.**

---

## Response thành công — `200 OK`

```json
{
    "success": true,
    "message": "OK",
    "data": {
        "tenantId": "10000000-0000-0000-0000-000000000001",
        "name": "Demo Company",
        "slug": "demo",
        "status": "Active"
    }
}
```

**`ResolveTenantDto`:**

| Field | Kiểu | Mô tả |
|---|---|---|
| `tenantId` | `uuid` | ID của tenant — dùng làm giá trị `X-Tenant-Id` trong các request tiếp theo |
| `name` | `string` | Tên hiển thị của tenant |
| `slug` | `string` | Slug (echo lại từ request để client tự xác nhận) |
| `status` | `"Active" \| "Inactive" \| "Suspended"` | Trạng thái của tenant |

> **Chú ý quan trọng:** Frontend *không* tự chặn dựa trên `status` ở bước resolve — mà sẽ hiển thị thông báo phù hợp. Backend trả về `200` kèm status thực tế để frontend quyết định hành vi. Xem phần [Logic phía frontend](#logic-phía-frontend) bên dưới.

---

## Các lỗi có thể gặp

| HTTP | Điều kiện |
|---|---|
| `400` | `slug` rỗng hoặc chứa ký tự không hợp lệ |
| `404` | Không tồn tại tenant nào có slug tương ứng |
| `429` | Vượt quá rate limit (xem [Rate Limiting](#rate-limiting)) |

```json
// 404 Not Found
{
    "success": false,
    "message": "Tenant 'unknown-slug' not found.",
    "data": null
}
```

---

## Logic xử lý

```
1. Validate: slug không rỗng, chỉ chứa a-z / 0-9 / dấu gạch ngang
2. SELECT id, name, slug, status FROM tenants
   WHERE slug = @slug AND is_deleted = false
   LIMIT 1
3. Nếu không tìm thấy → NotFoundException 404
4. Trả về ResolveTenantDto (bao gồm cả status != Active)
```

---

## Thao tác với Database

| Bảng | Thao tác | Columns đọc |
|---|---|---|
| `tenants` | SELECT | `id`, `name`, `slug`, `status` |

**Index khuyến nghị:**

```sql
CREATE UNIQUE INDEX idx_tenants_slug ON tenants (slug)
WHERE is_deleted = false;
```

---

## Rate Limiting

Endpoint nằm trong nhóm rate limit **`public`** — giới hạn lỏng hơn `auth` nhưng vẫn cần ngăn enumeration tên tenant:

| Chính sách | Giá trị đề xuất |
|---|---|
| Window | 1 phút (fixed window) |
| Limit | 30 requests/phút per IP |
| Queue | 0 |
| Trả về khi vượt | `429 Too Many Requests` |

---

## Bảo mật

- **Không trả về thông tin nhạy cảm:** chỉ `tenantId`, `name`, `slug`, `status` — không trả DB schema, admin email, user count, v.v.
- **Không phân biệt tenant tồn tại hay không bằng thời gian phản hồi** — trả lỗi `404` ngay lập tức (không phải sau N ms) để tránh timing attack enumeration.
- **Caching:** có thể cache response theo `slug` trong **5 phút** (Redis hoặc in-memory) vì thông tin này thay đổi rất hiếm. Invalidate cache khi sysadmin cập nhật tên / trạng thái tenant.

---

## Logic phía frontend

Sau khi nhận response `200`, frontend (`TenantBoundary.tsx`) xử lý:

```
status == "Active"
    → lưu { slug, tenantId, name } vào useTenantStore
    → render app bình thường (RouterProvider)

status == "Suspended"
    → hiển thị màn hình lỗi: "Tenant đang bị tạm khóa"
    → không render app

status == "Inactive"
    → hiển thị màn hình lỗi: "Tenant không còn hoạt động"
    → không render app
```

Sau khi có `tenantId` từ store, mọi API call tiếp theo (bao gồm `/auth/login`) đều tự động đính kèm header `X-Tenant-Id: {tenantId}` thông qua Axios request interceptor.

---

## Ví dụ cURL

```bash
# Resolve tenant "demo"
curl https://localhost:44322/api/v1/public/tenants/by-slug/demo

# Slug không tồn tại
curl https://localhost:44322/api/v1/public/tenants/by-slug/unknown-company
# → 404
```
