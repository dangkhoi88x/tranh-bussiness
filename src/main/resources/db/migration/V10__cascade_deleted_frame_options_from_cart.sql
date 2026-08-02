ALTER TABLE cart_items
    DROP CONSTRAINT cart_items_product_frame_option_id_fkey;

ALTER TABLE cart_items
    ADD CONSTRAINT fk_cart_items_product_frame_option
        FOREIGN KEY (product_frame_option_id)
        REFERENCES product_frame_options(id)
        ON DELETE CASCADE;
