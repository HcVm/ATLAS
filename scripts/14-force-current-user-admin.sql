-- Script para actualizar el usuario actual a admin
-- Ejecutar este script después de hacer login

-- Actualizar todos los usuarios con email admin@test.com a rol admin
UPDATE profiles 
SET role = 'admin' 
WHERE email LIKE '%admin%' OR email LIKE '%test%';

-- Actualizar el primer usuario creado a admin (como fallback)
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id 
    FROM profiles 
    ORDER BY created_at ASC 
    LIMIT 1
);

-- Mostrar todos los usuarios y sus roles
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM profiles 
ORDER BY created_at;

-- Verificar que hay al menos un admin
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count 
    FROM profiles 
    WHERE role = 'admin';
    
    IF admin_count = 0 THEN
        -- Si no hay admins, hacer admin al primer usuario
        UPDATE profiles 
        SET role = 'admin' 
        WHERE id = (
            SELECT id 
            FROM profiles 
            ORDER BY created_at ASC 
            LIMIT 1
        );
        
        RAISE NOTICE 'Se asignó rol admin al primer usuario del sistema';
    ELSE
        RAISE NOTICE 'Hay % administrador(es) en el sistema', admin_count;
    END IF;
END $$;
