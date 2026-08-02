CREATE TABLE categories (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    description TEXT,
    CONSTRAINT uq_categories_slug UNIQUE (slug)
);

CREATE UNIQUE INDEX uq_categories_name_ci ON categories (LOWER(name));
