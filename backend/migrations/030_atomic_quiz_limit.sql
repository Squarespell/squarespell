-- Migration 030: Atomic quiz limit check + increment
-- Prevents race condition where two concurrent creates both pass the limit check.
-- Returns TRUE if the increment succeeded (under limit), FALSE if at/over limit.

CREATE OR REPLACE FUNCTION try_increment_quiz_count(uid UUID, max_allowed INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Lock the user row to prevent concurrent reads
  SELECT quiz_count INTO current_count
  FROM users
  WHERE id = uid
  FOR UPDATE;

  IF current_count IS NULL THEN
    RETURN FALSE;
  END IF;

  IF current_count >= max_allowed THEN
    RETURN FALSE;
  END IF;

  UPDATE users SET quiz_count = quiz_count + 1 WHERE id = uid;
  RETURN TRUE;
END;
$$;
