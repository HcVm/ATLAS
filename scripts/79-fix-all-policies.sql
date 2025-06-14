-- Arreglar todas las políticas RLS que están bloqueando el acceso

-- 1. Verificar usuario actual
SELECT 'Usuario actual:' as info, auth.uid() as user_id;

-- 2. Verificar perfil del usuario
SELECT 'Perfil del usuario:' as info;
SELECT id, email, full_name, role, company_id, department_id 
FROM profiles 
WHERE id = auth.uid();

-- 3. ARREGLAR POLÍTICAS DE DEPARTMENTS (esto es crítico)
DROP POLICY IF EXISTS "departments_select_policy" ON departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON departments;
DROP POLICY IF EXISTS "departments_update_policy" ON departments;
DROP POLICY IF EXISTS "departments_delete_policy" ON departments;

-- Crear políticas más simples para departments
CREATE POLICY "departments_select_simple" ON departments
    FOR SELECT USING (
        -- Admin puede ver todos
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- Usuarios pueden ver departamentos de su empresa
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = departments.company_id)
    );

CREATE POLICY "departments_insert_simple" ON departments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "departments_update_simple" ON departments
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "departments_delete_simple" ON departments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. ARREGLAR POLÍTICAS DE COMPANIES
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
DROP POLICY IF EXISTS "companies_insert_policy" ON companies;
DROP POLICY IF EXISTS "companies_update_policy" ON companies;
DROP POLICY IF EXISTS "companies_delete_policy" ON companies;

CREATE POLICY "companies_select_simple" ON companies
    FOR SELECT USING (true); -- Todos pueden ver las empresas

CREATE POLICY "companies_insert_simple" ON companies
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "companies_update_simple" ON companies
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "companies_delete_simple" ON companies
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. ARREGLAR POLÍTICAS DE PROFILES
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

CREATE POLICY "profiles_select_simple" ON profiles
    FOR SELECT USING (
        -- Usuarios pueden ver su propio perfil
        id = auth.uid()
        OR
        -- Admin puede ver todos
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- Supervisores pueden ver perfiles de su empresa
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'supervisor' AND company_id = profiles.company_id)
    );

CREATE POLICY "profiles_insert_simple" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "profiles_update_simple" ON profiles
    FOR UPDATE USING (
        id = auth.uid() -- Usuarios pueden actualizar su propio perfil
        OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. Verificar que el usuario puede ver datos básicos
SELECT 'Verificando acceso a empresas:' as info;
SELECT COUNT(*) as empresas_visibles FROM companies;

SELECT 'Verificando acceso a departamentos:' as info;
SELECT COUNT(*) as departamentos_visibles FROM departments;

SELECT 'Verificando acceso a perfiles:' as info;
SELECT COUNT(*) as perfiles_visibles FROM profiles;

-- 7. Mostrar datos específicos para debug
SELECT 'Empresas disponibles:' as info;
SELECT id, name, code FROM companies LIMIT 5;

SELECT 'Departamentos disponibles:' as info;
SELECT d.id, d.name, c.name as company_name 
FROM departments d
LEFT JOIN companies c ON d.company_id = c.id
LIMIT 10;

-- 8. Verificar el perfil del usuario después de los cambios
SELECT 'Perfil final del usuario:' as info;
SELECT p.id, p.email, p.full_name, p.role, 
       c.name as company_name, c.id as company_id,
       d.name as department_name, d.id as department_id
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE p.id = auth.uid();

SELECT 'Políticas arregladas exitosamente' as resultado;
