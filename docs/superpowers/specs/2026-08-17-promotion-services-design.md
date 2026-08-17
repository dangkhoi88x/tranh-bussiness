# Refactor Promotion Services

## Mục tiêu

Giảm trách nhiệm chồng chéo trong `PromotionServiceImpl` nhưng không thay đổi API
`PromotionService`, endpoint, transaction boundary hay quy tắc quota hiện có.

## Kiến trúc

`PromotionServiceImpl` tiếp tục là Spring service triển khai `PromotionService`. Class này
chỉ điều phối ba dependency và giữ annotation `@Transactional` tương ứng với các phương thức
API hiện có.

| Thành phần | Trách nhiệm | Phụ thuộc chính |
| --- | --- | --- |
| `PromotionDefinitionService` | CRUD promotion, scope, validation definition/status, response và truy vấn quản trị | `PromotionRepository`, `PromotionUsageRepository`, category/product/variant repository |
| `PromotionEligibilityService` | Kiểm tra promotion active, thời gian, per-user/quota, scope và tính giá giảm | `PromotionRepository`, `PromotionUsageRepository`, `CartRepository` |
| `PromotionReservationService` | Reserve, consume, release, expire, truy vấn reservation hết hạn và mark promotion hết hạn | `PromotionRepository`, `PromotionUsageRepository`, `UserRepository` |
| `PromotionServiceImpl` | Facade giữ nguyên API, delegate theo trách nhiệm | Ba service trên |

## Luồng và tính nhất quán

- `previewCart` lấy giỏ hàng và tạo `PromotionLine` tại `PromotionEligibilityService`; việc tính
  toán vẫn không tin giá do client gửi.
- `reserve` tính eligibility trước khi dùng `PromotionRepository.reserveQuota`. Sau khi counter
  atomic được giữ thành công, kiểm tra per-user và tạo `PromotionUsage` giữ nguyên thứ tự hiện tại.
- `consume`, `release`, `expire` vẫn lấy `PromotionUsage` qua `findByOrderIdForUpdate` và cập nhật
  counter qua các repository method atomic tương ứng.
- `OrderServiceImpl`, `OrderFulfillmentServiceImpl`, `PromotionController` và
  `PromotionExpirationJob` tiếp tục chỉ phụ thuộc `PromotionService`.

## Xử lý lỗi

Giữ nguyên `ErrorCode`, điều kiện và thông điệp nghiệp vụ hiện hữu. Các lỗi quota, reservation
hết hạn, per-user limit, promotion không active, scope không phù hợp và dữ liệu definition không
hợp lệ không được đổi hành vi.

## Kiểm thử

- Tách `PromotionServiceImplTest` thành facade delegation test hoặc cập nhật để mock ba service.
- Thêm/di chuyển test trực tiếp cho eligibility, calculation theo scope và quota/per-user.
- Thêm/di chuyển test trực tiếp cho reservation lifecycle: reserve, consume, release, expire.
- Chạy toàn bộ `mvnw.cmd test`; các integration test yêu cầu Docker/Testcontainers có thể bị skip
  nếu Docker không khả dụng trên máy cục bộ.

## Ngoài phạm vi

- Không đổi schema, migration, REST contract hoặc logic UI.
- Không đổi định nghĩa quota/retry/concurrency ngoài việc giữ nguyên repository locking và atomic
  counter update đang có.
