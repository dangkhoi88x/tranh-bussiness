CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX idx_product_variants_catalog_filter
    ON product_variants(product_id, material, price, width_cm, height_cm)
    WHERE available = TRUE;

CREATE INDEX idx_order_items_product_order
    ON order_items(product_id, order_id);
