-- Verificar si hay documentos en la base de datos
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
ORDER BY d.created_at DESC
LIMIT 10;

-- Si no hay documentos, mostrar información sobre las tablas
SELECT 'Documentos encontrados:' as info, COUNT(*) as count FROM documents;
SELECT 'Perfiles encontrados:' as info, COUNT(*) as count FROM profiles;
SELECT 'Departamentos encontrados:' as info, COUNT(*) as count FROM departments;
