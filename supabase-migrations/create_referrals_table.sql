-- Create referrals table to track who referred whom
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_user_id bigint NOT NULL,
  referred_user_id bigint NOT NULL,
  referral_code text NOT NULL,
  points_awarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.user(user_id),
  CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.user(user_id),
  -- Ensure a user can only be referred once
  CONSTRAINT unique_referred_user UNIQUE (referred_user_id),
  -- Ensure the same pair can't refer each other multiple times
  CONSTRAINT unique_referral_pair UNIQUE (referrer_user_id, referred_user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

-- Add RLS policies (disabled for now to allow client-side access)
-- ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- If you want to enable RLS later, uncomment these policies:
-- CREATE POLICY "Allow public read access" ON public.referrals
--   FOR SELECT USING (true);

-- CREATE POLICY "Allow public insert access" ON public.referrals
--   FOR INSERT WITH CHECK (true);
