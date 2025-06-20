-- Diagnosticar y corregir el filtrado por empresa en ventas y cotizaciones

-- 1. Verificar estructura de las tablas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('sales', 'quotations') 
    AND column_name = 'company_id'
ORDER BY table_name, column_name;

-- 2. Verificar datos existentes en sales
SELECT 
    COUNT(*) as total_sales,
    company_id,
    CASE 
        WHEN company_id IS NULL THEN 'SIN EMPRESA'
        ELSE 'CON EMPRESA'
    END as status
FROM sales 
GROUP BY company_id, 
    CASE 
        WHEN company_id IS NULL THEN 'SIN EMPRESA'
        ELSE 'CON EMPRESA'
    END
ORDER BY company_id;

-- 3. Verificar datos existentes en quotations
SELECT 
    COUNT(*) as total_quotations,
    company_id,
    CASE 
        WHEN company_id IS NULL THEN 'SIN EMPRESA'
        ELSE 'CON EMPRESA'
    END as status
FROM quotations 
GROUP BY company_id, 
    CASE 
        WHEN company_id IS NULL THEN 'SIN EMPRESA'
        ELSE 'CON EMPRESA'
    END
ORDER BY company_id;

-- 4. Verificar empresas disponibles
SELECT id, name, code FROM companies ORDER BY name;

-- 5. Verificar políticas RLS activas
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
WHERE tablename IN ('sales', 'quotations')
ORDER BY tablename, policyname;

-- 6. Si hay registros sin company_id, asignarlos a la primera empresa disponible
DO $$
DECLARE
    first_company_id UUID;
    sales_updated INTEGER;
    quotations_updated INTEGER;
BEGIN
    -- Obtener la primera empresa
    SELECT id INTO first_company_id FROM companies ORDER BY created_at LIMIT 1;
    
    IF first_company_id IS NOT NULL THEN
        -- Actualizar sales sin company_id
        UPDATE sales 
        SET company_id = first_company_id 
        WHERE company_id IS NULL;
        
        GET DIAGNOSTICS sales_updated = ROW_COUNT;
        
        -- Actualizar quotations sin company_id
        UPDATE quotations 
        SET company_id = first_company_id 
        WHERE company_id IS NULL;
        
        GET DIAGNOSTICS quotations_updated = ROW_COUNT;
        
        RAISE NOTICE 'Actualizados % registros de sales y % registros de quotations con company_id: %', 
            sales_updated, quotations_updated, first_company_id;
    ELSE
        RAISE NOTICE 'No se encontraron empresas para asignar';
    END IF;
END $$;

-- 7. Verificar que las columnas company_id no sean nulas después de la actualización
ALTER TABLE sales ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE quotations ALTER COLUMN company_id SET NOT NULL;

-- 8. Verificar conteos finales
SELECT 'SALES' as tabla, COUNT(*) as total, company_id 
FROM sales 
GROUP BY company_id
UNION ALL
SELECT 'QUOTATIONS' as tabla, COUNT(*) as total, company_id 
FROM quotations 
GROUP BY company_id
ORDER BY tabla, company_id;

-- 9. Crear políticas RLS más específicas si no existen
DO $$
BEGIN
    -- Política para sales
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' AND policyname = 'sales_company_access'
    ) THEN
        CREATE POLICY sales_company_access ON sales
        FOR ALL
        USING (
            -- Admin puede ver todas las empresas
            (auth.jwt() ->> 'role' = 'admin') OR
            -- Usuarios normales solo ven su empresa
            (company_id = (
                SELECT company_id 
                FROM profiles 
                WHERE id = auth.uid()
            ))
        );
        RAISE NOTICE 'Política sales_company_access creada';
    END IF;

    -- Política para quotations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quotations' AND policyname = 'quotations_company_access'
    ) THEN
        CREATE POLICY quotations_company_access ON quotations
        FOR ALL
        USING (
            -- Admin puede ver todas las empresas
            (auth.jwt() ->> 'role' = 'admin') OR
            -- Usuarios normales solo ven su empresa
            (company_id = (
                SELECT company_id 
                FROM profiles 
                WHERE id = auth.uid()
            ))
        );
        RAISE NOTICE 'Política quotations_company_access creada';
    END IF;
END $$;

-- 10. Verificar que RLS esté habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('sales', 'quotations');

-- Si RLS no está habilitado, habilitarlo
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

RAISE NOTICE 'Diagnóstico y corrección completados';
