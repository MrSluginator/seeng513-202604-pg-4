-- Seed Data Script (PostgreSQL 16+)
-- Idempotent dummy data across all 13 tables in the Flare schema.

BEGIN;

-- 1. Tags
INSERT INTO tags (id, name, slug) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Music', 'music'),
    ('10000000-0000-0000-0000-000000000002', 'Food & Drink', 'food-drink'),
    ('10000000-0000-0000-0000-000000000003', 'Nightlife', 'nightlife'),
    ('10000000-0000-0000-0000-000000000004', 'Arts & Culture', 'arts-culture'),
    ('10000000-0000-0000-0000-000000000005', 'Outdoors', 'outdoors'),
    ('10000000-0000-0000-0000-000000000006', 'Tech & Networking', 'tech-networking'),
    ('10000000-0000-0000-0000-000000000007', 'Sports & Fitness', 'sports-fitness'),
    ('10000000-0000-0000-0000-000000000008', 'Markets', 'markets')
ON CONFLICT (id) DO NOTHING;

-- 2. Users
INSERT INTO users (id, username, email, password_hash, phone_number, account_type, spark_rating) VALUES
    ('20000000-0000-0000-0000-000000000001', 'alice_chen', 'alice@flare.example.com', '$2b$12$dummyhashalice00000000000000000000000000000000', '+1-403-555-0101', 'organizer', 420),
    ('20000000-0000-0000-0000-000000000002', 'marcus_vance', 'marcus@flare.example.com', '$2b$12$dummyhashmarcus0000000000000000000000000000000', '+1-403-555-0102', 'standard', 185),
    ('20000000-0000-0000-0000-000000000003', 'sofia_reyes', 'sofia@flare.example.com', '$2b$12$dummyhashsofia00000000000000000000000000000000', '+1-403-555-0103', 'organizer', 610),
    ('20000000-0000-0000-0000-000000000004', 'liam_oconnor', 'liam@flare.example.com', '$2b$12$dummyhashliam000000000000000000000000000000000', NULL, 'standard', 95),
    ('20000000-0000-0000-0000-000000000005', 'priya_patel', 'priya@flare.example.com', '$2b$12$dummyhashpriya00000000000000000000000000000000', '+1-403-555-0105', 'admin', 890)
ON CONFLICT (id) DO NOTHING;

-- 3. User Settings
INSERT INTO user_settings (user_id, profile_picture_url, social_links, feed_preferences, allow_mature_content) VALUES
    ('20000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', '{"instagram": "@alice.yyc", "twitter": "@alice_chen"}'::jsonb, '{"radius_km": 15, "sort_by": "trending"}'::jsonb, TRUE),
    ('20000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', '{"instagram": "@marcus_v"}'::jsonb, '{"radius_km": 10, "sort_by": "distance"}'::jsonb, FALSE),
    ('20000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80', '{"instagram": "@sofiareyes.art", "tiktok": "@sofia.yyc"}'::jsonb, '{"radius_km": 25, "sort_by": "recommended"}'::jsonb, TRUE),
    ('20000000-0000-0000-0000-000000000004', NULL, '{}'::jsonb, '{"radius_km": 5}'::jsonb, FALSE),
    ('20000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', '{"github": "priyapatel", "linkedin": "priya-patel"}'::jsonb, '{"radius_km": 50, "sort_by": "rating"}'::jsonb, TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Notification Settings
INSERT INTO notification_settings (user_id, rsvp_updates, rsvp_start_soon, interests_me, new_in_my_area, trending_in_my_area, spark_rating_updates) VALUES
    ('20000000-0000-0000-0000-000000000001', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
    ('20000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
    ('20000000-0000-0000-0000-000000000003', TRUE, FALSE, TRUE, TRUE, TRUE, FALSE),
    ('20000000-0000-0000-0000-000000000004', TRUE, TRUE, FALSE, TRUE, FALSE, TRUE),
    ('20000000-0000-0000-0000-000000000005', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- 5. User Friends
INSERT INTO user_friends (user_id, friend_id, status) VALUES
    ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'accepted'),
    ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'accepted'),
    ('20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005', 'accepted'),
    ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', 'accepted'),
    ('20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'pending')
ON CONFLICT (user_id, friend_id) DO NOTHING;

-- 6. User Preferred Tags
INSERT INTO user_preferred_tags (user_id, tag_id) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000008'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002'),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007'),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006'),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004'),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (user_id, tag_id) DO NOTHING;

-- 7. Events
INSERT INTO events (
    id, creator_id, title, summary, description,
    start_time, end_time, recurrence_pattern, recurrence_end_date,
    price_min, price_max, currency, location_name, latitude, longitude,
    crowd_by_hour, visits_count, shares_count, review_count, rating
) VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000001',
        'Beltline Midnight Jazz Jam',
        'Live brass and quartet improvisations in the heart of Beltline.',
        'Join local Calgary jazz musicians for an intimate late-night session featuring craft cocktails, vinyl sets between performances, and an open jam hour starting at 11 PM.',
        NOW() + INTERVAL '2 days 5 hours',
        NOW() + INTERVAL '2 days 9 hours',
        'weekly',
        NOW() + INTERVAL '90 days',
        15.00, 25.00, 'CAD',
        'Betty Lou''s Library, Beltline',
        51.038100, -114.079200,
        '{"0":12,"1":12,"2":12,"3":12,"4":12,"5":12,"6":12,"7":12,"8":12,"9":12,"10":12,"11":12,"12":12,"13":12,"14":12,"15":12,"16":12,"17":12,"18":12,"19":12,"20":88,"21":88,"22":88,"23":88}'::jsonb,
        142, 38, 2, 4.50
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000003',
        'Kensington Artisan & Coffee Pop-Up',
        'Weekend street market with local roasters, ceramics, and pastries.',
        'Stroll through Kensington Village and sample single-origin pour-overs, small-batch sourdough pastries, and handmade goods from over 30 local Calgary makers.',
        NOW() + INTERVAL '4 days 2 hours',
        NOW() + INTERVAL '4 days 8 hours',
        'one-time',
        NULL,
        0.00, 0.00, 'CAD',
        'Kensington Road NW Plaza',
        51.052400, -114.085600,
        '{"0":20,"1":20,"2":20,"3":20,"4":20,"5":20,"6":20,"7":20,"8":20,"9":20,"10":92,"11":92,"12":92,"13":92,"14":92,"15":92,"16":20,"17":20,"18":20,"19":20,"20":20,"21":20,"22":20,"23":20}'::jsonb,
        310, 74, 2, 5.00
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000005',
        'YYC AI & Full-Stack Builders Mixer',
        'Lightning talks and networking for Calgary software engineers.',
        'Monthly meetup bringing together developers, designers, and founders. Includes three 10-minute lightning demos followed by open networking and pizza.',
        NOW() + INTERVAL '7 days 4 hours',
        NOW() + INTERVAL '7 days 7 hours',
        'monthly',
        NOW() + INTERVAL '180 days',
        5.00, NULL, 'CAD',
        'The Nash Annex, Inglewood',
        51.041900, -114.036500,
        '{"0":10,"1":10,"2":10,"3":10,"4":10,"5":10,"6":10,"7":10,"8":10,"9":10,"10":10,"11":10,"12":10,"13":10,"14":10,"15":10,"16":10,"17":10,"18":76,"19":76,"20":76,"21":10,"22":10,"23":10}'::jsonb,
        89, 29, 1, 4.00
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000002',
        'Sunrise Bow River 5K Social Run',
        'Casual pace group run along the Bow River pathway + espresso.',
        'All paces welcome! Meet at Peace Bridge south entrance for a scenic 5 km loop along the river pathway, finishing at a nearby cafe.',
        NOW() + INTERVAL '1 day 14 hours',
        NOW() + INTERVAL '1 day 16 hours',
        'daily',
        NOW() + INTERVAL '60 days',
        0.00, NULL, 'CAD',
        'Peace Bridge South Plaza',
        51.053900, -114.078900,
        '{"0":8,"1":8,"2":8,"3":8,"4":8,"5":8,"6":8,"7":65,"8":65,"9":65,"10":8,"11":8,"12":8,"13":8,"14":8,"15":8,"16":8,"17":8,"18":8,"19":8,"20":8,"21":8,"22":8,"23":8}'::jsonb,
        64, 15, 1, 5.00
    ),
    (
        '30000000-0000-0000-0000-000000000005',
        '20000000-0000-0000-0000-000000000003',
        'Neon Horizons: Interactive Light Exhibition',
        'Outdoor projection mapping and soundscape installation.',
        'An evening outdoor digital art exhibition transforming East Village riverwalk walls into interactive audio-reactive visuals.',
        NOW() + INTERVAL '10 days 6 hours',
        NOW() + INTERVAL '10 days 10 hours',
        'none',
        NULL,
        12.00, 30.00, 'CAD',
        'East Village RiverWalk Square',
        51.045800, -114.051200,
        '{"0":18,"1":18,"2":18,"3":18,"4":18,"5":18,"6":18,"7":18,"8":18,"9":18,"10":18,"11":18,"12":18,"13":18,"14":18,"15":18,"16":18,"17":18,"18":18,"19":84,"20":84,"21":84,"22":84,"23":18}'::jsonb,
        215, 61, 1, 4.00
    )
ON CONFLICT (id) DO NOTHING;

-- 8. Event Tags
INSERT INTO event_tags (event_id, tag_id) VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004'),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006'),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002'),
    ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007'),
    ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005'),
    ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004'),
    ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003'),
    ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005')
ON CONFLICT (event_id, tag_id) DO NOTHING;

-- 9. Photos
INSERT INTO photos (id, uploader_id, file_name, file_url, file_size_bytes, mime_type) VALUES
    ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'beltline_jazz_cover.webp', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629', 348160, 'image/webp'),
    ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'beltline_jazz_crowd.jpg', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819', 512000, 'image/jpeg'),
    ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'kensington_coffee_cover.webp', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb', 289400, 'image/webp'),
    ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', 'yyc_tech_mixer.webp', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87', 410200, 'image/webp'),
    ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'peace_bridge_run.jpg', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8', 395000, 'image/jpeg'),
    ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', 'neon_horizons_cover.webp', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad', 612800, 'image/webp')
ON CONFLICT (id) DO NOTHING;

-- 10. Event Photos
INSERT INTO event_photos (event_id, photo_id, is_cover, display_order) VALUES
    ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', TRUE, 1),
    ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', FALSE, 2),
    ('30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', TRUE, 1),
    ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004', TRUE, 1),
    ('30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005', TRUE, 1),
    ('30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000006', TRUE, 1)
ON CONFLICT (event_id, photo_id) DO NOTHING;

-- 11. Reviews
INSERT INTO reviews (id, event_id, user_id, rating, content) VALUES
    ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 5, 'Incredible saxophone solo and great speakeasy vibe!'),
    ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 4, 'Loved the music, gets packed after 10 PM so arrive early.'),
    ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 5, 'Best weekend pop-up in Kensington! The cardamom buns were amazing.'),
    ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 5, NULL),
    ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 4, 'Great lightning talks and super welcoming developer crowd.'),
    ('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', 5, 'Perfect morning energy along the Bow River.'),
    ('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000004', 4, 'Awesome light installations by the river.')
ON CONFLICT (user_id, event_id) DO NOTHING;

-- 12. Saved Events
INSERT INTO saved_events (user_id, event_id, is_saved, user_visits) VALUES
    ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', TRUE, 2),
    ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', TRUE, 1),
    ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', TRUE, 3),
    ('20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', TRUE, 1),
    ('20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', TRUE, 0),
    ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', TRUE, 0),
    ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004', FALSE, 5)
ON CONFLICT (user_id, event_id) DO NOTHING;

-- 13. Scraped Events
INSERT INTO scraped_events (id, source_url, scrape_method, raw_data, status, parsed_event_id) VALUES
    (
        '60000000-0000-0000-0000-000000000001',
        'https://yycevents.example.com/listings/beltline-jazz-jam',
        'beautifulsoup_worker',
        '{"raw_title": "Beltline Midnight Jazz Jam", "venue": "Betty Lou''s Library", "price_text": "$15 - $25 CAD"}'::jsonb,
        'processed',
        '30000000-0000-0000-0000-000000000001'
    ),
    (
        '60000000-0000-0000-0000-000000000002',
        'https://yycevents.example.com/listings/kensington-artisan-popup',
        'beautifulsoup_worker',
        '{"raw_title": "Kensington Artisan & Coffee Pop-Up", "venue": "Kensington Road NW Plaza", "price_text": "Free admission"}'::jsonb,
        'processed',
        '30000000-0000-0000-0000-000000000002'
    ),
    (
        '60000000-0000-0000-0000-000000000003',
        'https://yycevents.example.com/listings/stampede-grounds-night-market',
        'rss_ingestor',
        '{"raw_title": "Stampede Park Twilight Food Trucks", "venue": "Stampede Park Midway", "date_string": "Next Friday 6:00 PM"}'::jsonb,
        'pending',
        NULL
    )
ON CONFLICT (id) DO NOTHING;

COMMIT;

