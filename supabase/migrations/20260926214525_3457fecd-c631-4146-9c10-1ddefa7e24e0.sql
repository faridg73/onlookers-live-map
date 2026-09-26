REVOKE EXECUTE ON FUNCTION public.auto_hide_reported_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_community_post_moderation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_content_reports() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_content_report(uuid, text) FROM PUBLIC, anon;