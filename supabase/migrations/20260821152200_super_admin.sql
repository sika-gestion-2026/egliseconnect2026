-- Modify the trigger to automatically grant super_admin to munokolive@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF new.email = 'munokolive@gmail.com' THEN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (new.id, new.email, 'super_admin');
  ELSE
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (new.id, new.email, 'member');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
