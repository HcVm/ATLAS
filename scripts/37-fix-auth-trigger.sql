-- Modificar la función que se ejecuta cuando se crea un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_dept_id uuid;
    user_role_val text;
BEGIN
    -- Obtener un departamento por defecto
    SELECT id INTO default_dept_id FROM departments ORDER BY created_at LIMIT 1;
    
    -- Verificar si la columna role es de tipo enum
    BEGIN
        -- Intentar con 'user' como texto
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            role, 
            department_id
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
            'user',
            default_dept_id
        );
    EXCEPTION WHEN others THEN
        -- Si falla, intentar con user como enum
        BEGIN
            INSERT INTO public.profiles (
                id, 
                email, 
                full_name, 
                role, 
                department_id
            )
            VALUES (
                new.id,
                new.email,
                COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
                'user'::user_role,
                default_dept_id
            );
        EXCEPTION WHEN others THEN
            -- Registrar el error pero no fallar
            RAISE NOTICE 'Error al crear perfil para %: %', new.email, SQLERRM;
        END;
    END;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
