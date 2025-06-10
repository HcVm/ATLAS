-- Primero, necesitas crear un usuario en Supabase Auth manualmente
-- Luego ejecuta este script reemplazando 'USER_ID_FROM_AUTH' con el ID real

-- Ejemplo de cómo insertar un perfil de prueba
-- REEMPLAZA 'USER_ID_FROM_AUTH' con el ID real del usuario creado en auth.users

-- INSERT INTO profiles (id, email, full_name, role, department_id) VALUES
-- ('USER_ID_FROM_AUTH', 'admin@test.com', 'Administrador de Prueba', 'admin', 
--  (SELECT id FROM departments WHERE name = 'Tecnología' LIMIT 1));

-- Para verificar que los departamentos existen:
SELECT * FROM departments;

-- Para verificar usuarios en profiles:
SELECT * FROM profiles;
