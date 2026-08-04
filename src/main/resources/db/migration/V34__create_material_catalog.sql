CREATE TABLE materials (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    scope VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    CONSTRAINT uq_materials_code UNIQUE (code),
    CONSTRAINT ck_materials_scope CHECK (scope IN ('ARTWORK_SURFACE', 'FRAME')),
    CONSTRAINT ck_materials_status CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    CONSTRAINT ck_materials_sort_order CHECK (sort_order >= 0)
);

INSERT INTO materials (id, created_at, updated_at, code, name, scope, status, sort_order, description)
VALUES
    ('00000000-0000-0000-0000-000000000341', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'CANVAS', 'Canvas', 'ARTWORK_SURFACE', 'ACTIVE', 10, 'Bề mặt canvas in tranh.'),
    ('00000000-0000-0000-0000-000000000342', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'SILK', 'Lụa', 'ARTWORK_SURFACE', 'ACTIVE', 20, 'Bề mặt lụa cho tranh in và tranh nghệ thuật.'),
    ('00000000-0000-0000-0000-000000000343', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'OAK_WOOD', 'Gỗ sồi', 'FRAME', 'ACTIVE', 10, NULL),
    ('00000000-0000-0000-0000-000000000344', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'COMPOSITE', 'Composite', 'FRAME', 'ACTIVE', 20, NULL)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE product_variants ADD COLUMN material_id UUID REFERENCES materials(id) ON DELETE RESTRICT;
UPDATE product_variants SET material_id = '00000000-0000-0000-0000-000000000341'
WHERE LOWER(TRIM(material)) = 'canvas';
UPDATE product_variants SET material_id = '00000000-0000-0000-0000-000000000342'
WHERE LOWER(TRIM(material)) IN ('lụa', 'lua', 'silk');
CREATE INDEX idx_product_variants_material_id ON product_variants(material_id);
