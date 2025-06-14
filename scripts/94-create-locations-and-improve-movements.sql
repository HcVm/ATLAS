-- Crear tabla de departamentos del Perú
CREATE TABLE IF NOT EXISTS peru_departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de provincias
CREATE TABLE IF NOT EXISTS peru_provinces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    department_id UUID REFERENCES peru_departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de distritos
CREATE TABLE IF NOT EXISTS peru_districts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    province_id UUID REFERENCES peru_provinces(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de entidades/empresas destino
CREATE TABLE IF NOT EXISTS destination_entities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('empresa', 'institucion', 'persona', 'sucursal')),
    document_type VARCHAR(20) CHECK (document_type IN ('RUC', 'DNI', 'CE')),
    document_number VARCHAR(20),
    contact_person VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(200),
    address TEXT,
    department_id UUID REFERENCES peru_departments(id),
    province_id UUID REFERENCES peru_provinces(id),
    district_id UUID REFERENCES peru_districts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar departamentos del Perú
INSERT INTO peru_departments (name, code) VALUES
('Amazonas', 'AMA'),
('Áncash', 'ANC'),
('Apurímac', 'APU'),
('Arequipa', 'ARE'),
('Ayacucho', 'AYA'),
('Cajamarca', 'CAJ'),
('Callao', 'CAL'),
('Cusco', 'CUS'),
('Huancavelica', 'HUA'),
('Huánuco', 'HUC'),
('Ica', 'ICA'),
('Junín', 'JUN'),
('La Libertad', 'LAL'),
('Lambayeque', 'LAM'),
('Lima', 'LIM'),
('Loreto', 'LOR'),
('Madre de Dios', 'MDD'),
('Moquegua', 'MOQ'),
('Pasco', 'PAS'),
('Piura', 'PIU'),
('Puno', 'PUN'),
('San Martín', 'SAM'),
('Tacna', 'TAC'),
('Tumbes', 'TUM'),
('Ucayali', 'UCA')
ON CONFLICT (code) DO NOTHING;

-- Insertar algunas provincias principales de Lima
INSERT INTO peru_provinces (name, code, department_id) 
SELECT 'Lima', 'LIM', id FROM peru_departments WHERE code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO peru_provinces (name, code, department_id) 
SELECT 'Callao', 'CAL', id FROM peru_departments WHERE code = 'CAL'
ON CONFLICT DO NOTHING;

-- Insertar algunos distritos principales de Lima
INSERT INTO peru_districts (name, code, province_id)
SELECT 'Lima', 'LIM01', id FROM peru_provinces WHERE code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO peru_districts (name, code, province_id)
SELECT 'San Isidro', 'LIM27', id FROM peru_provinces WHERE code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO peru_districts (name, code, province_id)
SELECT 'Miraflores', 'LIM18', id FROM peru_provinces WHERE code = 'LIM'
ON CONFLICT DO NOTHING;

INSERT INTO peru_districts (name, code, province_id)
SELECT 'Surco', 'LIM41', id FROM peru_provinces WHERE code = 'LIM'
ON CONFLICT DO NOTHING;

-- Mejorar tabla de movimientos de inventario
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS purchase_order_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS destination_entity_id UUID REFERENCES destination_entities(id),
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);

-- Crear políticas para las nuevas tablas
ALTER TABLE peru_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE peru_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE peru_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_entities ENABLE ROW LEVEL SECURITY;

-- Políticas para departamentos, provincias y distritos (lectura pública)
CREATE POLICY "Anyone can view peru locations" ON peru_departments FOR SELECT USING (true);
CREATE POLICY "Anyone can view peru provinces" ON peru_provinces FOR SELECT USING (true);
CREATE POLICY "Anyone can view peru districts" ON peru_districts FOR SELECT USING (true);

-- Políticas para entidades destino
CREATE POLICY "Users can view destination entities from their company" ON destination_entities
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage destination entities from their company" ON destination_entities
    FOR ALL USING (company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
    ));

-- Función para validar stock antes de salidas
CREATE OR REPLACE FUNCTION validate_stock_before_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo validar para salidas
    IF NEW.movement_type = 'salida' THEN
        -- Verificar que hay suficiente stock
        IF (SELECT current_stock FROM products WHERE id = NEW.product_id) < NEW.quantity THEN
            RAISE EXCEPTION 'Stock insuficiente. Stock disponible: %', 
                (SELECT current_stock FROM products WHERE id = NEW.product_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar stock
DROP TRIGGER IF EXISTS validate_stock_trigger ON inventory_movements;
CREATE TRIGGER validate_stock_trigger
    BEFORE INSERT ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION validate_stock_before_movement();

-- Función para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar stock según el tipo de movimiento
    IF NEW.movement_type = 'entrada' THEN
        UPDATE products 
        SET current_stock = current_stock + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'salida' THEN
        UPDATE products 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF NEW.movement_type = 'ajuste' THEN
        UPDATE products 
        SET current_stock = NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar stock
DROP TRIGGER IF EXISTS update_stock_trigger ON inventory_movements;
CREATE TRIGGER update_stock_trigger
    AFTER INSERT ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- Crear vista para productos con stock bajo
CREATE OR REPLACE VIEW products_low_stock AS
SELECT 
    p.*,
    CASE 
        WHEN p.current_stock = 0 THEN 'sin_stock'
        WHEN p.current_stock <= p.minimum_stock THEN 'stock_bajo'
        ELSE 'disponible'
    END as stock_status
FROM products p
WHERE p.is_active = true;

COMMENT ON VIEW products_low_stock IS 'Vista de productos con información de estado de stock';
