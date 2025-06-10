-- Crear función que se ejecuta cuando se crea un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario'),
    'user',
    (SELECT id FROM departments WHERE name = 'Tecnología' LIMIT 1)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger que ejecuta la función cuando se inserta un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Crear un usuario admin de prueba directamente
DO $$
DECLARE
    user_id uuid;
    dept_id uuid;
BEGIN
    -- Obtener el ID del departamento de Tecnología
    SELECT id INTO dept_id FROM departments WHERE name = 'Tecnología' LIMIT 1;
    
    -- Generar un UUID para el usuario
    user_id := gen_random_uuid();
    
    -- Insertar directamente en auth.users (solo para pruebas)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'admin@test.com',
        crypt('123456789', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Administrador de Prueba"}',
        false,
        '',
        '',
        '',
        ''
    );
    
    -- Insertar el perfil
    INSERT INTO profiles (id, email, full_name, role, department_id)
    VALUES (user_id, 'admin@test.com', 'Administrador de Prueba', 'admin', dept_id);
    
    RAISE NOTICE 'Usuario admin creado con email: admin@test.com y contraseña: 123456789';
END $$;
