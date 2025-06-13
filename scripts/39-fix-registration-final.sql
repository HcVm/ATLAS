-- 1. Primero, desactivamos el trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Creamos una nueva función para el trigger que maneje correctamente el tipo enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertamos el perfil con el tipo enum correcto para role
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
    'user'::user_role  -- Usamos casting explícito al tipo enum
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreamos el trigger con la función corregida
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
