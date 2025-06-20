-- =====================================================
-- MÓDULO DE COTIZACIONES/PROFORMAS
-- =====================================================

-- 1. Crear tabla de cotizaciones
CREATE TABLE IF NOT EXISTS quotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Datos de la empresa (automáticos)
    company_id UUID REFERENCES companies(id) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_ruc VARCHAR(20) NOT NULL,
    
    -- Datos de la entidad/cliente
    entity_id UUID REFERENCES sales_entities(id) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    entity_ruc VARCHAR(20) NOT NULL,
    delivery_location TEXT NOT NULL, -- Lugar de entrega
    
    -- Datos del producto
    product_id UUID REFERENCES products(id) NOT NULL,
    unique_code VARCHAR(100) NOT NULL, -- Código único del producto
    product_description TEXT NOT NULL,
    product_brand VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Precios y cálculos
    platform_unit_price_with_tax DECIMAL(12,2) NOT NULL, -- Precio unitario con IGV (plataforma)
    platform_total DECIMAL(12,2) NOT NULL, -- Total con precio de plataforma
    supplier_unit_price_with_tax DECIMAL(12,2), -- Precio unitario con IGV (proveedor)
    supplier_total DECIMAL(12,2), -- Total a ofertar con IGV (proveedor)
    offer_unit_price_with_tax DECIMAL(12,2), -- Precio unitario con IGV (oferta a entidad)
    offer_total_with_tax DECIMAL(12,2), -- Total ofertado incluido IGV
    
    -- Imagen referencial
    reference_image_url TEXT, -- URL de imagen referencial del producto
    
    -- Campos editables finales
    final_unit_price_with_tax DECIMAL(12,2), -- Unitario con IGV (final)
    budget_ceiling DECIMAL(12,2), -- Techo presupuestal
    
    -- Estado de la cotización
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
    
    -- Fechas importantes
    valid_until DATE, -- Válida hasta
    
    -- Observaciones
    observations TEXT,
    
    -- Auditoría
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_entity_id ON quotations(entity_id);
CREATE INDEX IF NOT EXISTS idx_quotations_product_id ON quotations(product_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_unique_code ON quotations(unique_code);

-- 3. Crear trigger para updated_at
DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can manage quotations based on department and role" ON quotations;

-- 6. Crear políticas RLS para quotations
-- Acceso basado en departamentos (ventas, administración, operaciones) y roles (admin, supervisor)
CREATE POLICY "Users can manage quotations based on department and role" ON quotations
FOR ALL USING (
    company_id IN (
        SELECT p.company_id
        FROM profiles p
        LEFT JOIN departments d ON p.department_id = d.id
        WHERE p.id = auth.uid()
        AND (
            -- Roles con acceso total
            p.role IN ('admin', 'supervisor')
            OR
            -- Usuarios de departamentos específicos
            (p.role = 'user' AND d.name ILIKE ANY(ARRAY['%ventas%', '%administración%', '%administracion%', '%operaciones%']))
        )
    )
);

-- 7. Crear función para obtener estadísticas de cotizaciones
CREATE OR REPLACE FUNCTION get_quotations_stats(company_uuid UUID)
RETURNS TABLE(
    total_quotations BIGINT,
    draft_quotations BIGINT,
    sent_quotations BIGINT,
    approved_quotations BIGINT,
    total_quoted_amount NUMERIC,
    average_quotation NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_quotations,
        COUNT(CASE WHEN q.status = 'draft' THEN 1 END)::BIGINT as draft_quotations,
        COUNT(CASE WHEN q.status = 'sent' THEN 1 END)::BIGINT as sent_quotations,
        COUNT(CASE WHEN q.status = 'approved' THEN 1 END)::BIGINT as approved_quotations,
        COALESCE(SUM(q.offer_total_with_tax), 0) as total_quoted_amount,
        COALESCE(AVG(q.offer_total_with_tax), 0) as average_quotation
    FROM quotations q
    WHERE q.company_id = company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Crear función para buscar productos por código único
CREATE OR REPLACE FUNCTION search_product_by_unique_code(
    search_code TEXT,
    company_uuid UUID
)
RETURNS TABLE(
    id UUID,
    code VARCHAR,
    name VARCHAR,
    description TEXT,
    brand VARCHAR,
    sale_price NUMERIC,
    current_stock INTEGER,
    image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        COALESCE(b.name, '') as brand,
        p.sale_price,
        COALESCE(p.current_stock, 0) as current_stock,
        p.image_url
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    WHERE p.company_id = company_uuid
    AND p.code = search_code
    AND p.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Crear función para calcular totales automáticamente
CREATE OR REPLACE FUNCTION calculate_quotation_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular total con precio de plataforma
    NEW.platform_total = NEW.quantity * NEW.platform_unit_price_with_tax;
    
    -- Calcular total con precio de proveedor si existe
    IF NEW.supplier_unit_price_with_tax IS NOT NULL THEN
        NEW.supplier_total = NEW.quantity * NEW.supplier_unit_price_with_tax;
    END IF;
    
    -- Calcular total ofertado si existe precio de oferta
    IF NEW.offer_unit_price_with_tax IS NOT NULL THEN
        NEW.offer_total_with_tax = NEW.quantity * NEW.offer_unit_price_with_tax;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Crear trigger para cálculos automáticos
DROP TRIGGER IF EXISTS calculate_quotation_totals_trigger ON quotations;
CREATE TRIGGER calculate_quotation_totals_trigger
    BEFORE INSERT OR UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quotation_totals();

-- 11. Comentarios para documentación
COMMENT ON TABLE quotations IS 'Cotizaciones y proformas del sistema';
COMMENT ON COLUMN quotations.unique_code IS 'Código único del producto para búsqueda automática';
COMMENT ON COLUMN quotations.delivery_location IS 'Lugar de entrega especificado por el cliente';
COMMENT ON COLUMN quotations.platform_unit_price_with_tax IS 'Precio unitario con IGV extraído del producto en plataforma';
COMMENT ON COLUMN quotations.platform_total IS 'Total calculado con precio de plataforma';
COMMENT ON COLUMN quotations.supplier_unit_price_with_tax IS 'Precio unitario con IGV del proveedor (editable)';
COMMENT ON COLUMN quotations.supplier_total IS 'Total a ofertar calculado con precio de proveedor';
COMMENT ON COLUMN quotations.offer_unit_price_with_tax IS 'Precio unitario con IGV ofertado a la entidad';
COMMENT ON COLUMN quotations.offer_total_with_tax IS 'Total ofertado incluido IGV';
COMMENT ON COLUMN quotations.final_unit_price_with_tax IS 'Precio unitario final (editable)';
COMMENT ON COLUMN quotations.budget_ceiling IS 'Techo presupuestal (editable)';
COMMENT ON COLUMN quotations.reference_image_url IS 'URL de imagen referencial del producto';

-- 12. Insertar datos de ejemplo
INSERT INTO quotations (
    company_id, company_name, company_ruc, entity_id, entity_name, entity_ruc,
    delivery_location, product_id, unique_code, product_description, product_brand,
    quantity, platform_unit_price_with_tax, supplier_unit_price_with_tax,
    offer_unit_price_with_tax, final_unit_price_with_tax, budget_ceiling,
    status, valid_until, observations, created_by
)
SELECT 
    c.id as company_id,
    c.name as company_name,
    COALESCE(c.ruc, c.tax_id, '') as company_ruc,
    se.id as entity_id,
    se.name as entity_name,
    se.ruc as entity_ruc,
    'Lima, Perú' as delivery_location,
    p.id as product_id,
    p.code as unique_code,
    p.description as product_description,
    COALESCE(b.name, 'Sin marca') as product_brand,
    10 as quantity,
    p.sale_price as platform_unit_price_with_tax,
    p.sale_price * 0.9 as supplier_unit_price_with_tax,
    p.sale_price * 1.1 as offer_unit_price_with_tax,
    p.sale_price * 1.15 as final_unit_price_with_tax,
    p.sale_price * 12 as budget_ceiling,
    'draft' as status,
    CURRENT_DATE + INTERVAL '30 days' as valid_until,
    'Cotización de ejemplo generada automáticamente' as observations,
    pr.id as created_by
FROM companies c
CROSS JOIN sales_entities se
CROSS JOIN products p
LEFT JOIN brands b ON p.brand_id = b.id
CROSS JOIN profiles pr
WHERE c.id = se.company_id
AND c.id = p.company_id
AND c.id = pr.company_id
AND pr.role = 'admin'
LIMIT 5
ON CONFLICT DO NOTHING;

-- 13. Verificar que todo se creó correctamente
DO $$
BEGIN
    -- Verificar tabla
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
        RAISE EXCEPTION 'Error: Tabla quotations no fue creada';
    END IF;
    
    -- Verificar políticas RLS
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quotations' 
        AND policyname = 'Users can manage quotations based on department and role'
    ) THEN
        RAISE EXCEPTION 'Error: Política RLS para quotations no fue creada';
    END IF;
    
    -- Verificar funciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_quotations_stats'
    ) THEN
        RAISE EXCEPTION 'Error: Función get_quotations_stats no fue creada';
    END IF;
    
    RAISE NOTICE 'Módulo de cotizaciones creado exitosamente';
    RAISE NOTICE 'Tabla creada: quotations';
    RAISE NOTICE 'Políticas RLS configuradas correctamente';
    RAISE NOTICE 'Funciones auxiliares creadas';
    RAISE NOTICE 'Triggers de cálculo automático configurados';
END $$;
