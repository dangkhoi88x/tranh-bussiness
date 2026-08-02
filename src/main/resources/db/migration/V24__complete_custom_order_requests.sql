ALTER TABLE custom_order_requests ADD COLUMN order_id UUID UNIQUE REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE custom_order_images ALTER COLUMN secure_url DROP NOT NULL;
ALTER TABLE custom_order_images ADD COLUMN is_authenticated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE order_custom_details (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    custom_order_request_id UUID NOT NULL UNIQUE REFERENCES custom_order_requests(id) ON DELETE RESTRICT,
    request_code VARCHAR(32) NOT NULL,
    request_type VARCHAR(30) NOT NULL,
    width_cm NUMERIC(10, 2) NOT NULL,
    height_cm NUMERIC(10, 2) NOT NULL,
    material VARCHAR(100) NOT NULL,
    frame_id UUID,
    frame_name VARCHAR(120),
    quoted_price NUMERIC(19, 2) NOT NULL,
    CONSTRAINT ck_order_custom_details_dimensions CHECK (width_cm > 0 AND height_cm > 0),
    CONSTRAINT ck_order_custom_details_quote CHECK (quoted_price >= 0),
    CONSTRAINT ck_order_custom_details_type CHECK (request_type IN ('FRAME_ONLY', 'PRINT_AND_FRAME', 'FAMILY_PHOTO'))
);
