-- Desactivar RLS completamente en profiles para eliminar la recursión

DO $$
BEGIN
    RAISE NOTICE 'Desactivando RLS en profiles...';
    
    -- Desactivar RLS completamente
    ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
    
    -- Eliminar TODAS las políticas existentes
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_simple" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_simple" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_simple" ON profiles;
    DROP POLICY IF EXISTS "profiles_allow_all_select" ON profiles;
    DROP POLICY IF EXISTS "profiles_allow_all_insert" ON profiles;
    DROP POLICY IF EXISTS "profiles_allow_all_update" ON profiles;
    DROP POLICY IF EXISTS "profiles_allow_all_delete" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    
    RAISE NOTICE 'RLS desactivado en profiles. Todas las políticas eliminadas.';
    
END $$;

-- Verificar que ahora funciona
SELECT 
    'Perfil del usuario actual:' as info,
    id,
    full_name,
    email,
    role,
    company_id,
    department_id
FROM profiles 
WHERE id = 'b01beafd-2665-44b0-9b53-dc1b5f976f83'
LIMIT 1;

-- También desactivar RLS en departments temporalmente
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_select_simple" ON departments;
DROP POLICY IF EXISTS "departments_insert_simple" ON departments;
DROP POLICY IF EXISTS "departments_update_simple" ON departments;
DROP POLICY IF EXISTS "departments_delete_simple" ON departments;

-- Verificar departamentos
SELECT 'Departamentos disponibles:' as info, 
       c.name as empresa,
       d.name as departamento,
       d.id as dept_id
FROM companies c
JOIN departments d ON c.id = d.company_id
ORDER BY c.name, d.name
LIMIT 10;
