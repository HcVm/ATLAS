-- Crear tabla de marcas por empresa
CREATE TABLE IF NOT EXISTS brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    logo_url TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, company_id)
);

-- Crear tabla de categorías de productos
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    color VARCHAR(7) DEFAULT '#10B981',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, company_id)
);

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    code VARCHAR(50) NOT NULL,
    barcode VARCHAR(100),
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'unidad',
    minimum_stock INTEGER DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    sale_price DECIMAL(10,2) DEFAULT 0,
    location VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, company_id)
);

-- Crear tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference_document VARCHAR(100),
    destination VARCHAR(200),
    supplier VARCHAR(200),
    reason VARCHAR(500),
    notes TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar marcas por defecto para las empresas existentes
INSERT INTO brands (name, description, company_id, color) 
SELECT 'VALHALLA', 'Marca VALHALLA de ALGE PERUVIAN', id, '#8B5CF6'
FROM companies WHERE code = 'ALGE' 
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO brands (name, description, company_id, color) 
SELECT 'ZEUS', 'Marca ZEUS de ALGE PERUVIAN', id, '#F59E0B'
FROM companies WHERE code = 'ALGE' 
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO brands (name, description, company_id, color) 
SELECT 'WORLD LIFE', 'Marca WORLD LIFE de ARM CORPORATIONS', id, '#10B981'
FROM companies WHERE code = 'ARM' 
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO brands (name, description, company_id, color) 
SELECT 'HOPE LIFE', 'Marca HOPE LIFE de ARM CORPORATIONS', id, '#EF4444'
FROM companies WHERE code = 'ARM' 
ON CONFLICT (name, company_id) DO NOTHING;

-- Insertar categorías por defecto
INSERT INTO product_categories (name, description, company_id, color)
SELECT 'Suplementos', 'Suplementos nutricionales', id, '#3B82F6'
FROM companies
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO product_categories (name, description, company_id, color)
SELECT 'Vitaminas', 'Vitaminas y minerales', id, '#10B981'
FROM companies
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO product_categories (name, description, company_id, color)
SELECT 'Proteínas', 'Proteínas en polvo y barras', id, '#F59E0B'
FROM companies
ON CONFLICT (name, company_id) DO NOTHING;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id ON inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_company_id ON product_categories(company_id);

-- Función para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
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
DROP TRIGGER IF EXISTS trigger_update_product_stock ON inventory_movements;
CREATE TRIGGER trigger_update_product_stock
    AFTER INSERT ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

COMMENT ON TABLE brands IS 'Marcas de productos por empresa';
COMMENT ON TABLE product_categories IS 'Categorías de productos por empresa';
COMMENT ON TABLE products IS 'Productos del inventario';
COMMENT ON TABLE inventory_movements IS 'Movimientos de entrada, salida y ajustes de inventario';
