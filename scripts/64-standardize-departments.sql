-- Script para estandarizar departamentos en todas las empresas
-- Cada empresa debe tener los mismos departamentos básicos

DO $$
DECLARE
    company_record RECORD;
    dept_record RECORD;
    dept_count INTEGER;
    company_count INTEGER;
BEGIN
    -- Mostrar estado actual
    RAISE NOTICE '=== ANÁLISIS DEL ESTADO ACTUAL ===';
    
    -- Contar empresas
    SELECT COUNT(*) INTO company_count FROM companies;
    RAISE NOTICE 'Total de empresas: %', company_count;
    
    -- Mostrar departamentos por empresa
    RAISE NOTICE '';
    RAISE NOTICE 'Departamentos por empresa:';
    FOR company_record IN 
        SELECT id, name FROM companies ORDER BY name
    LOOP
        SELECT COUNT(*) INTO dept_count 
        FROM departments 
        WHERE company_id = company_record.id;
        
        RAISE NOTICE '- % (ID: %): % departamentos', 
            company_record.name, company_record.id, dept_count;
    END LOOP;
    
    -- Mostrar departamentos huérfanos (sin empresa)
    SELECT COUNT(*) INTO dept_count FROM departments WHERE company_id IS NULL;
    RAISE NOTICE 'Departamentos sin empresa asignada: %', dept_count;
    
    IF dept_count > 0 THEN
        RAISE NOTICE 'Departamentos huérfanos:';
        FOR dept_record IN 
            SELECT name, description FROM departments WHERE company_id IS NULL
        LOOP
            RAISE NOTICE '  - %: %', dept_record.name, dept_record.description;
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ESTANDARIZANDO DEPARTAMENTOS ===';
    
    -- Definir departamentos estándar que cada empresa debe tener
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
    RAISE NOTICE '=== LIMPIEZA DE DEPARTAMENTOS HUÉRFANOS ===';
    
    -- Eliminar departamentos huérfanos (sin empresa)
    DELETE FROM departments WHERE company_id IS NULL;
    GET DIAGNOSTICS dept_count = ROW_COUNT;
    RAISE NOTICE 'Eliminados % departamentos huérfanos', dept_count;
    
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
    
    -- Verificar acceso al módulo de almacén
    RAISE NOTICE '=== USUARIOS CON ACCESO AL MÓDULO DE ALMACÉN ===';
    
    FOR company_record IN 
        SELECT id, name FROM companies ORDER BY name
    LOOP
        RAISE NOTICE 'En %:', company_record.name;
        
        -- Usuarios por rol
        FOR dept_record IN 
            SELECT 
                p.full_name,
                p.role,
                d.name as department_name
            FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            WHERE p.company_id = company_record.id
            AND (
                p.role IN ('admin', 'supervisor') 
                OR d.name IN ('Almacén', 'Contabilidad')
            )
            ORDER BY p.role, d.name, p.full_name
        LOOP
            RAISE NOTICE '  - % (%) - Depto: %', 
                dept_record.full_name, 
                dept_record.role,
                COALESCE(dept_record.department_name, 'Sin asignar');
        END LOOP;
        RAISE NOTICE '';
    END LOOP;
    
    DROP TABLE standard_departments;
    
    RAISE NOTICE '✅ Estandarización completada exitosamente';
    
END $$;
