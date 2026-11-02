REVOKE INSERT, UPDATE, DELETE ON public.user_settings FROM authenticated;
GRANT INSERT (user_id, theme, notifications_enabled, expiry_reminder_days, default_storage, default_unit, notify_expiry, notify_added, notify_merged, notify_shopping, notify_system, notify_expired, notify_low_stock, notify_recipe) ON public.user_settings TO authenticated;
GRANT UPDATE (theme, notifications_enabled, expiry_reminder_days, default_storage, default_unit, notify_expiry, notify_added, notify_merged, notify_shopping, notify_system, notify_expired, notify_low_stock, notify_recipe) ON public.user_settings TO authenticated;
DROP POLICY IF EXISTS "own settings" ON public.user_settings;
CREATE POLICY "read own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own preferences" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);