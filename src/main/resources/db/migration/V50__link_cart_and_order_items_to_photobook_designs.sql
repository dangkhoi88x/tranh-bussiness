-- Một dòng giỏ hàng/đơn hàng photobook có thể chốt vào đúng một bản thiết kế đã lưu — cần
-- giữ liên kết này để những gì đưa vào sản xuất khớp đúng với những gì khách đã thấy lúc mua,
-- không phụ thuộc vào bản nháp (photobook_drafts) mà khách có thể sửa tiếp sau đó.
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS photobook_design_id UUID REFERENCES photobook_designs (id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS photobook_design_id UUID;

-- V39 đã gộp bốn unique index cũ thành một, có page_count nhưng chưa biết tới design. Không mở
-- rộng thì hai bản thiết kế khác nhau ở cùng khổ/số trang sẽ bị coi là trùng một dòng giỏ hàng.
DROP INDEX IF EXISTS uq_cart_items_selection;

CREATE UNIQUE INDEX uq_cart_items_selection
    ON cart_items (cart_id, product_id,
                   COALESCE(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   COALESCE(product_frame_option_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   COALESCE(page_count, 0),
                   COALESCE(photobook_design_id, '00000000-0000-0000-0000-000000000000'::uuid));
