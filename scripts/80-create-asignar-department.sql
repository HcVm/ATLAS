-- Crear departamento ASIGNAR para todas las empresas
DO $$
DECLARE
    company_record RECORD;
    dept_exists INTEGER;
BEGIN
    RAISE NOTICE 'Creando departamento ASIGNAR para todas las empresas...';
    
    -- Recorrer todas las empresas
    FOR company_record IN SELECT id, name FROM companies ORDER BY name LOOP
        -- Verificar si ya existe el departamento ASIGNAR para esta empresa
        SELECT COUNT(*) INTO dept_exists 
        FROM departments 
        WHERE name = 'ASIGNAR' AND company_id = company_record.id;
        
        IF dept_exists = 0 THEN
            -- Crear el departamento ASIGNAR
            INSERT INTO departments (name, description, company_id, color, created_at, updated_at)
            VALUES (
                'ASIGNAR',
                'Departamento temporal para usuarios pendientes de asignación',
                company_record.id,
                '#6B7280',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Departamento ASIGNAR creado para empresa: %', company_record.name;
        ELSE
            RAISE NOTICE 'Departamento ASIGNAR ya existe para empresa: %', company_record.name;
        END IF;
    END LOOP;
    
    -- Mostrar resumen
    RAISE NOTICE 'Resumen de departamentos ASIGNAR:';
    FOR company_record IN 
        SELECT c.name as company_name, d.id as dept_id
        FROM companies c
        JOIN departments d ON c.id = d.company_id
        WHERE d.name = 'ASIGNAR'
        ORDER BY c.name
    LOOP
        RAISE NOTICE 'Empresa: % - Departamento ASIGNAR ID: %', company_record.company_name, company_record.dept_id;
    END LOOP;
    
    RAISE NOTICE 'Proceso completado exitosamente.';
END $$;
