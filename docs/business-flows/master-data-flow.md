# Luồng Quản lý Master Data & Khởi tạo Tenant

> **Liên quan:** [../api-description/master-data/](../api-description/master-data/) · [../api-description/auth/](../api-description/auth/) · [../api-description/admin/](../api-description/admin/)  
> **Database:** [../database/master-data/](../database/master-data/)

---

## 1. Tổng quan

Master Data là nền tảng cho mọi luồng nghiệp vụ. Cần thiết lập theo đúng thứ tự để tránh lỗi phụ thuộc.

### Thứ tự khởi tạo (Dependency Order)

```
1. [Auth] Register Tenant + Admin
      │
2. [Admin] Seed dữ liệu mẫu (tùy chọn)
      │
3. [Roles] Tạo & gán quyền cho các vai trò
      │
4. [Master Data] Tạo Chi nhánh + Kho hàng
      │
5. [Master Data] Tạo Đơn vị + Quy đổi đơn vị
      │
6. [Master Data] Tạo Danh mục sản phẩm
      │
7. [Master Data] Tạo Sản phẩm (gán đơn vị, danh mục)
      │
8. [Master Data] Tạo Khách hàng + Nhà cung cấp
      │
9. [Inventory] Nhập tồn kho đầu kỳ
      │
      ▼
   → Sẵn sàng cho nghiệp vụ
```

---

## 2. Đăng ký Tenant & Admin

```
POST /api/v1/auth/register
{
  "tenantName": "Chuỗi Siêu thị XYZ",
  "ownerName": "Nguyễn Văn A",
  "email": "admin@xyz.vn",
  "password": "SecureP@ss123"
}
→ Tạo: Tenant + User (Admin) + Role "Admin" + UserRole
```

**API:** [`POST /api/v1/auth/register`](../api-description/auth/POST_register.md)  
**Seed demo:** [`POST /api/v1/admin/seed`](../api-description/admin/POST_seed.md) — tạo toàn bộ dữ liệu mẫu (chỉ dùng cho dev/demo)

---

## 3. Quản lý Chi nhánh (Branches)

Chi nhánh tổ chức theo cấu trúc cây (parent-child).

```
POST /api/v1/branches
{
  "name": "Chi nhánh Quận 1",
  "code": "Q1",
  "address": "123 Lê Lợi, Q.1, TP.HCM",
  "phone": "028-1234-5678",
  "parentId": null    // null = chi nhánh gốc
}

POST /api/v1/branches
{
  "name": "Cửa hàng Bến Thành",
  "code": "Q1-BT",
  "parentId": 1    // thuộc Chi nhánh Quận 1
}

GET /api/v1/branches/tree    → Xem toàn bộ cây chi nhánh
```

**API:** [`POST /api/v1/branches`](../api-description/master-data/POST_branches.md) · [`GET /api/v1/branches/tree`](../api-description/master-data/GET_branches_tree.md)  
**Bảng:** [`Branches`](../database/master-data/Branches.md)

---

## 4. Quản lý Kho hàng (Warehouses)

Mỗi kho gắn với một chi nhánh.

```
POST /api/v1/warehouses
{
  "name": "Kho Trung tâm",
  "code": "KHO-TT",
  "branchId": 1,
  "address": "Số 5 Nguyễn Tất Thành, Q.4",
  "isDefault": true
}
```

**API:** [`POST /api/v1/warehouses`](../api-description/master-data/POST_warehouses.md)  
**Bảng:** [`Warehouses`](../database/master-data/Warehouses.md)

---

## 5. Quản lý Đơn vị tính (Units)

```
POST /api/v1/units
{ "name": "Cái", "code": "CAI", "isBaseUnit": true }

POST /api/v1/units
{ "name": "Thùng", "code": "THUNG", "isBaseUnit": false }

POST /api/v1/units
{ "name": "Lốc", "code": "LOC", "isBaseUnit": false }
```

**API:** [`POST /api/v1/units`](../api-description/master-data/POST_units.md)  
**Bảng:** [`Units`](../database/master-data/Units.md)

---

## 6. Quản lý Danh mục sản phẩm (Categories)

Danh mục hỗ trợ cấu trúc phẳng hoặc phân cấp (tùy impl).

```
POST /api/v1/categories
{ "name": "Đồ uống", "code": "DO-UONG" }

POST /api/v1/categories
{ "name": "Nước suối", "code": "NUOC-SUOI", "parentId": 1 }
```

**API:** [`POST /api/v1/categories`](../api-description/master-data/POST_categories.md)  
**Bảng:** [`Categories`](../database/master-data/Categories.md)

---

## 7. Quản lý Sản phẩm (Products)

### 7.1 Tạo sản phẩm

```
POST /api/v1/products
{
  "name": "Nước suối Aquafina 500ml",
  "code": "NS-AQF-500",
  "barcode": "8935049100009",
  "categoryId": 2,
  "baseUnitId": 1,      // Cái (BaseUnit)
  "costPrice": 4500,
  "sellingPrice": 6500,
  "description": "Nước suối đóng chai 500ml",
  "isActive": true
}
```

**API:** [`POST /api/v1/products`](../api-description/master-data/POST_products.md)  
**Bảng:** [`Products`](../database/master-data/Products.md)

### 7.2 Cấu hình quy đổi đơn vị

Sau khi tạo sản phẩm, cần cấu hình các đơn vị bán/mua khác với tỷ lệ chuyển đổi so với BaseUnit.

```
POST /api/v1/products/{id}/unit-conversions
[
  {
    "fromUnitId": 2,      // Lốc
    "toUnitId": 1,        // Cái (BaseUnit)
    "conversionRate": 6   // 1 Lốc = 6 Cái
  },
  {
    "fromUnitId": 3,      // Thùng
    "toUnitId": 1,        // Cái
    "conversionRate": 24  // 1 Thùng = 24 Cái
  }
]
```

**API:** [`POST /api/v1/products/{id}/unit-conversions`](../api-description/master-data/POST_products_{id}_unit-conversions.md)  
**Bảng:** [`ProductUnitConversions`](../database/master-data/ProductUnitConversions.md)

> **BFS Graph:** Hệ thống xây dựng graph từ `ProductUnitConversions` và dùng BFS để tính `ConversionRate` giữa bất kỳ 2 đơn vị nào.

---

## 8. Quản lý Khách hàng (Customers)

```
POST /api/v1/customers
{
  "name": "Công ty TNHH Thương mại ABC",
  "code": "KH-ABC",
  "phone": "0901-234-567",
  "email": "order@abc.vn",
  "address": "456 Nguyễn Huệ, Q.1",
  "taxCode": "0312345678",
  "creditLimit": 50000000,   // hạn mức công nợ
  "paymentTermDays": 30
}
```

**API:** [`POST /api/v1/customers`](../api-description/master-data/POST_customers.md)  
**Bảng:** [`Customers`](../database/master-data/Customers.md)

---

## 9. Quản lý Nhà cung cấp (Suppliers)

```
POST /api/v1/suppliers
{
  "name": "Công ty CP Sản xuất Aquafina VN",
  "code": "NCC-AQF",
  "phone": "028-3456-7890",
  "email": "supply@aquafina.vn",
  "address": "Khu CN Tân Bình",
  "taxCode": "0209876543",
  "paymentTermDays": 45
}
```

**API:** [`POST /api/v1/suppliers`](../api-description/master-data/POST_suppliers.md)  
**Bảng:** [`Suppliers`](../database/master-data/Suppliers.md)

---

## 10. CRUD chung cho tất cả Master Data

Tất cả các entity master data đều hỗ trợ đầy đủ CRUD:

| Entity | GET list | GET by ID | PUT | DELETE |
|---|---|---|---|---|
| Products | `GET /products` | `GET /products/{id}` | `PUT /products/{id}` | `DELETE /products/{id}` |
| Categories | `GET /categories` | `GET /categories/{id}` | `PUT /categories/{id}` | `DELETE /categories/{id}` |
| Units | `GET /units` | `GET /units/{id}` | `PUT /units/{id}` | `DELETE /units/{id}` |
| Warehouses | `GET /warehouses` | `GET /warehouses/{id}` | `PUT /warehouses/{id}` | `DELETE /warehouses/{id}` |
| Branches | `GET /branches` | `GET /branches/{id}` | `PUT /branches/{id}` | `DELETE /branches/{id}` |
| Customers | `GET /customers` | `GET /customers/{id}` | `PUT /customers/{id}` | `DELETE /customers/{id}` |
| Suppliers | `GET /suppliers` | `GET /suppliers/{id}` | `PUT /suppliers/{id}` | `DELETE /suppliers/{id}` |

> **DELETE là soft-delete:** Set `IsDeleted = true` — dữ liệu vẫn giữ nguyên trong DB, EF Global Query Filter tự động ẩn.

---

## 11. Quản lý người dùng (Admin)

```
GET  /api/v1/admin/users           → Danh sách users trong tenant
GET  /api/v1/admin/users/{id}      → Chi tiết user
PUT  /api/v1/admin/users/{id}      → Cập nhật thông tin user
POST /api/v1/admin/users/{id}/roles     → Gán/thay role
POST /api/v1/admin/users/{id}/branches  → Gán/thay chi nhánh
```

> Tạo user mới: dùng `POST /auth/register` rồi admin gán role/branch sau.

---

## 12. Checklist khởi tạo Tenant mới

| Bước | API | Bắt buộc |
|---|---|---|
| 1. Đăng ký tenant | `POST /auth/register` | ✅ |
| 2. Cấu hình roles & permissions | `POST /roles` + `PUT /roles/{id}/permissions` | ✅ |
| 3. Tạo chi nhánh đầu tiên | `POST /branches` | ✅ |
| 4. Tạo kho đầu tiên | `POST /warehouses` | ✅ |
| 5. Tạo đơn vị cơ bản | `POST /units` (BaseUnit) | ✅ |
| 6. Tạo đơn vị phụ | `POST /units` (Lốc, Thùng...) | Tùy chọn |
| 7. Tạo danh mục | `POST /categories` | ✅ |
| 8. Nhập danh sách sản phẩm | `POST /products` + unit-conversions | ✅ |
| 9. Nhập danh sách khách hàng | `POST /customers` | Tùy chọn |
| 10. Nhập danh sách NCC | `POST /suppliers` | Tùy chọn |
| 11. Nhập tồn kho đầu kỳ | `POST /inventory/opening-balance` | Nếu có tồn sẵn |
| 12. Tạo user nhân viên | `POST /auth/register` + gán role | Tùy chọn |

---

## 13. Bảng dữ liệu liên quan

| Bảng | Vai trò |
|---|---|
| [`Users`](../database/master-data/Users.md) | Tài khoản người dùng |
| [`Branches`](../database/master-data/Branches.md) | Cây chi nhánh |
| [`UserBranches`](../database/master-data/UserBranches.md) | Ánh xạ User ↔ Branch |
| [`Warehouses`](../database/master-data/Warehouses.md) | Kho hàng |
| [`Units`](../database/master-data/Units.md) | Đơn vị tính |
| [`Categories`](../database/master-data/Categories.md) | Danh mục sản phẩm |
| [`Products`](../database/master-data/Products.md) | Danh mục sản phẩm |
| [`ProductUnitConversions`](../database/master-data/ProductUnitConversions.md) | Quy đổi đơn vị |
| [`Customers`](../database/master-data/Customers.md) | Danh mục khách hàng |
| [`Suppliers`](../database/master-data/Suppliers.md) | Danh mục NCC |
