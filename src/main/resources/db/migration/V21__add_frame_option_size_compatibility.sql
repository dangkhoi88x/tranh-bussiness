ALTER TABLE product_frame_options
    ADD COLUMN min_width_cm NUMERIC(10, 2),
    ADD COLUMN max_width_cm NUMERIC(10, 2),
    ADD COLUMN min_height_cm NUMERIC(10, 2),
    ADD COLUMN max_height_cm NUMERIC(10, 2),
    ADD CONSTRAINT ck_product_frame_options_width_range CHECK (min_width_cm IS NULL OR max_width_cm IS NULL OR min_width_cm <= max_width_cm),
    ADD CONSTRAINT ck_product_frame_options_height_range CHECK (min_height_cm IS NULL OR max_height_cm IS NULL OR min_height_cm <= max_height_cm);
