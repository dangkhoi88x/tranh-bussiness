CREATE TABLE iam_roles (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(255),
    CONSTRAINT uq_iam_roles_name UNIQUE (name)
);

CREATE TABLE iam_permissions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(255),
    CONSTRAINT uq_iam_permissions_name UNIQUE (name)
);

CREATE TABLE iam_user_roles (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL REFERENCES iam_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES iam_roles(id) ON DELETE CASCADE,
    CONSTRAINT uq_iam_user_roles_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX ix_iam_user_roles_user_id ON iam_user_roles(user_id);
CREATE INDEX ix_iam_user_roles_role_id ON iam_user_roles(role_id);

CREATE TABLE iam_role_permissions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    role_id UUID NOT NULL REFERENCES iam_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES iam_permissions(id) ON DELETE CASCADE,
    CONSTRAINT uq_iam_role_permissions_role_permission UNIQUE (role_id, permission_id)
);

CREATE INDEX ix_iam_role_permissions_role_id ON iam_role_permissions(role_id);
CREATE INDEX ix_iam_role_permissions_permission_id ON iam_role_permissions(permission_id);

INSERT INTO iam_roles (id, created_at, updated_at, name, description) VALUES
    ('00000000-0000-0000-0000-000000000011', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'CUSTOMER', 'Store customer'),
    ('00000000-0000-0000-0000-000000000012', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'STAFF', 'Store staff member'),
    ('00000000-0000-0000-0000-000000000013', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'ADMIN', 'System administrator');

INSERT INTO iam_permissions (id, created_at, updated_at, name, description) VALUES
    ('00000000-0000-0000-0000-000000000021', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'DASHBOARD_VIEW', 'View the management dashboard'),
    ('00000000-0000-0000-0000-000000000022', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'USER_MANAGE', 'Manage users and role assignments'),
    ('00000000-0000-0000-0000-000000000023', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'CATEGORY_MANAGE', 'Manage product categories'),
    ('00000000-0000-0000-0000-000000000024', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'PRODUCT_MANAGE', 'Manage products and product images'),
    ('00000000-0000-0000-0000-000000000025', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'FRAME_MANAGE', 'Manage frames and product frame options');

-- STAFF keeps the same catalog-management access it had before RBAC normalization.
INSERT INTO iam_role_permissions (id, created_at, updated_at, role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000101', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000023'),
    ('00000000-0000-0000-0000-000000000102', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000024'),
    ('00000000-0000-0000-0000-000000000103', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000025'),
    ('00000000-0000-0000-0000-000000000104', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000021'),
    ('00000000-0000-0000-0000-000000000105', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000022'),
    ('00000000-0000-0000-0000-000000000106', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000023'),
    ('00000000-0000-0000-0000-000000000107', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000024'),
    ('00000000-0000-0000-0000-000000000108', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000025');

-- Preserve every existing user's role before removing the denormalized column.
INSERT INTO iam_user_roles (id, created_at, updated_at, user_id, role_id)
SELECT md5('iam_user_role:' || users.id::text || ':' || roles.id::text)::uuid,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP,
       users.id,
       roles.id
FROM iam_users users
JOIN iam_roles roles ON roles.name = users.role;

ALTER TABLE iam_users DROP CONSTRAINT ck_iam_users_role;
ALTER TABLE iam_users DROP COLUMN role;
