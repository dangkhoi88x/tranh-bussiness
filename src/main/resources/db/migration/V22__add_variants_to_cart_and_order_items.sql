ALTER TABLE cart_items ADD COLUMN product_variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT;
DROP INDEX uq_cart_items_cart_product_without_frame;
DROP INDEX uq_cart_items_cart_product_with_frame;
CREATE UNIQUE INDEX uq_cart_items_legacy_without_frame ON cart_items(cart_id, product_id) WHERE product_variant_id IS NULL AND product_frame_option_id IS NULL;
CREATE UNIQUE INDEX uq_cart_items_variant_without_frame ON cart_items(cart_id, product_id, product_variant_id) WHERE product_variant_id IS NOT NULL AND product_frame_option_id IS NULL;
CREATE UNIQUE INDEX uq_cart_items_legacy_with_frame ON cart_items(cart_id, product_id, product_frame_option_id) WHERE product_variant_id IS NULL AND product_frame_option_id IS NOT NULL;
CREATE UNIQUE INDEX uq_cart_items_variant_with_frame ON cart_items(cart_id, product_id, product_variant_id, product_frame_option_id) WHERE product_variant_id IS NOT NULL AND product_frame_option_id IS NOT NULL;

ALTER TABLE order_items
    ADD COLUMN product_variant_id UUID,
    ADD COLUMN variant_sku VARCHAR(80),
    ADD COLUMN variant_name VARCHAR(180),
    ADD COLUMN variant_material VARCHAR(100),
    ADD COLUMN variant_width_cm NUMERIC(10, 2),
    ADD COLUMN variant_height_cm NUMERIC(10, 2);
