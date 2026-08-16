# Flow của Business Store

Bản đồ luồng chạy thật của code, vẽ theo những gì đang có trong `src/` và `frontend/src/`
(không phải theo dự định). Bổ sung cho [`architecture.md`](architecture.md) — bên đó nói *code
nằm ở đâu*, bên này nói *dữ liệu đi qua đâu*.

Mermaid render sẵn trên GitHub. Mục [Bẫy dễ đọc nhầm](#bẫy-dễ-đọc-nhầm) ở cuối ghi những chỗ
sơ đồ trông có vẻ khác thực tế.

---

## 1. Bản đồ tổng thể

```mermaid
flowchart LR
  subgraph FE["Frontend — React + Vite"]
    SF["Storefront<br/>(bundle chính)"]
    AD["Admin /admin/*<br/>(lazy chunk)"]
    PB["Photobook editor<br/>(lazy, nặng nhất)"]
  end

  HTTP["api/http.ts<br/>giữ access token, tự refresh khi 401"]

  subgraph BE["Backend — Spring Boot"]
    CTL[controller]
    SVC["service / service impl<br/>(@Transactional ở đây)"]
    REPO[repository]
    ENT[entity]
  end

  PG[("PostgreSQL<br/>Flyway sở hữu schema")]
  RD[("Redis<br/>token + pub/sub")]
  CDN[("Cloudinary<br/>ảnh & bản mềm")]
  SMTP["SMTP<br/>Mailpit khi dev"]

  SF --> HTTP
  AD --> HTTP
  PB --> HTTP
  HTTP --> CTL --> SVC --> REPO --> ENT --> PG
  SVC --> RD
  SVC --> CDN
  SVC -. "AFTER_COMMIT" .-> SMTP
```

Quy tắc phân lớp: controller chỉ bind DTO và gọi **một** service; ranh giới `@Transactional`
nằm ở service; repository dùng derived query có kèm ownership (`findByIdAndUserId`) thay vì
`findById` rồi tự kiểm sau.

---

## 2. Vòng đời một request

```mermaid
sequenceDiagram
  participant C as Client
  participant F as SecurityFilterChain
  participant M as @PreAuthorize
  participant S as Service
  participant D as PostgreSQL
  participant H as GlobalExceptionHandler

  C->>F: Authorization: Bearer <access>
  F->>F: verify JWT, nạp ROLE_* + permission
  alt không có trong danh sách permitAll
    F-->>C: 401 nếu thiếu/hỏng token
  end
  F->>M: đã xác thực
  M->>M: hasAuthority('ORDER_MANAGE'), ...
  M-->>C: 403 nếu thiếu quyền
  M->>S: gọi nghiệp vụ
  S->>D: đọc/ghi trong một transaction
  S-->>C: DTO response
  S->>H: AppException(ErrorCode, message)
  H-->>C: JSON lỗi + đúng HTTP status
```

Lỗi luôn đi qua `AppException(ErrorCode, message)` → handler tập trung dịch ra status. Thêm
tình huống lỗi mới nghĩa là thêm hằng số vào `ErrorCode`, không ném exception trần.

---

## 3. Mua hàng: giỏ → thanh toán → đơn

Đây là luồng nhiều bất biến nhất. **Backend tính lại toàn bộ**, không tin số từ giỏ.

```mermaid
flowchart TD
  A["Khách bấm Xác nhận đặt hàng"] --> B["POST /orders/checkout"]
  B --> C{"Sản phẩm còn PUBLISHED?"}
  C -- không --> C1["PRODUCT_NOT_AVAILABLE"]
  C -- có --> D{"Sản phẩm có variant?"}
  D -- có, chưa chọn --> D1["PRODUCT_VARIANT_REQUIRED"]
  D -- ok --> E["UPDATE ... WHERE stock_quantity >= :qty<br/>(trừ kho atomic)"]
  E --> F{"đổi được dòng nào không?"}
  F -- 0 dòng --> F1["INSUFFICIENT_PRODUCT_STOCK"]
  F -- 1 dòng --> G["Tính lại giá qua LinePricingService"]
  G --> H["Chụp snapshot vào OrderItem<br/>tên, SKU, kích thước, giá, khung"]
  H --> I{"Có mã giảm giá?"}
  I -- có --> J["promotionService.reserve → RESERVED"]
  I -- không --> K
  J --> K["Lưu Order ở PENDING"]
  K --> L["openProjectsFor: mở PhotobookProject<br/>cho mỗi dòng photobook"]
  L --> M["publish OrderPlacedEvent"]
  M --> N["AFTER_COMMIT: thông báo + email + SSE cho admin"]
```

Ba điểm dễ làm hỏng nếu sửa ẩu:

- **Giá tính lại từ `LinePricingService`**, dùng chung với giỏ hàng và cả preview khuyến mãi —
  lệch một nơi là khách trả sai tiền.
- **`OrderItem` là bản chụp bất biến**: sửa danh mục sau này không được đổi đơn cũ.
- **Trừ kho phải nằm trong chính câu `UPDATE` có điều kiện.** Đọc ra rồi mới trừ *không* an
  toàn kể cả khi đã `SELECT ... FOR UPDATE`, vì entity thường đã nằm trong persistence context
  nên Hibernate trả lại số cũ trong bộ nhớ.

---

## 4. Máy trạng thái đơn hàng

Điều dễ hiểu nhầm nhất: **mỗi mũi tên do một endpoint khác nhau bắn**, không phải một API
"đổi trạng thái" chung.

```mermaid
stateDiagram-v2
  [*] --> PENDING: checkout
  PENDING --> CONFIRMED: PUT /orders/:id/status — chỉ mũi tên này đi qua đây
  CONFIRMED --> SHIPPING: PUT /shipments/:id/status sang IN_TRANSIT
  SHIPPING --> DELIVERED: POST /orders/:id/fulfillment/complete
  SHIPPING --> DELIVERY_FAILED: POST /orders/:id/fulfillment/delivery-failed
  PENDING --> CANCELLED: khách huỷ hoặc hết hạn giữ mã
  CONFIRMED --> CANCELLED: khách huỷ
  DELIVERED --> [*]
  DELIVERY_FAILED --> [*]
  CANCELLED --> [*]
```

`DELIVERED` và `DELIVERY_FAILED` **không** đi qua `PUT /shipments/{id}/status` được, vì hai
bước đó còn đụng cả Payment lẫn Order nên phải là endpoint nguyên tử riêng.

Khi huỷ hoặc giao thất bại: hoàn kho (UPDATE atomic), huỷ khoản COD đang chờ, và trả lại mã
giảm giá.

---

## 5. Vận đơn, thanh toán, hoàn tiền

**Vận đơn**

```mermaid
stateDiagram-v2
  [*] --> READY: tạo — cần đơn CONFIRMED và có COD đang chờ thu
  READY --> IN_TRANSIT: bàn giao cho đơn vị vận chuyển
  READY --> CANCELLED: huỷ bàn giao
  IN_TRANSIT --> DELIVERED: giao thành công
  IN_TRANSIT --> DELIVERY_FAILED: giao thất bại
  CANCELLED --> READY: tạo lại — dùng lại đúng dòng cũ, reset phí và mã vận đơn
```

**Thanh toán** (hiện chỉ có COD)

```mermaid
stateDiagram-v2
  [*] --> PENDING: POST /orders/:id/payments
  PENDING --> SUCCESS: giao thành công hoặc xác nhận đã thu COD
  PENDING --> CANCELLED: huỷ đơn hoặc giao thất bại
```

**Hoàn tiền**

```mermaid
stateDiagram-v2
  [*] --> PENDING: sinh ra khi giao thất bại một đơn ĐÃ thu tiền
  PENDING --> SUCCESS: PUT /payment-refunds/:id/settle
  PENDING --> FAILED: settle kèm lý do bắt buộc
```

Tiền chuyển thật nằm ngoài hệ thống (chuyển khoản/tiền mặt); `settle` chỉ ghi nhận kết quả,
khoá dòng khi chốt và không cho chốt lại khoản đã chốt.

---

## 6. Khuyến mãi: đặt chỗ ba trạng thái

Quota **không** dựa vào Redis. Đúng/sai do Postgres giữ bằng `UPDATE` có điều kiện.

```mermaid
stateDiagram-v2
  [*] --> RESERVED: checkout — UPDATE có điều kiện reserved + used nhỏ hơn usage_limit
  RESERVED --> CONSUMED: xưởng xác nhận đơn
  RESERVED --> RELEASED: huỷ đơn
  RESERVED --> EXPIRED: quá TTL giữ chỗ
  CONSUMED --> [*]
```

Các chốt chặn khi áp mã: còn hiệu lực theo thời gian và `status = ACTIVE`, đạt
`minOrderAmount`, chưa hết `usageLimit` toàn hệ thống, chưa hết `perUserLimit` của người đó,
và mức giảm bị chặn trên bởi `maxDiscountAmount`.

---

## 7. Photobook — bốn khái niệm khác nhau

Đây là phần đồ sộ nhất và rất dễ nhầm lẫn bốn thứ này với nhau.

```mermaid
flowchart TD
  subgraph BEFORE["Trước khi mua"]
    DR["PhotobookDraft<br/>tự lưu, mỗi user + slug một dòng<br/>server chỉ giữ metadata,<br/>file ảnh nằm ở IndexedDB máy khách"]
    SP["PhotobookSharePreview<br/>link công khai theo token, hết hạn 30 ngày"]
    DS["PhotobookDesign<br/>bản chụp bất biến, ảnh đã upload đủ<br/>tạo ngay trước khi thêm vào giỏ"]
  end
  subgraph AFTER["Sau khi mua"]
    PJ["PhotobookProject<br/>hồ sơ sản xuất thật<br/>một dòng cho mỗi OrderItem photobook"]
  end

  DR -. "chỉ để mở lại máy khác" .-> DR
  DR --> SP
  DR --> DS
  DS --> CART["CartItem → OrderItem<br/>(giữ photobook_design_id)"]
  CART --> PJ
```

Hai đường vào sản xuất:

```mermaid
flowchart TD
  CO["checkout: openProjectsFor(order)"] --> Q{"OrderItem có kèm design?"}
  Q -- "có, khớp slug + số trang" --> HY["hydrateFromDesign<br/>tạo photo/spread/slot từ design,<br/>dùng lại publicId nên không upload lại"]
  HY --> PS["mở thẳng ở PHOTOS_SUBMITTED"]
  Q -- "không / lệch" --> AW["mở ở AWAITING_PHOTOS"]
  AW --> UP["khách gửi ảnh thủ công (tối thiểu 3 ảnh/trang)"]
  UP --> LE["PhotobookLayoutEngine dựng spread theo chu kỳ mẫu"]
  LE --> PS
```

Vòng duyệt bản mềm:

```mermaid
stateDiagram-v2
  [*] --> AWAITING_PHOTOS: mua không kèm thiết kế
  [*] --> PHOTOS_SUBMITTED: mua kèm bản thiết kế
  AWAITING_PHOTOS --> PHOTOS_SUBMITTED: khách gửi đủ ảnh
  PHOTOS_SUBMITTED --> PROOF_SENT: xưởng gửi bản mềm
  PROOF_SENT --> REVISION_REQUESTED: khách yêu cầu sửa — bắt buộc ghi rõ chỗ sửa
  REVISION_REQUESTED --> PROOF_SENT: xưởng gửi bản mới
  PROOF_SENT --> APPROVED: khách duyệt
  APPROVED --> [*]
```

Tối đa **2 lượt sửa miễn phí**; hết lượt thì `PHOTOBOOK_REVISION_LIMIT_REACHED`. Khách còn
đổi được bố cục ở trang *Sắp xếp* khi project đang ở `PHOTOS_SUBMITTED`.

Mã bố cục (`TRAN_DOI`, `DOI_CAN`, `CONTACT_SHEET`, …) phải **giống hệt từng ký tự** giữa
`frontend/src/data/spreadLayouts.ts` và bảng `photobook_layouts`: mã chọn ở client được dùng
thẳng ở server, không có bước dịch.

---

## 8. Đặt in theo yêu cầu

```mermaid
stateDiagram-v2
  [*] --> NEW: khách gửi yêu cầu
  NEW --> QUOTED: xưởng báo giá
  QUOTED --> CONFIRMED: khách đồng ý — sinh Order liên kết
  QUOTED --> CANCELLED: khách từ chối
  CONFIRMED --> IN_PRODUCTION: xưởng bắt đầu làm
  IN_PRODUCTION --> COMPLETED: xong
  COMPLETED --> [*]
```

Khách phải chọn địa chỉ giao trước khi đồng ý báo giá; đồng ý hai lần bị chặn.

---

## 9. Thông báo và SSE cho admin

Hai cơ chế tách rời, dễ tưởng là một.

```mermaid
sequenceDiagram
  participant O as OrderServiceImpl
  participant DB as PostgreSQL
  participant L as NotificationEventListener
  participant R as Redis pub/sub
  participant I as "Mọi instance app"
  participant A as Trình duyệt admin

  O->>DB: commit transaction đặt hàng
  O->>L: OrderPlacedEvent (AFTER_COMMIT)
  L->>DB: "INSERT ... ON CONFLICT(event_key) DO NOTHING"
  L-->>L: chỉ gửi email khi insert thật sự thêm dòng
  L->>R: publish thông báo đơn mới cho admin
  R->>I: fan-out
  I->>A: đẩy qua SSE
```

Vì sao phải qua Redis: mỗi instance chỉ giữ SSE client của chính nó, nên thông báo phải phát
tán liên-instance chứ không thể là event trong tiến trình. Email hỏng chỉ được ghi log, **không
bao giờ** làm rollback nghiệp vụ đã commit.

---

## 10. Xác thực và phân quyền

```mermaid
flowchart LR
  L["POST /auth/login"] --> AT["access token JWT<br/>mang ROLE_* + permission đã resolve"]
  L --> RT["refresh token<br/>cookie HttpOnly, whitelist trong Redis"]
  AT --> API["gọi API"]
  API -- 401 --> RF["POST /auth/refresh<br/>xoay vòng token"]
  RF --> AT
  CP["đổi mật khẩu / đặt lại mật khẩu"] --> RV["thu hồi toàn bộ refresh token"]
```

```mermaid
flowchart LR
  U[User] --> UR[UserRole] --> RO[Role] --> RP[RolePermission] --> PE[Permission]
  PE --> PA["@PreAuthorize kiểm PERMISSION<br/>không kiểm tên role"]
```

Nhờ vậy admin cấp/gỡ được từng quyền cho `STAFF` mà không phải sửa code. Route guard phía
frontend **chỉ để giao diện gọn**; thẩm quyền thật nằm ở `@PreAuthorize` và các truy vấn theo
chủ sở hữu.

---

## 11. Bản đồ route frontend

| Route | Trang | Ghi chú |
|---|---|---|
| `/` | HomePage | |
| `/danh-muc/:slug`, `/tranh/:slug` | Danh mục, chi tiết tranh | |
| `/tim-kiem`, `/kho-va-gia` | Tìm kiếm, bảng khổ & giá | |
| `/gio-hang` → `/thanh-toan` | Giỏ → thanh toán | giỏ khách vãng lai gộp vào khi đăng nhập |
| `/don-hang-cua-toi/:orderId?` | Đơn của tôi | có dòng thời gian và nút huỷ |
| `/photobook`, `/photobook/:slug` | Danh sách, trình thiết kế | lazy-load |
| `/xem-truoc/:token` | Xem trước công khai | không cần đăng nhập |
| `/photobook-cua-toi/:id`, `/…/sap-xep` | Gửi ảnh, sắp xếp | sau khi mua |
| `/dat-in` | Đặt theo yêu cầu | |
| `/yeu-thich`, `/thong-bao`, `/account` | Yêu thích, thông báo, tài khoản | cần đăng nhập |
| `/admin/*` | Khu quản trị | một lazy chunk, chặn theo permission |
| `/403`, `*` | Không đủ quyền, 404 | |

---

## Bẫy dễ đọc nhầm

| Chỗ | Thực tế |
|---|---|
| `OrderStatus.PROCESSING` | **Không code nào đặt trạng thái này.** Có trong enum, được cộng vào dashboard và hiện trong ô lọc của admin, nhưng lọc luôn ra rỗng. |
| Nhánh sinh hoàn tiền | Chỉ chạy khi giao thất bại một đơn **đã** thu tiền. Với COD hiện tại gần như không với tới được, vì payment chỉ `SUCCESS` khi đơn đã `DELIVERED`, mà `DELIVERED` thì không giao thất bại được nữa. Nó là phần dựng sẵn cho phương thức trả trước. |
| `SELECT ... FOR UPDATE` khi trừ kho | Không đủ an toàn nếu entity đã được nạp trước đó trong cùng transaction. Việc giữ chỗ tồn kho phải nằm trong chính câu `UPDATE` có điều kiện. |
| Hai cờ `editable` của photobook | Ở `PhotobookProject` nghĩa là *còn thêm/xoá ảnh được*; ở arrangement nghĩa là *còn đổi bố cục được* (`PHOTOS_SUBMITTED`). Hai thứ khác nhau. |
| Số ảnh của photobook | "60–80 ảnh" là lượng gửi cho **xưởng tự bố cục** (gửi dư để xưởng chọn). Khi khách **tự thiết kế** thì chỉ cần đúng số ô của chủ đề, ít hơn nhiều. |
| `photobook_drafts` | Không đơn hàng nào tham chiếu tới nó. Đơn hàng gắn với `PhotobookDesign`. |
| Cột JSON thô | `photobook_layouts.slots`, `photobook_designs.spreads_json`, … cố ý không chuẩn hoá vì không có nhu cầu truy vấn vào bên trong. |
| Migration Flyway | Không bao giờ sửa file migration đã chạy; luôn thêm `V<n+1>__*.sql` mới. |
