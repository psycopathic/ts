CREATE TABLE users (
    id SERIAL PRIMARY KEY,

    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),

    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    name VARCHAR(255),

    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret TEXT,

    token_version INTEGER NOT NULL DEFAULT 0,

    reset_password_token TEXT,
    reset_password_expires TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);