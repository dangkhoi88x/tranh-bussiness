CREATE TABLE shipping_addresses (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL REFERENCES iam_users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(160) NOT NULL, phone VARCHAR(30) NOT NULL,
    province VARCHAR(120) NOT NULL, district VARCHAR(120) NOT NULL, ward VARCHAR(120) NOT NULL,
    address_line VARCHAR(255) NOT NULL, is_default BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX uk_shipping_addresses_one_default_per_user ON shipping_addresses(user_id) WHERE is_default;
CREATE INDEX idx_shipping_addresses_user_created_at ON shipping_addresses(user_id, created_at DESC);

CREATE TABLE order_shipping_addresses (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    recipient_name VARCHAR(160) NOT NULL, phone VARCHAR(30) NOT NULL,
    province VARCHAR(120) NOT NULL, district VARCHAR(120) NOT NULL, ward VARCHAR(120) NOT NULL,
    address_line VARCHAR(255) NOT NULL
);
