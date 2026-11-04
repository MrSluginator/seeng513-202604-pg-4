-- Database Schema (PostgreSQL 16+)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User & Identity

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    account_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    spark_rating INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_picture_url TEXT,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    feed_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    allow_mature_content BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    rsvp_updates BOOLEAN NOT NULL DEFAULT TRUE,
    rsvp_start_soon BOOLEAN NOT NULL DEFAULT TRUE,
    interests_me BOOLEAN NOT NULL DEFAULT TRUE,
    new_in_my_area BOOLEAN NOT NULL DEFAULT TRUE,
    trending_in_my_area BOOLEAN NOT NULL DEFAULT FALSE,
    spark_rating_updates BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_friends (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'accepted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);

-- 2. Events & Media

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    summary VARCHAR(255),
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    recurrence_pattern VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (recurrence_pattern IN ('none', 'one-time', 'daily', 'weekly', 'monthly')),
    recurrence_end_date TIMESTAMPTZ,
    price_min DECIMAL(10, 2) CHECK (price_min IS NULL OR price_min >= 0),
    price_max DECIMAL(10, 2) CHECK (price_max IS NULL OR price_max >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    location_name VARCHAR(255),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    crowd_by_hour JSONB NOT NULL DEFAULT '{}'::jsonb,
    visits_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    rating DECIMAL(3, 2) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (recurrence_pattern <> 'none' OR recurrence_end_date IS NULL),
    CHECK (price_max IS NULL OR (price_min IS NOT NULL AND price_max >= price_min))
);

CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_photos (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    display_order SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (event_id, photo_id)
);

-- 3. Engagement & Community

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS saved_events (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    is_saved BOOLEAN NOT NULL DEFAULT TRUE,
    user_visits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, event_id)
);

-- 4. Tags & External Ingestion

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS event_tags (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_preferred_tags (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS scraped_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scrape_method VARCHAR(100) NOT NULL,
    raw_data JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    parsed_event_id UUID REFERENCES events(id) ON DELETE SET NULL
);

