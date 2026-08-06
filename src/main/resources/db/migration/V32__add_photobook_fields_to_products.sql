ALTER TABLE products ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cover_material VARCHAR(120);

ALTER TABLE products ADD CONSTRAINT ck_products_page_count CHECK (page_count IS NULL OR page_count > 0);
