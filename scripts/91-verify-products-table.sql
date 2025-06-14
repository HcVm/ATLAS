-- Verificar estructura de la tabla products
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;

-- Verificar constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'products';

-- Verificar que existan marcas y categorías
SELECT 'brands' as table_name, count(*) as count FROM brands
UNION ALL
SELECT 'product_categories' as table_name, count(*) as count FROM product_categories;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'products';
