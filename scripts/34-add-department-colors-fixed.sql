-- Agregar columna de color a la tabla departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6B7280';

-- Crear una tabla temporal con colores predefinidos
CREATE TEMP TABLE department_colors (
  id SERIAL PRIMARY KEY,
  color VARCHAR(7)
);

-- Insertar colores predefinidos
INSERT INTO department_colors (color) VALUES 
  ('#EF4444'),  -- Rojo
  ('#10B981'),  -- Verde
  ('#3B82F6'),  -- Azul
  ('#8B5CF6'),  -- Púrpura
  ('#F59E0B'),  -- Ámbar
  ('#06B6D4'),  -- Cian
  ('#84CC16'),  -- Lima
  ('#EC4899'),  -- Rosa
  ('#14B8A6'),  -- Teal
  ('#F97316'),  -- Naranja
  ('#A855F7'),  -- Violeta
  ('#6366F1');  -- Índigo

-- Actualizar departamentos con nombres específicos
UPDATE departments SET color = 
  CASE 
    WHEN name ILIKE '%recursos humanos%' OR name ILIKE '%rrhh%' OR name ILIKE '%personal%' THEN '#EF4444'
    WHEN name ILIKE '%contabilidad%' OR name ILIKE '%finanzas%' OR name ILIKE '%contable%' THEN '#10B981'
    WHEN name ILIKE '%sistemas%' OR name ILIKE '%tecnolog%' OR name ILIKE '%informatic%' OR name ILIKE '%ti%' THEN '#3B82F6'
    WHEN name ILIKE '%legal%' OR name ILIKE '%juridic%' OR name ILIKE '%abogad%' THEN '#8B5CF6'
    WHEN name ILIKE '%marketing%' OR name ILIKE '%mercadeo%' OR name ILIKE '%publicidad%' THEN '#F59E0B'
    WHEN name ILIKE '%ventas%' OR name ILIKE '%comercial%' OR name ILIKE '%cliente%' THEN '#06B6D4'
    WHEN name ILIKE '%operacion%' OR name ILIKE '%produccion%' OR name ILIKE '%manufactur%' THEN '#84CC16'
    WHEN name ILIKE '%administracion%' OR name ILIKE '%gerencia%' OR name ILIKE '%direccion%' THEN '#DC2626'
    WHEN name ILIKE '%compras%' OR name ILIKE '%adquisicion%' OR name ILIKE '%procurement%' THEN '#7C3AED'
    WHEN name ILIKE '%calidad%' OR name ILIKE '%control%' OR name ILIKE '%auditoria%' THEN '#059669'
    WHEN name ILIKE '%logistica%' OR name ILIKE '%almacen%' OR name ILIKE '%inventario%' THEN '#D97706'
    WHEN name ILIKE '%seguridad%' OR name ILIKE '%vigilancia%' OR name ILIKE '%proteccion%' THEN '#374151'
    ELSE color
  END
WHERE color = '#6B7280' OR color IS NULL;

-- Actualizar los departamentos restantes con colores aleatorios
UPDATE departments d SET
  color = dc.color
FROM (
  SELECT d.id, dc.color
  FROM departments d
  JOIN department_colors dc ON (d.id % 12) + 1 = dc.id
  WHERE d.color = '#6B7280' OR d.color IS NULL
) AS dc
WHERE d.id = dc.id;

-- Verificar los colores asignados
SELECT id, name, color FROM departments ORDER BY name;

-- Eliminar la tabla temporal
DROP TABLE department_colors;
