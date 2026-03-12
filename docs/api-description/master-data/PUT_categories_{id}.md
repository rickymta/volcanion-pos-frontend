# PUT /api/v1/categories/{id} — Cập nhật danh mục

## Mô tả

Cập nhật danh mục. Yêu cầu quyền **Manager** hoặc **Admin**.

## Request

```
PUT /api/v1/categories/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID danh mục |

### Request body

```json
{
  "code": "CA-PHE-SUA",
  "name": "Cà phê sữa",
  "description": null,
  "parentCategoryId": "cat-uuid-1"
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 50 ký tự |
| `name` | Bắt buộc, tối đa 100 ký tự |

## Response 200

Trả về `CategoryDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Manager) |
| 404 | Không tìm thấy danh mục |
