-- Verificar movimientos existentes
SELECT 
  dm.id,
  dm.created_at,
  d.title as document_title,
  d.document_number,
  from_dept.name as from_department,
  to_dept.name as to_department,
  p.full_name as moved_by
FROM document_movements dm
LEFT JOIN documents d ON dm.document_id = d.id
LEFT JOIN departments from_dept ON dm.from_department_id = from_dept.id
LEFT JOIN departments to_dept ON dm.to_department_id = to_dept.id
LEFT JOIN profiles p ON dm.moved_by = p.id
ORDER BY dm.created_at DESC
LIMIT 20;

-- Contar total de movimientos
SELECT COUNT(*) as total_movements FROM document_movements;

-- Verificar documentos recientes
SELECT 
  id,
  title,
  document_number,
  department_id,
  created_at
FROM documents
ORDER BY created_at DESC
LIMIT 10;

-- Verificar si hay movimientos para documentos recientes
SELECT 
  d.title,
  d.created_at as document_created,
  COUNT(dm.id) as movement_count
FROM documents d
LEFT JOIN document_movements dm ON d.id = dm.document_id
WHERE d.created_at > NOW() - INTERVAL '7 days'
GROUP BY d.id, d.title, d.created_at
ORDER BY d.created_at DESC;
