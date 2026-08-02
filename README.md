# Business Store

## Cart

Cart belongs to the authenticated user. A cart item may optionally select a compatible `productFrameOption`; its displayed unit price is the current product price plus that option's price adjustment. Adding the same product and frame selection again increases its quantity.

- `GET /api/v1/cart` - get the current user's cart.
- `POST /api/v1/cart/items` - add an item. Body: `productId`, optional `productFrameOptionId`, and `quantity`.
- `PUT /api/v1/cart/items/{itemId}` - replace an item's quantity.
- `DELETE /api/v1/cart/items/{itemId}` - remove one item.
- `DELETE /api/v1/cart` - remove all items from the current cart.

Backend Spring Boot cho website bán tranh, khung tranh và dịch vụ đặt theo yêu cầu. Dự án đang tổ chức theo **package by layer** với package gốc `com.example.businessstore`.

## Yêu cầu

- Java 21
- Docker Desktop (để chạy PostgreSQL cục bộ)

## Chạy cục bộ

```bash
docker compose up -d
./mvnw spring-boot:run
```

Trên Windows PowerShell, dùng `./mvnw.cmd spring-boot:run`. API mặc định chạy ở `http://localhost:8080`; health check là `GET /actuator/health`.

PostgreSQL local dùng database `art_store`, user `art_store`, password `art_store_dev`; Redis chạy tại cổng `6379`. Mailpit nhận email local tại SMTP `localhost:1025` và cho xem thư tại `http://localhost:8025`. Các giá trị production phải cấu hình bằng biến môi trường; xem `.env.example`.

## IAM

- Access token là JWT ngắn hạn gửi trong header `Authorization: Bearer <token>`.
- Refresh token là JWT dài hạn đặt trong cookie `HttpOnly`, được whitelist và xoay vòng trong Redis.
- RBAC dùng các bảng `iam_roles`, `iam_user_roles`, `iam_permissions` và `iam_role_permissions`; một user có thể có nhiều role.
- Role mặc định gồm `CUSTOMER`, `STAFF`, `ADMIN`. JWT mang cả authority `ROLE_*` và permission của các role.
- `POST /api/v1/auth/logout` thu hồi refresh token và blacklist access token đến khi token hết hạn.
- Google OAuth dùng `POST /api/v1/auth/google` với authorization code; cần `GOOGLE_OAUTH_CLIENT_ID` và `GOOGLE_OAUTH_CLIENT_SECRET`.
- Quên mật khẩu dùng `POST /api/v1/auth/password/forgot` và `POST /api/v1/auth/password/reset`; cần SMTP qua các biến `MAIL_*`.

## Product media

Ảnh sản phẩm được upload từ backend lên Cloudinary. Khai báo `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET` trong môi trường trước khi gọi upload. Backend chỉ chấp nhận JPEG, PNG hoặc WebP, tối đa 10 MB mỗi file.

- `POST /api/v1/products/{productId}/images` (`multipart/form-data`, field `file`) — cần `PRODUCT_MANAGE`.
- `GET /api/v1/products/{productId}/images` — chỉ ảnh của Product đã PUBLISHED.
- `PATCH /api/v1/products/{productId}/images/{imageId}` — cập nhật alt text, thứ tự hoặc ảnh chính.
- `DELETE /api/v1/products/{productId}/images/{imageId}` — xóa database và Cloudinary.

## Frames

Khung tranh có vật liệu, màu, bề rộng (mm), giá cộng thêm và trạng thái `ACTIVE`/`INACTIVE`.

- `GET /api/v1/frames`, `GET /api/v1/frames/{id}`, `GET /api/v1/frames/slug/{slug}` — public, chỉ frame ACTIVE.
- `POST`, `PUT`, `DELETE /api/v1/frames/{id}` — cần `FRAME_MANAGE`.
- `POST /api/v1/frames/{id}/image` (`multipart/form-data`, field `file`) và `DELETE /api/v1/frames/{id}/image` — cần `FRAME_MANAGE`.

## Product frame options

Mỗi Product có thể khai báo các khung tương thích và giá cộng thêm riêng. Nếu không truyền `priceAdjustment` khi tạo option, hệ thống dùng giá cộng thêm mặc định của Frame.

- `GET /api/v1/products/{productId}/frame-options` — public, chỉ Product PUBLISHED, Frame ACTIVE và option available.
- `GET /api/v1/products/management/{productId}/frame-options` — cần `FRAME_MANAGE`.
- `POST`, `PUT`, `DELETE /api/v1/products/{productId}/frame-options` — cần `FRAME_MANAGE`.

## Cấu trúc

- `frontend/`: nơi đặt ứng dụng giao diện; `node_modules` được tạo sau khi cài dependency và không commit.
- `src/main/java/com/example/businessstore/`: mã backend theo layer.
- `src/main/resources/db/migration/`: Flyway migrations.
- `architecture.md`: quy ước dependency giữa các layer.
