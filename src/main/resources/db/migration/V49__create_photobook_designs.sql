-- Bản thiết kế photobook khách đã hoàn tất trước khi mua (khổ, số trang, layout từng spread,
-- ảnh, crop, caption, màu nền) — snapshot vĩnh viễn, không hết hạn như photobook_share_previews,
-- vì một đơn hàng đã thanh toán có thể tham chiếu tới nó bất cứ lúc nào sau này.
CREATE TABLE IF NOT EXISTS photobook_designs (
    id           UUID PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES iam_users (id),
    product_slug VARCHAR(255) NOT NULL,
    size_label   VARCHAR(100),
    page_count   INTEGER      NOT NULL,
    finish       VARCHAR(50),
    template_id  VARCHAR(50),
    spreads_json JSONB        NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ck_photobook_designs_page_count CHECK (page_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_photobook_designs_user
    ON photobook_designs (user_id, product_slug);

CREATE TABLE IF NOT EXISTS photobook_design_images (
    id         UUID PRIMARY KEY,
    design_id  UUID         NOT NULL REFERENCES photobook_designs (id) ON DELETE CASCADE,
    image_key  VARCHAR(100) NOT NULL,
    public_id  VARCHAR(255) NOT NULL,
    secure_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photobook_design_images_design
    ON photobook_design_images (design_id);
