-- credit_transactions: writes only from trusted server-side/SECURITY DEFINER code
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM anon;
GRANT ALL ON public.credit_transactions TO service_role;

CREATE POLICY "No client inserts of transactions"
  ON public.credit_transactions FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "No client updates of transactions"
  ON public.credit_transactions FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "No client deletes of transactions"
  ON public.credit_transactions FOR DELETE TO authenticated, anon
  USING (false);

-- profiles: a user may create/update only their own row; no deletes from clients
REVOKE DELETE ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "No client deletes of profiles"
  ON public.profiles FOR DELETE TO authenticated, anon
  USING (false);