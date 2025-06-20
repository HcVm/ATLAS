-- ============================================================================
-- SIMPLIFICAR CAMPOS DE RUTA EN COTIZACIONES
-- Eliminar campos innecesarios de combustible, peajes y waypoints
-- ============================================================================

-- Eliminar columnas que no necesitamos
ALTER TABLE quotations 
DROP COLUMN IF EXISTS route_toll_cost,
DROP COLUMN IF EXISTS route_fuel_cost,
DROP COLUMN IF EXISTS route_waypoints;

-- Verificar que las columnas se eliminaron correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' 
        AND column_name = 'route_toll_cost'
    ) THEN
        RAISE NOTICE '✅ Columnas innecesarias eliminadas exitosamente';
    ELSE
        RAISE NOTICE '❌ Error: No se pudieron eliminar las columnas';
    END IF;
END $$;

-- Eliminar función de cálculo de combustible que ya no necesitamos
DROP FUNCTION IF EXISTS calculate_fuel_cost(NUMERIC, NUMERIC, NUMERIC);

-- Actualizar trigger para que no calcule costos
CREATE OR REPLACE FUNCTION update_route_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar timestamp de ruta cuando cambie la distancia
    IF NEW.route_distance_km IS NOT NULL AND OLD.route_distance_km IS DISTINCT FROM NEW.route_distance_km THEN
        NEW.route_created_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear trigger con la función simplificada
DROP TRIGGER IF EXISTS trigger_update_route_fuel_cost ON quotations;
CREATE TRIGGER trigger_update_route_info
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_route_info();

-- Mostrar estructura final de campos de ruta
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name LIKE 'route_%'
ORDER BY ordinal_position;

-- Comentarios actualizados
COMMENT ON COLUMN quotations.route_origin_address IS 'Dirección de origen para la ruta de entrega';
COMMENT ON COLUMN quotations.route_destination_address IS 'Dirección de destino para la ruta de entrega';
COMMENT ON COLUMN quotations.route_distance_km IS 'Distancia total de la ruta en kilómetros';
COMMENT ON COLUMN quotations.route_duration_minutes IS 'Duración estimada del viaje en minutos';
COMMENT ON COLUMN quotations.route_google_maps_url IS 'URL de Google Maps con la ruta planificada';
COMMENT ON COLUMN quotations.route_created_at IS 'Fecha y hora cuando se creó la ruta';
COMMENT ON COLUMN quotations.route_created_by IS 'Usuario que creó la información de ruta';
