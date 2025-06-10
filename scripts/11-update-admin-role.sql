-- Actualizar el rol del usuario admin de prueba a 'admin'
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@test.com';

-- Verificar que el cambio se aplicó correctamente
SELECT 
    id,
    email,
    full_name,
    role,
    department_id
FROM profiles 
WHERE email = 'admin@test.com';

-- También podemos crear un usuario admin adicional si es necesario
-- Primero verificar si ya existe
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count 
    FROM profiles 
    WHERE role = 'admin';
    
    RAISE NOTICE 'Número de administradores en el sistema: %', admin_count;
    
    -- Si no hay administradores, mostrar advertencia
    IF admin_count = 0 THEN
        RAISE NOTICE 'ADVERTENCIA: No hay administradores en el sistema';
    END IF;
END $$;

-- Mostrar todos los usuarios y sus roles
SELECT 
    email,
    full_name,
    role,
    created_at
FROM profiles 
ORDER BY role, created_at;
