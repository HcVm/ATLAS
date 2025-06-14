-- Primero, migrar los nombres existentes a inventory_movements si hay datos
UPDATE inventory_movements 
SET destination_entity_name = de.name
FROM destination_entities de
WHERE inventory_movements.destination_entity_id = de.id
  AND inventory_movements.destination_entity_name IS NULL;

-- Eliminar la referencia en inventory_movements
ALTER TABLE inventory_movements 
DROP COLUMN IF EXISTS destination_entity_id;

-- Eliminar la tabla compleja
DROP TABLE IF EXISTS destination_entities CASCADE;

-- Crear una tabla simple solo con nombres
CREATE TABLE IF NOT EXISTS destination_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_destination_entities_company_name 
ON destination_entities(company_id, name);

-- Políticas RLS
ALTER TABLE destination_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view entities from their company" ON destination_entities;
CREATE POLICY "Users can view entities from their company" ON destination_entities
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage entities from their company" ON destination_entities;
CREATE POLICY "Users can manage entities from their company" ON destination_entities
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Función mejorada para obtener entidades (ahora de ambas fuentes)
CREATE OR REPLACE FUNCTION get_entity_suggestions(company_uuid UUID)
RETURNS TABLE(entity_name TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Obtener de la tabla de entidades
    SELECT DISTINCT de.name::TEXT
    FROM destination_entities de
    WHERE de.company_id = company_uuid
    
    UNION
    
    -- Obtener de movimientos históricos
    SELECT DISTINCT im.destination_entity_name::TEXT
    FROM inventory_movements im
    WHERE im.company_id = company_uuid 
      AND im.destination_entity_name IS NOT NULL
      AND im.destination_entity_name != ''
    
    ORDER BY entity_name;
END;
$$ LANGUAGE plpgsql;

-- Función para crear entidad automáticamente si no existe
CREATE OR REPLACE FUNCTION create_entity_if_not_exists(
    company_uuid UUID,
    entity_name TEXT
) RETURNS UUID AS $$
DECLARE
    entity_id UUID;
BEGIN
    -- Buscar si ya existe
    SELECT id INTO entity_id
    FROM destination_entities
    WHERE company_id = company_uuid AND name = entity_name;
    
    -- Si no existe, crearla
    IF entity_id IS NULL THEN
        INSERT INTO destination_entities (company_id, name)
        VALUES (company_uuid, entity_name)
        RETURNING id INTO entity_id;
    END IF;
    
    RETURN entity_id;
END;
$$ LANGUAGE plpgsql;

-- Verificar estructura final
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'destination_entities'
ORDER BY ordinal_position;
