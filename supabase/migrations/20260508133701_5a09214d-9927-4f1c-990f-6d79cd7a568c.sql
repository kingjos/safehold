
-- 1) Update fund_escrow_from_wallet to also notify vendor (SECURITY DEFINER bypasses notif RLS)
CREATE OR REPLACE FUNCTION public.fund_escrow_from_wallet(p_escrow_id uuid)
 RETURNS wallet_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_escrow public.transactions;
  v_total NUMERIC;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.client_id != auth.uid() THEN RAISE EXCEPTION 'Only the client can fund this escrow'; END IF;
  IF v_escrow.status != 'pending_funding' THEN RAISE EXCEPTION 'Escrow is not pending funding'; END IF;

  v_total := v_escrow.amount + v_escrow.platform_fee;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = auth.uid();
  IF v_wallet IS NULL THEN RAISE EXCEPTION 'Wallet not found'; END IF;
  IF v_wallet.balance < v_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_total, v_wallet.balance;
  END IF;

  UPDATE public.wallets SET balance = balance - v_total WHERE id = v_wallet.id RETURNING * INTO v_wallet;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
  ) VALUES (
    v_wallet.id, auth.uid(), 'escrow_fund', v_total, v_wallet.balance,
    'Escrow Funding: ' || v_escrow.title, p_escrow_id, 'completed'
  ) RETURNING * INTO v_transaction;

  UPDATE public.transactions SET status = 'funded', funded_at = now() WHERE id = p_escrow_id;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'funded', 'Client funded the escrow from wallet');

  -- Notify vendor (bypasses notif RLS via SECURITY DEFINER)
  IF v_escrow.vendor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
    VALUES (
      v_escrow.vendor_id, 'escrow_funded', 'New Escrow Funded',
      'An escrow for "' || v_escrow.title || '" has been funded. Please review and accept.',
      p_escrow_id
    );
  END IF;

  RETURN v_transaction;
END;
$function$;

-- 2) Vendor accept
CREATE OR REPLACE FUNCTION public.vendor_accept_escrow(p_escrow_id uuid)
 RETURNS public.transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.vendor_id IS NULL OR v_escrow.vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can accept this escrow';
  END IF;
  IF v_escrow.status != 'funded' THEN
    RAISE EXCEPTION 'Escrow must be funded before acceptance (current: %)', v_escrow.status;
  END IF;

  UPDATE public.transactions
  SET status = 'in_progress', started_at = now(), updated_at = now()
  WHERE id = p_escrow_id
  RETURNING * INTO v_escrow;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'accepted', 'Vendor accepted the escrow and started work');

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.client_id, 'escrow_accepted', 'Escrow Accepted',
    'The vendor accepted "' || v_escrow.title || '" and started work.', p_escrow_id);

  RETURN v_escrow;
END;
$function$;

-- 3) Vendor decline (auto-refund)
CREATE OR REPLACE FUNCTION public.vendor_decline_escrow(p_escrow_id uuid, p_reason text DEFAULT NULL)
 RETURNS public.transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow public.transactions;
  v_client_wallet public.wallets;
  v_refund NUMERIC;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.vendor_id IS NULL OR v_escrow.vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can decline this escrow';
  END IF;
  IF v_escrow.status NOT IN ('funded','pending_funding') THEN
    RAISE EXCEPTION 'Escrow can only be declined before work starts (current: %)', v_escrow.status;
  END IF;

  -- Refund if it was funded
  IF v_escrow.status = 'funded' THEN
    v_refund := v_escrow.amount + v_escrow.platform_fee;

    SELECT * INTO v_client_wallet FROM public.wallets WHERE user_id = v_escrow.client_id;
    IF v_client_wallet IS NULL THEN
      INSERT INTO public.wallets (user_id) VALUES (v_escrow.client_id) RETURNING * INTO v_client_wallet;
    END IF;

    UPDATE public.wallets SET balance = balance + v_refund
    WHERE id = v_client_wallet.id RETURNING * INTO v_client_wallet;

    INSERT INTO public.wallet_transactions (
      wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
    ) VALUES (
      v_client_wallet.id, v_escrow.client_id, 'escrow_refund', v_refund, v_client_wallet.balance,
      'Escrow Refund (vendor declined): ' || v_escrow.title, p_escrow_id, 'completed'
    );
  END IF;

  UPDATE public.transactions
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_escrow_id
  RETURNING * INTO v_escrow;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'declined',
    COALESCE('Vendor declined the escrow: ' || p_reason, 'Vendor declined the escrow'));

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.client_id, 'escrow_declined', 'Escrow Declined',
    'The vendor declined "' || v_escrow.title || '"' ||
    CASE WHEN v_refund IS NOT NULL THEN '. Funds refunded to your wallet.' ELSE '.' END,
    p_escrow_id);

  RETURN v_escrow;
END;
$function$;

-- 4) Vendor mark complete (-> pending_release)
CREATE OR REPLACE FUNCTION public.vendor_mark_complete(p_escrow_id uuid)
 RETURNS public.transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.vendor_id IS NULL OR v_escrow.vendor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned vendor can mark this escrow complete';
  END IF;
  IF v_escrow.status != 'in_progress' THEN
    RAISE EXCEPTION 'Escrow must be in progress (current: %)', v_escrow.status;
  END IF;

  UPDATE public.transactions
  SET status = 'pending_release', updated_at = now()
  WHERE id = p_escrow_id
  RETURNING * INTO v_escrow;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'submitted', 'Vendor marked the work as complete and requested release');

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.client_id, 'escrow_pending_release', 'Work Submitted for Release',
    'The vendor submitted "' || v_escrow.title || '" for release. Please review and release funds.',
    p_escrow_id);

  RETURN v_escrow;
END;
$function$;

-- 5) Restrict transactions UPDATE policies so status can't be flipped directly outside RPCs.
-- Only allow non-status field edits by parties; status transitions must go through SECURITY DEFINER funcs.
DROP POLICY IF EXISTS "Clients can update their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Vendors can update assigned transactions" ON public.transactions;

CREATE POLICY "Clients can update non-status fields"
ON public.transactions
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (
  auth.uid() = client_id
  AND status = (SELECT status FROM public.transactions WHERE id = transactions.id)
);

CREATE POLICY "Vendors can update non-status fields"
ON public.transactions
FOR UPDATE
USING (auth.uid() = vendor_id)
WITH CHECK (
  auth.uid() = vendor_id
  AND status = (SELECT status FROM public.transactions WHERE id = transactions.id)
);

-- 6) release_escrow_funds already notifies via events; add explicit completion notification for vendor.
CREATE OR REPLACE FUNCTION public.release_escrow_funds(p_escrow_id uuid)
 RETURNS wallet_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vendor_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_escrow public.transactions;
BEGIN
  SELECT * INTO v_escrow FROM public.transactions WHERE id = p_escrow_id;
  IF v_escrow IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF v_escrow.client_id != auth.uid() THEN RAISE EXCEPTION 'Only the client can release funds'; END IF;
  IF v_escrow.status NOT IN ('pending_release', 'in_progress', 'funded') THEN
    RAISE EXCEPTION 'Escrow cannot be released in current status';
  END IF;
  IF v_escrow.vendor_id IS NULL THEN RAISE EXCEPTION 'No vendor assigned to this escrow'; END IF;

  SELECT * INTO v_vendor_wallet FROM public.wallets WHERE user_id = v_escrow.vendor_id;
  IF v_vendor_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (v_escrow.vendor_id) RETURNING * INTO v_vendor_wallet;
  END IF;

  UPDATE public.wallets SET balance = balance + v_escrow.amount
  WHERE id = v_vendor_wallet.id RETURNING * INTO v_vendor_wallet;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, escrow_id, status
  ) VALUES (
    v_vendor_wallet.id, v_escrow.vendor_id, 'escrow_release', v_escrow.amount, v_vendor_wallet.balance,
    'Escrow Payment: ' || v_escrow.title, p_escrow_id, 'completed'
  ) RETURNING * INTO v_transaction;

  UPDATE public.transactions SET status = 'completed', completed_at = now() WHERE id = p_escrow_id;

  INSERT INTO public.transaction_events (transaction_id, user_id, event_type, description)
  VALUES (p_escrow_id, auth.uid(), 'completed', 'Client released funds to vendor');

  INSERT INTO public.notifications (user_id, type, title, message, transaction_id)
  VALUES (v_escrow.vendor_id, 'escrow_released', 'Funds Released',
    'Funds for "' || v_escrow.title || '" have been released to your wallet.', p_escrow_id);

  RETURN v_transaction;
END;
$function$;
