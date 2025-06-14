-- Script alternativo: Crear enum desde cero si es necesario

-- Verificar si necesitamos crear el enum desde cero
DO $$ 
BEGIN
    -- Si no existe el enum, crearlo
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'supervisor', 'almacen', 'contabilidad');
        RAISE NOTICE 'Enum user_role creado exitosamente';
    ELSE
        RAISE NOTICE 'Enum user_role ya existe';
    END IF;
END $$;

-- Si la columna role no usa el enum, convertirla
DO $$
DECLARE
    column_type text;
BEGIN
    SELECT data_type INTO column_type
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role';
    
    IF column_type = 'character varying' THEN
        RAISE NOTICE 'Convirtiendo columna role de varchar a enum...';
        
        -- Primero, limpiar valores inválidos
        UPDATE profiles SET role = 'admin' WHERE role IN ('administrador', 'administrator');
        UPDATE profiles SET role = 'user' WHERE role IN ('usuario', 'empleado');
        UPDATE profiles SET role = 'user' WHERE role NOT IN ('admin', 'user', 'supervisor', 'almacen', 'contabilidad');
        
        -- Convertir la columna al enum
        ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::user_role;
        
        RAISE NOTICE 'Columna convertida exitosamente';
    END IF;
END $$;

-- Verificar el resultado final
SELECT 'Verificación final:' as info;
SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY role;
