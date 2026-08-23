-- Một cuốn photobook đã đặt cần một chỗ để khách gửi ảnh và theo dõi tiến độ làm sách.
-- Gắn theo order_item chứ không phải order: một đơn có thể chứa nhiều cuốn khác khổ/khác số
-- trang, mỗi cuốn là một tập ảnh riêng.
CREATE TABLE IF NOT EXISTS photobook_projects (
    id            UUID PRIMARY KEY,
    order_id      UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    order_item_id UUID        NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES iam_users (id),
    page_count    INTEGER     NOT NULL,
    status        VARCHAR(30) NOT NULL,
    customer_note TEXT,
    submitted_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_photobook_projects_order_item UNIQUE (order_item_id),
    CONSTRAINT ck_photobook_projects_page_count CHECK (page_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_photobook_projects_user ON photobook_projects (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photobook_projects_status ON photobook_projects (status, created_at);

-- Ảnh gốc của khách là tài liệu riêng tư: lưu dạng authenticated trên Cloudinary và chỉ phát
-- URL đã ký khi đọc, giống ảnh của custom order request. Vì vậy không lưu secure_url tĩnh.
CREATE TABLE IF NOT EXISTS photobook_project_photos (
    id                   UUID PRIMARY KEY,
    photobook_project_id UUID         NOT NULL REFERENCES photobook_projects (id) ON DELETE CASCADE,
    public_id            VARCHAR(255) NOT NULL UNIQUE,
    original_filename    VARCHAR(255),
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photobook_project_photos_project
    ON photobook_project_photos (photobook_project_id, created_at);
