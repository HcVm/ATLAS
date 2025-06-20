-- ============================================================================
-- AGREGAR NUMERACIÓN A COTIZACIONES Y MEJORAR MÓDULO DE VENTAS (CORREGIDO)
-- ============================================================================

-- 1. Agregar columna quotation_number a cotizaciones
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(50);

-- 2. Crear función para generar número de cotización automático
CREATE OR REPLACE FUNCTION generate_quotation_number(company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    formatted_number VARCHAR(50);
BEGIN
    -- Obtener el año actual
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Obtener el siguiente número para este año y empresa
    SELECT COALESCE(MAX(
        CASE 
            WHEN quotation_number ~ '^COT-[0-9]{4}-[0-9]+$' 
            THEN CAST(SPLIT_PART(quotation_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM quotations 
    WHERE company_id = company_uuid 
    AND quotation_number LIKE 'COT-' || current_year || '-%';
    
    -- Formatear el número con ceros a la izquierda
    formatted_number := 'COT-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear trigger para generar número automáticamente
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
        NEW.quotation_number := generate_quotation_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger
DROP TRIGGER IF EXISTS trigger_set_quotation_number ON quotations;
CREATE TRIGGER trigger_set_quotation_number
    BEFORE INSERT ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION set_quotation_number();

-- 5. Actualizar cotizaciones existentes sin número
UPDATE quotations 
SET quotation_number = generate_quotation_number(company_id)
WHERE quotation_number IS NULL OR quotation_number = '';

-- 6. Agregar columna quotation_id a ventas para vincular con cotizaciones
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id);

-- 7. Crear índices básicos (sin funciones complejas)
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_company_date ON quotations(company_id, quotation_date);
CREATE INDEX IF NOT EXISTS idx_sales_quotation_id ON sales(quotation_id);

-- 8. Agregar columna sale_number a ventas para numeración automática
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS sale_number VARCHAR(50);

-- 9. Crear función para generar número de venta automático
CREATE OR REPLACE FUNCTION generate_sale_number(company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    current_year INTEGER;
    next_number INTEGER;
    formatted_number VARCHAR(50);
BEGIN
    -- Obtener el año actual
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Obtener el siguiente número para este año y empresa
    SELECT COALESCE(MAX(
        CASE 
            WHEN sale_number ~ '^VEN-[0-9]{4}-[0-9]+$' 
            THEN CAST(SPLIT_PART(sale_number, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO next_number
    FROM sales 
    WHERE company_id = company_uuid 
    AND sale_number LIKE 'VEN-' || current_year || '-%';
    
    -- Formatear el número con ceros a la izquierda
    formatted_number := 'VEN-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- 10. Crear trigger para generar número de venta automáticamente
CREATE OR REPLACE FUNCTION set_sale_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
        NEW.sale_number := generate_sale_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Crear trigger para ventas
DROP TRIGGER IF EXISTS trigger_set_sale_number ON sales;
CREATE TRIGGER trigger_set_sale_number
    BEFORE INSERT ON sales
    FOR EACH ROW
    EXECUTE FUNCTION set_sale_number();

-- 12. Actualizar ventas existentes sin número
UPDATE sales 
SET sale_number = generate_sale_number(company_id)
WHERE sale_number IS NULL OR sale_number = '';

-- 13. Crear índices básicos para ventas
CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON sales(company_id, sale_date);

-- 14. Crear función IMMUTABLE para extraer año (opcional, para índices futuros)
CREATE OR REPLACE FUNCTION extract_year_immutable(date_val DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM date_val);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 15. Crear función IMMUTABLE para extraer año de timestamp (opcional)
CREATE OR REPLACE FUNCTION extract_year_from_timestamp_immutable(ts_val TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM ts_val);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las columnas se agregaron correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('quotations', 'sales') 
AND column_name IN ('quotation_number', 'quotation_id', 'sale_number')
ORDER BY table_name, column_name;

-- Verificar que las funciones se crearon
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
    'generate_quotation_number', 
    'generate_sale_number', 
    'set_quotation_number', 
    'set_sale_number',
    'extract_year_immutable',
    'extract_year_from_timestamp_immutable'
)
ORDER BY routine_name;

-- Verificar que los triggers se crearon
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_set_quotation_number', 'trigger_set_sale_number')
ORDER BY trigger_name;

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('quotations', 'sales')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Mostrar algunas cotizaciones con sus números
SELECT id, quotation_number, entity_name, quotation_date, company_id
FROM quotations 
ORDER BY quotation_date DESC 
LIMIT 5;

-- Mostrar algunas ventas con sus números
SELECT id, sale_number, entity_name, sale_date, company_id
FROM sales 
ORDER BY sale_date DESC 
LIMIT 5;

-- Mensaje de éxito
SELECT 'Script ejecutado exitosamente. Numeración automática configurada.' as resultado;

COMMIT;
