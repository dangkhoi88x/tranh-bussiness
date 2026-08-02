CREATE TABLE carts (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL UNIQUE REFERENCES iam_users(id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_frame_option_id UUID REFERENCES product_frame_options(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    CONSTRAINT ck_cart_items_quantity CHECK (quantity > 0)
);

CREATE UNIQUE INDEX uq_cart_items_cart_product_without_frame
    ON cart_items(cart_id, product_id)
    WHERE product_frame_option_id IS NULL;

CREATE UNIQUE INDEX uq_cart_items_cart_product_with_frame
    ON cart_items(cart_id, product_id, product_frame_option_id)
    WHERE product_frame_option_id IS NOT NULL;

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
