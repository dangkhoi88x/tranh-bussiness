CREATE TABLE wishlist_items (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL REFERENCES iam_users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_wishlist_user_product_without_variant
    ON wishlist_items(user_id, product_id)
    WHERE product_variant_id IS NULL;

CREATE UNIQUE INDEX uq_wishlist_user_product_with_variant
    ON wishlist_items(user_id, product_id, product_variant_id)
    WHERE product_variant_id IS NOT NULL;

CREATE INDEX idx_wishlist_items_user_created
    ON wishlist_items(user_id, created_at DESC);
