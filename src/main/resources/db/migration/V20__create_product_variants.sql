CREATE TABLE product_variants (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(180) NOT NULL,
    width_cm NUMERIC(10, 2) NOT NULL, height_cm NUMERIC(10, 2) NOT NULL,
    material VARCHAR(100) NOT NULL, price NUMERIC(19, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL, available BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_product_variants_dimensions CHECK (width_cm > 0 AND height_cm > 0),
    CONSTRAINT ck_product_variants_price CHECK (price > 0),
    CONSTRAINT ck_product_variants_stock CHECK (stock_quantity >= 0)
);
CREATE INDEX idx_product_variants_product_price ON product_variants(product_id, price);
