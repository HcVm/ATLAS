-- Primero, limpiar datos existentes que puedan estar causando conflictos
DELETE FROM profiles WHERE email = 'admin@test.com';

-- Eliminar el trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear la función actualizada para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Verificar si el perfil ya existe antes de insertarlo
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
      'user',
      (SELECT id FROM departments WHERE name = 'Tecnología' LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Verificar que tenemos departamentos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Tecnología') THEN
    INSERT INTO departments (name, description) VALUES
      ('Tecnología', 'Departamento de sistemas y tecnología');
  END IF;
END $$;

-- Crear usuario de prueba de forma más segura
DO $$
DECLARE
    user_id uuid;
    dept_id uuid;
    existing_user_id uuid;
BEGIN
    -- Verificar si ya existe un usuario con este email
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = 'admin@test.com' 
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- Si el usuario ya existe, solo asegurar que tenga perfil
        SELECT id INTO dept_id FROM departments WHERE name = 'Tecnología' LIMIT 1;
        
        INSERT INTO profiles (id, email, full_name, role, department_id)
        VALUES (existing_user_id, 'admin@test.com', 'Administrador de Prueba', 'admin', dept_id)
        ON CONFLICT (id) DO UPDATE SET
            role = 'admin',
            full_name = 'Administrador de Prueba';
            
        RAISE NOTICE 'Perfil actualizado para usuario existente: admin@test.com';
    ELSE
        -- Crear nuevo usuario
        SELECT id INTO dept_id FROM departments WHERE name = 'Tecnología' LIMIT 1;
        user_id := gen_random_uuid();
        
        -- Insertar en auth.users
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
        
        -- Insertar perfil
        INSERT INTO profiles (id, email, full_name, role, department_id)
        VALUES (user_id, 'admin@test.com', 'Administrador de Prueba', 'admin', dept_id);
        
        RAISE NOTICE 'Usuario admin creado: admin@test.com / 123456789';
    END IF;
END $$;

-- Verificar el resultado
SELECT 
    u.email,
    p.full_name,
    p.role,
    d.name as department
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE u.email = 'admin@test.com';
