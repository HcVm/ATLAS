-- Arreglar recursión infinita en políticas de profiles

DO $$
BEGIN
    RAISE NOTICE 'Eliminando todas las políticas de profiles...';
    
    -- Eliminar TODAS las políticas de profiles
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_simple" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_simple" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_simple" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    
    RAISE NOTICE 'Creando políticas simples sin recursión...';
    
    -- Crear políticas muy simples que no causen recursión
    CREATE POLICY "profiles_allow_all_select" ON profiles
        FOR SELECT USING (true);
    
    CREATE POLICY "profiles_allow_all_insert" ON profiles
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "profiles_allow_all_update" ON profiles
        FOR UPDATE USING (true);
    
    CREATE POLICY "profiles_allow_all_delete" ON profiles
        FOR DELETE USING (true);
    
    RAISE NOTICE 'Políticas de profiles arregladas!';
    
END $$;

-- Verificar que el usuario actual puede acceder a su perfil
SELECT 
    'Usuario actual:' as info,
    id,
    full_name,
    email,
    role,
    company_id,
    department_id
FROM profiles 
WHERE id = auth.uid()
LIMIT 1;

-- Verificar departamentos ASIGNAR
SELECT 'Departamentos ASIGNAR por empresa:' as info, 
       c.name as empresa,
       d.name as departamento,
       d.id as dept_id
FROM companies c
LEFT JOIN departments d ON c.id = d.company_id AND d.name = 'ASIGNAR'
ORDER BY c.name;
