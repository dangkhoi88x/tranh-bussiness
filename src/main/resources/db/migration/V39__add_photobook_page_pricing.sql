-- Photobook được bán theo hai trục nhân nhau: khổ sách (S/M/L) và số trang (20–150, bước 2).
-- Khổ đã có sẵn dạng product_variants. Số trang không thể là variant — 3 khổ × 66 mức trang
-- là 198 SKU cho mỗi template — nên nó là một chiều tính giá riêng.
--
-- Giá KHÔNG phải công thức thuần: bảng giá của xưởng neo giá cứng ở vài mức trang
-- (20 và 30 trang), và khổ S có giá neo riêng không suy ra được từ phụ thu mỗi bậc.
-- Vì vậy neo giá được lưu thành dữ liệu (photobook_page_tiers), còn price_per_step
-- chỉ áp dụng cho các mức trang NẰM TRÊN neo cao nhất.

ALTER TABLE products ADD COLUMN IF NOT EXISTS min_pages INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_pages INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS page_step INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_per_step NUMERIC(19, 2);

-- Bốn cột đi liền nhau: hoặc khai đủ cả bốn (sản phẩm tính giá theo trang), hoặc bỏ trống cả bốn.
ALTER TABLE products DROP CONSTRAINT IF EXISTS ck_products_page_pricing;
ALTER TABLE products ADD CONSTRAINT ck_products_page_pricing CHECK (
    (min_pages IS NULL AND max_pages IS NULL AND page_step IS NULL AND price_per_step IS NULL)
    OR (min_pages > 0 AND max_pages >= min_pages AND page_step > 0 AND price_per_step >= 0)
);

CREATE TABLE IF NOT EXISTS photobook_page_tiers (
    id                 UUID PRIMARY KEY,
    product_variant_id UUID           NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
    page_count         INTEGER        NOT NULL,
    price              NUMERIC(19, 2) NOT NULL,
    created_at         TIMESTAMPTZ    NOT NULL,
    updated_at         TIMESTAMPTZ    NOT NULL,
    CONSTRAINT uq_photobook_page_tiers UNIQUE (product_variant_id, page_count),
    CONSTRAINT ck_photobook_page_tiers_page_count CHECK (page_count > 0),
    CONSTRAINT ck_photobook_page_tiers_price CHECK (price > 0)
);

CREATE INDEX IF NOT EXISTS idx_photobook_page_tiers_variant
    ON photobook_page_tiers (product_variant_id, page_count);

-- Số trang khách chọn phải theo được suốt vòng đời đơn: giá đã trả phụ thuộc vào nó.
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS page_count INTEGER;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS ck_cart_items_page_count;
ALTER TABLE cart_items ADD CONSTRAINT ck_cart_items_page_count CHECK (page_count IS NULL OR page_count > 0);
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS ck_order_items_page_count;
ALTER TABLE order_items ADD CONSTRAINT ck_order_items_page_count CHECK (page_count IS NULL OR page_count > 0);

-- V22 dựng bốn unique index một phần cho giỏ hàng, tất cả đều chưa biết tới số trang, nên
-- cùng một cuốn ở 20 trang và 40 trang bị coi là trùng dòng. Gộp cả bốn thành một index duy
-- nhất có page_count: COALESCE để Postgres không coi mỗi NULL là một giá trị khác nhau.
-- Không thể sinh trùng khi tạo — khoá mới là tập cha của khoá cũ.
DROP INDEX IF EXISTS uq_cart_items_legacy_without_frame;
DROP INDEX IF EXISTS uq_cart_items_variant_without_frame;
DROP INDEX IF EXISTS uq_cart_items_legacy_with_frame;
DROP INDEX IF EXISTS uq_cart_items_variant_with_frame;
DROP INDEX IF EXISTS uq_cart_items_selection;

CREATE UNIQUE INDEX uq_cart_items_selection
    ON cart_items (cart_id, product_id,
                   COALESCE(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   COALESCE(product_frame_option_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   COALESCE(page_count, 0));
