-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('client', 'vendor', 'admin');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create escrow status enum
CREATE TYPE public.escrow_status AS ENUM (
  'pending_funding', 'funded', 'in_progress', 'pending_release', 
  'completed', 'disputed', 'cancelled', 'refunded'
);

-- Create transactions/escrows table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  platform_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status escrow_status NOT NULL DEFAULT 'pending_funding',
  client_id UUID REFERENCES auth.users(id) NOT NULL,
  vendor_id UUID REFERENCES auth.users(id),
  vendor_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  funded_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Vendors can view their transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = vendor_id);

CREATE POLICY "Clients can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Vendors can update assigned transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = vendor_id);

CREATE POLICY "Admins can manage all transactions"
ON public.transactions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create dispute status enum
CREATE TYPE public.dispute_status AS ENUM (
  'open', 'under_review', 'awaiting_response', 'resolved', 'closed', 'escalated'
);

-- Create dispute reason enum
CREATE TYPE public.dispute_reason AS ENUM (
  'service_not_delivered', 'quality_issues', 'late_delivery', 
  'payment_dispute', 'communication_issues', 'scope_disagreement', 'other'
);

-- Create disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  opened_by UUID REFERENCES auth.users(id) NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  reason dispute_reason NOT NULL,
  description TEXT NOT NULL,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can view disputes"
ON public.disputes FOR SELECT
USING (
  auth.uid() = opened_by OR
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = transaction_id 
    AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Users can create disputes on their transactions"
ON public.disputes FOR INSERT
WITH CHECK (
  auth.uid() = opened_by AND
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = transaction_id 
    AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all disputes"
ON public.disputes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create dispute events table for timeline
CREATE TABLE public.dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can view events"
ON public.dispute_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.disputes d 
    WHERE d.id = dispute_id 
    AND (
      d.opened_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.transactions t 
        WHERE t.id = d.transaction_id 
        AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Admins can manage dispute events"
ON public.dispute_events FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create transaction events table for escrow timeline
CREATE TABLE public.transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transaction parties can view events"
ON public.transaction_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = transaction_id 
    AND (t.client_id = auth.uid() OR t.vendor_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage transaction events"
ON public.transaction_events FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();