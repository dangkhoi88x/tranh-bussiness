CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL REFERENCES iam_users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(300),
    event_key VARCHAR(180) NOT NULL UNIQUE,
    read_at TIMESTAMPTZ,
    CONSTRAINT ck_notifications_type CHECK (type IN ('WELCOME', 'ORDER_CONFIRMED'))
);

CREATE INDEX idx_notifications_user_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
