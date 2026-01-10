-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_number, bank_name)
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own bank accounts"
ON public.bank_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts"
ON public.bank_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts"
ON public.bank_accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts"
ON public.bank_accounts
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all bank accounts"
ON public.bank_accounts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one default bank account per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_bank_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting this account as default, unset all others for this user
  IF NEW.is_default = true THEN
    UPDATE public.bank_accounts
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  -- If this is the first account for the user, make it default
  IF NOT EXISTS (
    SELECT 1 FROM public.bank_accounts 
    WHERE user_id = NEW.user_id AND id != NEW.id
  ) THEN
    NEW.is_default := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for default bank account management
CREATE TRIGGER ensure_single_default_bank_account_trigger
BEFORE INSERT OR UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_bank_account();