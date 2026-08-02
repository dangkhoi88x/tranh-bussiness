CREATE TABLE order_status_histories (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    changed_by UUID NOT NULL REFERENCES iam_users(id) ON DELETE RESTRICT,
    note TEXT,
    CONSTRAINT ck_order_status_histories_from CHECK (from_status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERY_FAILED', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT ck_order_status_histories_to CHECK (to_status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERY_FAILED', 'DELIVERED', 'CANCELLED'))
);
CREATE INDEX idx_order_status_histories_order_created ON order_status_histories(order_id, created_at ASC);
