-- Temporalmente deshabilitar RLS para diagnosticar
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Verificar que se puede insertar directamente
SELECT 'Probando inserción directa...' as test;

-- Intentar insertar un producto de prueba
INSERT INTO products (
    name,
    code,
    unit_of_measure,
    minimum_stock,
    current_stock,
    cost_price,
    sale_price,
    is_active,
    company_id,
    created_by
) VALUES (
    'Producto de Prueba',
    'TEST001',
    'unidad',
    0,
    0,
    0.00,
    0.00,
    true,
    (SELECT id FROM companies LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- Verificar que se insertó
SELECT 'Producto insertado:' as result;
SELECT id, name, code, company_id, created_by 
FROM products 
WHERE code = 'TEST001';

-- Limpiar el producto de prueba
DELETE FROM products WHERE code = 'TEST001';

-- Volver a habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

SELECT 'RLS habilitado nuevamente' as status;
