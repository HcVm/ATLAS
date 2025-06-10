-- Insert sample departments
INSERT INTO departments (name, description) VALUES
  ('Recursos Humanos', 'Departamento de gestión de personal'),
  ('Finanzas', 'Departamento de gestión financiera'),
  ('Tecnología', 'Departamento de sistemas y tecnología'),
  ('Operaciones', 'Departamento de operaciones generales'),
  ('Legal', 'Departamento legal y cumplimiento');

-- Insert sample admin user (you'll need to create this user in Supabase Auth first)
-- This is just an example - replace with actual user ID from auth.users
-- INSERT INTO profiles (id, email, full_name, role, department_id) VALUES
--   ('your-admin-user-id', 'admin@company.com', 'Administrador Sistema', 'admin', (SELECT id FROM departments WHERE name = 'Tecnología' LIMIT 1));

-- Insert sample news
-- INSERT INTO news (title, content, published, created_by) VALUES
--   ('Bienvenidos al nuevo sistema', 'Estamos emocionados de presentar nuestro nuevo sistema de seguimiento de documentos.', true, 'your-admin-user-id'),
--   ('Actualización de políticas', 'Se han actualizado las políticas de manejo de documentos. Por favor revisen la nueva documentación.', true, 'your-admin-user-id');
