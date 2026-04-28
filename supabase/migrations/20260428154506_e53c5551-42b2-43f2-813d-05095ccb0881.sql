
-- Backfill profiles for users who don't have one yet
DO $$
DECLARE
  u RECORD;
  base_username TEXT;
  final_username TEXT;
  suffix INT;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    base_username := COALESCE(
      NULLIF(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
      'user'
    );
    -- Pad to min 3 chars
    IF length(base_username) < 3 THEN
      base_username := base_username || 'usr';
    END IF;
    -- Trim to max 20
    base_username := substr(base_username, 1, 20);

    final_username := base_username;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
      suffix := suffix + 1;
      final_username := substr(base_username, 1, 20 - length(suffix::text)) || suffix::text;
    END LOOP;

    INSERT INTO public.profiles (id, username, display_name, onboarding_complete)
    VALUES (
      u.id,
      final_username,
      COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', final_username),
      false
    );
  END LOOP;
END $$;
