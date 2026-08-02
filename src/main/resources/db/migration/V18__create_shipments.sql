CREATE TABLE shipments (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    carrier VARCHAR(120) NOT NULL, tracking_code VARCHAR(120) NOT NULL UNIQUE,
    shipping_fee NUMERIC(19, 2) NOT NULL, status VARCHAR(20) NOT NULL,
    shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, failed_at TIMESTAMPTZ, failure_reason TEXT,
    CONSTRAINT ck_shipments_fee CHECK (shipping_fee >= 0),
    CONSTRAINT ck_shipments_status CHECK (status IN ('READY', 'IN_TRANSIT', 'DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'))
);
CREATE INDEX idx_shipments_status_created_at ON shipments(status, created_at DESC);
