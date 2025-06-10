-- Script para crear un super admin directamente en la base de datos
-- USAR SOLO EN DESARROLLO - NO EN PRODUCCIÓN

DO $$
DECLARE
    super_admin_id uuid;
    tech_dept_id uuid;
    existing_user_id uuid;
BEGIN
    -- Generar un nuevo UUID para el super admin
    super_admin_id := gen_random_uuid();
    
    -- Obtener el ID del departamento de Tecnología
    SELECT id INTO tech_dept_id 
    FROM departments 
    WHERE name = 'Tecnología' 
    LIMIT 1;
    
    -- Verificar si ya existe un usuario con email superadmin@test.com
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE email = 'superadmin@test.com' 
    LIMIT 1;
    
    IF existing_user_id IS NULL THEN
        -- Crear usuario en auth.users
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
            super_admin_id,
            'authenticated',
            'authenticated',
            'superadmin@test.com',
            crypt('admin123456', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Super Administrador"}',
            false,
            '',
            '',
            '',
            ''
        );
        
        -- Crear perfil
        INSERT INTO profiles (id, email, full_name, role, department_id)
        VALUES (
            super_admin_id, 
            'superadmin@test.com', 
            'Super Administrador', 
            'admin', 
            tech_dept_id
        );
        
        RAISE NOTICE 'Super admin creado:';
        RAISE NOTICE 'Email: superadmin@test.com';
        RAISE NOTICE 'Contraseña: admin123456';
        RAISE NOTICE 'Rol: admin';
    ELSE
        RAISE NOTICE 'Ya existe un usuario con email superadmin@test.com';
    END IF;
    
END $$;

-- Verificar todos los administradores
SELECT 
    'Administradores en el sistema:' as info;
    
SELECT 
    email,
    full_name,
    role,
    created_at
FROM profiles 
WHERE role = 'admin'
ORDER BY created_at;
