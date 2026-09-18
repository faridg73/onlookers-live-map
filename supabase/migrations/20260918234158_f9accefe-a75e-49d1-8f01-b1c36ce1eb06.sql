UPDATE public.community_posts p
SET report_incident_type = split_part((SELECT tag FROM unnest(p.tags) tag WHERE tag LIKE 'incident:%' LIMIT 1), ':', 2),
    report_radius_m = COALESCE(
      (SELECT NULLIF(regexp_replace(rt, '[^0-9]', '', 'g'), '')::integer
       FROM unnest(p.tags) rt WHERE rt LIKE 'radius:%' LIMIT 1),
      500
    ),
    reporter_trust_level = public.trust_level(p.user_id),
    media_analysis_status = CASE WHEN p.media_path IS NULL THEN 'not_required' ELSE 'complete' END,
    trust_score = CASE public.trust_level(p.user_id) WHEN 3 THEN 5 WHEN 2 THEN 2 ELSE 0 END,
    report_status = CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= now() THEN 'expired' ELSE 'unverified' END
WHERE p.report_incident_type IS NULL
  AND p.tags && ARRAY['incident:fire','incident:police','incident:medical','incident:traffic','incident:hazard'];