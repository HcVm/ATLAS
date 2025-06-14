-- Arreglar el problema de múltiples departamentos ASIGNAR
-- y crear la estructura para movimientos

-- 1. Limpiar departamentos ASIGNAR duplicados
DELETE FROM departments 
WHERE name = 'ASIGNAR' 
AND id NOT IN (
    SELECT MIN(id) 
    FROM departments 
    WHERE name = 'ASIGNAR' 
    GROUP BY company_id
);

-- 2. Asegurar que cada empresa tenga exactamente un departamento ASIGNAR
INSERT INTO departments (name, description, color, company_id)
SELECT 
    'ASIGNAR',
    'Departamento temporal para usuarios sin asignar',
    '#6B7280',
    c.id
FROM companies c
WHERE NOT EXISTS (
    SELECT 1 FROM departments d 
    WHERE d.company_id = c.id AND d.name = 'ASIGNAR'
);

-- 3. Crear un departamento ASIGNAR global para usuarios sin empresa
INSERT INTO departments (name, description, color, company_id)
SELECT 
    'ASIGNAR',
    'Departamento temporal para usuarios sin empresa asignada',
    '#6B7280',
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM departments 
    WHERE company_id IS NULL AND name = 'ASIGNAR'
);

-- 4. Verificar la estructura
SELECT 
    'Departamentos ASIGNAR creados:' as info,
    COUNT(*) as total
FROM departments 
WHERE name = 'ASIGNAR';

SELECT 
    COALESCE(c.name, 'SIN EMPRESA') as empresa,
    d.name as departamento,
    d.id
FROM departments d
LEFT JOIN companies c ON d.company_id = c.id
WHERE d.name = 'ASIGNAR'
ORDER BY c.name NULLS LAST;
