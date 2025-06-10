-- Script para diagnosticar y arreglar problemas de roles de usuario

DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
    no_role_count INTEGER;
BEGIN
    -- Contar usuarios totales
    SELECT COUNT(*) INTO user_count FROM profiles;
    
    -- Contar administradores
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    
    -- Contar usuarios sin rol
    SELECT COUNT(*) INTO no_role_count FROM profiles WHERE role IS NULL;
    
    RAISE NOTICE '=== DIAGNÓSTICO DE ROLES DE USUARIO ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Total de usuarios: %', user_count;
    RAISE NOTICE 'Administradores: %', admin_count;
    RAISE NOTICE 'Usuarios sin rol: %', no_role_count;
    RAISE NOTICE '';
    
    -- Si hay usuarios sin rol, asignar rol 'user' por defecto
    IF no_role_count > 0 THEN
        UPDATE profiles 
        SET role = 'user' 
        WHERE role IS NULL;
        
        RAISE NOTICE 'Se asignó rol "user" a % usuarios que no tenían rol', no_role_count;
    END IF;
    
    -- Si no hay administradores, hacer admin al primer usuario
    IF admin_count = 0 AND user_count > 0 THEN
        UPDATE profiles 
        SET role = 'admin' 
        WHERE id = (
            SELECT id 
            FROM profiles 
            ORDER BY created_at ASC 
            LIMIT 1
        );
        
        RAISE NOTICE 'Se asignó rol "admin" al primer usuario del sistema';
    END IF;
    
    -- Mostrar estado final
    RAISE NOTICE '';
    RAISE NOTICE 'ESTADO FINAL:';
    
    FOR rec IN 
        SELECT 
            email,
            full_name,
            role,
            created_at
        FROM profiles 
        ORDER BY 
            CASE role 
                WHEN 'admin' THEN 1 
                WHEN 'supervisor' THEN 2 
                WHEN 'user' THEN 3 
                ELSE 4 
            END,
            created_at
    LOOP
        RAISE NOTICE '- % (%) - %', rec.email, rec.role, rec.full_name;
    END LOOP;
    
END $$;

-- Verificar que todos los usuarios tienen departamento
UPDATE profiles 
SET department_id = (
    SELECT id FROM departments WHERE name = 'Tecnología' LIMIT 1
)
WHERE department_id IS NULL;

-- Mostrar resumen final
SELECT 
    'RESUMEN FINAL:' as info,
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as administradores,
    COUNT(CASE WHEN role = 'supervisor' THEN 1 END) as supervisores,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as usuarios,
    COUNT(CASE WHEN role IS NULL THEN 1 END) as sin_rol
FROM profiles;
