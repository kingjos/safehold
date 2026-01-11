-- Create function to fund escrow from wallet
CREATE OR REPLACE FUNCTION public.fund_escrow_from_wallet(p_escrow_id uuid)
RETURNS wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_escrow public.transactions;
  v_total NUMERIC;
BEGIN
  -- Get the escrow transaction
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  
  IF v_escrow IS NULL THEN
    RAISE EXCEPTION 'Escrow not found';
  END IF;
  
  -- Verify the user is the client
  IF v_escrow.client_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the client can fund this escrow';
  END IF;
  
  -- Verify escrow is pending funding
  IF v_escrow.status != 'pending_funding' THEN
    RAISE EXCEPTION 'Escrow is not pending funding';
  END IF;
  
  -- Calculate total (amount + platform fee)
  v_total := v_escrow.amount + v_escrow.platform_fee;
  
  -- Get wallet
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = auth.uid();
  
  IF v_wallet IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF v_wallet.balance < v_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_total, v_wallet.balance;
  END IF;
  
  -- Deduct from wallet
  UPDATE public.wallets
  SET balance = balance - v_total
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;
  
  -- Create wallet transaction record
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
  ) VALUES (
    v_wallet.id, auth.uid(), 'escrow_fund', v_total, v_wallet.balance, 
    'Escrow Funding: ' || v_escrow.title, p_escrow_id, 'completed'
  ) RETURNING * INTO v_transaction;
  
  -- Update escrow status
  UPDATE public.transactions
  SET status = 'funded', funded_at = now()
  WHERE id = p_escrow_id;
  
  -- Create transaction event
  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'funded', 'Client funded the escrow from wallet');
  
  RETURN v_transaction;
END;
$$;

-- Create function to release escrow funds to vendor
CREATE OR REPLACE FUNCTION public.release_escrow_funds(p_escrow_id uuid)
RETURNS wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vendor_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_escrow public.transactions;
BEGIN
  -- Get the escrow transaction
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  
  IF v_escrow IS NULL THEN
    RAISE EXCEPTION 'Escrow not found';
  END IF;
  
  -- Verify the user is the client
  IF v_escrow.client_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the client can release funds';
  END IF;
  
  -- Verify escrow is in a releasable state
  IF v_escrow.status NOT IN ('pending_release', 'in_progress', 'funded') THEN
    RAISE EXCEPTION 'Escrow cannot be released in current status';
  END IF;
  
  -- Verify vendor exists
  IF v_escrow.vendor_id IS NULL THEN
    RAISE EXCEPTION 'No vendor assigned to this escrow';
  END IF;
  
  -- Get or create vendor wallet
  SELECT * INTO v_vendor_wallet FROM public.wallets WHERE user_id = v_escrow.vendor_id;
  
  IF v_vendor_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (v_escrow.vendor_id) RETURNING * INTO v_vendor_wallet;
  END IF;
  
  -- Add to vendor wallet (amount without platform fee)
  UPDATE public.wallets
  SET balance = balance + v_escrow.amount
  WHERE id = v_vendor_wallet.id
  RETURNING * INTO v_vendor_wallet;
  
  -- Create wallet transaction for vendor
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
  ) VALUES (
    v_vendor_wallet.id, v_escrow.vendor_id, 'escrow_release', v_escrow.amount, v_vendor_wallet.balance, 
    'Escrow Payment: ' || v_escrow.title, p_escrow_id, 'completed'
  ) RETURNING * INTO v_transaction;
  
  -- Update escrow status
  UPDATE public.transactions
  SET status = 'completed', completed_at = now()
  WHERE id = p_escrow_id;
  
  -- Create transaction event
  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'completed', 'Client released funds to vendor');
  
  RETURN v_transaction;
END;
$$;