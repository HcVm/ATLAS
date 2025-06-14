-- Recrear estructura básica: empresas, departamentos y marcas
-- Ejecutar después de limpiar la base de datos

DO $$
DECLARE
    alge_company_id UUID;
    arm_company_id UUID;
    amco_company_id UUID;
    gmc_company_id UUID;
    galur_company_id UUID;
    dept_id UUID;
BEGIN
    RAISE NOTICE '=== RECREANDO ESTRUCTURA BÁSICA ===';
    
    -- 1. CREAR EMPRESAS
    RAISE NOTICE '1. Creando empresas...';
    
    INSERT INTO companies (id, name, code, description, color, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), 'ALGE PERUVIAN', 'ALGE', 'Empresa peruana especializada en productos de calidad', '#8B5CF6', NOW(), NOW()),
        (gen_random_uuid(), 'ARM CORPORATIONS', 'ARM', 'Corporación internacional con presencia global', '#10B981', NOW(), NOW()),
        (gen_random_uuid(), 'AMCO', 'AMCO', 'Empresa especializada en servicios corporativos', '#F59E0B', NOW(), NOW()),
        (gen_random_uuid(), 'GMC', 'GMC', 'Grupo empresarial de gestión y consultoría', '#EF4444', NOW(), NOW()),
        (gen_random_uuid(), 'GALUR', 'GALUR', 'Empresa de desarrollo y tecnología', '#06B6D4', NOW(), NOW());
    
    -- Obtener IDs de las empresas
    SELECT id INTO alge_company_id FROM companies WHERE code = 'ALGE';
    SELECT id INTO arm_company_id FROM companies WHERE code = 'ARM';
    SELECT id INTO amco_company_id FROM companies WHERE code = 'AMCO';
    SELECT id INTO gmc_company_id FROM companies WHERE code = 'GMC';
    SELECT id INTO galur_company_id FROM companies WHERE code = 'GALUR';
    
    RAISE NOTICE 'Empresas creadas:';
    RAISE NOTICE '- ALGE PERUVIAN (ALGE): %', alge_company_id;
    RAISE NOTICE '- ARM CORPORATIONS (ARM): %', arm_company_id;
    RAISE NOTICE '- AMCO (AMCO): %', amco_company_id;
    RAISE NOTICE '- GMC (GMC): %', gmc_company_id;
    RAISE NOTICE '- GALUR (GALUR): %', galur_company_id;
    
    -- 2. CREAR DEPARTAMENTOS PARA ALGE PERUVIAN
    RAISE NOTICE '2. Creando departamentos para ALGE PERUVIAN...';
    
    INSERT INTO departments (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'Administración', 'Departamento de administración general', alge_company_id, '#F97316', NOW(), NOW()),
        (gen_random_uuid(), 'Almacén', 'Departamento encargado de la gestión de inventario y almacén', alge_company_id, '#10B981', NOW(), NOW()),
        (gen_random_uuid(), 'Contabilidad', 'Departamento encargado de la gestión contable y financiera', alge_company_id, '#3B82F6', NOW(), NOW()),
        (gen_random_uuid(), 'Recursos Humanos', 'Departamento de gestión de personal', alge_company_id, '#EF4444', NOW(), NOW()),
        (gen_random_uuid(), 'Operaciones', 'Departamento de operaciones generales', alge_company_id, '#84CC16', NOW(), NOW()),
        (gen_random_uuid(), 'Legal', 'Departamento legal y cumplimiento', alge_company_id, '#8B5CF6', NOW(), NOW()),
        (gen_random_uuid(), 'Tecnología', 'Departamento de sistemas y tecnología', alge_company_id, '#06B6D4', NOW(), NOW()),
        (gen_random_uuid(), 'Certificaciones', 'Departamento de Certificaciones y Validaciones', alge_company_id, '#7C3AED', NOW(), NOW());
    
    -- 3. CREAR DEPARTAMENTOS PARA ARM CORPORATIONS
    RAISE NOTICE '3. Creando departamentos para ARM CORPORATIONS...';
    
    INSERT INTO departments (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'Administración', 'Departamento de administración general', arm_company_id, '#F97316', NOW(), NOW()),
        (gen_random_uuid(), 'Almacén', 'Departamento encargado de la gestión de inventario y almacén', arm_company_id, '#10B981', NOW(), NOW()),
        (gen_random_uuid(), 'Contabilidad', 'Departamento encargado de la gestión contable y financiera', arm_company_id, '#3B82F6', NOW(), NOW()),
        (gen_random_uuid(), 'Recursos Humanos', 'Departamento de gestión de personal', arm_company_id, '#EF4444', NOW(), NOW()),
        (gen_random_uuid(), 'Operaciones', 'Departamento de operaciones generales', arm_company_id, '#84CC16', NOW(), NOW()),
        (gen_random_uuid(), 'Legal', 'Departamento legal y cumplimiento', arm_company_id, '#8B5CF6', NOW(), NOW()),
        (gen_random_uuid(), 'Tecnología', 'Departamento de sistemas y tecnología', arm_company_id, '#06B6D4', NOW(), NOW()),
        (gen_random_uuid(), 'Certificaciones', 'Departamento de Certificaciones y Validaciones', arm_company_id, '#7C3AED', NOW(), NOW());
    
    -- 4. CREAR DEPARTAMENTOS PARA AMCO
    RAISE NOTICE '4. Creando departamentos para AMCO...';
    
    INSERT INTO departments (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'Administración', 'Departamento de administración general', amco_company_id, '#F97316', NOW(), NOW()),
        (gen_random_uuid(), 'Almacén', 'Departamento encargado de la gestión de inventario y almacén', amco_company_id, '#10B981', NOW(), NOW()),
        (gen_random_uuid(), 'Contabilidad', 'Departamento encargado de la gestión contable y financiera', amco_company_id, '#3B82F6', NOW(), NOW()),
        (gen_random_uuid(), 'Recursos Humanos', 'Departamento de gestión de personal', amco_company_id, '#EF4444', NOW(), NOW()),
        (gen_random_uuid(), 'Operaciones', 'Departamento de operaciones generales', amco_company_id, '#84CC16', NOW(), NOW()),
        (gen_random_uuid(), 'Legal', 'Departamento legal y cumplimiento', amco_company_id, '#8B5CF6', NOW(), NOW()),
        (gen_random_uuid(), 'Tecnología', 'Departamento de sistemas y tecnología', amco_company_id, '#06B6D4', NOW(), NOW()),
        (gen_random_uuid(), 'Certificaciones', 'Departamento de Certificaciones y Validaciones', amco_company_id, '#7C3AED', NOW(), NOW());
    
    -- 5. CREAR DEPARTAMENTOS PARA GMC
    RAISE NOTICE '5. Creando departamentos para GMC...';
    
    INSERT INTO departments (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'Administración', 'Departamento de administración general', gmc_company_id, '#F97316', NOW(), NOW()),
        (gen_random_uuid(), 'Almacén', 'Departamento encargado de la gestión de inventario y almacén', gmc_company_id, '#10B981', NOW(), NOW()),
        (gen_random_uuid(), 'Contabilidad', 'Departamento encargado de la gestión contable y financiera', gmc_company_id, '#3B82F6', NOW(), NOW()),
        (gen_random_uuid(), 'Recursos Humanos', 'Departamento de gestión de personal', gmc_company_id, '#EF4444', NOW(), NOW()),
        (gen_random_uuid(), 'Operaciones', 'Departamento de operaciones generales', gmc_company_id, '#84CC16', NOW(), NOW()),
        (gen_random_uuid(), 'Legal', 'Departamento legal y cumplimiento', gmc_company_id, '#8B5CF6', NOW(), NOW()),
        (gen_random_uuid(), 'Tecnología', 'Departamento de sistemas y tecnología', gmc_company_id, '#06B6D4', NOW(), NOW()),
        (gen_random_uuid(), 'Certificaciones', 'Departamento de Certificaciones y Validaciones', gmc_company_id, '#7C3AED', NOW(), NOW());
    
    -- 6. CREAR DEPARTAMENTOS PARA GALUR
    RAISE NOTICE '6. Creando departamentos para GALUR...';
    
    INSERT INTO departments (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'Administración', 'Departamento de administración general', galur_company_id, '#F97316', NOW(), NOW()),
        (gen_random_uuid(), 'Almacén', 'Departamento encargado de la gestión de inventario y almacén', galur_company_id, '#10B981', NOW(), NOW()),
        (gen_random_uuid(), 'Contabilidad', 'Departamento encargado de la gestión contable y financiera', galur_company_id, '#3B82F6', NOW(), NOW()),
        (gen_random_uuid(), 'Recursos Humanos', 'Departamento de gestión de personal', galur_company_id, '#EF4444', NOW(), NOW()),
        (gen_random_uuid(), 'Operaciones', 'Departamento de operaciones generales', galur_company_id, '#84CC16', NOW(), NOW()),
        (gen_random_uuid(), 'Legal', 'Departamento legal y cumplimiento', galur_company_id, '#8B5CF6', NOW(), NOW()),
        (gen_random_uuid(), 'Tecnología', 'Departamento de sistemas y tecnología', galur_company_id, '#06B6D4', NOW(), NOW()),
        (gen_random_uuid(), 'Certificaciones', 'Departamento de Certificaciones y Validaciones', galur_company_id, '#7C3AED', NOW(), NOW());
    
    -- 7. CREAR MARCAS PARA ALGE PERUVIAN
    RAISE NOTICE '7. Creando marcas para ALGE PERUVIAN...';
    
    INSERT INTO brands (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'VALHALLA', 'Marca premium de ALGE PERUVIAN', alge_company_id, '#8B5CF6', NOW(), NOW()),
        (gen_random_uuid(), 'ZEUS', 'Marca especializada de ALGE PERUVIAN', alge_company_id, '#F59E0B', NOW(), NOW());
    
    -- 8. CREAR MARCAS PARA ARM CORPORATIONS
    RAISE NOTICE '8. Creando marcas para ARM CORPORATIONS...';
    
    INSERT INTO brands (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'WORLD LIFE', 'Marca global de ARM CORPORATIONS', arm_company_id, '#10B981', NOW(), NOW()),
        (gen_random_uuid(), 'HOPE LIFE', 'Marca especializada de ARM CORPORATIONS', arm_company_id, '#EF4444', NOW(), NOW());
    
    -- 9. CREAR MARCAS PARA AMCO
    RAISE NOTICE '9. Creando marcas para AMCO...';
    
    INSERT INTO brands (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'AMCO PRIME', 'Marca principal de AMCO', amco_company_id, '#F59E0B', NOW(), NOW()),
        (gen_random_uuid(), 'AMCO SOLUTIONS', 'Marca de soluciones de AMCO', amco_company_id, '#8B5CF6', NOW(), NOW());
    
    -- 10. CREAR MARCAS PARA GMC
    RAISE NOTICE '10. Creando marcas para GMC...';
    
    INSERT INTO brands (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'GMC CONSULTING', 'Marca de consultoría de GMC', gmc_company_id, '#EF4444', NOW(), NOW()),
        (gen_random_uuid(), 'GMC MANAGEMENT', 'Marca de gestión de GMC', gmc_company_id, '#10B981', NOW(), NOW());
    
    -- 11. CREAR MARCAS PARA GALUR
    RAISE NOTICE '11. Creando marcas para GALUR...';
    
    INSERT INTO brands (id, name, description, company_id, color, created_at, updated_at) VALUES
        (gen_random_uuid(), 'GALUR TECH', 'Marca tecnológica de GALUR', galur_company_id, '#06B6D4', NOW(), NOW()),
        (gen_random_uuid(), 'GALUR INNOVATION', 'Marca de innovación de GALUR', galur_company_id, '#7C3AED', NOW(), NOW());
    
    -- 12. VERIFICAR RESULTADOS
    RAISE NOTICE '=== VERIFICACIÓN DE RESULTADOS ===';
    
    RAISE NOTICE 'Empresas creadas: %', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE 'Departamentos creados: %', (SELECT COUNT(*) FROM departments);
    RAISE NOTICE 'Marcas creadas: %', (SELECT COUNT(*) FROM brands);
    
    -- Mostrar distribución por empresa
    RAISE NOTICE '--- Departamentos por empresa ---';
    FOR dept_id IN 
        SELECT DISTINCT company_id FROM departments 
    LOOP
        RAISE NOTICE 'Empresa %: % departamentos', 
            (SELECT name FROM companies WHERE id = dept_id),
            (SELECT COUNT(*) FROM departments WHERE company_id = dept_id);
    END LOOP;
    
    RAISE NOTICE '--- Marcas por empresa ---';
    FOR dept_id IN 
        SELECT DISTINCT company_id FROM brands 
    LOOP
        RAISE NOTICE 'Empresa %: % marcas', 
            (SELECT name FROM companies WHERE id = dept_id),
            (SELECT COUNT(*) FROM brands WHERE company_id = dept_id);
    END LOOP;
    
    RAISE NOTICE '=== ESTRUCTURA BÁSICA RECREADA EXITOSAMENTE ===';
    
END $$;

-- Mostrar resumen final
SELECT 
    'EMPRESAS' as tipo,
    CONCAT(name, ' (', code, ')') as nombre,
    description as descripcion,
    color as color,
    created_at as creado
FROM companies
UNION ALL
SELECT 
    'DEPARTAMENTO' as tipo,
    d.name as nombre,
    CONCAT(d.description, ' (', c.name, ')') as descripcion,
    d.color as color,
    d.created_at as creado
FROM departments d
JOIN companies c ON d.company_id = c.id
UNION ALL
SELECT 
    'MARCA' as tipo,
    b.name as nombre,
    CONCAT(b.description, ' (', c.name, ')') as descripcion,
    b.color as color,
    b.created_at as creado
FROM brands b
JOIN companies c ON b.company_id = c.id
ORDER BY tipo, nombre;
