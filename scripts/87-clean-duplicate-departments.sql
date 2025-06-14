-- Limpiar departamentos duplicados y asegurar filtrado por empresa

DO $$
DECLARE
    dept_record RECORD;
    company_record RECORD;
    dept_count INTEGER;
BEGIN
    RAISE NOTICE 'Limpiando departamentos duplicados...';
    
    -- 1. Verificar departamentos actuales
    SELECT COUNT(*) INTO dept_count FROM departments;
    RAISE NOTICE 'Departamentos totales antes de limpiar: %', dept_count;
    
    -- 2. Eliminar departamentos duplicados manteniendo solo uno por empresa
    FOR company_record IN SELECT id, name FROM companies LOOP
        RAISE NOTICE 'Procesando empresa: %', company_record.name;
        
        -- Para cada tipo de departamento, mantener solo uno por empresa
        WITH duplicates AS (
            SELECT id, name, company_id,
                   ROW_NUMBER() OVER (PARTITION BY name, company_id ORDER BY created_at) as rn
            FROM departments 
            WHERE company_id = company_record.id
        )
        DELETE FROM departments 
        WHERE id IN (
            SELECT id FROM duplicates WHERE rn > 1
        );
        
    END LOOP;
    
    -- 3. Verificar que cada empresa tenga al menos los departamentos básicos
    FOR company_record IN SELECT id, name FROM companies LOOP
        
        -- Crear departamento de Administración si no existe
        IF NOT EXISTS (
            SELECT 1 FROM departments 
            WHERE name = 'Administración' AND company_id = company_record.id
        ) THEN
            INSERT INTO departments (name, description, company_id, color)
            VALUES (
                'Administración',
                'Departamento de administración general',
                company_record.id,
                '#F97316'
            );
            RAISE NOTICE 'Creado departamento Administración para %', company_record.name;
        END IF;
        
        -- Crear departamento de Almacén si no existe
        IF NOT EXISTS (
            SELECT 1 FROM departments 
            WHERE name = 'Almacén' AND company_id = company_record.id
        ) THEN
            INSERT INTO departments (name, description, company_id, color)
            VALUES (
                'Almacén',
                'Departamento encargado de la gestión de inventario y almacén',
                company_record.id,
                '#10B981'
            );
            RAISE NOTICE 'Creado departamento Almacén para %', company_record.name;
        END IF;
        
    END LOOP;
    
    -- 4. Verificar resultado final
    SELECT COUNT(*) INTO dept_count FROM departments;
    RAISE NOTICE 'Departamentos totales después de limpiar: %', dept_count;
    
END $$;

-- Mostrar departamentos por empresa
SELECT 'Departamentos por empresa:' as info;
SELECT 
    c.name as empresa,
    c.code as codigo_empresa,
    d.name as departamento,
    d.color,
    d.created_at
FROM companies c
JOIN departments d ON c.id = d.company_id
ORDER BY c.name, d.name;

-- Verificar usuarios por departamento y empresa
SELECT 'Usuarios por departamento:' as info;
SELECT 
    c.name as empresa,
    d.name as departamento,
    COUNT(p.id) as usuarios
FROM companies c
JOIN departments d ON c.id = d.company_id
LEFT JOIN profiles p ON d.id = p.department_id AND p.company_id = c.id
GROUP BY c.name, d.name, c.id, d.id
ORDER BY c.name, d.name;
