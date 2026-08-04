CREATE TABLE payment_refunds (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    amount NUMERIC(19, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    idempotency_key VARCHAR(80) NOT NULL UNIQUE,
    provider_refund_id VARCHAR(120) UNIQUE,
    requested_by UUID REFERENCES iam_users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    failure_message TEXT,
    CONSTRAINT ck_payment_refunds_amount CHECK (amount > 0),
    CONSTRAINT ck_payment_refunds_status CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED'))
);

CREATE INDEX idx_payment_refunds_order_created_at ON payment_refunds(order_id, created_at DESC);
