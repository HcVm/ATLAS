-- Eliminar la tabla actual con restricciones por empresa
DROP TABLE IF EXISTS destination_entities CASCADE;

-- Crear tabla global de entidades (sin company_id)
CREATE TABLE destination_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_destination_entities_name ON destination_entities(name);

-- Políticas RLS - permitir acceso a todos los usuarios autenticados
ALTER TABLE destination_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can view entities" ON destination_entities;
CREATE POLICY "All authenticated users can view entities" ON destination_entities
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can manage entities" ON destination_entities;
CREATE POLICY "All authenticated users can manage entities" ON destination_entities
FOR ALL USING (auth.role() = 'authenticated');

-- Función para obtener entidades globales
CREATE OR REPLACE FUNCTION get_entity_suggestions()
RETURNS TABLE(entity_name TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Obtener de la tabla de entidades globales
    SELECT DISTINCT de.name::TEXT
    FROM destination_entities de
    
    UNION
    
    -- Obtener de movimientos históricos de todas las empresas
    SELECT DISTINCT im.destination_entity_name::TEXT
    FROM inventory_movements im
    WHERE im.destination_entity_name IS NOT NULL
      AND im.destination_entity_name != ''
    
    ORDER BY entity_name;
END;
$$ LANGUAGE plpgsql;

-- Función para crear entidad global si no existe
CREATE OR REPLACE FUNCTION create_entity_if_not_exists(entity_name TEXT) 
RETURNS UUID AS $$
DECLARE
    entity_id UUID;
BEGIN
    -- Buscar si ya existe
    SELECT id INTO entity_id
    FROM destination_entities
    WHERE name = entity_name;
    
    -- Si no existe, crearla
    IF entity_id IS NULL THEN
        INSERT INTO destination_entities (name)
        VALUES (entity_name)
        RETURNING id INTO entity_id;
    END IF;
    
    RETURN entity_id;
END;
$$ LANGUAGE plpgsql;

-- Poblar con entidades existentes de movimientos
INSERT INTO destination_entities (name)
SELECT DISTINCT destination_entity_name
FROM inventory_movements
WHERE destination_entity_name IS NOT NULL 
  AND destination_entity_name != ''
ON CONFLICT (name) DO NOTHING;

-- Verificar estructura final
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'destination_entities'
ORDER BY ordinal_position;

-- Mostrar entidades creadas
SELECT COUNT(*) as total_entities FROM destination_entities;
SELECT name FROM destination_entities ORDER BY name LIMIT 10;
