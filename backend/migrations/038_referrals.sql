-- Referral codes and tracked referrals (backend/src/services/referrals.ts, /api/referrals, /api/public/referral/track).
-- No earlier migration created these tables, so every referral call failed with a 500. Idempotent: an environment
-- that created them by hand keeps its tables and data.

CREATE TABLE IF NOT EXISTS referral_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code          TEXT NOT NULL UNIQUE,
  reward_type   TEXT NOT NULL DEFAULT 'discount',
  reward_amount NUMERIC NOT NULL DEFAULT 25,
  max_uses      INTEGER NOT NULL DEFAULT 999,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes (user_id);

CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_email   TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  reward_granted   BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals (referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_email ON referrals (referred_email);

-- Only the backend (service role) touches these tables.
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
