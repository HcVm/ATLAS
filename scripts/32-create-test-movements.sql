-- Crear algunos movimientos de prueba si no existen
DO $$
DECLARE
  doc_id UUID;
  dept1_id UUID;
  dept2_id UUID;
  user_id UUID;
BEGIN
  -- Obtener un documento existente
  SELECT id INTO doc_id FROM documents LIMIT 1;
  
  -- Obtener departamentos
  SELECT id INTO dept1_id FROM departments ORDER BY created_at LIMIT 1;
  SELECT id INTO dept2_id FROM departments ORDER BY created_at LIMIT 1 OFFSET 1;
  
  -- Obtener un usuario
  SELECT id INTO user_id FROM profiles WHERE role = 'admin' LIMIT 1;
  
  -- Solo crear movimientos si tenemos los datos necesarios
  IF doc_id IS NOT NULL AND dept1_id IS NOT NULL AND dept2_id IS NOT NULL AND user_id IS NOT NULL THEN
    -- Crear un movimiento de prueba
    INSERT INTO document_movements (
      document_id,
      from_department_id,
      to_department_id,
      moved_by,
      notes,
      created_at
    ) VALUES (
      doc_id,
      dept1_id,
      dept2_id,
      user_id,
      'Movimiento de prueba creado automáticamente',
      NOW() - INTERVAL '1 hour'
    );
    
    -- Actualizar el departamento del documento
    UPDATE documents 
    SET department_id = dept2_id, updated_at = NOW()
    WHERE id = doc_id;
    
    RAISE NOTICE 'Movimiento de prueba creado exitosamente';
  ELSE
    RAISE NOTICE 'No se pudieron crear movimientos de prueba - faltan datos necesarios';
  END IF;
END $$;
