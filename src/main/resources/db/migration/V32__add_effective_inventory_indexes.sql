CREATE INDEX IF NOT EXISTS idx_product_variants_available_stock
    ON product_variants(product_id, stock_quantity)
    WHERE available = TRUE;
