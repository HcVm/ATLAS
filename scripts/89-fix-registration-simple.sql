-- Limpiar todos los departamentos ASIGNAR existentes
DELETE FROM departments WHERE name = 'ASIGNAR';

-- Crear UN SOLO departamento ASIGNAR global
INSERT INTO departments (name, description, color, company_id)
VALUES (
    'ASIGNAR',
    'Departamento temporal para usuarios sin asignar',
    '#6B7280',
    NULL
);

-- Verificar que solo existe uno
SELECT 
    'Departamento ASIGNAR creado:' as info,
    COUNT(*) as total
FROM departments 
WHERE name = 'ASIGNAR';

SELECT 
    name as departamento,
    description,
    company_id,
    id
FROM departments 
WHERE name = 'ASIGNAR';
