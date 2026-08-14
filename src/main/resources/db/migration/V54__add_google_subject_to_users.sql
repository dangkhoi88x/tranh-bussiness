ALTER TABLE iam_users
    ADD COLUMN google_subject VARCHAR(255);

ALTER TABLE iam_users
    ADD CONSTRAINT uq_iam_users_google_subject
        UNIQUE (google_subject);
