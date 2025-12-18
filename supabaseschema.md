-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint,
  product_id text NOT NULL,
  product_name text,
  review_text text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  points_awarded integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
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