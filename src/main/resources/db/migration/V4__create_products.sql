CREATE TABLE products (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(180) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    description TEXT,
    price NUMERIC(19, 2) NOT NULL,
    width_cm NUMERIC(10, 2),
    height_cm NUMERIC(10, 2),
    stock_quantity INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT uq_products_slug UNIQUE (slug),
    CONSTRAINT ck_products_price CHECK (price > 0),
    CONSTRAINT ck_products_width CHECK (width_cm IS NULL OR width_cm > 0),
    CONSTRAINT ck_products_height CHECK (height_cm IS NULL OR height_cm > 0),
    CONSTRAINT ck_products_stock_quantity CHECK (stock_quantity >= 0),
    CONSTRAINT ck_products_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status_created_at ON products(status, created_at DESC);
