CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    hashed_salted_password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (user_name, hashed_salted_password, email, first_name, last_name, role)
VALUES
    (
        'doctor',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'doctor@example.com',
        'Doctor',
        'User',
        'DOCTOR'
    ),
    (
        'admin',
        '$2a$10$8LM/CY2uyZrV2UU..3pK3.cHXQdSa7vC9ecAn/.3XsshpCyGu5Y56',
        'admin@example.com',
        'Admin',
        'User',
        'ADMIN'
    )
ON CONFLICT (user_name) DO NOTHING;
