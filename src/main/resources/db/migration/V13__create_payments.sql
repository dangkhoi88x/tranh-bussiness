CREATE TABLE payments (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    amount NUMERIC(19, 2) NOT NULL,
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    transaction_code VARCHAR(64) NOT NULL UNIQUE,
    paid_at TIMESTAMPTZ,
    CONSTRAINT ck_payments_amount CHECK (amount > 0),
    CONSTRAINT ck_payments_method CHECK (method IN ('COD')),
    CONSTRAINT ck_payments_status CHECK (status IN ('PENDING', 'SUCCESS', 'CANCELLED'))
);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status_created_at ON payments(status, created_at DESC);
CREATE UNIQUE INDEX uk_payments_one_pending_per_order ON payments(order_id) WHERE status = 'PENDING';
