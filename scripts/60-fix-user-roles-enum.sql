-- Script para corregir y actualizar los roles de usuario de forma segura

-- Primero, verificar qué roles existen actualmente
SELECT 'Roles actuales en profiles:' as info;
SELECT DISTINCT role FROM profiles ORDER BY role;

-- Verificar si existe el enum user_role y sus valores
SELECT 'Enum user_role actual:' as info;
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') ORDER BY enumsortorder;

-- Verificar el tipo de la columna role
SELECT 'Tipo de la columna role:' as info;
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- Si la columna role es varchar, podemos trabajar directamente
-- Si es enum, necesitamos ser más cuidadosos

DO $$ 
DECLARE
    column_type text;
BEGIN
    -- Obtener el tipo de la columna role
    SELECT data_type INTO column_type
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role';
    
    RAISE NOTICE 'Tipo de columna role: %', column_type;
    
    -- Si es character varying (varchar), podemos actualizar directamente
    IF column_type = 'character varying' THEN
        RAISE NOTICE 'Columna role es varchar, actualizando valores...';
        
        -- Actualizar roles problemáticos a valores válidos
        UPDATE profiles SET role = 'admin' WHERE role = 'administrador';
        UPDATE profiles SET role = 'admin' WHERE role = 'administrator';
        UPDATE profiles SET role = 'user' WHERE role = 'usuario';
        UPDATE profiles SET role = 'user' WHERE role = 'empleado';
        
        RAISE NOTICE 'Roles actualizados exitosamente';
        
    ELSIF column_type = 'USER-DEFINED' THEN
        RAISE NOTICE 'Columna role usa enum, verificando valores...';
        
        -- Si es enum, necesitamos agregar los valores faltantes primero
        -- Intentar agregar nuevos valores al enum
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';
            RAISE NOTICE 'Agregado valor supervisor al enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo agregar supervisor: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'almacen';
            RAISE NOTICE 'Agregado valor almacen al enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo agregar almacen: %', SQLERRM;
        END;
        
        BEGIN
            ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'contabilidad';
            RAISE NOTICE 'Agregado valor contabilidad al enum';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo agregar contabilidad: %', SQLERRM;
        END;
        
    END IF;
END $$;

-- Mostrar el estado final
SELECT 'Estado final - Roles en profiles:' as info;
SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY role;

-- Mostrar valores del enum después de las modificaciones
SELECT 'Valores finales del enum user_role:' as info;
SELECT enumlabel as enum_values 
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Verificar departamentos existentes
SELECT 'Departamentos existentes:' as info;
SELECT id, name, company_id FROM departments ORDER BY company_id, name;

-- Verificar usuarios y sus departamentos
SELECT 'Usuarios y sus departamentos:' as info;
SELECT p.email, p.role, d.name as department, c.name as company
FROM profiles p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY c.name, p.email;
