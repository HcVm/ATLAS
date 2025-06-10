-- Arreglar la creación de perfiles para evitar duplicados
-- Primero, verificar si existe el trigger

SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_name LIKE '%profile%';

-- Eliminar trigger existente si causa problemas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear una función mejorada que maneje duplicados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertar perfil solo si no existe
  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'department_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'department_id')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    department_id = COALESCE(EXCLUDED.department_id, profiles.department_id),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verificar que el trigger se creó correctamente
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_name = 'on_auth_user_created';
