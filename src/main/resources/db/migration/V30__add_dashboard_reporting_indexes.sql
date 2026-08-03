CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_success_paid_at ON payments(paid_at DESC) WHERE status = 'SUCCESS';
