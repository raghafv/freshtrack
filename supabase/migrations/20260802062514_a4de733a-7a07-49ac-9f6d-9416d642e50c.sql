UPDATE public.profiles p
SET email = u.email, updated_at = now()
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email AND u.email IS NOT NULL;