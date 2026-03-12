# PUT /api/v1/branches/{id} — Cập nhật chi nhánh

## Mô tả

Cập nhật thông tin chi nhánh. Yêu cầu quyền **Admin**.

## Request

```
PUT /api/v1/branches/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

### Path parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | guid | ID chi nhánh |

### Request body

```json
{
  "code": "HN01",
  "name": "Chi nhánh Hà Nội (updated)",
  "address": "46 Hoàn Kiếm, Hà Nội",
  "phone": "024-9876-0000",
  "parentBranchId": "branch-uuid-1",
  "status": 0
}
```

### Validation

| Trường | Quy tắc |
|---|---|
| `code` | Bắt buộc, tối đa 20 ký tự, chỉ `A-Z`, `0-9`, `-`, `_` |
| `name` | Bắt buộc, tối đa 200 ký tự |
| `address` | Tối đa 300 ký tự (nếu có) |
| `phone` | Tối đa 20 ký tự (nếu có) |
| `status` | Phải là giá trị hợp lệ của `EntityStatus` |

## Response 200

Trả về `BranchSummaryDto` đã cập nhật.

## Lỗi

| HTTP | Điều kiện |
|---|---|
| 400 | Dữ liệu không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không đủ quyền (< Admin) |
| 404 | Không tìm thấy chi nhánh |
