-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.calendars (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  plan jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calendars_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customer (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL UNIQUE,
  email text NOT NULL,
  name text DEFAULT ''::text,
  profile_picture text DEFAULT ''::text,
  gender text DEFAULT ''::text,
  location text DEFAULT ''::text,
  skin_tone text DEFAULT ''::text,
  face_shape text,
  body_shape text,
  personality text,
  is_new_user boolean DEFAULT true,
  affiliate_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  onboarding_completed boolean DEFAULT false,
  CONSTRAINT customer_pkey PRIMARY KEY (id),
  CONSTRAINT customer_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.pairings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  top_id uuid,
  bottom_id uuid,
  description text,
  accessories ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pairings_pkey PRIMARY KEY (id),
  CONSTRAINT pairings_top_id_fkey FOREIGN KEY (top_id) REFERENCES public.wardrobe_items(id),
  CONSTRAINT pairings_bottom_id_fkey FOREIGN KEY (bottom_id) REFERENCES public.wardrobe_items(id)
);
CREATE TABLE public.points_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint,
  action text NOT NULL,
  points integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT points_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT points_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_user_id bigint NOT NULL,
  referred_user_id bigint NOT NULL UNIQUE,
  referral_code text NOT NULL,
  points_awarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referrals_pkey PRIMARY KEY (id),
  CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.user(user_id),
  CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint,
  product_id text NOT NULL,
  product_name text,
  review_text text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  points_awarded integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  trigger_action text,
  feedback text,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);
CREATE TABLE public.reward_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint,
  reward_id uuid,
  purchased_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reward_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT reward_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id),
  CONSTRAINT reward_purchases_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.rewards(id)
);
CREATE TABLE public.rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cost integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rewards_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user (
  user_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL UNIQUE,
  user_role USER-DEFINED NOT NULL DEFAULT 'customer'::user_role,
  firebase_id character varying UNIQUE,
  name character varying,
  points integer NOT NULL DEFAULT 0,
  gender text,
  location text,
  skin_tone text,
  face_shape text,
  body_shape text,
  personality text,
  onboarding_completed boolean DEFAULT false,
  last_login_date date,
  referral_code text UNIQUE,
  total_referrals integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.wardrobe_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  category text CHECK (category = ANY (ARRAY['top'::text, 'bottom'::text])),
  file_path text NOT NULL,
  tags ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wardrobe_items_pkey PRIMARY KEY (id)
);