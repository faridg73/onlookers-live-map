create or replace function public.resolve_content_report(_report_id uuid, _action text)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare _post uuid;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'moderator')) then
    raise exception 'Not allowed';
  end if;
  if _action not in ('dismiss','remove','restore') then raise exception 'Unknown action'; end if;
  select post_id into _post from public.content_reports where id = _report_id;
  if _post is null then raise exception 'Report not found'; end if;
  if _action = 'remove' then
    update public.community_posts set hidden_at = now() where id = _post;
  else
    update public.community_posts set hidden_at = null where id = _post;
  end if;
  update public.content_reports set status = case _action when 'remove' then 'removed' when 'restore' then 'restored' else 'dismissed' end,
    resolved_by = auth.uid(), resolved_at = now()
  where post_id = _post and status in ('open','removed','restored');
end $$;