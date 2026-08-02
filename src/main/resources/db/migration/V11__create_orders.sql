CREATE TABLE orders (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    order_code VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES iam_users(id) ON DELETE RESTRICT,
    shipping_address TEXT NOT NULL,
    subtotal_amount NUMERIC(19, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT ck_orders_subtotal_amount CHECK (subtotal_amount >= 0),
    CONSTRAINT ck_orders_status CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'))
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_name VARCHAR(180) NOT NULL,
    product_slug VARCHAR(220) NOT NULL,
    product_frame_option_id UUID,
    frame_name VARCHAR(120),
    product_price NUMERIC(19, 2) NOT NULL,
    frame_price_adjustment NUMERIC(19, 2) NOT NULL,
    unit_price NUMERIC(19, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    line_total NUMERIC(19, 2) NOT NULL,
    CONSTRAINT ck_order_items_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_orders_user_created_at ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
