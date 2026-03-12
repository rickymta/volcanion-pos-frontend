# POST /api/v1/categories — Tạo danh mục

## Mô tả

Tạo danh mục mới. Hỗ trợ tạo danh mục cha–con (nested). Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
POST /api/v1/categories
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "code": "CA-PHE",
  "name": "Cà phê",
  "description": "Nhóm sản phẩm cà phê",
  "parentCategoryId": "cat-uuid-1"
}
```

> `parentCategoryId` = `null` → tạo danh mục gốc (root).

### Validation

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 50 ký tự |
| `name` | Bắt buộc, tối đa 100 ký tự |
| `description` | Tối đa 500 ký tự (nếu có) |

## Response 201

Trả về `CategoryDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
