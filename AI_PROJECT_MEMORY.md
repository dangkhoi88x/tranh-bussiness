# AI Project Memory — Business Store

> Cập nhật theo source tại nhánh `fe-detail1`, ngày 2026-08-18 (lần trước: 2026-08-05, đã lệch khá xa so với source).  
> Đây là tài liệu bàn giao ngữ cảnh cho AI/lập trình viên tiếp theo. Khi tài liệu và source khác nhau, **source + Flyway migration + test hiện tại là nguồn sự thật cuối cùng**.
>
> Tài liệu này mô tả *ngữ cảnh và ý đồ thiết kế*, không phải trạng thái hoàn thành theo thời gian thực. Trước khi dựa vào mục 15 (đã có / chưa có), hãy đối chiếu nhanh: `ls src/main/resources/db/migration | tail`, `git log --oneline -20`, và route table trong `frontend/src/App.tsx`.

## 1. Project này đang xây cái gì?

Business Store (thương hiệu *bubble memories*) là hệ thống thương mại điện tử cho cửa hàng tranh, khung tranh, photobook đặt làm và dịch vụ in/đóng khung theo yêu cầu.

Sản phẩm không chỉ là một website bán hàng phổ thông. Domain chính phải thể hiện đúng đặc thù cửa hàng tranh:

- Một tác phẩm có thể bán trực tiếp bằng giá/tồn kho của Product.
- Một tác phẩm có thể có nhiều biến thể theo khổ tranh, chất liệu, SKU, giá và tồn kho riêng.
- Khách có thể chọn khung tương thích; tiền khung là phần cộng thêm, tách khỏi giá tranh.
- Khách có thể gửi yêu cầu riêng như làm khung, in và đóng khung, hoặc in ảnh gia đình; nhân viên báo giá rồi chuyển yêu cầu được chấp nhận thành Order bình thường.
- **Photobook là dòng sản phẩm tự dựng riêng, phức tạp nhất hệ thống**: khách tự thiết kế trước khi mua, giá tính theo số trang, sau khi mua thì gửi ảnh và xưởng gửi bản mềm cho khách duyệt (xem mục 14).
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
- `src/main/resources/db/migration`: lịch sử schema V1…V55 (16 migration trong đó thuộc photobook); phải thêm migration mới thay vì sửa migration đã chạy.
- `frontend/src`: **cả storefront công khai và admin/operations** trong cùng một app; `/admin/*` là một chunk `lazy()` riêng.
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

`NotificationType` hiện có 6 giá trị, tất cả đều đã được wire:

| Event | NotificationType | Nơi publish |
|---|---|---|
| `UserRegisteredEvent` | `WELCOME` | `AuthenticationServiceImpl` |
| `OrderPlacedEvent` | `ORDER_PLACED` | `OrderServiceImpl.checkout()` |
| `OrderConfirmedEvent` | `ORDER_CONFIRMED` | `OrderServiceImpl` |
| `OrderShippedEvent` | `ORDER_SHIPPED` | `ShipmentServiceImpl` |
| `CustomOrderQuotedEvent` | `CUSTOM_ORDER_QUOTED` | `CustomOrderRequestServiceImpl` |
| — (tạo trực tiếp, không qua event) | `PHOTOBOOK_PROOF_SENT` | `PhotobookProjectServiceImpl` |

**Khoảng trống đã biết** (xem mục 15): `OrderFulfillmentServiceImpl` không publish event nào và `OrderServiceImpl.cancelOrder()` cũng vậy, nên khách **không nhận được thông báo** khi đơn bị huỷ, giao thành công, hoặc giao thất bại. Đây là lỗ hổng nghiệp vụ chứ không chỉ thiếu tính năng — khách bị giao hàng thất bại hiện không được báo gì.

Pattern bắt buộc giữ:

```text
business transaction COMMIT
  -> @TransactionalEventListener(AFTER_COMMIT)
  -> INSERT notification ON CONFLICT(event_key) DO NOTHING
  -> chỉ khi insert thành công mới gửi email
  -> SMTP failure: log warning, không rollback business transaction
```

Notification query/mutation luôn lọc theo authenticated user ID để không đọc/đánh dấu notification của người khác.

Cảnh báo "đơn mới" cho **admin** là cơ chế tách biệt, không dùng bảng `notifications`: `OrderPlacedEvent` -> `NotificationEventListener` gọi `AdminOrderNotificationPublisher` -> Redis pub/sub -> mỗi instance có `RedisAdminOrderNotificationSubscriber` fan-out xuống SSE client cục bộ (`AdminOrderNotificationStreamService`). Redis pub/sub ở đây là bắt buộc để nhiều instance cùng nhận, không thể thay bằng in-process event.

## 13. Frontend: storefront và admin

`frontend/src/App.tsx` là **một route table duy nhất cho cả storefront công khai lẫn admin**. Đây là điểm tài liệu cũ mô tả sai: storefront đã hoàn chỉnh và chạy được end-to-end, không còn là "chỉ có admin app".

Storefront (tiếng Việt, slug tiếng Việt):

| Route | Chức năng |
|---|---|
| `/` | Trang chủ |
| `/danh-muc/:slug`, `/tranh/:slug` | Danh mục, chi tiết tranh (chọn khổ/khung, thêm giỏ) |
| `/tim-kiem` | Tìm kiếm |
| `/gio-hang`, `/thanh-toan` | Giỏ hàng, checkout (COD, áp coupon) |
| `/don-hang-cua-toi`, `/don-hang-cua-toi/:orderId` | Đơn của tôi, chi tiết + huỷ đơn |
| `/yeu-thich`, `/thong-bao` | Wishlist, notification center |
| `/account`, `/auth`, `/dat-lai-mat-khau` | Tài khoản, đăng nhập/ký, reset mật khẩu |
| `/dat-in` | Đặt in theo yêu cầu (custom order) |
| `/photobook`, `/photobook/:slug` | Catalog và editor photobook |
| `/photobook-cua-toi/:projectId[/sap-xep]` | Dự án photobook của khách, trang sắp xếp |
| `/xem-truoc/:token` | Share preview công khai, không cần đăng nhập |
| `/gioi-thieu`, `/kho-va-gia`, `/lien-he`, `/chinh-sach-*` | Trang tĩnh |

Admin (`/admin/*`, một chunk `lazy()` riêng): `dashboard`, `users`, `categories`, `products`, `materials`, `art-sizes`, `frames`, `orders`, `payments`, `custom-orders`, `shipments`, `promotions`, `photobooks`, `photobook-templates`.

Route và menu đều lọc bằng permission. Dashboard hiển thị:

- doanh thu COD đã thu;
- số đơn tạo mới và đơn cần xử lý;
- COD chờ thu;
- trạng thái đơn;
- mặt hàng/variant sắp hết tồn;
- metric theo ngày trong khoảng chọn.

Không bịa số dashboard: backend aggregate từ Order/Payment/Product. Revenue hiện được định nghĩa theo payment COD thành công, không phải doanh thu dự kiến.

Thiết kế frontend dùng React + TypeScript thuần, chưa có state/query library lớn. Access token được giữ phía frontend, refresh cookie đi kèm credential; wrapper HTTP tự refresh session theo contract hiện tại.

**Nợ kỹ thuật frontend cần biết trước khi sửa** (chi tiết ở mục 15):

- Nhiều page được viết thành **một dòng JSX cực dài** (`NotificationsPage` 3342 ký tự/dòng, `OperationsPages` 3206, `WishlistPage` 3185; 15 file trên 400 ký tự). Diff của những dòng này gần như không review được — một bug stale-state từng ẩn trong đó suốt thời gian dài.
- Còn 15 chỗ dùng `window.prompt/confirm/alert` (`CatalogFilterPage`, `CatalogPages`, `PromotionPages`, `StaffPages`, `OperationsFilterPages`) trong khi phần còn lại đã có modal riêng. Chúng vừa lệch design system vừa chặn test tự động.
- **Không có test component/page nào**: 45 page + 20 component, nhưng chỉ 4 file test và đều thuộc lớp api/data (`http`, `guestCart`, `googleOAuth`, `draft`).

## 14. Photobook

Đây là subsystem lớn nhất và dễ nhầm lẫn nhất: **67 file backend, 13 entity, 16 migration, 29 file frontend, 7 test class**. Bốn khái niệm dưới đây gần giống nhau nhưng **không được gộp**:

| Khái niệm | Bảng | Vòng đời |
|---|---|---|
| `PhotobookDraft` | `photobook_drafts` | State editor trước khi mua, 1 row/user+slug, ghi đè mỗi lần autosave. Chỉ metadata — file ảnh nằm client-side (IndexedDB, `frontend/src/data/photobookDraft.ts`). **Không** bao giờ được order tham chiếu. |
| `PhotobookDesign` | `photobook_designs` (+ `_images`) | Snapshot bất biến đã upload đầy đủ, tạo ngay trước "thêm vào giỏ". `CartItem`/`OrderItem` link tới đây (`photobook_design_id`) để cái đem đi sản xuất đúng bằng cái khách thấy lúc add-to-cart. |
| `PhotobookProject` | `photobook_projects` (+ `PhotobookSpread`/`SpreadSlot`) | Bản ghi sản xuất thật, 1 project/photobook `OrderItem`, tạo tại checkout bởi `PhotobookProjectServiceImpl.openProjectsFor()`. |
| `PhotobookSharePreview` | `photobook_share_previews` (+ `_images`) | Snapshot read-only chia sẻ bằng token, sống 30 ngày, cho người chưa đăng nhập xem. Cùng shape `spreads` JSON với Design nhưng khác vòng đời. |

State machine của project:

```text
AWAITING_PHOTOS -> PHOTOS_SUBMITTED -> PROOF_SENT -> APPROVED
                                          └-> REVISION_REQUESTED (tối đa 2 lần miễn phí) -┘
```

Nếu order item có `PhotobookDesign` kèm theo, project được hydrate thẳng thành spreads/slots/photos và bắt đầu ở `PHOTOS_SUBMITTED`; nếu không, bắt đầu ở `AWAITING_PHOTOS` và khách phải tự upload, sau đó `PhotobookLayoutEngine` tự sinh spread từ template mặc định.

Hai chỗ **bắt buộc sửa cùng lúc**, không được để lệch:

- Layout archetype (`TRAN_DOI`, `DOI_CAN`, `CONTACT_SHEET`, …) phải giống hệt nhau giữa `frontend/src/data/spreadLayouts.ts` và bảng seed `photobook_layouts` — mã layout chọn ở client được dùng thẳng ở server, không có bước dịch.
- Luật `3–4 ảnh/trang` cố ý lặp ở cả hai phía: `frontend/src/api/photobook.ts` (`photoRangeFor()`) và `PhotobookProjectServiceImpl`/`PhotobookDesignServiceImpl`.

`PhotobookSpreadsPayloadValidator` là phần dùng chung giữa Design và SharePreview (parse metadata, đối chiếu image id, giới hạn kích thước).

## 15. Những gì đã có và những gì chưa có

### Đã có

- Backend monolith và PostgreSQL schema V1…V55.
- IAM, JWT/refresh Redis, Google OAuth contract, password reset, RBAC động, rate limit cho endpoint auth.
- Catalog, variant, material, art size, frame, media.
- Cart, wishlist, shipping address.
- Checkout, immutable snapshots, history, stock locking/compensation.
- Promotion preview/reserve/consume/release/expire.
- COD, shipment, atomic fulfillment, refund record + API settle thủ công.
- Custom order end-to-end đến Order.
- **Photobook end-to-end**: draft/design/project/share-preview, layout engine, pricing theo trang, hàng đợi xưởng, gửi proof.
- Notification in-app + email cho 6 loại sự kiện; SSE realtime báo đơn mới cho admin qua Redis pub/sub.
- **Storefront khách hàng hoàn chỉnh** (xem bảng route ở mục 13) — đã verify chạy thật end-to-end.
- Admin/operations đầy đủ, dashboard, quản lý nhân sự và quyền STAFF.
- CI (`.github/workflows/ci.yml`) chạy backend test -> frontend test -> frontend build trên mỗi PR.

### Chưa hoàn thiện / ranh giới trung thực

Xếp theo mức độ nên xử lý trước:

1. **Không có test frontend cho UI.** 45 page + 20 component, 0 test component/page; 4 file test hiện có đều thuộc lớp api/data. Hai bug thật được phát hiện ngày 2026-08-18 (admin không huỷ được đơn `CONFIRMED`; stale state ở `ExistingShipmentCard`) đều là frontend và đều lọt qua CI.
2. **Nợ định dạng che giấu bug.** 15 file frontend + 10 file backend có dòng trên 400 ký tự (tối đa 3342). Bug stale-state nêu trên nằm gọn trong một dòng 3206 ký tự.
3. **Thiếu notification ở nhánh huỷ/giao thành công/giao thất bại** (chi tiết ở mục 12).
4. `window.prompt/confirm/alert` còn 15 chỗ — chặn test tự động và lệch design system.
5. Online payment provider, signed webhook, reconciliation và refund provider thật.
6. Email delivery có retry queue/outbox; hiện failure sau commit chỉ được log. Không có bất kỳ outbox/`@Retryable` nào trong source.
7. E2E browser test xuyên suốt customer checkout -> staff fulfillment. Chưa cài Playwright/Cypress.
8. 27 service backend chưa có unit test (phần lớn là CRUD, rủi ro thấp hơn nhóm order/promotion/photobook vốn đã có test tốt).
9. Production observability sâu, audit log, security hardening, deployment guide hoàn chỉnh.

Không gọi dự án là production-ready cho tới khi các phần payment/webhook/reconciliation, email retry/outbox, E2E và operational hardening được xử lý.

## 16. Roadmap hợp lý

> Ưu tiên #1 của bản roadmap cũ ("hoàn thiện storefront") **đã xong**. Thứ tự dưới đây được viết lại ngày 2026-08-18.

1. **Chống hồi quy frontend** — gộp ba việc cùng gốc: viết test cho các luồng admin hay đổi trạng thái nhất (order transition, shipment transition, promotion form); chạy Prettier trên đúng file đang sửa để tách các dòng nghìn ký tự (không format cả repo một lượt, tránh diff khổng lồ nuốt lịch sử git); thay `window.confirm/prompt` bằng modal có sẵn để mở khoá test tự động. Đây là chỗ vừa phát sinh 2 bug thật.
2. **Bổ sung notification còn thiếu** cho huỷ đơn / giao thành công / giao thất bại. Việc nhỏ, giá trị nghiệp vụ cao: pattern `AFTER_COMMIT` + `ON CONFLICT(event_key)` đã có sẵn, chỉ cần thêm event + enum theo khuôn `OrderShippedEvent`.
3. Thêm E2E cho luồng customer checkout -> staff confirm -> COD/shipment -> delivery success/failure.
4. Chọn và tích hợp online payment theo server-authoritative flow: signed webhook, amount/currency/order validation, idempotency, reconciliation.
5. Hoàn thiện refund processor và trạng thái provider.
6. Thêm durable outbox/retry cho notification/email.
7. Observability, audit log, backup/restore và production deployment.

Lý do để payment (mục 4) sau lưới an toàn test: đây là hạng mục lớn và rủi ro nhất, không nên làm khi frontend chưa có test hồi quy nào.

Không nên tách microservice trước khi các invariant trên được test chắc. Nếu scale thực tế xuất hiện, boundary tự nhiên có thể là media, notification hoặc payment integration; Order/Promotion/Inventory vẫn cần chiến lược consistency rõ ràng trước khi tách.

## 17. Quy tắc cho AI tiếp tục code

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

## 18. Checklist xác minh

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

## 19. Source map để bắt đầu nhanh

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
- Photobook production: `service/impl/PhotobookProjectServiceImpl.java`, `service/impl/PhotobookLayoutEngine.java`
- Photobook design/share: `service/impl/PhotobookDesignServiceImpl.java`, `service/impl/PhotobookSharePreviewServiceImpl.java`, `service/impl/PhotobookSpreadsPayloadValidator.java`
- Photobook pricing: `service/impl/PhotobookPricing.java`, `service/impl/PhotobookPagePricingServiceImpl.java`
- Layout vocab phải khớp server: `frontend/src/data/spreadLayouts.ts` ↔ bảng seed `photobook_layouts`
- **Toàn bộ route (storefront + admin)**: `frontend/src/App.tsx`
- Admin layout: `frontend/src/components/AdminLayout.tsx`
- Auth frontend: `frontend/src/contexts/AuthContext.tsx`, `frontend/src/api/http.ts`
- Photobook draft client-side: `frontend/src/data/photobookDraft.ts`, `frontend/src/api/photobook.ts`
- Schema truth: `src/main/resources/db/migration/`

## 20. Tóm tắt một đoạn cho AI

Đây là Java 21/Spring Boot modular monolith cho shop tranh, đóng khung và photobook đặt làm, dùng PostgreSQL/Flyway (V1…V55), Redis cho token state và pub/sub, Cloudinary cho media, Mailpit/SMTP cho mail, React/Vite cho cả storefront lẫn admin trong một app. Hệ thống ưu tiên server authority, immutable order snapshot, pessimistic locking/atomic quota, state transition rõ ràng, RBAC theo permission và idempotent side effects. Đã có đầy đủ: catalog/variant/frame, cart/wishlist, checkout/order, promotion, COD/shipment/fulfillment, custom order, photobook end-to-end, notification, dashboard, storefront khách hàng và admin operations. Phần còn thiếu đáng kể nhất **không phải tính năng mà là lưới an toàn**: frontend chưa có test component/page nào dù bug thật gần đây đều nằm ở frontend, chưa có E2E, chưa có online payment/outbox email, và thiếu notification ở nhánh huỷ/giao-thành-công/giao-thất-bại. Mọi thay đổi phải giữ Flyway ownership, transaction/compensation, ownership/authorization và phải được xác minh bằng test + runtime phù hợp, không chỉ compile.
