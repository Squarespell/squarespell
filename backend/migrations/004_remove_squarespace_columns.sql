-- Migration 004: Remove dead Squarespace OAuth columns
-- These were never used in production. The embed approach doesn't need OAuth.

ALTER TABLE users DROP COLUMN IF EXISTS squarespace_token;
ALTER TABLE users DROP COLUMN IF EXISTS squarespace_site_url;
