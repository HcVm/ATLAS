-- Crear documentos de ejemplo si no existen
INSERT INTO documents (
    title,
    document_number,
    description,
    status,
    department_id,
    created_by
)
SELECT 
    'Documento de Prueba ' || generate_series,
    'DOC-' || LPAD(generate_series::text, 4, '0'),
    'Descripción del documento de prueba número ' || generate_series,
    CASE 
        WHEN generate_series % 4 = 0 THEN 'pending'
        WHEN generate_series % 4 = 1 THEN 'in_progress'
        WHEN generate_series % 4 = 2 THEN 'completed'
        ELSE 'cancelled'
    END,
    (SELECT id FROM departments LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
FROM generate_series(1, 5)
WHERE NOT EXISTS (SELECT 1 FROM documents LIMIT 1);

-- Verificar los documentos creados
SELECT 
    d.id,
    d.title,
    d.document_number,
    d.status,
    d.created_at,
    p.full_name as created_by,
    dept.name as department_name
FROM documents d
LEFT JOIN profiles p ON d.created_by = p.id
LEFT JOIN departments dept ON d.department_id = dept.id
ORDER BY d.created_at DESC;
