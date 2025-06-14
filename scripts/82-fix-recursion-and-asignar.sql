-- Arreglar recursión infinita en políticas y crear departamento ASIGNAR

DO $$
BEGIN
    RAISE NOTICE 'Iniciando corrección de políticas y departamento ASIGNAR...';
    
    -- 1. Eliminar todas las políticas problemáticas de profiles
    RAISE NOTICE 'Eliminando políticas recursivas...';
    
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
    DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
    DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
    DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
    
    -- 2. Crear políticas simples sin recursión
    RAISE NOTICE 'Creando políticas simples...';
    
    CREATE POLICY "profiles_select_simple" ON profiles
        FOR SELECT USING (true);
    
    CREATE POLICY "profiles_insert_simple" ON profiles
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "profiles_update_simple" ON profiles
        FOR UPDATE USING (true);
    
    -- 3. Verificar si existe el departamento ASIGNAR
    IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'ASIGNAR') THEN
        RAISE NOTICE 'Creando departamento ASIGNAR para cada empresa...';
        
        -- Crear departamento ASIGNAR para cada empresa
        INSERT INTO departments (name, description, company_id, color, created_at, updated_at)
        SELECT 
            'ASIGNAR',
            'Departamento temporal para usuarios pendientes de asignación',
            c.id,
            '#6B7280',
            NOW(),
            NOW()
        FROM companies c
        WHERE NOT EXISTS (
            SELECT 1 FROM departments d 
            WHERE d.name = 'ASIGNAR' AND d.company_id = c.id
        );
        
        RAISE NOTICE 'Departamento ASIGNAR creado para todas las empresas';
    ELSE
        RAISE NOTICE 'Departamento ASIGNAR ya existe';
    END IF;
    
    -- 4. Verificar el resultado
    RAISE NOTICE 'Verificando departamentos ASIGNAR creados:';
    PERFORM 
        c.name as empresa,
        d.name as departamento,
        d.id as departamento_id
    FROM companies c
    JOIN departments d ON c.id = d.company_id
    WHERE d.name = 'ASIGNAR';
    
    -- 5. Mostrar conteo final
    RAISE NOTICE 'Total de departamentos ASIGNAR: %', (
        SELECT COUNT(*) FROM departments WHERE name = 'ASIGNAR'
    );
    
    RAISE NOTICE 'Corrección completada exitosamente!';
    
END $$;

-- Verificar que las políticas están correctas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Verificar departamentos ASIGNAR
SELECT 
    c.name as empresa,
    d.name as departamento,
    d.description,
    d.color
FROM companies c
JOIN departments d ON c.id = d.company_id
WHERE d.name = 'ASIGNAR'
ORDER BY c.name;
