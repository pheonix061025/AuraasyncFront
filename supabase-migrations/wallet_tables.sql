-- Wallet Balance Table
CREATE TABLE public.wallet_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  currency text DEFAULT 'INR',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wallet_balances_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);

-- Razorpay Orders Table
CREATE TABLE public.razorpay_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  razorpay_order_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  currency text DEFAULT 'INR',
  coins integer NOT NULL,
  status text NOT NULL DEFAULT 'created',
  payment_id text,
  razorpay_signature text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT razorpay_orders_pkey PRIMARY KEY (id),
  CONSTRAINT razorpay_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);

-- Wallet Transactions Table
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  transaction_type text NOT NULL,
  amount integer NOT NULL,
  coins integer NOT NULL,
  description text,
  razorpay_order_id text,
  payment_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user(user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_wallet_balances_user_id ON public.wallet_balances(user_id);
CREATE INDEX idx_razorpay_orders_user_id ON public.razorpay_orders(user_id);
CREATE INDEX idx_razorpay_orders_status ON public.razorpay_orders(status);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions(status);
