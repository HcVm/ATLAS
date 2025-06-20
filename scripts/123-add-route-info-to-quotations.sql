-- ============================================================================
-- AGREGAR INFORMACIÓN DE RUTA A COTIZACIONES
-- Script para agregar campos de Google Maps y rutas
-- ============================================================================

-- Agregar columnas para información de ruta
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS route_origin_address TEXT,
ADD COLUMN IF NOT EXISTS route_destination_address TEXT,
ADD COLUMN IF NOT EXISTS route_distance_km NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS route_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS route_toll_cost NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS route_fuel_cost NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS route_google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS route_waypoints JSONB,
ADD COLUMN IF NOT EXISTS route_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS route_created_by UUID REFERENCES profiles(id);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_quotations_route_distance ON quotations(route_distance_km);
CREATE INDEX IF NOT EXISTS idx_quotations_route_duration ON quotations(route_duration_minutes);
CREATE INDEX IF NOT EXISTS idx_quotations_route_created_by ON quotations(route_created_by);

-- Comentarios para documentar las columnas
COMMENT ON COLUMN quotations.route_origin_address IS 'Dirección de origen para la ruta de entrega';
COMMENT ON COLUMN quotations.route_destination_address IS 'Dirección de destino para la ruta de entrega';
COMMENT ON COLUMN quotations.route_distance_km IS 'Distancia total de la ruta en kilómetros';
COMMENT ON COLUMN quotations.route_duration_minutes IS 'Duración estimada del viaje en minutos';
COMMENT ON COLUMN quotations.route_toll_cost IS 'Costo estimado de peajes en soles';
COMMENT ON COLUMN quotations.route_fuel_cost IS 'Costo estimado de combustible en soles';
COMMENT ON COLUMN quotations.route_google_maps_url IS 'URL de Google Maps con la ruta planificada';
COMMENT ON COLUMN quotations.route_waypoints IS 'Puntos intermedios de la ruta en formato JSON';
COMMENT ON COLUMN quotations.route_created_at IS 'Fecha y hora cuando se creó la ruta';
COMMENT ON COLUMN quotations.route_created_by IS 'Usuario que creó la información de ruta';

-- Función para calcular costo estimado de combustible
CREATE OR REPLACE FUNCTION calculate_fuel_cost(
    distance_km NUMERIC,
    fuel_price_per_liter NUMERIC DEFAULT 15.50,
    vehicle_consumption_km_per_liter NUMERIC DEFAULT 12.0
) RETURNS NUMERIC AS $$
BEGIN
    -- Cálculo: (distancia / rendimiento) * precio_combustible
    RETURN ROUND((distance_km / vehicle_consumption_km_per_liter) * fuel_price_per_liter, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el costo de combustible
CREATE OR REPLACE FUNCTION update_route_fuel_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo calcular si hay distancia pero no hay costo de combustible
    IF NEW.route_distance_km IS NOT NULL AND NEW.route_fuel_cost IS NULL THEN
        NEW.route_fuel_cost := calculate_fuel_cost(NEW.route_distance_km);
    END IF;
    
    -- Actualizar timestamp de ruta
    IF NEW.route_distance_km IS NOT NULL AND OLD.route_distance_km IS DISTINCT FROM NEW.route_distance_km THEN
        NEW.route_created_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_update_route_fuel_cost ON quotations;
CREATE TRIGGER trigger_update_route_fuel_cost
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_route_fuel_cost();

-- Verificar que las columnas se agregaron correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotations' 
        AND column_name = 'route_distance_km'
    ) THEN
        RAISE NOTICE '✅ Columnas de ruta agregadas exitosamente a la tabla quotations';
    ELSE
        RAISE NOTICE '❌ Error: No se pudieron agregar las columnas de ruta';
    END IF;
END $$;

-- Mostrar estructura actualizada de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quotations' 
AND column_name LIKE 'route_%'
ORDER BY ordinal_position;
