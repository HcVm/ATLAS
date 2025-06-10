-- Eliminar trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear función más simple
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_dept_id uuid;
BEGIN
    -- Obtener el ID del departamento por defecto
    SELECT id INTO default_dept_id FROM departments WHERE name = 'Tecnología' LIMIT 1;
    
    -- Insertar perfil básico
    INSERT INTO public.profiles (id, email, full_name, role, department_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
        'user',
        default_dept_id
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Si hay error, continuar sin fallar
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Trigger actualizado correctamente' as status;
