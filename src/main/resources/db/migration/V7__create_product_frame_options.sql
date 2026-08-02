CREATE TABLE product_frame_options (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    frame_id UUID NOT NULL REFERENCES frames(id) ON DELETE RESTRICT,
    price_adjustment NUMERIC(19, 2) NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_product_frame_options_product_frame UNIQUE (product_id, frame_id),
    CONSTRAINT ck_product_frame_options_price_adjustment CHECK (price_adjustment >= 0)
);

CREATE INDEX idx_product_frame_options_product_available ON product_frame_options(product_id, available);
CREATE INDEX idx_product_frame_options_frame_id ON product_frame_options(frame_id);
