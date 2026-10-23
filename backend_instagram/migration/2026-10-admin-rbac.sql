-- One-time migration for an existing local database.
-- Fresh databases are created by Hibernate (ddl-auto=update) and then seeded.
-- Back up the database before running this file.
--
-- Notes:
-- * posts.status keeps its legacy meaning ("True"/"false" for user visibility).
--   Admin moderation uses the new moderation_state column.
-- * Existing posts with status='false' are treated as legacy user-deleted and are
--   not automatically marked HIDDEN. Review them manually if needed.
-- * Rotate JWT_BASE64_SECRET when deploying the new role-aware tokens.

ALTER TABLE users
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN suspended_until DATETIME(6) NULL,
  ADD COLUMN status_reason_code VARCHAR(32) NULL,
  ADD COLUMN status_reason VARCHAR(500) NULL,
  ADD COLUMN status_changed_at DATETIME(6) NULL,
  ADD COLUMN status_changed_by BIGINT NULL;

ALTER TABLE posts
  ADD COLUMN moderation_state VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN moderation_reason_code VARCHAR(32) NULL,
  ADD COLUMN moderation_reason VARCHAR(500) NULL,
  ADD COLUMN moderated_at DATETIME(6) NULL,
  ADD COLUMN moderated_by BIGINT NULL;

ALTER TABLE comments
  ADD COLUMN moderation_state VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN moderation_reason_code VARCHAR(32) NULL,
  ADD COLUMN moderation_reason VARCHAR(500) NULL,
  ADD COLUMN moderated_at DATETIME(6) NULL,
  ADD COLUMN moderated_by BIGINT NULL;

ALTER TABLE stories
  ADD COLUMN moderation_state VARCHAR(16) NOT NULL DEFAULT 'VISIBLE',
  ADD COLUMN moderation_reason_code VARCHAR(32) NULL,
  ADD COLUMN moderation_reason VARCHAR(500) NULL,
  ADD COLUMN moderated_at DATETIME(6) NULL,
  ADD COLUMN moderated_by BIGINT NULL;

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_posts_state_created ON posts(moderation_state, created_at);
CREATE INDEX idx_comments_state_created ON comments(moderation_state, created_at);
CREATE INDEX idx_stories_state_created ON stories(moderation_state, created_at);

CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(16) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  reporter_id BIGINT NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  target_id BIGINT NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  note VARCHAR(1000) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  assignee_id BIGINT NULL,
  claimed_at DATETIME(6) NULL,
  decided_by BIGINT NULL,
  action VARCHAR(32) NULL,
  decision_note VARCHAR(1000) NULL,
  decided_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_report_reporter_target (reporter_id, target_type, target_id),
  KEY idx_reports_status_created (status, created_at),
  KEY idx_reports_assignee_status (assignee_id, status),
  KEY idx_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_reports_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),
  CONSTRAINT fk_reports_decider FOREIGN KEY (decided_by) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT NULL,
  actor_label VARCHAR(128) NOT NULL,
  action VARCHAR(48) NOT NULL,
  target_type VARCHAR(16) NULL,
  target_id BIGINT NULL,
  report_id BIGINT NULL,
  reason_code VARCHAR(32) NULL,
  reason_text VARCHAR(1000) NULL,
  metadata JSON NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME(6) NOT NULL,
  KEY idx_audit_created (created_at),
  KEY idx_audit_actor (actor_id, created_at),
  KEY idx_audit_target (target_type, target_id),
  KEY idx_audit_action (action, created_at)
);

INSERT INTO roles (code) VALUES ('USER'), ('MODERATOR'), ('ADMIN')
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r WHERE r.code = 'USER';

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE r.code = 'ADMIN' AND u.user_email = 'admin@instagram.local';
