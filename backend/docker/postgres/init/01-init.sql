CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL UNIQUE,
    hashed_salted_password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(255),
    role VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gestational_age_weeks INTEGER NOT NULL,
    birth_weight_kg NUMERIC(5, 2) NOT NULL,
    postnatal_age_days INTEGER NOT NULL,
    clinic VARCHAR(128) NOT NULL,
    bed_number VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_allowed_data_types (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_type VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, data_type)
);

CREATE TABLE IF NOT EXISTS us_examinations (
    id BIGSERIAL PRIMARY KEY,
    external_examination_id VARCHAR(128) NOT NULL UNIQUE,
    external_patient_id VARCHAR(64) NOT NULL,
    examination_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS us_examination_videos (
    id BIGSERIAL PRIMARY KEY,
    examination_id BIGINT NOT NULL REFERENCES us_examinations(id) ON DELETE CASCADE,
    region VARCHAR(8) NOT NULL,
    description VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS us_ai_modules (
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

CREATE TABLE IF NOT EXISTS us_ai_analyses (
    analysis_uuid UUID PRIMARY KEY,
    examination_id BIGINT REFERENCES us_examinations(id) ON DELETE SET NULL,
    patient_id BIGINT,
    status VARCHAR(32),
    result_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS us_analysis_region_frame_indices (
    analysis_uuid UUID NOT NULL REFERENCES us_ai_analyses(analysis_uuid) ON DELETE CASCADE,
    region VARCHAR(8) NOT NULL,
    frame_index INTEGER NOT NULL,
    PRIMARY KEY (analysis_uuid, region)
);

CREATE TABLE IF NOT EXISTS us_analysis_preprocessing_settings (
    id BIGSERIAL PRIMARY KEY,
    analysis_uuid UUID NOT NULL REFERENCES us_ai_analyses(analysis_uuid) ON DELETE CASCADE,
    operation_name VARCHAR(128) NOT NULL,
    operation_code VARCHAR(64) NOT NULL,
    display_order INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    parameters JSONB
);

CREATE TABLE IF NOT EXISTS us_analysis_module_runs (
    id BIGSERIAL PRIMARY KEY,
    analysis_uuid UUID NOT NULL REFERENCES us_ai_analyses(analysis_uuid) ON DELETE CASCADE,
    ai_module_id BIGINT NOT NULL REFERENCES us_ai_modules(id) ON DELETE RESTRICT,
    module_version VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    request_payload JSONB,
    response_payload JSONB
);

CREATE TABLE IF NOT EXISTS us_analysis_reports (
    id BIGSERIAL PRIMARY KEY,
    analysis_uuid UUID NOT NULL UNIQUE REFERENCES us_ai_analyses(analysis_uuid) ON DELETE CASCADE,
    exported_pdf_url VARCHAR(2048),
    exported_doc_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_suggestion (
    id BIGSERIAL PRIMARY KEY,
    final_diagnosis VARCHAR(4096),
    treatment_recommendation VARCHAR(4096),
    follow_up_recommendation VARCHAR(4096),
    analysis_report_id BIGINT UNIQUE REFERENCES us_analysis_reports(id) ON DELETE CASCADE
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
    phone_number,
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
        '+905551001000',
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
        '+905551001100',
        'User',
        'ADMIN',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ahmet.yilmaz',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ahmet.yilmaz@example.com',
        'Ahmet',
        '+905551001200',
        'Yılmaz',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'mehmet.kaya',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'mehmet.kaya@example.com',
        'Mehmet',
        '+905551001300',
        'Kaya',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ayse.demir',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ayse.demir@example.com',
        'Ayşe',
        '+905551001400',
        'Demir',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'fatma.sahin',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'fatma.sahin@example.com',
        'Fatma',
        '+905551001500',
        'Şahin',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'mustafa.celik',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'mustafa.celik@example.com',
        'Mustafa',
        '+905551001600',
        'Çelik',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'emine.arslan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'emine.arslan@example.com',
        'Emine',
        '+905551001700',
        'Arslan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ali.koc',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ali.koc@example.com',
        'Ali',
        '+905551001800',
        'Koç',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'zeynep.kurt',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'zeynep.kurt@example.com',
        'Zeynep',
        '+905551001900',
        'Kurt',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'hasan.ozdemir',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'hasan.ozdemir@example.com',
        'Hasan',
        '+905551002000',
        'Özdemir',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'huseyin.acar',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'huseyin.acar@example.com',
        'Hüseyin',
        '+905551002100',
        'Acar',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'murat.aslan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'murat.aslan@example.com',
        'Murat',
        '+905551002200',
        'Aslan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'elif.yildiz',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'elif.yildiz@example.com',
        'Elif',
        '+905551002300',
        'Yıldız',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ibrahim.dogan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ibrahim.dogan@example.com',
        'İbrahim',
        '+905551002400',
        'Doğan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'esra.kilic',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'esra.kilic@example.com',
        'Esra',
        '+905551002500',
        'Kılıç',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'omer.tekin',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'omer.tekin@example.com',
        'Ömer',
        '+905551002600',
        'Tekin',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'selin.karaca',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'selin.karaca@example.com',
        'Selin',
        '+905551002700',
        'Karaca',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'burak.turan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'burak.turan@example.com',
        'Burak',
        '+905551002800',
        'Turan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'buse.kaplan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'buse.kaplan@example.com',
        'Buse',
        '+905551002900',
        'Kaplan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'cem.aydin',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'cem.aydin@example.com',
        'Cem',
        '+905551003000',
        'Aydın',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'deniz.erdem',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'deniz.erdem@example.com',
        'Deniz',
        '+905551003100',
        'Erdem',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ece.bulut',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ece.bulut@example.com',
        'Ece',
        '+905551003200',
        'Bulut',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ferhat.ozkan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ferhat.ozkan@example.com',
        'Ferhat',
        '+905551003300',
        'Özkan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'gamze.polat',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'gamze.polat@example.com',
        'Gamze',
        '+905551003400',
        'Polat',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'gokhan.sezer',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'gokhan.sezer@example.com',
        'Gökhan',
        '+905551003500',
        'Sezer',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'hande.tas',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'hande.tas@example.com',
        'Hande',
        '+905551003600',
        'Taş',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ilker.yuce',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ilker.yuce@example.com',
        'İlker',
        '+905551003700',
        'Yüce',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'irem.altin',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'irem.altin@example.com',
        'İrem',
        '+905551003800',
        'Altın',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'kaan.sari',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'kaan.sari@example.com',
        'Kaan',
        '+905551003900',
        'Sarı',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'leyla.keser',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'leyla.keser@example.com',
        'Leyla',
        '+905551004000',
        'Keser',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'melis.uyan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'melis.uyan@example.com',
        'Melis',
        '+905551004100',
        'Uyan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'nazli.guler',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'nazli.guler@example.com',
        'Nazlı',
        '+905551004200',
        'Güler',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'onur.cetin',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'onur.cetin@example.com',
        'Onur',
        '+905551004300',
        'Çetin',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'ozge.akin',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'ozge.akin@example.com',
        'Özge',
        '+905551004400',
        'Akın',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'pelin.korkmaz',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'pelin.korkmaz@example.com',
        'Pelin',
        '+905551004500',
        'Korkmaz',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'recep.ustun',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'recep.ustun@example.com',
        'Recep',
        '+905551004600',
        'Üstün',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'seda.yavuz',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'seda.yavuz@example.com',
        'Seda',
        '+905551004700',
        'Yavuz',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'serkan.karaman',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'serkan.karaman@example.com',
        'Serkan',
        '+905551004800',
        'Karaman',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'sevgi.durmaz',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'sevgi.durmaz@example.com',
        'Sevgi',
        '+905551004900',
        'Durmaz',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'sinem.cakir',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'sinem.cakir@example.com',
        'Sinem',
        '+905551005000',
        'Çakır',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'tugba.inan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'tugba.inan@example.com',
        'Tuğba',
        '+905551005100',
        'İnan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'umut.erdogan',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'umut.erdogan@example.com',
        'Umut',
        '+905551005200',
        'Erdoğan',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'yasemin.kandemir',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'yasemin.kandemir@example.com',
        'Yasemin',
        '+905551005300',
        'Kandemir',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'yigit.kara',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'yigit.kara@example.com',
        'Yiğit',
        '+905551005400',
        'Kara',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'selcuk.gunduz',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'selcuk.gunduz@example.com',
        'Selçuk',
        '+905551005500',
        'Gündüz',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'merve.ayaz',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'merve.ayaz@example.com',
        'Merve',
        '+905551005600',
        'Ayaz',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'baris.tunc',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'baris.tunc@example.com',
        'Barış',
        '+905551005700',
        'Tunç',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'sule.ozer',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'sule.ozer@example.com',
        'Şule',
        '+905551005800',
        'Özer',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'kerem.ay',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'kerem.ay@example.com',
        'Kerem',
        '+905551005900',
        'Ay',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'derya.ipek',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'derya.ipek@example.com',
        'Derya',
        '+905551006000',
        'İpek',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    ),
    (
        'tolga.coskun',
        '$2a$10$wExwxpJaavv0G2Vr/Hsm/O3JKQxFAhGx2A6RlTKgqAGmyGC9HFN..',
        'tolga.coskun@example.com',
        'Tolga',
        '+905551006100',
        'Coşkun',
        'DOCTOR',
        TRUE,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (user_name) DO NOTHING;

INSERT INTO user_allowed_data_types (user_id, data_type)
SELECT u.id, 'ULTRASOUND'
FROM users u
WHERE u.role = 'DOCTOR'
ON CONFLICT (user_id, data_type) DO NOTHING;

INSERT INTO user_allowed_data_types (user_id, data_type)
SELECT u.id, v.data_type
FROM users u
JOIN (
    VALUES
        ('ULTRASOUND'),
        ('PULSE_OXIMETER'),
        ('MRI'),
        ('ECG'),
        ('CT')
) AS v(data_type) ON TRUE
WHERE u.user_name = 'admin'
ON CONFLICT (user_id, data_type) DO NOTHING;

INSERT INTO us_ai_modules (module_code, display_name, description, active)
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

INSERT INTO us_examinations (
    external_examination_id,
    external_patient_id,
    examination_date,
    created_at,
    updated_at
)
SELECT
    'EX_' || LPAD((1000 + seq)::text, 4, '0'),
    'PT_1001',
    TIMESTAMP '2025-01-01 08:00:00'
        + ((seq - 1) * INTERVAL '2 days')
        + ((seq % 5) * INTERVAL '3 hours')
        + ((seq % 4) * INTERVAL '17 minutes'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM generate_series(1, 55) AS seq
ON CONFLICT (external_examination_id) DO NOTHING;

INSERT INTO us_examinations (
    external_examination_id,
    external_patient_id,
    examination_date,
    created_at,
    updated_at
)
SELECT
    '1776348962_EX_124',
    'PT_1001',
    TIMESTAMP '2025-01-01 08:00:00'
        + ((seq - 1) * INTERVAL '2 days')
        + ((seq % 5) * INTERVAL '3 hours')
        + ((seq % 4) * INTERVAL '17 minutes'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM generate_series(1, 1) AS seq
ON CONFLICT (external_examination_id) DO NOTHING;

INSERT INTO us_examinations (
    external_examination_id,
    external_patient_id,
    examination_date,
    created_at,
    updated_at
)
SELECT
    'EX_' || LPAD((1055 + seq)::text, 4, '0'),
    'PT_1002',
    TIMESTAMP '2025-04-10 09:30:00'
        + ((seq - 1) * INTERVAL '3 days')
        + ((seq % 4) * INTERVAL '2 hours')
        + ((seq % 3) * INTERVAL '11 minutes'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM generate_series(1, 15) AS seq
ON CONFLICT (external_examination_id) DO NOTHING;

INSERT INTO us_examination_videos (
    examination_id,
    region,
    description,
    created_at
)
SELECT
    e.id,
    regions.region,
    'Mock ultrasound video for ' || e.external_examination_id || ' / ' || regions.region,
    CURRENT_TIMESTAMP
FROM us_examinations e
JOIN LATERAL (
    VALUES
        ('R1', 1),
        ('R2', 2),
        ('R3', 3),
        ('R4', 4),
        ('R5', 5),
        ('R6', 6)
) AS regions(region, region_order) ON TRUE
WHERE e.external_patient_id IN ('PT_1001', 'PT_1002')
  AND regions.region_order <= CASE
      WHEN CAST(RIGHT(e.external_examination_id, 4) AS INTEGER) % 5 = 0 THEN 4
      WHEN CAST(RIGHT(e.external_examination_id, 4) AS INTEGER) % 3 = 0 THEN 5
      ELSE 6
  END
  AND NOT EXISTS (
      SELECT 1
      FROM us_examination_videos ev
      WHERE ev.examination_id = e.id
        AND ev.region = regions.region
  );

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
        '{"kernelSize": 5, "sigmaX": 1.2, "sigmaY": 1.2}'::jsonb,
        TRUE
    )
ON CONFLICT (data_type, operation_code) DO UPDATE
SET
    operation_name = EXCLUDED.operation_name,
    default_parameters = EXCLUDED.default_parameters,
    active = EXCLUDED.active;

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
WHERE u.role = 'DOCTOR' OR u.user_name = 'admin'
ON CONFLICT (owner_user_id, data_type, operation_code) DO UPDATE
SET
    operation_id = EXCLUDED.operation_id,
    operation_name = EXCLUDED.operation_name,
    display_order = EXCLUDED.display_order,
    active = EXCLUDED.active,
    parameters = EXCLUDED.parameters,
    updated_at = EXCLUDED.updated_at;

INSERT INTO patients (
    id,
    name,
    date_of_birth,
    gestational_age_weeks,
    birth_weight_kg,
    postnatal_age_days,
    clinic,
    bed_number,
    created_at,
    updated_at
)
VALUES
    (
        1001,
        'Aylin Yilmaz',
        DATE '2026-02-18',
        34,
        2.12,
        12,
        'NICU',
        'B-12',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        1002,
        'Kerem Demir',
        DATE '2026-01-25',
        36,
        2.85,
        20,
        'NICU',
        'B-08',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

