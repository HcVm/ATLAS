-- Arreglar filtrado por empresa y acceso al inventario

DO $$
DECLARE
    user_id UUID := 'b01beafd-2665-44b0-9b53-dc1b5f976f83';
    first_company_id UUID;
BEGIN
    -- 1. Verificar usuario actual
    RAISE NOTICE 'Verificando usuario actual...';
    
    -- 2. Asignar empresa al usuario si no la tiene
    SELECT company_id INTO first_company_id FROM profiles WHERE id = user_id;
    
    IF first_company_id IS NULL THEN
        SELECT id INTO first_company_id FROM companies ORDER BY name LIMIT 1;
        
        UPDATE profiles 
        SET company_id = first_company_id,
            updated_at = NOW()
        WHERE id = user_id;
        
        RAISE NOTICE 'Usuario asignado a empresa: %', first_company_id;
    END IF;
    
    -- 3. Crear tablas de inventario si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
        RAISE NOTICE 'Creando tabla brands...';
        CREATE TABLE brands (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            company_id UUID REFERENCES companies(id),
            logo_url TEXT,
            color VARCHAR(7) DEFAULT '#6B7280',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(name, company_id)
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_categories') THEN
        RAISE NOTICE 'Creando tabla product_categories...';
        CREATE TABLE product_categories (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            company_id UUID REFERENCES companies(id),
            color VARCHAR(7) DEFAULT '#6B7280',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(name, company_id)
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        RAISE NOTICE 'Creando tabla products...';
        CREATE TABLE products (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            code VARCHAR(100) NOT NULL,
            barcode VARCHAR(100),
            brand_id UUID REFERENCES brands(id),
            category_id UUID REFERENCES product_categories(id),
            unit_of_measure VARCHAR(50) DEFAULT 'unidad',
            minimum_stock INTEGER DEFAULT 0,
            current_stock INTEGER DEFAULT 0,
            unit_cost DECIMAL(10,2) DEFAULT 0,
            sale_price DECIMAL(10,2) DEFAULT 0,
            location TEXT,
            notes TEXT,
            is_active BOOLEAN DEFAULT true,
            company_id UUID REFERENCES companies(id),
            created_by UUID REFERENCES profiles(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(code, company_id)
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        RAISE NOTICE 'Creando tabla inventory_movements...';
        CREATE TABLE inventory_movements (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            product_id UUID REFERENCES products(id),
            movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
            quantity INTEGER NOT NULL,
            unit_cost DECIMAL(10,2),
            total_cost DECIMAL(10,2),
            reference_document VARCHAR(255),
            destination TEXT,
            supplier TEXT,
            reason TEXT,
            notes TEXT,
            movement_date TIMESTAMPTZ DEFAULT NOW(),
            company_id UUID REFERENCES companies(id),
            created_by UUID REFERENCES profiles(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
    
    -- 4. Desactivar RLS en todas las tablas de inventario
    ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
    ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
    ALTER TABLE products DISABLE ROW LEVEL SECURITY;
    ALTER TABLE inventory_movements DISABLE ROW LEVEL SECURITY;
    
    -- 5. Crear datos de prueba si no existen
    IF NOT EXISTS (SELECT 1 FROM brands LIMIT 1) THEN
        RAISE NOTICE 'Creando marcas de prueba...';
        
        -- Crear marcas para cada empresa
        INSERT INTO brands (name, description, company_id, color)
        SELECT 
            brand_name,
            'Marca de ' || c.name,
            c.id,
            brand_color
        FROM companies c
        CROSS JOIN (
            VALUES 
                ('VALHALLA', '#8B5CF6'),
                ('ZEUS', '#F59E0B'),
                ('WORLD LIFE', '#10B981'),
                ('HOPE LIFE', '#EF4444'),
                ('PRIME', '#3B82F6'),
                ('SOLUTIONS', '#6366F1'),
                ('CONSULTING', '#8B5CF6'),
                ('MANAGEMENT', '#F59E0B'),
                ('TECH', '#10B981'),
                ('INNOVATION', '#EF4444')
        ) AS brands_data(brand_name, brand_color);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM product_categories LIMIT 1) THEN
        RAISE NOTICE 'Creando categorías de prueba...';
        
        -- Crear categorías para cada empresa
        INSERT INTO product_categories (name, description, company_id, color)
        SELECT 
            cat_name,
            'Categoría de ' || cat_name,
            c.id,
            cat_color
        FROM companies c
        CROSS JOIN (
            VALUES 
                ('Suplementos', '#10B981'),
                ('Vitaminas', '#3B82F6'),
                ('Proteínas', '#8B5CF6'),
                ('Minerales', '#F59E0B'),
                ('Equipos', '#EF4444')
        ) AS cats_data(cat_name, cat_color);
    END IF;
    
    -- 6. Verificar datos creados
    RAISE NOTICE 'Datos de inventario creados:';
    RAISE NOTICE 'Marcas: %', (SELECT COUNT(*) FROM brands);
    RAISE NOTICE 'Categorías: %', (SELECT COUNT(*) FROM product_categories);
    RAISE NOTICE 'Productos: %', (SELECT COUNT(*) FROM products);
    
END $$;

-- Verificar el estado final
SELECT 'Usuario actual:' as info;
SELECT p.full_name, p.role, c.name as empresa, d.name as departamento
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE p.id = 'b01beafd-2665-44b0-9b53-dc1b5f976f83';

SELECT 'Empresas disponibles:' as info;
SELECT id, name, code FROM companies ORDER BY name;

SELECT 'Departamentos por empresa:' as info;
SELECT c.name as empresa, d.name as departamento, d.id as dept_id
FROM companies c
JOIN departments d ON c.id = d.company_id
ORDER BY c.name, d.name;

SELECT 'Inventario disponible:' as info;
SELECT 
    (SELECT COUNT(*) FROM brands) as marcas,
    (SELECT COUNT(*) FROM product_categories) as categorias,
    (SELECT COUNT(*) FROM products) as productos,
    (SELECT COUNT(*) FROM inventory_movements) as movimientos;
