-- Crear departamentos de Almacén y Contabilidad para cada empresa
-- Maneja duplicados y restricciones de unicidad

-- Primero, verificar la estructura de la tabla departments
SELECT 
    'Estructura actual de departments:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'departments' 
ORDER BY ordinal_position;

-- Verificar restricciones únicas existentes
SELECT 
    'Restricciones únicas en departments:' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'departments' 
AND constraint_type = 'UNIQUE';

-- Verificar departamentos existentes
SELECT 
    'Departamentos existentes:' as info,
    c.name as empresa,
    d.name as departamento,
    d.id
FROM companies c
LEFT JOIN departments d ON c.id = d.company_id
ORDER BY c.name, d.name;

-- Función para crear departamentos de forma segura
DO $$
DECLARE
    company_record RECORD;
    dept_exists BOOLEAN;
BEGIN
    -- Para cada empresa
    FOR company_record IN SELECT id, name FROM companies LOOP
        
        -- Verificar si ya existe departamento de Almacén para esta empresa
        SELECT EXISTS(
            SELECT 1 FROM departments 
            WHERE company_id = company_record.id 
            AND name IN ('Almacén', 'Almacen')
        ) INTO dept_exists;
        
        -- Crear departamento de Almacén si no existe
        IF NOT dept_exists THEN
            INSERT INTO departments (name, description, company_id, color, created_at, updated_at)
            VALUES (
                'Almacén',
                'Departamento encargado de la gestión de inventario y almacén',
                company_record.id,
                '#10B981',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Departamento Almacén creado para empresa: %', company_record.name;
        ELSE
            RAISE NOTICE 'Departamento Almacén ya existe para empresa: %', company_record.name;
        END IF;
        
        -- Verificar si ya existe departamento de Contabilidad para esta empresa
        SELECT EXISTS(
            SELECT 1 FROM departments 
            WHERE company_id = company_record.id 
            AND name = 'Contabilidad'
        ) INTO dept_exists;
        
        -- Crear departamento de Contabilidad si no existe
        IF NOT dept_exists THEN
            INSERT INTO departments (name, description, company_id, color, created_at, updated_at)
            VALUES (
                'Contabilidad',
                'Departamento encargado de la gestión contable y financiera',
                company_record.id,
                '#3B82F6',
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Departamento Contabilidad creado para empresa: %', company_record.name;
        ELSE
            RAISE NOTICE 'Departamento Contabilidad ya existe para empresa: %', company_record.name;
        END IF;
        
    END LOOP;
END $$;

-- Si hay restricción única global, intentar eliminarla y crear una compuesta
DO $$
BEGIN
    -- Verificar si existe restricción única solo en name
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'departments' 
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name = 'name'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.key_column_usage kcu2 
            WHERE kcu2.constraint_name = kcu.constraint_name 
            AND kcu2.column_name = 'company_id'
        )
    ) THEN
        -- Eliminar restricción única simple en name
        ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;
        
        -- Crear restricción única compuesta (name + company_id)
        ALTER TABLE departments ADD CONSTRAINT departments_name_company_unique 
        UNIQUE (name, company_id);
        
        RAISE NOTICE 'Restricción única actualizada: ahora permite mismo nombre en diferentes empresas';
    ELSE
        RAISE NOTICE 'Restricción única ya está configurada correctamente o no existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No se pudo modificar la restricción única: %', SQLERRM;
END $$;

-- Mostrar resultado final
SELECT 
    'RESULTADO FINAL - Departamentos por empresa:' as info,
    c.name as empresa,
    d.name as departamento,
    d.color,
    d.description
FROM companies c
LEFT JOIN departments d ON c.id = d.company_id
WHERE d.name IN ('Almacén', 'Contabilidad', 'Almacen') OR d.name IS NULL
ORDER BY c.name, d.name;

-- Verificar usuarios con acceso al almacén
SELECT 
    'USUARIOS CON ACCESO AL ALMACÉN:' as info,
    c.name as empresa,
    p.full_name as usuario,
    p.role as rol,
    COALESCE(d.name, 'Sin departamento') as departamento,
    CASE 
        WHEN p.role IN ('admin', 'supervisor') THEN 'Acceso completo por rol'
        WHEN d.name IN ('Almacén', 'Contabilidad', 'Almacen') THEN 'Acceso por departamento'
        ELSE 'Sin acceso al almacén'
    END as tipo_acceso
FROM companies c
JOIN profiles p ON c.id = p.company_id
LEFT JOIN departments d ON p.department_id = d.id
ORDER BY c.name, 
         CASE WHEN p.role IN ('admin', 'supervisor') THEN 1 
              WHEN d.name IN ('Almacén', 'Contabilidad', 'Almacen') THEN 2 
              ELSE 3 END,
         p.full_name;
