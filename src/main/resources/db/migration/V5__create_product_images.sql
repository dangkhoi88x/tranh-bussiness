CREATE TABLE product_images (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    public_id VARCHAR(255) NOT NULL,
    secure_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_product_images_public_id UNIQUE (public_id),
    CONSTRAINT ck_product_images_sort_order CHECK (sort_order >= 0)
);

CREATE INDEX idx_product_images_product_sort ON product_images(product_id, sort_order, created_at);
CREATE UNIQUE INDEX uq_product_images_one_primary ON product_images(product_id) WHERE is_primary;
