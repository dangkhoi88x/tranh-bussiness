CREATE TABLE custom_order_requests (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    request_code VARCHAR(32) NOT NULL UNIQUE, user_id UUID NOT NULL REFERENCES iam_users(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL, width_cm NUMERIC(10, 2) NOT NULL, height_cm NUMERIC(10, 2) NOT NULL,
    material VARCHAR(100) NOT NULL, frame_id UUID REFERENCES frames(id) ON DELETE SET NULL,
    quoted_price NUMERIC(19, 2), staff_note TEXT, customer_note TEXT, status VARCHAR(20) NOT NULL,
    CONSTRAINT ck_custom_order_request_dimensions CHECK (width_cm > 0 AND height_cm > 0),
    CONSTRAINT ck_custom_order_request_quote CHECK (quoted_price IS NULL OR quoted_price >= 0),
    CONSTRAINT ck_custom_order_request_type CHECK (type IN ('FRAME_ONLY', 'PRINT_AND_FRAME', 'FAMILY_PHOTO')),
    CONSTRAINT ck_custom_order_request_status CHECK (status IN ('NEW', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'))
);
CREATE TABLE custom_order_images (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    custom_order_request_id UUID NOT NULL REFERENCES custom_order_requests(id) ON DELETE CASCADE,
    public_id VARCHAR(255) NOT NULL UNIQUE, secure_url TEXT NOT NULL
);
CREATE INDEX idx_custom_order_requests_user_created_at ON custom_order_requests(user_id, created_at DESC);
CREATE INDEX idx_custom_order_requests_status_created_at ON custom_order_requests(status, created_at DESC);
CREATE INDEX idx_custom_order_images_request_id ON custom_order_images(custom_order_request_id);
