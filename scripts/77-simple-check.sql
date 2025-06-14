-- Verificación simple sin bloques complejos
SELECT 'Verificando usuario actual...' as step;
SELECT auth.uid() as current_user_id;

SELECT 'Verificando perfil...' as step;
SELECT id, email, full_name, role, company_id, department_id 
FROM profiles 
WHERE id = auth.uid();

SELECT 'Verificando empresas...' as step;
SELECT id, name, code FROM companies ORDER BY name;

SELECT 'Verificando departamentos...' as step;
SELECT d.id, d.name, c.name as company_name 
FROM departments d 
JOIN companies c ON d.company_id = c.id 
ORDER BY c.name, d.name;

SELECT 'Verificando tablas del almacén...' as step;
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('brands', 'product_categories', 'products', 'inventory_movements');

-- Si existen las tablas, contar registros
SELECT 'Contando registros...' as step;
SELECT 
  (SELECT COUNT(*) FROM brands) as brands_count,
  (SELECT COUNT(*) FROM product_categories) as categories_count,
  (SELECT COUNT(*) FROM products) as products_count,
  (SELECT COUNT(*) FROM inventory_movements) as movements_count;
