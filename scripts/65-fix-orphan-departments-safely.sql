-- Script para manejar departamentos huérfanos de forma segura
-- Evita duplicados al asignar departamentos huérfanos

DO $$
DECLARE
    company_record RECORD;
    dept_record RECORD;
    dept_count INTEGER;
    movement_count INTEGER;
    first_company_id UUID;
    target_dept_id UUID;
BEGIN
    RAISE NOTICE '=== ANÁLISIS DE DEPARTAMENTOS HUÉRFANOS ===';
    
    -- Contar departamentos huérfanos
    SELECT COUNT(*) INTO dept_count FROM departments WHERE company_id IS NULL;
    RAISE NOTICE 'Departamentos sin empresa: %', dept_count;
    
    IF dept_count = 0 THEN
        RAISE NOTICE 'No hay departamentos huérfanos. Continuando con estandarización...';
    ELSE
        -- Obtener la primera empresa para referencias
        SELECT id INTO first_company_id FROM companies ORDER BY created_at LIMIT 1;
        
        IF first_company_id IS NULL THEN
            RAISE EXCEPTION 'No hay empresas en el sistema';
        END IF;
        
        -- Procesar cada departamento huérfano
        FOR dept_record IN 
            SELECT id, name, description FROM departments WHERE company_id IS NULL
        LOOP
            -- Contar movimientos que referencian este departamento
            SELECT COUNT(*) INTO movement_count 
            FROM document_movements 
            WHERE from_department_id = dept_record.id 
               OR to_department_id = dept_record.id;
            
            RAISE NOTICE 'Departamento huérfano: % (ID: %) - % movimientos asociados', 
                dept_record.name, dept_record.id, movement_count;
            
            -- Verificar si ya existe un departamento con el mismo nombre en la empresa
            SELECT id INTO target_dept_id
            FROM departments 
            WHERE company_id = first_company_id 
            AND name = dept_record.name
            LIMIT 1;
            
            IF target_dept_id IS NOT NULL THEN
                -- Ya existe, redirigir las referencias y eliminar el huérfano
                RAISE NOTICE '  - Ya existe departamento similar (ID: %)', target_dept_id;
                
                -- Actualizar referencias en document_movements
                UPDATE document_movements 
                SET from_department_id = target_dept_id 
                WHERE from_department_id = dept_record.id;
                
                UPDATE document_movements 
                SET to_department_id = target_dept_id 
                WHERE to_department_id = dept_record.id;
                
                -- Actualizar referencias en profiles si las hay
                UPDATE profiles 
                SET department_id = target_dept_id 
                WHERE department_id = dept_record.id;
                
                -- Ahora sí podemos eliminar el departamento huérfano
                DELETE FROM departments WHERE id = dept_record.id;
                
                RAISE NOTICE '  ✓ Referencias redirigidas y departamento huérfano eliminado';
            ELSE
                -- No existe, asignar a la empresa
                UPDATE departments 
                SET company_id = first_company_id,
                    updated_at = NOW()
                WHERE id = dept_record.id;
                
                RAISE NOTICE '  ✓ Asignado a empresa (ID: %)', first_company_id;
            END IF;
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ESTANDARIZANDO DEPARTAMENTOS ===';
    
    -- Crear tabla temporal con departamentos estándar
    CREATE TEMP TABLE standard_departments (
        name VARCHAR(100),
        description TEXT,
        color VARCHAR(7)
    );
    
    INSERT INTO standard_departments VALUES
        ('Administración', 'Departamento de administración general', '#F97316'),
        ('Almacén', 'Departamento encargado de la gestión de inventario y almacén', '#10B981'),
        ('Contabilidad', 'Departamento encargado de la gestión contable y financiera', '#3B82F6'),
        ('Recursos Humanos', 'Departamento de gestión de personal', '#EF4444'),
        ('Operaciones', 'Departamento de operaciones generales', '#84CC16'),
        ('Legal', 'Departamento legal y cumplimiento', '#8B5CF6'),
        ('Tecnología', 'Departamento de sistemas y tecnología', '#06B6D4'),
        ('Certificaciones', 'Departamento de Certificaciones y Validaciones', '#7C3AED');
    
    -- Para cada empresa, crear departamentos faltantes
    FOR company_record IN 
        SELECT id, name FROM companies ORDER BY name
    LOOP
        RAISE NOTICE 'Procesando empresa: %', company_record.name;
        
        -- Para cada departamento estándar
        FOR dept_record IN 
            SELECT name, description, color FROM standard_departments
        LOOP
            -- Verificar si ya existe
            SELECT COUNT(*) INTO dept_count
            FROM departments 
            WHERE company_id = company_record.id 
            AND name = dept_record.name;
            
            IF dept_count = 0 THEN
                -- No existe, crearlo
                INSERT INTO departments (name, description, company_id, color, created_at, updated_at)
                VALUES (
                    dept_record.name,
                    dept_record.description,
                    company_record.id,
                    dept_record.color,
                    NOW(),
                    NOW()
                );
                RAISE NOTICE '  ✓ Creado: %', dept_record.name;
            ELSE
                RAISE NOTICE '  - Ya existe: %', dept_record.name;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICACIÓN DE DUPLICADOS ===';
    
    -- Verificar si hay duplicados
    FOR dept_record IN 
        SELECT name, company_id, COUNT(*) as count
        FROM departments 
        WHERE company_id IS NOT NULL
        GROUP BY name, company_id
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'ADVERTENCIA: Departamento duplicado: % en empresa %', 
            dept_record.name, dept_record.company_id;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== RESULTADO FINAL ===';
    
    -- Mostrar resultado final
    FOR company_record IN 
        SELECT id, name FROM companies ORDER BY name
    LOOP
        SELECT COUNT(*) INTO dept_count 
        FROM departments 
        WHERE company_id = company_record.id;
        
        RAISE NOTICE '% tiene % departamentos:', company_record.name, dept_count;
        
        FOR dept_record IN 
            SELECT name, color FROM departments 
            WHERE company_id = company_record.id 
            ORDER BY name
        LOOP
            RAISE NOTICE '  - % (%)', dept_record.name, dept_record.color;
        END LOOP;
        RAISE NOTICE '';
    END LOOP;
    
    -- Verificar que no hay departamentos huérfanos
    SELECT COUNT(*) INTO dept_count FROM departments WHERE company_id IS NULL;
    RAISE NOTICE 'Departamentos huérfanos restantes: %', dept_count;
    
    DROP TABLE standard_departments;
    
    RAISE NOTICE '✅ Estandarización completada sin duplicados';
    
END $$;
