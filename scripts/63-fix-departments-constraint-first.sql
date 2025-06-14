-- Primero eliminar la restricción única problemática y luego crear departamentos

-- Paso 1: Verificar y eliminar la restricción única problemática
DO $$
BEGIN
    -- Verificar si existe la restricción única en 'name' solamente
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'departments' 
        AND constraint_name = 'departments_name_key'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Eliminar la restricción única problemática
        ALTER TABLE departments DROP CONSTRAINT departments_name_key;
        RAISE NOTICE 'Restricción departments_name_key eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Restricción departments_name_key no existe o ya fue eliminada';
    END IF;
    
    -- Verificar si ya existe una restricción única compuesta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu1 ON tc.constraint_name = kcu1.constraint_name
        JOIN information_schema.key_column_usage kcu2 ON tc.constraint_name = kcu2.constraint_name
        WHERE tc.table_name = 'departments' 
        AND tc.constraint_type = 'UNIQUE'
        AND kcu1.column_name = 'name'
        AND kcu2.column_name = 'company_id'
        AND kcu1.constraint_name = kcu2.constraint_name
    ) THEN
        -- Crear restricción única compuesta (name + company_id)
        ALTER TABLE departments ADD CONSTRAINT departments_name_company_unique 
        UNIQUE (name, company_id);
        RAISE NOTICE 'Restricción única compuesta (name, company_id) creada exitosamente';
    ELSE
        RAISE NOTICE 'Restricción única compuesta ya existe';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error al modificar restricciones: %', SQLERRM;
END $$;

-- Paso 2: Mostrar departamentos existentes antes de crear nuevos
SELECT 
    'DEPARTAMENTOS EXISTENTES ANTES:' as info,
    c.name as empresa,
    d.name as departamento,
    d.id
FROM companies c
LEFT JOIN departments d ON c.id = d.company_id
ORDER BY c.name, d.name;

-- Paso 3: Crear departamentos de forma segura
DO $$
DECLARE
    company_record RECORD;
    dept_count INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando creación de departamentos...';
    
    -- Para cada empresa
    FOR company_record IN SELECT id, name FROM companies LOOP
        RAISE NOTICE 'Procesando empresa: %', company_record.name;
        
        -- Verificar y crear departamento de Almacén
        SELECT COUNT(*) INTO dept_count
        FROM departments 
        WHERE company_id = company_record.id 
        AND name IN ('Almacén', 'Almacen');
        
        IF dept_count = 0 THEN
            INSERT INTO departments (name, description, company_id, color, created_at, updated_at)
            VALUES (
                'Almacén',
                'Departamento encargado de la gestión de inventario y almacén',
                company_record.id,
                '#10B981',
                NOW(),
                NOW()
            );
            RAISE NOTICE '✓ Departamento Almacén creado para: %', company_record.name;
        ELSE
            RAISE NOTICE '- Departamento Almacén ya existe para: %', company_record.name;
        END IF;
        
        -- Verificar y crear departamento de Contabilidad
        SELECT COUNT(*) INTO dept_count
        FROM departments 
        WHERE company_id = company_record.id 
        AND name = 'Contabilidad';
        
        IF dept_count = 0 THEN
            INSERT INTO departments (name, description, company_id, color, created_at, updated_at)
            VALUES (
                'Contabilidad',
                'Departamento encargado de la gestión contable y financiera',
                company_record.id,
                '#3B82F6',
                NOW(),
                NOW()
            );
            RAISE NOTICE '✓ Departamento Contabilidad creado para: %', company_record.name;
        ELSE
            RAISE NOTICE '- Departamento Contabilidad ya existe para: %', company_record.name;
        END IF;
        
    END LOOP;
    
    RAISE NOTICE 'Proceso de creación de departamentos completado';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error durante la creación de departamentos: %', SQLERRM;
END $$;

-- Paso 4: Mostrar resultado final
SELECT 
    'DEPARTAMENTOS DESPUÉS DE LA CREACIÓN:' as info,
    c.name as empresa,
    d.name as departamento,
    d.color,
    d.description
FROM companies c
JOIN departments d ON c.id = d.company_id
WHERE d.name IN ('Almacén', 'Contabilidad', 'Almacen')
ORDER BY c.name, d.name;

-- Paso 5: Verificar restricciones actuales
SELECT 
    'RESTRICCIONES ÚNICAS ACTUALES:' as info,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columnas
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'departments' 
AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name;

-- Paso 6: Verificar acceso al almacén
SELECT 
    'USUARIOS CON ACCESO AL ALMACÉN:' as info,
    c.name as empresa,
    p.full_name as usuario,
    p.role as rol,
    COALESCE(d.name, 'Sin departamento') as departamento,
    CASE 
        WHEN p.role IN ('admin', 'supervisor') THEN 'Acceso completo'
        WHEN d.name IN ('Almacén', 'Contabilidad', 'Almacen') THEN 'Acceso por departamento'
        ELSE 'Sin acceso'
    END as tipo_acceso
FROM companies c
JOIN profiles p ON c.id = p.company_id
LEFT JOIN departments d ON p.department_id = d.id
WHERE p.role IN ('admin', 'supervisor') 
   OR d.name IN ('Almacén', 'Contabilidad', 'Almacen')
ORDER BY c.name, p.full_name;
