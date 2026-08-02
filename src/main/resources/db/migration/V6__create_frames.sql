CREATE TABLE frames (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    material VARCHAR(80) NOT NULL,
    color VARCHAR(80) NOT NULL,
    width_mm NUMERIC(10, 2) NOT NULL,
    price_adjustment NUMERIC(19, 2) NOT NULL,
    description TEXT,
    image_public_id VARCHAR(255),
    image_url TEXT,
    status VARCHAR(20) NOT NULL,
    CONSTRAINT uq_frames_slug UNIQUE (slug),
    CONSTRAINT ck_frames_width CHECK (width_mm > 0),
    CONSTRAINT ck_frames_price_adjustment CHECK (price_adjustment >= 0),
    CONSTRAINT ck_frames_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE UNIQUE INDEX uq_frames_name_ci ON frames (LOWER(name));
CREATE INDEX idx_frames_status_name ON frames(status, name);
