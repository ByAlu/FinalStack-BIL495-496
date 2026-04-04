CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    hashed_salted_password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_allowed_data_types (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, data_type)
);

CREATE TABLE IF NOT EXISTS examinations (
    id BIGSERIAL PRIMARY KEY,
    external_examination_id VARCHAR(128) NOT NULL UNIQUE,
    external_patient_id VARCHAR(64) NOT NULL,
    examination_date TIMESTAMP NOT NULL,
    description VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS examination_videos (
    id BIGSERIAL PRIMARY KEY,
    examination_id BIGINT NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
    region VARCHAR(8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_modules (
    id BIGSERIAL PRIMARY KEY,
    module_code VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    description VARCHAR(2048),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS preprocessing_operations (
    id BIGSERIAL PRIMARY KEY,
    data_type VARCHAR(32) NOT NULL,
    operation_name VARCHAR(128) NOT NULL,
    operation_code VARCHAR(64) NOT NULL,
    default_parameters JSONB NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_preprocessing_operation_type_code UNIQUE (data_type, operation_code)
);

CREATE TABLE IF NOT EXISTS user_preprocessing_settings (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type VARCHAR(32) NOT NULL,
    operation_id BIGINT NOT NULL REFERENCES preprocessing_operations(id) ON DELETE CASCADE,
    operation_name VARCHAR(128) NOT NULL,
    operation_code VARCHAR(64) NOT NULL,
    display_order INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    parameters JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_user_preprocessing_owner_type_operation UNIQUE (owner_user_id, data_type, operation_code)
);

CREATE TABLE IF NOT EXISTS ai_analyses (
    analysis_uuid UUID PRIMARY KEY,
    examination_id BIGINT REFERENCES examinations(id) ON DELETE SET NULL,
    patient_id BIGINT,
    status VARCHAR(32),
    result_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analysis_region_frame_indices (
    analysis_uuid UUID NOT NULL REFERENCES ai_analyses(analysis_uuid) ON DELETE CASCADE,
    region VARCHAR(8) NOT NULL,
    frame_index INTEGER NOT NULL,
    PRIMARY KEY (analysis_uuid, region)
);

CREATE TABLE IF NOT EXISTS analysis_preprocessing_settings (
    id BIGSERIAL PRIMARY KEY,
    analysis_uuid UUID NOT NULL REFERENCES ai_analyses(analysis_uuid) ON DELETE CASCADE,
    operation_name VARCHAR(128) NOT NULL,
    operation_code VARCHAR(64) NOT NULL,
    display_order INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    parameters JSONB
);

CREATE TABLE IF NOT EXISTS analysis_module_runs (
    id BIGSERIAL PRIMARY KEY,
    analysis_uuid UUID NOT NULL REFERENCES ai_analyses(analysis_uuid) ON DELETE CASCADE,
    ai_module_id BIGINT NOT NULL REFERENCES ai_modules(id) ON DELETE RESTRICT,
    module_version VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    request_payload JSONB,
    response_payload JSONB
);

CREATE TABLE IF NOT EXISTS analysis_reports (
    id BIGSERIAL PRIMARY KEY,
    analysis_uuid UUID NOT NULL UNIQUE REFERENCES ai_analyses(analysis_uuid) ON DELETE CASCADE,
    exported_pdf_url VARCHAR(2048),
    exported_doc_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_suggestion (
    id BIGSERIAL PRIMARY KEY,
    examination_region VARCHAR(32),
    b_lines BIGINT,
    rd_score BIGINT,
    url VARCHAR(255),
    final_diagnosis VARCHAR(4096),
    treatment_recommendation VARCHAR(4096),
    follow_up_recommendation VARCHAR(4096),
    analysis_report_id BIGINT UNIQUE REFERENCES analysis_reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(128) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    description VARCHAR(2048) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (
    user_name,
    hashed_salted_password,
    email,
    first_name,
    last_name,
    role,
    enabled,
    update_time
)
VALUES
    (
        'doctor',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'doctor@example.com',
        'Doctor',
        'User',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'admin',
        '$2a$10$8LM/CY2uyZrV2UU..3pK3.cHXQdSa7vC9ecAn/.3XsshpCyGu5Y56',
        'admin@example.com',
        'Admin',
        'User',
        'ADMIN',
        TRUE,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (user_name) DO NOTHING;

INSERT INTO user_allowed_data_types (user_id, data_type)
SELECT u.id, v.data_type
FROM users u
JOIN (
    VALUES
        ('doctor', 'ULTRASOUND'),
        ('admin', 'ULTRASOUND'),
        ('admin', 'PULSE_OXIMETER'),
        ('admin', 'MRI'),
        ('admin', 'ECG'),
        ('admin', 'CT')
) AS v(user_name, data_type) ON u.user_name = v.user_name
ON CONFLICT (user_id, data_type) DO NOTHING;

INSERT INTO ai_modules (module_code, display_name, description, active)
VALUES
    (
        'RDS_SCORING',
        'RDS Scoring',
        'Scores respiratory distress syndrome findings for ultrasound examinations.',
        TRUE
    ),
    (
        'B_LINE_DETECTION',
        'B-line Detection',
        'Detects B-lines across ultrasound lung regions.',
        TRUE
    )
ON CONFLICT (module_code) DO NOTHING;

INSERT INTO preprocessing_operations (
    data_type,
    operation_name,
    operation_code,
    default_parameters,
    active
)
VALUES
    (
        'ULTRASOUND',
        'Median Blur',
        'MEDIAN_BLUR',
        '{"kernelSize": 3}'::jsonb,
        TRUE
    ),
    (
        'ULTRASOUND',
        'CLAHE',
        'CLAHE',
        '{"clipLimit": 2.0, "tileGridSize": 8}'::jsonb,
        TRUE
    ),
    (
        'ULTRASOUND',
        'Gaussian Blur',
        'GAUSSIAN_BLUR',
        '{"kernelSize": 5, "sigma": 1.2}'::jsonb,
        TRUE
    )
ON CONFLICT (data_type, operation_code) DO NOTHING;

INSERT INTO user_preprocessing_settings (
    owner_user_id,
    data_type,
    operation_id,
    operation_name,
    operation_code,
    display_order,
    active,
    parameters,
    updated_at
)
SELECT
    u.id,
    'ULTRASOUND',
    p.id,
    p.operation_name,
    p.operation_code,
    CASE p.operation_code
        WHEN 'MEDIAN_BLUR' THEN 1
        WHEN 'CLAHE' THEN 2
        WHEN 'GAUSSIAN_BLUR' THEN 3
        ELSE 99
    END,
    TRUE,
    p.default_parameters,
    CURRENT_TIMESTAMP
FROM users u
JOIN preprocessing_operations p
    ON p.data_type = 'ULTRASOUND'
WHERE u.user_name IN ('doctor', 'admin')
ON CONFLICT (owner_user_id, data_type, operation_code) DO NOTHING;
