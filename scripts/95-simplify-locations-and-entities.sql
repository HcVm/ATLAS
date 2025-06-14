-- Agregar campos necesarios a inventory_movements si no existen
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS destination_entity_name VARCHAR(200);

ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS destination_department_id UUID;

ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS destination_address TEXT;

ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);

-- Agregar referencia a departamentos si existe la tabla
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'peru_departments') THEN
        ALTER TABLE inventory_movements 
        ADD CONSTRAINT fk_destination_department 
        FOREIGN KEY (destination_department_id) REFERENCES peru_departments(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Comentarios para claridad
COMMENT ON COLUMN inventory_movements.destination_entity_name IS 'Nombre de la entidad destino (se autocompleta)';
COMMENT ON COLUMN inventory_movements.destination_department_id IS 'Departamento de destino';
COMMENT ON COLUMN inventory_movements.destination_address IS 'Dirección específica del destino';
COMMENT ON COLUMN inventory_movements.sale_price IS 'Precio de venta específico para este movimiento (solo salidas)';
COMMENT ON COLUMN inventory_movements.unit_cost IS 'Costo unitario del producto';

-- Función para obtener entidades únicas para autocompletado
CREATE OR REPLACE FUNCTION get_entity_suggestions(company_uuid UUID)
RETURNS TABLE(entity_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT im.destination_entity_name::TEXT
    FROM inventory_movements im
    WHERE im.company_id = company_uuid 
      AND im.destination_entity_name IS NOT NULL
      AND im.destination_entity_name != ''
    ORDER BY im.destination_entity_name;
END;
$$ LANGUAGE plpgsql;

-- Verificar estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'inventory_movements' 
  AND column_name IN ('destination_entity_name', 'destination_department_id', 'destination_address', 'sale_price')
ORDER BY column_name;
