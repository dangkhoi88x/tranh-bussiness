# AI Project Memory — Business Store

> Cập nhật theo source tại nhánh `main`, ngày 2026-08-05.  
> Đây là tài liệu bàn giao ngữ cảnh cho AI/lập trình viên tiếp theo. Khi tài liệu và source khác nhau, **source + Flyway migration + test hiện tại là nguồn sự thật cuối cùng**.

## 1. Project này đang xây cái gì?

Business Store là hệ thống thương mại điện tử cho cửa hàng tranh, khung tranh và dịch vụ đặt tranh/đóng khung theo yêu cầu.

Sản phẩm không chỉ là một website bán hàng phổ thông. Domain chính phải thể hiện đúng đặc thù cửa hàng tranh:

- Một tác phẩm có thể bán trực tiếp bằng giá/tồn kho của Product.
- Một tác phẩm có thể có nhiều biến thể theo khổ tranh, chất liệu, SKU, giá và tồn kho riêng.
- Khách có thể chọn khung tương thích; tiền khung là phần cộng thêm, tách khỏi giá tranh.
- Khách có thể gửi yêu cầu riêng như làm khung, in và đóng khung, hoặc in ảnh gia đình; nhân viên báo giá rồi chuyển yêu cầu được chấp nhận thành Order bình thường.
- Cửa hàng vận hành đơn, COD, giao hàng, coupon, tồn kho, nhân sự và dashboard trong cùng một hệ thống.

Mục tiêu hiện tại là một **modular monolith thực dụng**, đủ chặt về transaction, phân quyền và tính nhất quán dữ liệu. Không chia microservice chỉ để tăng số lượng service.

## 2. Tư duy sản phẩm và nguyên tắc thiết kế

Các nguyên tắc dưới đây quan trọng hơn việc thêm nhanh endpoint mới:

1. **Backend là nguồn sự thật.** Giá, giảm giá, phí giao hàng, tổng tiền, tồn kho, quyền và trạng thái nghiệp vụ không được tin từ client.
2. **Đơn hàng là ảnh chụp lịch sử.** Tên, SKU, chất liệu, kích thước, giá, khung và địa chỉ giao hàng phải được snapshot để dữ liệu cũ không đổi khi catalog/address thay đổi.
3. **Một hành động nghiệp vụ phải nhất quán trong một transaction.** Checkout, giữ coupon, trừ/hoàn tồn kho, chuyển trạng thái, COD và shipment phải khóa đúng bản ghi và có compensation phù hợp.
4. **Retry không được tạo tác dụng phụ trùng.** Dùng unique constraint, conditional update, idempotency key hoặc `ON CONFLICT DO NOTHING` khi một request/event có thể chạy lại.
5. **Thông báo không được làm hỏng giao dịch chính.** Account/order commit trước; notification/email chạy `AFTER_COMMIT`. SMTP lỗi chỉ được log, không rollback đăng ký hoặc xác nhận đơn.
6. **Schema do Flyway sở hữu.** Hibernate luôn `ddl-auto: validate`; không dùng `update`, không sửa DB thủ công để thay cho migration.
7. **Phân quyền theo permission, không hard-code role vào từng tính năng.** Role gom permission; endpoint quản trị dùng `@PreAuthorize` với authority cụ thể.
8. **Không trả JPA entity trực tiếp.** Controller nhận request DTO, service xử lý nghiệp vụ, response trả DTO chuẩn.
9. **Không copy nguyên kiến trúc microservice từ project khác.** Có thể học pattern đã chứng minh hiệu quả, nhưng phải chuyển thành dependency nội bộ phù hợp monolith này.
10. **Không tuyên bố production-ready khi mới compile.** Phải phân biệt compile, unit test, PostgreSQL/Flyway integration test và browser/runtime verification.

## 3. Stack và cấu trúc

- Backend: Java 21, Spring Boot 4.1, Spring MVC, Spring Data JPA, Spring Security, OAuth2 Resource Server, Bean Validation.
- Database: PostgreSQL 17; schema migration bằng Flyway.
- Trạng thái tạm IAM: Redis 7.4.
- Email local: Mailpit (`SMTP 1025`, UI `8025`).
- Media: Cloudinary; ảnh sản phẩm JPEG/PNG/WebP, tối đa mặc định 10 MB.
- Frontend: React 19, TypeScript, Vite 5, React Router.
- Test: JUnit/Mockito/Spring test; Testcontainers được dùng cho phần cần PostgreSQL thật.

Backend tổ chức theo package-by-layer:

```text
controller -> service interface -> service/impl -> repository -> entity -> PostgreSQL
     |                    |
 request/response DTO     events / external infrastructure
```

Các thư mục quan trọng:

- `src/main/java/com/example/businessstore/controller`: HTTP contract.
- `service` và `service/impl`: luật nghiệp vụ và transaction boundary.
- `repository`: query, pessimistic lock, conditional mutation.
- `entity`: domain persistence model.
- `constant`: state machine/permission/domain enum.
- `security`: JWT, CORS, cookie, authentication/authorization.
- `src/main/resources/db/migration`: lịch sử schema V1…V36; phải thêm migration mới thay vì sửa migration đã chạy.
- `frontend/src`: admin web app hiện tại.
- `src/test`: unit/security/migration test.

## 4. Hạ tầng và cách chạy local

Các service local:

| Thành phần | Địa chỉ/cổng mặc định | Vai trò |
|---|---:|---|
| Backend | `http://localhost:8080` | REST API |
| Frontend | `http://localhost:5173` | Vite React |
| PostgreSQL | `localhost:5432/art_store` | dữ liệu bền vững |
| Redis | `localhost:6379` | refresh whitelist, access blacklist, reset token |
| Mailpit UI | `http://localhost:8025` | xem email local |
| Mailpit SMTP | `localhost:1025` | nhận email local |

Khởi động cơ bản:

```bash
cp .env.example .env
docker compose up -d postgres redis mailpit
sh mvnw spring-boot:run
cd frontend && npm install && npm run dev
```

Lưu ý:

- File `mvnw` có thể không executable; dùng `sh mvnw ...`.
- Profile mặc định là `dev`; seed dữ liệu chỉ chạy ở dev và có thể tắt bằng `APP_SEED_ENABLED=false`.
- Admin local mặc định được mô tả trong `README.md`/`.env.example`; không sao chép credential development sang production.
- `docker compose down` giữ volume. Chỉ `down -v` khi người dùng thật sự muốn xóa DB local.
- Production bắt buộc truyền DB, Redis, JWT, CORS, SMTP và Cloudinary qua biến môi trường; cookie secure mặc định true ở profile prod.

## 5. Identity, authentication và RBAC

Luồng đăng nhập:

- Access token là JWT ngắn hạn, gửi bằng `Authorization: Bearer ...`.
- Refresh token là JWT dài hạn trong cookie `HttpOnly`; Redis whitelist token và rotate khi refresh.
- Logout thu hồi refresh token và blacklist access token đến lúc hết TTL.
- Hỗ trợ đăng ký bằng password, Google authorization code, forgot/reset password.
- Khi account bị khóa hoặc role/permission thay đổi, backend đọc authority hiện tại từ DB khi xác thực JWT; frontend cũng đồng bộ `/api/v1/users/me` định kỳ, khi focus và khi authorization thay đổi.

Mô hình RBAC:

```text
User -> UserRole -> Role -> RolePermission -> Permission
```

Role chuẩn: `CUSTOMER`, `STAFF`, `ADMIN`.

Permission hiện có:

- `DASHBOARD_VIEW`
- `USER_MANAGE`
- `CATEGORY_MANAGE`
- `PRODUCT_MANAGE`
- `FRAME_MANAGE`
- `ORDER_MANAGE`
- `PAYMENT_MANAGE`
- `CUSTOM_ORDER_MANAGE`
- `SHIPMENT_MANAGE`
- `PROMOTION_MANAGE`

Admin có khu vực quản lý user, khóa/mở tài khoản, gán role và cấu hình permission cho STAFF. Không cho người dùng tự đổi quyền của chính mình qua UI quản trị.

## 6. Mô hình catalog

### Product

- Trạng thái: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- Product không có variant dùng trực tiếp price, size và stock ở Product.
- Product có variant yêu cầu người mua chọn variant; tồn kho và giá lấy từ variant.
- Public catalog chỉ trả sản phẩm được publish.

### ProductVariant

Mỗi variant có SKU, tên, khổ, chất liệu, giá, tồn kho và cờ available. Variant phải thuộc đúng Product; Cart/Order không được nhận một variant của Product khác.

### Material và ArtSize

- Material là catalog chuẩn hóa; scope gồm `ARTWORK_SURFACE` và `FRAME`.
- ArtSize chuẩn hóa khổ tranh; variant có thể liên kết một ArtSize thay vì lưu khổ tùy ý không kiểm soát.

### Frame và ProductFrameOption

- Frame có vật liệu, màu, bề rộng, ảnh, giá cộng mặc định và trạng thái active/inactive.
- ProductFrameOption nối Product với Frame, có thể override price adjustment và khai báo khoảng kích thước tương thích.
- Khi chọn variant, option khung phải tương thích với kích thước variant.
- Tiền khung không nằm trong eligible artwork subtotal khi tính promotion.

### Search/filter

Public `GET /api/v1/products` hỗ trợ category, keyword bỏ dấu/không phân biệt hoa thường, price range, material, width/height và sort:

- `NEWEST`
- `PRICE_ASC`
- `PRICE_DESC`
- `BEST_SELLING` — chỉ tính quantity từ Order `DELIVERED`.

Với Product có variant, các điều kiện giá/chất liệu/kích thước phải cùng khớp trên **một variant available**, không được ghép dữ liệu từ nhiều variant khác nhau.

## 7. Cart và Wishlist

### Cart

- Cart thuộc authenticated user.
- Identity của CartItem là tổ hợp Product + optional Variant + optional FrameOption.
- Thêm lại cùng lựa chọn sẽ tăng quantity.
- Giá hiển thị = giá Product/Variant + frame adjustment.
- Backend kiểm tra publish status, variant ownership/availability, frame compatibility và stock.

### Wishlist

- Wishlist là server-authoritative.
- Save toàn Product và save một Variant cụ thể là hai ý định khác nhau.
- DB ngăn duplicate generic item và duplicate variant item, kể cả retry đồng thời.
- Response có Product, selected variant và primary image để frontend render card.

## 8. Luồng Order chuẩn

Luồng chính:

```text
Cart
  -> checkout
  -> lock Product/Variant stock
  -> snapshot item + shipping address
  -> decrement stock
  -> optional coupon reservation
  -> Order PENDING
  -> staff CONFIRMED
  -> coupon CONSUMED + welcome/order notification event
  -> create pending COD payment
  -> create shipment READY
  -> shipment IN_TRANSIT, Order SHIPPING
  -> complete delivery atomically
  -> Shipment DELIVERED + Payment SUCCESS + Order DELIVERED
```

Order state enum:

```text
PENDING -> CONFIRMED -> PROCESSING -> SHIPPING -> DELIVERED
                                      └-------> DELIVERY_FAILED
PENDING/CONFIRMED -> CANCELLED
```

Thực tế service giới hạn transition theo use case, không cho client tùy ý nhảy state. Các thay đổi trạng thái phải ghi `OrderStatusHistory` với actor, thời gian và note.

Các bất biến checkout:

- Chỉ checkout cart của chính user.
- Shipping address phải thuộc user.
- Không nhận unit price/subtotal/discount/total từ request.
- Lock tồn kho pessimistic trước khi kiểm tra và trừ.
- Snapshot Product/Variant/Frame và địa chỉ giao hàng vào Order/OrderItem.
- `total = subtotal - discount + shippingFee`.
- Cart chỉ được clear sau khi Order và optional promotion usage đã persist thành công.
- Cancel hợp lệ hoàn đúng stock row đã snapshot, release coupon và cancel pending COD.

## 9. Promotion/coupon

Promotion có:

- percentage hoặc fixed amount;
- thời gian hiệu lực;
- min order amount, optional max discount;
- global usage limit và per-user limit;
- scope Category/Product/Variant hoặc applies-to-all rõ ràng.

Điểm rất quan trọng: scope rỗng được lưu với ý nghĩa explicit `appliesToAll`. Khi target catalog bị xóa, không được vô tình biến coupon scoped thành coupon toàn shop.

Quota lifecycle:

```text
preview: chỉ tính toán trên Cart server-side
checkout: atomically reserve quota -> RESERVED (TTL mặc định 30 phút)
order confirmed: RESERVED -> CONSUMED
cancel/failure: RESERVED hoặc CONSUMED -> RELEASED
timeout while order PENDING: usage EXPIRED + order CANCELLED + restore stock + cancel pending COD
```

Không dùng Redis làm correctness mechanism cho quota. PostgreSQL conditional update/lock/constraint mới là lớp bảo vệ chính.

## 10. Payment, shipment, delivery và refund

### Payment

- Hiện chỉ hỗ trợ `COD`.
- Một Order tạo một pending COD theo rule hiện tại.
- Staff không nên confirm COD rời rạc trước khi giao thành công; endpoint fulfillment là đường hoàn tất nguyên tử được ưu tiên.
- Chưa có Stripe/MoMo/VNPay hoặc webhook provider.

### Shipment

- Tạo shipment khi Order `CONFIRMED` và có pending COD.
- Shipping fee cập nhật cả `Order.totalAmount` và amount của pending COD.
- Shipment bắt đầu `READY`; chuyển `IN_TRANSIT` làm Order thành `SHIPPING`.
- Không thay đổi shipment đã delivered/cancelled tùy ý.

### Fulfillment atomic

- Complete delivery yêu cầu Order `SHIPPING` + Shipment `IN_TRANSIT` + COD `PENDING`, rồi cùng transaction đổi Shipment `DELIVERED`, Payment `SUCCESS`, Order `DELIVERED`.
- Delivery failed đổi shipment/order sang failed, cancel pending COD, hoàn stock và release promotion.
- Nếu tương lai có Payment `SUCCESS` nhưng delivery thất bại, hệ thống tạo `PaymentRefund PENDING` bằng idempotency key. Hiện entity/migration đã có nhưng chưa có tích hợp provider để hoàn tiền thật hoặc callback cập nhật `SUCCESS/FAILED`.

## 11. Custom order

Loại yêu cầu:

- `FRAME_ONLY`
- `PRINT_AND_FRAME`
- `FAMILY_PHOTO`

State machine:

```text
NEW -> QUOTED -> CONFIRMED -> IN_PRODUCTION -> COMPLETED
        └---- customer decline -----------------> CANCELLED
```

- Customer tạo request và upload ảnh tham chiếu khi còn `NEW`.
- Staff báo giá; customer là người duy nhất accept/decline.
- Accept quote bắt buộc shipping address và tạo Order `PENDING` liên kết request.
- Order snapshot custom dimensions, material, frame và quoted price để tái dùng Payment/Shipment chuẩn.
- Ảnh custom mới dùng Cloudinary delivery type `authenticated`; API chỉ sinh signed URL sau ownership/permission check. Ảnh legacy public cần re-upload nếu muốn mức bảo vệ tương đương.

## 12. Notification và email

Event hiện có:

- `UserRegisteredEvent` -> in-app `WELCOME` + welcome email.
- `OrderConfirmedEvent` -> in-app `ORDER_CONFIRMED` + email xác nhận đơn.

Pattern bắt buộc giữ:

```text
business transaction COMMIT
  -> @TransactionalEventListener(AFTER_COMMIT)
  -> INSERT notification ON CONFLICT(event_key) DO NOTHING
  -> chỉ khi insert thành công mới gửi email
  -> SMTP failure: log warning, không rollback business transaction
```

Notification query/mutation luôn lọc theo authenticated user ID để không đọc/đánh dấu notification của người khác.

## 13. Dashboard và admin frontend hiện tại

Frontend hiện tại là **admin/operations app**, chưa phải storefront hoàn chỉnh.

Các route chính:

- `/auth`, `/account`
- `/admin/dashboard`
- `/admin/users`
- `/admin/categories`, `/admin/products`, `/admin/materials`, `/admin/art-sizes`, `/admin/frames`
- `/admin/orders`, `/admin/payments`, `/admin/custom-orders`, `/admin/shipments`, `/admin/promotions`

Route và menu đều lọc bằng permission. Dashboard hiển thị:

- doanh thu COD đã thu;
- số đơn tạo mới và đơn cần xử lý;
- COD chờ thu;
- trạng thái đơn;
- mặt hàng/variant sắp hết tồn;
- metric theo ngày trong khoảng chọn.

Không bịa số dashboard: backend aggregate từ Order/Payment/Product. Revenue hiện được định nghĩa theo payment COD thành công, không phải doanh thu dự kiến.

Thiết kế frontend dùng React + TypeScript thuần, chưa có state/query library lớn. Access token được giữ phía frontend, refresh cookie đi kèm credential; wrapper HTTP tự refresh session theo contract hiện tại.

## 14. Những gì đã có và những gì chưa có

### Đã có

- Backend monolith và PostgreSQL schema V1…V36.
- IAM, JWT/refresh Redis, Google OAuth contract, password reset, RBAC động.
- Catalog, variant, material, art size, frame, media.
- Cart, wishlist, shipping address.
- Checkout, immutable snapshots, history, stock locking/compensation.
- Promotion preview/reserve/consume/release/expire.
- COD, shipment, atomic fulfillment, refund record foundation.
- Custom order end-to-end đến Order.
- Persisted notification + email ở hai milestone.
- Admin frontend cho catalog và operations.
- Dashboard và quản lý nhân sự/quyền STAFF.

### Chưa hoàn thiện / ranh giới trung thực

- Storefront/customer UI đầy đủ: catalog mua hàng, product detail cho customer, cart, checkout, wishlist, my orders, notification center.
- Online payment provider, signed webhook, reconciliation và refund provider thật.
- Email delivery có retry queue/outbox; hiện failure sau commit chỉ được log.
- Notification type cho shipping/delivery/payment/custom-order chưa được mở rộng.
- E2E browser test xuyên suốt customer checkout -> staff fulfillment.
- Production observability sâu, rate limiting, audit/security hardening, CI/CD và deployment guide hoàn chỉnh.
- Refund processing API/background worker để đổi `PENDING` thành `SUCCESS/FAILED`.

Không gọi dự án là production-ready cho tới khi các phần payment/webhook/reconciliation, email retry/outbox, E2E và operational hardening được xử lý.

## 15. Roadmap hợp lý

Thứ tự ưu tiên đề xuất:

1. Hoàn thiện storefront/customer UI dựa trên API hiện có.
2. Thêm E2E cho luồng customer checkout -> staff confirm -> COD/shipment -> delivery success/failure.
3. Chọn và tích hợp online payment theo server-authoritative flow: signed webhook, amount/currency/order validation, idempotency, reconciliation.
4. Hoàn thiện refund processor và trạng thái provider.
5. Thêm durable outbox/retry cho notification/email và mở rộng business event.
6. Observability, audit log, rate limit, CI/CD, backup/restore và production deployment.

Không nên tách microservice trước khi các invariant trên được test chắc. Nếu scale thực tế xuất hiện, boundary tự nhiên có thể là media, notification hoặc payment integration; Order/Promotion/Inventory vẫn cần chiến lược consistency rõ ràng trước khi tách.

## 16. Quy tắc cho AI tiếp tục code

Trước khi thay đổi:

1. Đọc `README.md`, `architecture.md`, file service/repository/entity liên quan và migration mới nhất.
2. Chạy `git status --short`; giữ nguyên thay đổi không liên quan của người dùng.
3. Tìm endpoint và contract thật bằng `rg`; không đoán tên route.
4. Xác định state transition, ownership, permission, concurrency và compensation trước khi viết happy path.

Khi thay đổi backend:

- Đặt transaction ở service, read query dùng `readOnly = true`.
- Mutation liên quan stock/quota/order/payment/shipment phải cân nhắc pessimistic lock hoặc atomic SQL.
- Thêm ErrorCode rõ ràng và map qua GlobalExceptionHandler.
- Thêm Flyway migration mới; không sửa migration lịch sử đã áp dụng.
- Bảo vệ ownership ở repository/service, không chỉ ẩn nút trên frontend.
- Thêm unit test cho happy path, invalid transition, ownership, retry/idempotency và compensation.

Khi thay đổi frontend:

- Dùng `/api/v1` qua HTTP wrapper hiện có.
- UI route guard chỉ cải thiện UX; backend permission vẫn là authority thật.
- Chờ mutation server thành công rồi mới báo thành công/cập nhật optimistic state.
- Hiển thị backend error có ích; không che lỗi thật bằng “Something went wrong” chung chung.
- Kiểm tra responsive, loading, empty, error, disabled/busy và forbidden state.

## 17. Checklist xác minh

```bash
# Backend compile
sh mvnw -DskipTests compile

# Backend test; đọc kỹ số passed/skipped
sh mvnw test

# Frontend
cd frontend
npm run build

# Kiểm tra hạ tầng/runtime
docker compose ps
curl -sS http://localhost:8080/actuator/health
```

Nếu Testcontainers bị skip do Docker chưa chạy, phải ghi rõ “test bị skip”; không được biến `BUILD SUCCESS` thành kết luận migration PostgreSQL đã được verify.

Với bug UI/runtime, build pass chưa đủ. Phải chạy đúng backend + frontend, đăng nhập đúng role, tái hiện flow trong browser và kiểm tra response/DB/state sau mutation.

Snapshot xác minh ngày 2026-08-05:

- `sh mvnw test`: **52 tests passed, 0 failed, 0 error, 0 skipped**.
- Docker/Testcontainers hoạt động; PostgreSQL 17.10 đã chạy đủ và validate/apply thành công toàn bộ **36 Flyway migrations** từ empty schema.
- Spring application context khởi động thành công với Hibernate schema validation.
- `frontend/npm run build`: TypeScript và Vite production build thành công.
- Đây vẫn chưa phải browser E2E hoặc production deployment verification.

## 18. Source map để bắt đầu nhanh

- Tổng quan API/chạy local: `README.md`
- Quy ước layer: `architecture.md`
- Cấu hình: `src/main/resources/application*.yaml`, `.env.example`, `docker-compose.yml`
- Security: `security/SecurityConfiguration.java`, `security/*Validator.java`, `constant/SecurityExpressions.java`
- Checkout/order: `service/impl/OrderServiceImpl.java`
- Delivery atomic/refund foundation: `service/impl/OrderFulfillmentServiceImpl.java`
- Promotion: `service/impl/PromotionServiceImpl.java`, `service/impl/PromotionExpirationJob.java`
- Payment/shipment: `service/impl/PaymentServiceImpl.java`, `service/impl/ShipmentServiceImpl.java`
- Notification: `service/impl/NotificationEventListener.java`, `repository/NotificationRepository.java`
- Product filters: `repository/specification/ProductCatalogSpecifications.java`
- Custom request: `service/impl/CustomOrderRequestServiceImpl.java`
- Admin routes: `frontend/src/App.tsx`, `frontend/src/components/AdminLayout.tsx`
- Auth frontend: `frontend/src/contexts/AuthContext.tsx`, `frontend/src/api/http.ts`
- Schema truth: `src/main/resources/db/migration/`

## 19. Tóm tắt một đoạn cho AI

Đây là Java 21/Spring Boot modular monolith cho shop tranh và đóng khung, dùng PostgreSQL/Flyway, Redis cho token state, Cloudinary cho media, Mailpit/SMTP cho mail, React/Vite cho admin UI. Hệ thống ưu tiên server authority, immutable order snapshot, pessimistic locking/atomic quota, state transition rõ ràng, RBAC theo permission và idempotent side effects. Backend đã có catalog/variant/frame, cart/wishlist, checkout/order, promotion, COD/shipment, custom order, notification và dashboard; frontend hiện chủ yếu phục vụ admin, storefront customer và online payment vẫn là phần tiếp theo. Mọi thay đổi phải giữ Flyway ownership, transaction/compensation, ownership/authorization và phải được xác minh bằng test + runtime phù hợp, không chỉ compile.
