CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL
        REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX comments_user_id_idx ON comments(user_id);
CREATE INDEX comments_product_id_idx ON comments(product_id);
