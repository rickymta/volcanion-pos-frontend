# Roles API — Tổng quan

## Mô tả

Quản lý vai trò (roles) và phân quyền (permissions) trong hệ thống. Tất cả endpoint trong nhóm này yêu cầu quyền **Admin**.

## Base URL

```
/api/v1/roles
```

## Xác thực

- **Bắt buộc:** `Authorization: Bearer {token}`
- **Bắt buộc:** `X-Tenant-Id: {tenantId}`
- **Quyền yêu cầu:** `RequireAdmin` — chỉ Admin

## Danh sách endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/roles` | Danh sách vai trò |
| GET | `/api/v1/roles/{id}` | Chi tiết vai trò |
| POST | `/api/v1/roles` | Tạo vai trò mới |
| PUT | `/api/v1/roles/{id}` | Cập nhật vai trò |
| DELETE | `/api/v1/roles/{id}` | Xóa vai trò |
| PUT | `/api/v1/roles/{id}/permissions` | Gán quyền cho vai trò |
| GET | `/api/v1/roles/permissions` | Danh sách tất cả quyền hệ thống |

## Lưu ý

- Vai trò hệ thống (`isSystemRole = true`) không thể sửa tên hoặc xóa.
- `PUT /{id}/permissions` sẽ **thay thế toàn bộ** danh sách quyền hiện tại (không phải append).
