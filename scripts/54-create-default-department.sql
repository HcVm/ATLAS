-- Crear departamento por defecto para usuarios sin asignar
INSERT INTO departments (name, description, color) 
VALUES ('ASIGNAR', 'Departamento temporal para usuarios pendientes de asignación', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- Verificar que se creó correctamente
SELECT id, name, description, color FROM departments WHERE name = 'ASIGNAR';
