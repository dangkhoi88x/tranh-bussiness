# Business Store

## Cart

Cart belongs to the authenticated user. When a product has variants, the customer must select a `productVariantId`; unit price and available quantity then come from that variant, not the parent product. A cart item may optionally select a compatible `productFrameOption`; its displayed unit price is the product or variant price plus that option's price adjustment. Adding the same product, variant and frame selection again increases its quantity.

- `GET /api/v1/cart` - get the current user's cart.
- `POST /api/v1/cart/items` - add an item. Body: `productId`, required `productVariantId` when the product has variants, optional `productFrameOptionId`, and `quantity`.
- `PUT /api/v1/cart/items/{itemId}` - replace an item's quantity.
- `DELETE /api/v1/cart/items/{itemId}` - remove one item.
- `DELETE /api/v1/cart` - remove all items from the current cart.

## Wishlist

Wishlist is fully server-authoritative for authenticated users. A user may save a whole Product or one exact ProductVariant; the two intents are distinct, but the database prevents duplicate generic or duplicate variant entries even when requests are retried concurrently. The response includes the current Product, selected variant and primary image so the frontend can render saved-product cards directly.

- `GET /api/v1/wishlist` — get the authenticated user's current wishlist.
- `POST /api/v1/wishlist` — body: required `productId`, optional `productVariantId`. Only a published Product and an available variant belonging to it can be saved.
- `DELETE /api/v1/wishlist/{itemId}` — remove only an item owned by the authenticated user.

## Notifications

The backend creates a durable, per-user in-app notification and sends a plain-text email after a new password or Google account is committed. When staff confirms an order, it creates one `ORDER_CONFIRMED` notification and email for the owner. Notification event keys are unique, so a retried event cannot create or email duplicate welcome/order-confirmed messages. SMTP failures are logged after the business transaction has committed; they do not roll back account creation or order confirmation.

- `GET /api/v1/notifications` — authenticated user's notifications, newest first.
- `GET /api/v1/notifications/unread-count` — current unread count.
- `PATCH /api/v1/notifications/{id}/read`, `PATCH /api/v1/notifications/read-all` — mark only the current user's notifications as read.

## Orders

Checkout creates an immutable purchase snapshot from the authenticated user's cart: product, variant (ID/SKU/name/material/dimensions/price), frame and selected delivery address are retained. The matching product or variant stock row is pessimistically locked and decremented in the same transaction; cancelling an eligible order restores that same stock row. The backend calculates `totalAmount = subtotalAmount - discountAmount + shippingFee`; it never accepts price or discount values from the client. The cart is cleared only after the order and optional coupon reservation are persisted.

- `POST /api/v1/orders/checkout` — create a `PENDING` order. Body: required `shippingAddressId` and optional `couponCode`.
- `GET /api/v1/orders/my-orders`, `GET /api/v1/orders/my-orders/{id}` — authenticated customer's orders only.
- `GET /api/v1/orders/my-orders/{id}/history` — status and payment/shipment events for the owning customer only.
- `PUT /api/v1/orders/my-orders/{id}/cancel` — customer may cancel only `PENDING` or `CONFIRMED`; stock is restored.
- `GET /api/v1/orders`, `GET /api/v1/orders/{id}`, `GET /api/v1/orders/{id}/history`, `PUT /api/v1/orders/{id}/status` — requires `ORDER_MANAGE`. Status updates accept an optional `note` and are stored with the actor and timestamp.

## Shipping addresses

Customers manage their own delivery-address book. A user may have one default address, but deleting or editing an address never changes its snapshot on a previous order.

- `POST /api/v1/shipping-addresses`, `GET /api/v1/shipping-addresses`
- `PUT /api/v1/shipping-addresses/{id}`, `DELETE /api/v1/shipping-addresses/{id}`

## Promotions and coupons

A Promotion owns one coupon code, a percentage or fixed-amount rule, an active period, global/per-user quotas, and optional Category/Product/ProductVariant scopes. An empty scope list is stored explicitly as `appliesToAll`; deleting a scoped catalog target cannot accidentally turn a campaign into a store-wide coupon. Product and variant discounts apply to the base artwork price, while a selected frame adjustment remains outside the eligible subtotal.

Checkout reserves quota atomically for 30 minutes by default. Confirming the Order consumes the reservation; cancelling it releases either reserved or consumed quota. A scheduled expiry cancels a still-`PENDING` Order, restores its exact product/variant stock, cancels a pending COD payment and marks the usage `EXPIRED`. The Order snapshots promotion ID, code and discount, while staff can inspect the full usage list.

- `POST /api/v1/promotions/preview` — authenticated customer previews a coupon against the current server-side Cart. Body: `{ "couponCode": "..." }`.
- `POST /api/v1/promotions`, `PUT`/`DELETE /api/v1/promotions/{id}` and `PATCH /api/v1/promotions/{id}/status` — require `PROMOTION_MANAGE`.
- `GET /api/v1/promotions`, `GET /api/v1/promotions/{id}`, `GET /api/v1/promotions/{id}/usages` — require `PROMOTION_MANAGE`.
- `PROMOTION_RESERVATION_TTL` and `PROMOTION_EXPIRY_SCAN_MS` configure reservation duration and expiry polling.

## Payments

The first supported method is COD. A customer creates one pending COD payment for an order; staff may mark it paid only once the order is `DELIVERED`. A shipment can be created only for a `CONFIRMED` order with a pending COD payment; its shipping fee updates both `Order.totalAmount` and the pending COD amount. Cancelling an eligible order automatically changes its pending COD payment to `CANCELLED`. This does not yet include an online payment provider.

- `POST /api/v1/orders/{orderId}/payments` — body: `{ "method": "COD" }`.
- `GET /api/v1/payments/my-payments`, `GET /api/v1/payments/my-payments/{id}` — authenticated customer's payments only.
- `GET /api/v1/payments`, `PUT /api/v1/payments/{id}/cod/confirm` — requires `PAYMENT_MANAGE`.

## Custom framing and printing requests

Customers can ask for a bespoke frame, a print-and-frame service, or a family-photo print. Each request records dimensions, material, an optional frame, reference images, a quoted price and a separate production workflow. When the customer accepts a quote, the backend requires a delivery address and creates a normal `PENDING` Order linked through `orderId`; the Order snapshots the custom dimensions, material, selected frame and quoted price in `customDetails`, so the existing Payment and Shipment APIs work without a separate flow.

- `POST /api/v1/custom-order-requests` — create a request with type `FRAME_ONLY`, `PRINT_AND_FRAME`, or `FAMILY_PHOTO`.
- `GET /api/v1/custom-order-requests/mine`, `GET /api/v1/custom-order-requests/mine/{id}` — customer's requests only.
- `POST /api/v1/custom-order-requests/mine/{id}/images` (`multipart/form-data`, field `file`) — upload a reference image while request is `NEW`.
- `PUT /api/v1/custom-order-requests/mine/{id}/quote-decision` — body `{ "accepted": true, "shippingAddressId": "..." }` creates the linked Order; `{ "accepted": false }` declines and cancels the request.
- `GET /api/v1/custom-order-requests`, `PUT /api/v1/custom-order-requests/{id}/quote` — requires `CUSTOM_ORDER_MANAGE`. The workflow is `NEW → QUOTED → CONFIRMED → IN_PRODUCTION → COMPLETED`; only the customer can accept or decline a quote.

New custom reference images are uploaded with Cloudinary delivery type `authenticated`. The API generates a signed URL only after ownership or staff authorization; it does not store a reusable public URL. Legacy images already uploaded as public assets remain marked as legacy and should be re-uploaded if they need the same protection.

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

### Chạy database bằng Docker

1. Copy `.env.example` thành `.env` (có thể giữ các giá trị development mặc định).
2. Chỉ khởi động PostgreSQL: `docker compose up -d postgres`.
3. Kiểm tra database đã sẵn sàng: `docker compose ps` hoặc `docker compose logs -f postgres`.

PostgreSQL được lưu trong Docker volume `postgres_data`, nên `docker compose down` không xóa dữ liệu. Chỉ dùng `docker compose down -v` khi muốn xóa toàn bộ dữ liệu local và chạy lại Flyway từ đầu.

PostgreSQL local dùng database `art_store`, user `art_store`, password `art_store_dev`; Redis chạy tại cổng `6379`. Mailpit nhận email local tại SMTP `localhost:1025` và cho xem thư tại `http://localhost:8025`. Các giá trị production phải cấu hình bằng biến môi trường; xem `.env.example`.

### Dữ liệu development

Với profile `dev`, ứng dụng tự tạo dữ liệu mẫu theo cách idempotent: 3 category, 3 frame, 4 product đã publish, variant, ảnh placeholder và lựa chọn khung. Tài khoản quản trị local là `admin@tranh.local` / `Admin@123456`; có thể đổi bằng `APP_SEED_ADMIN_EMAIL` và `APP_SEED_ADMIN_PASSWORD`.

Seed chỉ chạy trong `dev` và có thể tắt bằng `APP_SEED_ENABLED=false`. Không có dữ liệu mẫu nào được chạy trong profile `prod`.

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

## Product catalog search and filters

`GET /api/v1/products` remains public and backward-compatible with `categoryId`, `page`, and `size`. It now accepts an optional `keyword` (matched case- and accent-insensitively against product name and description), `minPrice`, `maxPrice`, `material`, `widthCm`, `heightCm`, and `sort`.

- `sort` is one of `NEWEST` (default), `PRICE_ASC`, `PRICE_DESC`, or `BEST_SELLING`.
- `minPrice` and `maxPrice` form an inclusive price range; `widthCm` and `heightCm` are exact dimensions.
- For a Product with variants, price/material/size conditions must match one available ProductVariant. A Product without variants is matched by its base price and dimensions; it cannot match a material filter.
- Price sorting uses the lowest available variant price when variants exist. Best-selling sorting sums quantities from `DELIVERED` orders only.

Example: `GET /api/v1/products?keyword=son%20dau&material=Canvas&widthCm=60&heightCm=90&minPrice=500000&maxPrice=2500000&sort=PRICE_ASC`

## Frames

Khung tranh có vật liệu, màu, bề rộng (mm), giá cộng thêm và trạng thái `ACTIVE`/`INACTIVE`.

- `GET /api/v1/frames`, `GET /api/v1/frames/{id}`, `GET /api/v1/frames/slug/{slug}` — public, chỉ frame ACTIVE.
- `POST`, `PUT`, `DELETE /api/v1/frames/{id}` — cần `FRAME_MANAGE`.
- `POST /api/v1/frames/{id}/image` (`multipart/form-data`, field `file`) và `DELETE /api/v1/frames/{id}/image` — cần `FRAME_MANAGE`.

## Product variants

A product can expose independent print sizes and materials, each with its own SKU, price and stock. These variants are now used by Cart and Order: a variant product requires a selection, and frame compatibility is checked against its width and height.

- `GET /api/v1/products/{productId}/variants` — public variants for a published product.
- `GET /api/v1/products/management/{productId}/variants`, `POST`, `PUT`, `DELETE /api/v1/products/{productId}/variants` — requires `PRODUCT_MANAGE`.

## Shipments

Staff create one shipment for a confirmed order with pending COD payment, then update the carrier lifecycle. `IN_TRANSIT` moves the order to `SHIPPING`; `DELIVERED` moves it to `DELIVERED`; `DELIVERY_FAILED` moves it to `DELIVERY_FAILED`. Delivered or cancelled shipments cannot be changed, and orders cannot be cancelled once shipping has begun.

- `POST /api/v1/orders/{orderId}/shipment`, `GET /api/v1/orders/{orderId}/shipment`, `PUT /api/v1/shipments/{id}/status` — requires `SHIPMENT_MANAGE`.
- `GET /api/v1/orders/my-orders/{orderId}/shipment` — owning customer only.

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

## SEO và chia sẻ sản phẩm

Production storefront phải chạy prerender sau khi API catalogue publish đã sẵn sàng:

```bash
cd frontend
SEO_API_BASE=https://api.example.com/api/v1 \
SEO_SITE_URL=https://shop.example.com \
npm run seo:prerender
```

Lệnh này tạo HTML có Open Graph/JSON-LD cho từng `/tranh/:slug` và `/danh-muc/:slug`, cùng `sitemap.xml` và `robots.txt` trong `frontend/dist`. Web server phải ưu tiên file route đã tạo (ví dụ `/tranh/<slug>/index.html`) trước fallback SPA; nếu luôn trả về `index.html`, crawler mạng xã hội chỉ thấy metadata chung của trang chủ.
