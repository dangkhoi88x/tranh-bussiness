CREATE TABLE photobook_drafts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES iam_users(id) ON DELETE CASCADE,
    product_slug VARCHAR(255) NOT NULL,
    draft_json  JSONB       NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, product_slug)
);
