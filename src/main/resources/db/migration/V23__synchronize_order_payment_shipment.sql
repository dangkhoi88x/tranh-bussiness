ALTER TABLE orders ADD COLUMN total_amount NUMERIC(19, 2);
UPDATE orders SET total_amount = subtotal_amount WHERE total_amount IS NULL;
ALTER TABLE orders ALTER COLUMN total_amount SET NOT NULL;
ALTER TABLE orders ADD CONSTRAINT ck_orders_total_amount CHECK (total_amount >= subtotal_amount);

ALTER TABLE orders DROP CONSTRAINT ck_orders_status;
ALTER TABLE orders ADD CONSTRAINT ck_orders_status CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERY_FAILED', 'DELIVERED', 'CANCELLED'));
