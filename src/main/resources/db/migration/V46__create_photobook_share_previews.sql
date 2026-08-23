CREATE TABLE IF NOT EXISTS photobook_share_previews (
    id           UUID PRIMARY KEY,
    token        VARCHAR(16)  NOT NULL UNIQUE,
    product_slug VARCHAR(255) NOT NULL,
    size_label   VARCHAR(100),
    page_count   VARCHAR(20),
    finish       VARCHAR(50),
    template_id  VARCHAR(50),
    spreads_json JSONB        NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photobook_share_previews_token
    ON photobook_share_previews (token);
CREATE INDEX IF NOT EXISTS idx_photobook_share_previews_expires
    ON photobook_share_previews (expires_at);

CREATE TABLE IF NOT EXISTS photobook_share_preview_images (
    id         UUID PRIMARY KEY,
    preview_id UUID         NOT NULL REFERENCES photobook_share_previews (id) ON DELETE CASCADE,
    image_key  VARCHAR(100) NOT NULL,
    public_id  VARCHAR(255) NOT NULL,
    secure_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photobook_share_preview_images_preview
    ON photobook_share_preview_images (preview_id);
