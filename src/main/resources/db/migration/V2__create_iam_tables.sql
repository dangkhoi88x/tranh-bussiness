CREATE TABLE iam_users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(32) NOT NULL,
    CONSTRAINT uq_iam_users_email UNIQUE (email),
    CONSTRAINT ck_iam_users_role CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN'))
);
