-- Email-code sign-up (services/auth/userMatching.ts) creates or matches a
-- users row without ever going through Clerk, so clerk_user_id must be
-- optional. The column keeps its UNIQUE constraint (Postgres allows any
-- number of NULLs in a UNIQUE column) so existing Clerk-created rows are
-- untouched and still cannot collide.
ALTER TABLE users ALTER COLUMN clerk_user_id DROP NOT NULL;
