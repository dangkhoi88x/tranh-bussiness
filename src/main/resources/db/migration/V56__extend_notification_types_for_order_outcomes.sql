-- Bổ sung ba loại thông báo cho các kết cục của đơn hàng: huỷ, giao thành công, giao thất bại.
-- Trước đây khách không nhận được thông báo nào ở ba nhánh này; nặng nhất là giao thất bại —
-- hàng quay về kho, COD bị huỷ, mà khách hoàn toàn không biết.
--
-- Constraint này là danh sách khoá cứng (xem V29 -> V38 -> V41): thêm giá trị vào enum Java mà
-- quên migration thì INSERT sẽ đổ ở tầng DB, và vì notification chạy AFTER_COMMIT trong
-- runSafely nên lỗi chỉ hiện ra dưới dạng log warning chứ không làm request thất bại.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS ck_notifications_type;

ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type CHECK (
    type IN (
        'WELCOME',
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'ORDER_SHIPPED',
        'ORDER_DELIVERED',
        'ORDER_DELIVERY_FAILED',
        'ORDER_CANCELLED',
        'CUSTOM_ORDER_QUOTED',
        'PHOTOBOOK_PROOF_SENT'
    )
);
