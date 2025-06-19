-- =====================================================
-- MÓDULO DE VENTAS COMPLETO - SCRIPT ÚNICO
-- =====================================================

-- 1. Agregar columna RUC a companies si no existe
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ruc VARCHAR(20);

-- 2. Crear tabla de entidades (clientes) con estructura simplificada
CREATE TABLE IF NOT EXISTS sales_entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ruc VARCHAR(20) NOT NULL,
    executing_unit VARCHAR(50), -- Unidad ejecutora (opcional)
    company_id UUID REFERENCES companies(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ruc, company_id)
);

-- 3. Crear tabla de ventas con estructura completa
CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Datos de la empresa (automáticos)
    company_id UUID REFERENCES companies(id) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_ruc VARCHAR(20) NOT NULL,
    
    -- Datos de la entidad/cliente
    entity_id UUID REFERENCES sales_entities(id) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    entity_ruc VARCHAR(20) NOT NULL,
    entity_executing_unit VARCHAR(50), -- Unidad ejecutora de la entidad (opcional)
    
    -- Información de la venta
    quotation_code VARCHAR(100) NOT NULL, -- Código de cotización
    exp_siaf VARCHAR(100), -- EXP. SIAF
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Datos del producto
    product_id UUID REFERENCES products(id) NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    product_brand VARCHAR(255),
    
    -- Información adicional
    ocam VARCHAR(100), -- Orden electrónica
    physical_order VARCHAR(100), -- Orden física
    project_meta VARCHAR(255), -- Proyecto meta
    final_destination TEXT, -- Lugar de destino final
    warehouse_manager VARCHAR(255), -- Encargado de almacén
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CREDITO', 'CONTADO')),
    
    -- Información financiera
    unit_price_with_tax DECIMAL(12,2) NOT NULL,
    total_sale DECIMAL(12,2) NOT NULL,
    
    -- Fechas y plazos
    delivery_date DATE, -- Fecha de entrega
    delivery_term VARCHAR(255), -- Plazo de entrega
    
    -- Observaciones
    observations TEXT,
    
    -- Auditoría
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_entity_id ON sales(entity_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_quotation_code ON sales(quotation_code);
CREATE INDEX IF NOT EXISTS idx_sales_entities_company_id ON sales_entities(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_entities_ruc ON sales_entities(ruc);

-- 5. Crear función para actualizar updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_sales_entities_updated_at ON sales_entities;
CREATE TRIGGER update_sales_entities_updated_at
    BEFORE UPDATE ON sales_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Habilitar RLS (Row Level Security)
ALTER TABLE sales_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 8. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can manage entities based on department and role" ON sales_entities;
DROP POLICY IF EXISTS "Users can manage sales based on department and role" ON sales;

-- 9. Crear políticas RLS para sales_entities
-- Acceso basado en departamentos (ventas, administración, operaciones) y roles (admin, supervisor)
CREATE POLICY "Users can manage entities based on department and role" ON sales_entities
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

-- 10. Crear políticas RLS para sales
CREATE POLICY "Users can manage sales based on department and role" ON sales
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

-- 11. Insertar datos de ejemplo para sales_entities
INSERT INTO sales_entities (name, ruc, executing_unit, company_id) 
SELECT * FROM (VALUES
    ('GOBIERNO REGIONAL DE LIMA', '20131378770', '001', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('MUNICIPALIDAD DE LIMA', '20131370570', '002', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('ESSALUD', '20131257750', '003', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('MINISTERIO DE SALUD', '20131370019', '004', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('GOBIERNO REGIONAL DE AREQUIPA', '20145078390', '005', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('MUNICIPALIDAD DE AREQUIPA', '20142570113', '006', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('MINISTERIO DE EDUCACIÓN', '20131370768', '007', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('HOSPITAL NACIONAL DOS DE MAYO', '20131371123', '008', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('UNIVERSIDAD NACIONAL MAYOR DE SAN MARCOS', '20148092282', '009', (SELECT id FROM companies ORDER BY created_at LIMIT 1)),
    ('SERVICIO DE AGUA POTABLE Y ALCANTARILLADO DE LIMA', '20100152356', '010', (SELECT id FROM companies ORDER BY created_at LIMIT 1))
) AS v(name, ruc, executing_unit, company_id)
WHERE EXISTS (SELECT 1 FROM companies)
ON CONFLICT (ruc, company_id) DO NOTHING;

-- 12. Crear función para obtener estadísticas de ventas
CREATE OR REPLACE FUNCTION get_sales_stats(company_uuid UUID)
RETURNS TABLE(
    total_sales BIGINT,
    total_amount NUMERIC,
    average_ticket NUMERIC,
    pending_deliveries BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_sales,
        COALESCE(SUM(s.total_sale), 0) as total_amount,
        COALESCE(AVG(s.total_sale), 0) as average_ticket,
        COUNT(CASE WHEN s.delivery_date >= CURRENT_DATE THEN 1 END)::BIGINT as pending_deliveries
    FROM sales s
    WHERE s.company_id = company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Crear función para buscar productos por código
CREATE OR REPLACE FUNCTION search_products_for_sales(
    search_term TEXT,
    company_uuid UUID
)
RETURNS TABLE(
    id UUID,
    code VARCHAR,
    name VARCHAR,
    description TEXT,
    brand VARCHAR,
    price NUMERIC,
    stock INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.brand,
        p.price,
        COALESCE(p.stock, 0) as stock
    FROM products p
    WHERE p.company_id = company_uuid
    AND (
        p.code ILIKE '%' || search_term || '%'
        OR p.name ILIKE '%' || search_term || '%'
    )
    ORDER BY p.name
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Comentarios para documentación
COMMENT ON TABLE sales_entities IS 'Entidades/clientes para el módulo de ventas';
COMMENT ON TABLE sales IS 'Registro de ventas realizadas';
COMMENT ON COLUMN sales_entities.executing_unit IS 'Unidad ejecutora de la entidad (opcional)';
COMMENT ON COLUMN sales.quotation_code IS 'Código de cotización asociado a la venta';
COMMENT ON COLUMN sales.exp_siaf IS 'Expediente SIAF';
COMMENT ON COLUMN sales.ocam IS 'Orden de Compra Electrónica';
COMMENT ON COLUMN sales.payment_method IS 'Método de pago: CREDITO o CONTADO';

-- 15. Verificar que todo se creó correctamente
DO $$
BEGIN
    -- Verificar tablas
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_entities') THEN
        RAISE EXCEPTION 'Error: Tabla sales_entities no fue creada';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales') THEN
        RAISE EXCEPTION 'Error: Tabla sales no fue creada';
    END IF;
    
    -- Verificar políticas RLS
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales_entities' 
        AND policyname = 'Users can manage entities based on department and role'
    ) THEN
        RAISE EXCEPTION 'Error: Política RLS para sales_entities no fue creada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' 
        AND policyname = 'Users can manage sales based on department and role'
    ) THEN
        RAISE EXCEPTION 'Error: Política RLS para sales no fue creada';
    END IF;
    
    RAISE NOTICE 'Módulo de ventas creado exitosamente';
    RAISE NOTICE 'Tablas creadas: sales_entities, sales';
    RAISE NOTICE 'Políticas RLS configuradas correctamente';
    RAISE NOTICE 'Datos de ejemplo insertados';
    RAISE NOTICE 'Funciones auxiliares creadas';
END $$;
