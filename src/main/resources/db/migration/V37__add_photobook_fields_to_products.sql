-- Script này từng mang số hiệu V32 và đã chạy trên một số DB dev trước khi đổi sang V37
-- (V32 bị trùng với add_effective_inventory_indexes). Vì vậy mọi câu lệnh phải chạy lại được
-- trên DB đã có sẵn cột và constraint.
ALTER TABLE products ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cover_material VARCHAR(120);

-- Postgres không có ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_products_page_count'
          AND conrelid = 'products'::regclass
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT ck_products_page_count CHECK (page_count IS NULL OR page_count > 0);
    END IF;
END $$;
