-- Run after the Spring application has created/updated its tables:
-- mysql -h 127.0.0.1 -P 3306 -u instagram_user -p backend_instagram < seed-demo.sql
-- Demo password for all seeded accounts: InstagramDemo!2026
-- Roles:
--   admin@instagram.local     USER + ADMIN
--   moderator@instagram.local USER + MODERATOR
--   linh/minh                 USER

INSERT INTO roles (code) VALUES ('USER'), ('MODERATOR'), ('ADMIN')
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'admin', 'Demo Admin', 'admin@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://i.pravatar.cc/300?img=12', 'Demo account for local testing', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'admin@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'moderator_demo', 'Demo Moderator', 'moderator@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://i.pravatar.cc/300?img=5', 'Demo moderation account', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'moderator@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'linh_demo', 'Linh Nguyen', 'linh@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://i.pravatar.cc/300?img=47', 'Coffee, travel, and little moments', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'linh@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'minh_demo', 'Minh Tran', 'minh@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://i.pravatar.cc/300?img=33', 'Weekend photographer', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'minh@instagram.local');

-- More demo users for a lively feed, recommendations, and story bar
INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'an_traveler', 'An Nguyen', 'an@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', 'Exploring the world one coffee at a time ✈️☕', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'an@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'hoa_designer', 'Hoa Dang', 'hoa@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', 'Product Designer & Visual Creator 🎨✨', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'hoa@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'duc_coder', 'Duc Hoang', 'duc@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Building with Spring Boot & React 💻☕', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'duc@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'mai_foodie', 'Mai Le', 'mai@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'Chasing flavors & Saigon street food 🍜🍰', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'mai@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'phuong_film', 'Phuong Vu', 'phuong@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', 'Film cameras & candid street memories 🎞️📸', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'phuong@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'quang_fitness', 'Quang Pham', 'quang@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'Fitness & healthy lifestyle coach 🏋️‍♂️🥗', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'quang@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'lan_artist', 'Lan Tran', 'lan@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400', 'Digital art & whimsical sketches 🖌️🌸', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'lan@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'nam_music', 'Nam Vo', 'nam@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400', 'Indie music producer & vinyl collector 🎧🎵', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'nam@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'thu_books', 'Thu Ha', 'thu@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'Book lover & cozy afternoon reader 📚☕', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'thu@instagram.local');

INSERT INTO users (user_nickname, user_fullname, user_email, user_password, user_image, user_bio, is_online, created_at)
SELECT 'bao_arch', 'Bao Dang', 'bao@instagram.local', '$2a$10$QPRY62IaT8vmj/idabOVhu4QrjX8hlOq5clVknvFkQZL8AaKRrqe.',
       'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'Architecture enthusiast & urban lines 🏛️📐', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE user_email = 'bao@instagram.local');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r WHERE r.code = 'USER';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE r.code = 'ADMIN' AND u.user_email = 'admin@instagram.local';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE r.code = 'MODERATOR' AND u.user_email = 'moderator@instagram.local';

INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'A quiet morning in Saigon', u.id, NOW() - INTERVAL 2 HOUR, 1, 1, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'admin@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title = 'A quiet morning in Saigon');

INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'Weekend escape', u.id, NOW() - INTERVAL 1 DAY, 1, 1, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'linh@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title = 'Weekend escape');

INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'admin@instagram.local' AND p.title = 'A quiet morning in Saigon'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'linh@instagram.local' AND p.title = 'Weekend escape'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

INSERT INTO comments (user_id, post_id, content, created_at)
SELECT actor.id, p.id, 'This looks lovely!', NOW()
FROM users actor CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE actor.user_email = 'linh@instagram.local' AND owner.user_email = 'admin@instagram.local'
AND p.title = 'A quiet morning in Saigon'
AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.user_id = actor.id AND c.post_id = p.id AND c.content = 'This looks lovely!');

INSERT INTO comments (user_id, post_id, content, created_at)
SELECT actor.id, p.id, 'Adding this place to my list!', NOW()
FROM users actor CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE actor.user_email = 'admin@instagram.local' AND owner.user_email = 'linh@instagram.local'
AND p.title = 'Weekend escape'
AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.user_id = actor.id AND c.post_id = p.id AND c.content = 'Adding this place to my list!');

INSERT INTO likes (user_id, post_id, created_at)
SELECT actor.id, p.id, NOW()
FROM users actor CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE actor.user_email = 'linh@instagram.local' AND owner.user_email = 'admin@instagram.local'
AND p.title = 'A quiet morning in Saigon'
AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.user_id = actor.id AND l.post_id = p.id);

INSERT INTO likes (user_id, post_id, created_at)
SELECT actor.id, p.id, NOW()
FROM users actor CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE actor.user_email = 'admin@instagram.local' AND owner.user_email = 'linh@instagram.local'
AND p.title = 'Weekend escape'
AND NOT EXISTS (SELECT 1 FROM likes l WHERE l.user_id = actor.id AND l.post_id = p.id);

INSERT INTO user_follow (follower_id, following_id, created_at, is_blocking, is_friend)
SELECT follower.id, following.id, NOW(), 0, 1
FROM users follower CROSS JOIN users following
WHERE follower.user_email = 'admin@instagram.local' AND following.user_email = 'linh@instagram.local'
AND NOT EXISTS (SELECT 1 FROM user_follow f WHERE f.follower_id = follower.id AND f.following_id = following.id);

INSERT INTO user_follow (follower_id, following_id, created_at, is_blocking, is_friend)
SELECT follower.id, following.id, NOW(), 0, 1
FROM users follower CROSS JOIN users following
WHERE follower.user_email = 'linh@instagram.local' AND following.user_email = 'admin@instagram.local'
AND NOT EXISTS (SELECT 1 FROM user_follow f WHERE f.follower_id = follower.id AND f.following_id = following.id);

INSERT INTO stories (user_id, url, access, status, created_at, moderation_state)
SELECT u.id, 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=900', 'PUBLIC', 1, NOW(), 'VISIBLE'
FROM users u WHERE u.user_email = 'admin@instagram.local'
AND NOT EXISTS (SELECT 1 FROM stories s WHERE s.user_id = u.id AND s.url LIKE '%1500534623283%');

INSERT INTO stories (user_id, url, access, status, created_at, moderation_state)
SELECT u.id, 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900', 'PUBLIC', 1, NOW(), 'VISIBLE'
FROM users u WHERE u.user_email = 'linh@instagram.local'
AND NOT EXISTS (SELECT 1 FROM stories s WHERE s.user_id = u.id AND s.url LIKE '%1470770841072%');

INSERT INTO notifications (user_id, actor_id, post_id, type, message, sent_at, is_read)
SELECT owner.id, actor.id, p.id, 'LIKE', 'linh_demo liked your post', NOW(), 0
FROM users actor CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE actor.user_email = 'linh@instagram.local' AND owner.user_email = 'admin@instagram.local'
AND p.title = 'A quiet morning in Saigon'
AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = owner.id AND n.actor_id = actor.id AND n.post_id = p.id AND n.type = 'LIKE');

INSERT INTO conversations (name, is_group_chat, created_at, updated_at)
SELECT 'Demo chat', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM conversations WHERE name = 'Demo chat');

INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
SELECT c.id, u.id, NOW()
FROM conversations c CROSS JOIN users u
WHERE c.name = 'Demo chat' AND u.user_email IN ('admin@instagram.local', 'linh@instagram.local')
AND NOT EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = u.id);

INSERT INTO messages (conversation_id, sender_id, content, created_at, is_read)
SELECT c.id, u.id, 'Hi! This is a seeded conversation for testing.', NOW(), 1
FROM conversations c CROSS JOIN users u
WHERE c.name = 'Demo chat' AND u.user_email = 'admin@instagram.local'
AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content = 'Hi! This is a seeded conversation for testing.');

INSERT INTO messages (conversation_id, sender_id, content, created_at, is_read)
SELECT c.id, u.id, 'Nice to meet you here!', NOW(), 0
FROM conversations c CROSS JOIN users u
WHERE c.name = 'Demo chat' AND u.user_email = 'linh@instagram.local'
AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content = 'Nice to meet you here!');

INSERT INTO reports (reporter_id, target_type, target_id, reason_code, note, status, version, created_at)
SELECT reporter.id, 'POST', p.id, 'SPAM', 'Looks like spam to me.', 'OPEN', 0, NOW() - INTERVAL 3 HOUR
FROM users reporter CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE reporter.user_email = 'minh@instagram.local'
AND owner.user_email = 'admin@instagram.local'
AND p.title = 'A quiet morning in Saigon'
AND NOT EXISTS (
  SELECT 1 FROM reports r WHERE r.reporter_id = reporter.id
  AND r.target_type = 'POST' AND r.target_id = p.id
);

INSERT INTO reports (reporter_id, target_type, target_id, reason_code, note, status, assignee_id, claimed_at, version, created_at)
SELECT reporter.id, 'COMMENT', c.id, 'HARASSMENT', 'Demo claimed report.', 'CLAIMED', mod_user.id, NOW() - INTERVAL 1 HOUR, 0, NOW() - INTERVAL 5 HOUR
FROM users reporter CROSS JOIN comments c
JOIN posts p ON p.id = c.post_id
JOIN users commenter ON commenter.id = c.user_id
CROSS JOIN users mod_user
WHERE reporter.user_email = 'admin@instagram.local'
AND commenter.user_email = 'admin@instagram.local'
AND mod_user.user_email = 'moderator@instagram.local'
AND c.content = 'Adding this place to my list!'
AND NOT EXISTS (
  SELECT 1 FROM reports r WHERE r.reporter_id = reporter.id
  AND r.target_type = 'COMMENT' AND r.target_id = c.id
);

-- Fix any broken local media URLs left behind by restarted containers
UPDATE media
SET url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1000'
WHERE url LIKE '%localhost:4566%' OR url LIKE '%1792770830241%';

-- Ensure demo posts are visible
UPDATE posts SET moderation_state = 'VISIBLE' WHERE moderation_state IS NULL OR moderation_state = 'HIDDEN';
UPDATE stories SET moderation_state = 'VISIBLE' WHERE moderation_state IS NULL OR moderation_state = 'HIDDEN';
UPDATE comments SET moderation_state = 'VISIBLE' WHERE moderation_state IS NULL OR moderation_state = 'HIDDEN';

-- More sample posts with high quality Unsplash photos
INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'Sunset over the coastal cliffs 🌅 Can never get tired of this view.', u.id, NOW() - INTERVAL 5 HOUR, 3, 2, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'an@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title LIKE 'Sunset over the coastal%');

INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'New minimalist workstation setup for the week ahead 🖥️✨ Keeping it clean and distraction-free.', u.id, NOW() - INTERVAL 12 HOUR, 5, 3, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'hoa@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title LIKE 'New minimalist workstation%');

INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'Late night coding session fueled by cold brew ☕ Bug resolved at 1 AM!', u.id, NOW() - INTERVAL 18 HOUR, 4, 1, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'duc@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title LIKE 'Late night coding%');

INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'Best artisan pastries in town 🥐 Crispy outside, pillowy inside.', u.id, NOW() - INTERVAL 1 DAY, 6, 2, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'mai@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title LIKE 'Best artisan pastries%');

INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'Quiet rainy afternoon through a 35mm lens 🎞️📸', u.id, NOW() - INTERVAL 2 DAY, 2, 1, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'phuong@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title LIKE 'Quiet rainy afternoon%');

INSERT INTO posts (title, user_id, created_at, likes_count, comments_count, status, access, moderation_state)
SELECT 'Studio vibes 🎹 Working on something special for the upcoming EP.', u.id, NOW() - INTERVAL 3 DAY, 7, 3, 'True', 'PUBLIC', 'VISIBLE'
FROM users u WHERE u.user_email = 'nam@instagram.local'
AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.user_id = u.id AND p.title LIKE 'Studio vibes%');

-- Media for new posts
INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'an@instagram.local' AND p.title LIKE 'Sunset over the coastal%'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'hoa@instagram.local' AND p.title LIKE 'New minimalist workstation%'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'duc@instagram.local' AND p.title LIKE 'Late night coding%'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'mai@instagram.local' AND p.title LIKE 'Best artisan pastries%'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'phuong@instagram.local' AND p.title LIKE 'Quiet rainy afternoon%'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

INSERT INTO media (url, type, post_id, created_at)
SELECT 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000', 'IMAGE', p.id, NOW()
FROM posts p JOIN users u ON u.id = p.user_id
WHERE u.user_email = 'nam@instagram.local' AND p.title LIKE 'Studio vibes%'
AND NOT EXISTS (SELECT 1 FROM media m WHERE m.post_id = p.id);

-- Additional comments
INSERT INTO comments (user_id, post_id, content, created_at)
SELECT actor.id, p.id, 'Stunning capture! Where was this taken?', NOW()
FROM users actor CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE actor.user_email = 'admin@instagram.local' AND owner.user_email = 'an@instagram.local'
AND p.title LIKE 'Sunset over the coastal%'
AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.user_id = actor.id AND c.post_id = p.id AND c.content LIKE 'Stunning capture%');

INSERT INTO comments (user_id, post_id, content, created_at)
SELECT actor.id, p.id, 'Love the color scheme and desk mat!', NOW()
FROM users actor CROSS JOIN posts p JOIN users owner ON owner.id = p.user_id
WHERE actor.user_email = 'duc@instagram.local' AND owner.user_email = 'hoa@instagram.local'
AND p.title LIKE 'New minimalist workstation%'
AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.user_id = actor.id AND c.post_id = p.id AND c.content LIKE 'Love the color%');

-- Follow relationships:
-- 1) Admin follows: linh_demo, an_traveler, hoa_designer, duc_coder, mai_foodie, nam_music (creates rich feed & stories)
INSERT INTO user_follow (follower_id, following_id, created_at, is_blocking, is_friend)
SELECT follower.id, following.id, NOW(), 0, 1
FROM users follower CROSS JOIN users following
WHERE follower.user_email = 'admin@instagram.local'
AND following.user_email IN ('an@instagram.local', 'hoa@instagram.local', 'duc@instagram.local', 'mai@instagram.local', 'nam@instagram.local')
AND NOT EXISTS (SELECT 1 FROM user_follow f WHERE f.follower_id = follower.id AND f.following_id = following.id);

-- 2) Users follow Admin: linh_demo, an_traveler, hoa_designer, phuong_film, mai_foodie (creates follower list in sidebar)
INSERT INTO user_follow (follower_id, following_id, created_at, is_blocking, is_friend)
SELECT follower.id, following.id, NOW(), 0, 1
FROM users follower CROSS JOIN users following
WHERE following.user_email = 'admin@instagram.local'
AND follower.user_email IN ('an@instagram.local', 'hoa@instagram.local', 'phuong@instagram.local', 'mai@instagram.local')
AND NOT EXISTS (SELECT 1 FROM user_follow f WHERE f.follower_id = follower.id AND f.following_id = following.id);

-- 3) Active fresh Stories (valid for 24h) for users admin follows
INSERT INTO stories (user_id, url, access, status, created_at, moderation_state)
SELECT u.id, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900', 'PUBLIC', 1, NOW(), 'VISIBLE'
FROM users u WHERE u.user_email = 'an@instagram.local'
AND NOT EXISTS (SELECT 1 FROM stories s WHERE s.user_id = u.id AND s.url LIKE '%1507525428034%');

INSERT INTO stories (user_id, url, access, status, created_at, moderation_state)
SELECT u.id, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=900', 'PUBLIC', 1, NOW(), 'VISIBLE'
FROM users u WHERE u.user_email = 'hoa@instagram.local'
AND NOT EXISTS (SELECT 1 FROM stories s WHERE s.user_id = u.id AND s.url LIKE '%1527443224154%');

INSERT INTO stories (user_id, url, access, status, created_at, moderation_state)
SELECT u.id, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900', 'PUBLIC', 1, NOW(), 'VISIBLE'
FROM users u WHERE u.user_email = 'duc@instagram.local'
AND NOT EXISTS (SELECT 1 FROM stories s WHERE s.user_id = u.id AND s.url LIKE '%1555066931436%');

INSERT INTO stories (user_id, url, access, status, created_at, moderation_state)
SELECT u.id, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900', 'PUBLIC', 1, NOW(), 'VISIBLE'
FROM users u WHERE u.user_email = 'mai@instagram.local'
AND NOT EXISTS (SELECT 1 FROM stories s WHERE s.user_id = u.id AND s.url LIKE '%1509440159596%');

INSERT INTO audit_logs (actor_id, actor_label, action, target_type, target_id, reason_code, reason_text, metadata, created_at)
SELECT u.id, CONCAT(u.user_nickname, '#', u.id), 'ROLE_BOOTSTRAP', 'USER', u.id, 'SEED', 'Seeded demo roles', JSON_OBJECT('roles', JSON_ARRAY('USER', 'ADMIN')), NOW()
FROM users u
WHERE u.user_email = 'admin@instagram.local'
AND NOT EXISTS (
  SELECT 1 FROM audit_logs a WHERE a.action = 'ROLE_BOOTSTRAP' AND a.target_id = u.id
);
