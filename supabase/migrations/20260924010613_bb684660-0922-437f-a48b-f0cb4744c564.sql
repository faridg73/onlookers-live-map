CREATE TABLE public.pro_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_role text NOT NULL CHECK (pro_role IN ('agent','property_manager','home_builder')),
  company text NOT NULL CHECK (char_length(company) BETWEEN 1 AND 120),
  plan text NOT NULL DEFAULT 'none' CHECK (plan IN ('none','starter','pro','team')),
  plan_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pro_accounts TO authenticated;
GRANT ALL ON public.pro_accounts TO service_role;
ALTER TABLE public.pro_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pros read own account" ON public.pro_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Pros create own account" ON public.pro_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND plan = 'none');
CREATE POLICY "Pros update own account" ON public.pro_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.guard_pro_account_plan()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('service_role','postgres','supabase_admin') THEN
    NEW.plan := OLD.plan;
    NEW.plan_updated_at := OLD.plan_updated_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER guard_pro_account_plan BEFORE UPDATE ON public.pro_accounts
FOR EACH ROW EXECUTE FUNCTION public.guard_pro_account_plan();