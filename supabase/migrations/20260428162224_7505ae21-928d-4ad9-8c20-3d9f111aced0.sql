
-- Fix the trigger to use a valid role
CREATE OR REPLACE FUNCTION public.handle_new_ensemble()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ensemble_members (ensemble_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (ensemble_id, user_id) DO UPDATE SET role = 'admin';
  RETURN NEW;
END;
$$;

-- Backfill: ensure every ensemble creator is an admin member of their ensemble
INSERT INTO public.ensemble_members (ensemble_id, user_id, role)
SELECT e.id, e.created_by, 'admin'
FROM public.ensembles e
LEFT JOIN public.ensemble_members em
  ON em.ensemble_id = e.id AND em.user_id = e.created_by
WHERE em.user_id IS NULL
ON CONFLICT (ensemble_id, user_id) DO UPDATE SET role = 'admin';
