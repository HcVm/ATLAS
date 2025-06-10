-- Script para forzar la creación de un usuario admin si es necesario
-- Este script actualiza o crea un usuario admin

DO $$
DECLARE
    admin_user_id uuid;
    tech_dept_id uuid;
BEGIN
    -- Obtener el ID del departamento de Tecnología
    SELECT id INTO tech_dept_id 
    FROM departments 
    WHERE name = 'Tecnología' 
    LIMIT 1;
    
    -- Verificar si existe el usuario admin@test.com
    SELECT id INTO admin_user_id 
    FROM profiles 
    WHERE email = 'admin@test.com' 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Si existe, actualizar su rol a admin
        UPDATE profiles 
        SET 
            role = 'admin',
            full_name = 'Administrador del Sistema',
            department_id = tech_dept_id
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Usuario admin@test.com actualizado a rol admin';
    ELSE
        -- Si no existe, intentar crearlo
        RAISE NOTICE 'Usuario admin@test.com no encontrado. Debe crearse desde Supabase Auth primero.';
    END IF;
    
    -- Mostrar el resultado
    SELECT 
        email,
        full_name,
        role,
        departments.name as department_name
    FROM profiles 
    LEFT JOIN departments ON profiles.department_id = departments.id
    WHERE email = 'admin@test.com';
    
END $$;
