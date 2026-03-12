# POST /api/v1/branches — Tạo chi nhánh

## Mô tả

Tạo chi nhánh mới. Yêu cầu quyền **Admin**.

## Request

```
POST /api/v1/branches
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Request body

```json
{
  "code": "HN01",
  "name": "Chi nhánh Hà Nội",
  "address": "45 Hoàn Kiếm, Hà Nội",
  "phone": "024-9876-5432",
  "parentBranchId": "branch-uuid-1"
}
```

> `parentBranchId` = `null` → chi nhánh là gốc (root level).

### Validation

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 20 ký tự, chỉ `A-Z`, `0-9`, `-`, `_` |
| `name` | Bắt buộc, tối đa 200 ký tự |
| `address` | Tối đa 300 ký tự (nếu có) |
| `phone` | Tối đa 20 ký tự, chỉ chứa chữ số / `+` `-` `(` `)` `space` (nếu có) |

## Response 201

Trả về `BranchSummaryDto` vừa tạo.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Admin) |
