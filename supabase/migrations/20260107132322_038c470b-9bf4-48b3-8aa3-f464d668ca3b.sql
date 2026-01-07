-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet_transactions table for transaction history
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'escrow_fund', 'escrow_release', 'refund')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  escrow_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallets RLS policies
CREATE POLICY "Users can view their own wallet"
ON public.wallets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.wallets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create wallets"
ON public.wallets
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all wallets"
ON public.wallets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Wallet transactions RLS policies
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create wallet transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all wallet transactions"
ON public.wallet_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user function to also create a wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  -- Default role is client
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  -- Create wallet for new user
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create function to fund wallet
CREATE OR REPLACE FUNCTION public.fund_wallet(
  p_amount NUMERIC,
  p_reference TEXT DEFAULT NULL
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Get or create wallet
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = auth.uid();
  
  IF v_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (auth.uid()) RETURNING * INTO v_wallet;
  END IF;

  -- Update wallet balance
  UPDATE public.wallets
  SET balance = balance + p_amount
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, reference, status
  ) VALUES (
    v_wallet.id, auth.uid(), 'deposit', p_amount, v_wallet.balance, 'Wallet Funding', p_reference, 'completed'
  ) RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

-- Create function to withdraw from wallet
CREATE OR REPLACE FUNCTION public.withdraw_wallet(
  p_amount NUMERIC,
  p_bank_details TEXT DEFAULT NULL
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_fee NUMERIC := 50;
  v_total NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  v_total := p_amount + v_fee;

  -- Get wallet
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = auth.uid();
  
  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_wallet.balance < v_total THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Update wallet balance
  UPDATE public.wallets
  SET balance = balance - v_total
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  -- Create transaction record
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, reference, status
  ) VALUES (
    v_wallet.id, auth.uid(), 'withdrawal', v_total, v_wallet.balance, 
    'Bank Withdrawal', p_bank_details, 'pending'
  ) RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;