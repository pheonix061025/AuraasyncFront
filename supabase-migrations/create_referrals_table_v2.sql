-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS public.referrals CASCADE;

-- Create referrals table to track who referred whom
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_user_id bigint NOT NULL,
  referred_user_id bigint NOT NULL,
  referral_code text NOT NULL,
  points_awarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.user(user_id) ON DELETE CASCADE,
  CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.user(user_id) ON DELETE CASCADE,
  -- Ensure a user can only be referred once
  CONSTRAINT unique_referred_user UNIQUE (referred_user_id),
  -- Ensure the same pair can't refer each other multiple times
  CONSTRAINT unique_referral_pair UNIQUE (referrer_user_id, referred_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

-- Disable RLS for this table (since we're using Firebase Auth, not Supabase Auth)
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.referrals TO anon;
GRANT ALL ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

-- Verify the table was created
SELECT 'Referrals table created successfully!' as status;
