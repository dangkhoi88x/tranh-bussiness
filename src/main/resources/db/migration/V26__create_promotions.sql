CREATE TABLE promotions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    name VARCHAR(160) NOT NULL,
    code VARCHAR(60) NOT NULL,
    description TEXT,
    type VARCHAR(24) NOT NULL,
    discount_value NUMERIC(19, 2) NOT NULL,
    max_discount_amount NUMERIC(19, 2),
    min_order_amount NUMERIC(19, 2) NOT NULL DEFAULT 0,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER NOT NULL DEFAULT 0,
    reserved_count INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    per_user_limit INTEGER NOT NULL DEFAULT 1,
    applies_to_all BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT uq_promotions_code UNIQUE (code),
    CONSTRAINT ck_promotions_type CHECK (type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    CONSTRAINT ck_promotions_status CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'EXPIRED')),
    CONSTRAINT ck_promotions_period CHECK (end_at > start_at),
    CONSTRAINT ck_promotions_discount_value CHECK (discount_value > 0),
    CONSTRAINT ck_promotions_max_discount CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    CONSTRAINT ck_promotions_min_order CHECK (min_order_amount >= 0),
    CONSTRAINT ck_promotions_usage_limit CHECK (usage_limit >= 0),
    CONSTRAINT ck_promotions_reserved_count CHECK (reserved_count >= 0),
    CONSTRAINT ck_promotions_used_count CHECK (used_count >= 0),
    CONSTRAINT ck_promotions_per_user_limit CHECK (per_user_limit >= 0),
    CONSTRAINT ck_promotions_percentage CHECK (type <> 'PERCENTAGE' OR discount_value <= 100)
);

CREATE UNIQUE INDEX uq_promotions_code_ci ON promotions (UPPER(code));
CREATE INDEX idx_promotions_status_period ON promotions(status, start_at, end_at);

CREATE TABLE promotion_scopes (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    scope_type VARCHAR(20) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT ck_promotion_scopes_type CHECK (scope_type IN ('CATEGORY', 'PRODUCT', 'VARIANT')),
    CONSTRAINT ck_promotion_scopes_target CHECK (
        (scope_type = 'CATEGORY' AND category_id IS NOT NULL AND product_id IS NULL AND product_variant_id IS NULL) OR
        (scope_type = 'PRODUCT' AND category_id IS NULL AND product_id IS NOT NULL AND product_variant_id IS NULL) OR
        (scope_type = 'VARIANT' AND category_id IS NULL AND product_id IS NULL AND product_variant_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_promotion_scope_category ON promotion_scopes(promotion_id, category_id) WHERE category_id IS NOT NULL;
CREATE UNIQUE INDEX uq_promotion_scope_product ON promotion_scopes(promotion_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX uq_promotion_scope_variant ON promotion_scopes(promotion_id, product_variant_id) WHERE product_variant_id IS NOT NULL;
CREATE INDEX idx_promotion_scopes_promotion ON promotion_scopes(promotion_id);

ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(19, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN promotion_id UUID;
ALTER TABLE orders ADD COLUMN promotion_code VARCHAR(60);
ALTER TABLE orders ADD CONSTRAINT ck_orders_discount_amount CHECK (discount_amount >= 0 AND discount_amount <= subtotal_amount);
ALTER TABLE orders DROP CONSTRAINT ck_orders_total_amount;
ALTER TABLE orders ADD CONSTRAINT ck_orders_total_amount CHECK (total_amount >= 0);
ALTER TABLE order_status_histories ALTER COLUMN changed_by DROP NOT NULL;

CREATE TABLE promotion_usages (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES iam_users(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    coupon_code VARCHAR(60) NOT NULL,
    eligible_subtotal NUMERIC(19, 2) NOT NULL,
    discount_amount NUMERIC(19, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    CONSTRAINT uq_promotion_usages_order UNIQUE (order_id),
    CONSTRAINT ck_promotion_usages_status CHECK (status IN ('RESERVED', 'CONSUMED', 'RELEASED', 'EXPIRED')),
    CONSTRAINT ck_promotion_usages_amounts CHECK (eligible_subtotal > 0 AND discount_amount > 0 AND discount_amount <= eligible_subtotal)
);

CREATE INDEX idx_promotion_usages_promotion_created ON promotion_usages(promotion_id, created_at DESC);
CREATE INDEX idx_promotion_usages_user_status ON promotion_usages(promotion_id, user_id, status);
CREATE INDEX idx_promotion_usages_expiry ON promotion_usages(status, expires_at) WHERE status = 'RESERVED';

INSERT INTO iam_permissions (id, created_at, updated_at, name, description)
VALUES ('00000000-0000-0000-0000-000000000030', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'PROMOTION_MANAGE', 'Manage promotions and coupon usage');

INSERT INTO iam_role_permissions (id, created_at, updated_at, role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000117', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000030'),
    ('00000000-0000-0000-0000-000000000118', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000030');
