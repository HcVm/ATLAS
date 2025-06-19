-- Política para sales_entities - acceso basado en departamento y rol  
CREATE POLICY "Users can manage entities based on department and role" ON sales_entities
FOR ALL USING (
  company_id IN (
    SELECT CASE 
      WHEN auth.jwt() ->> 'role' IN ('admin', 'supervisor') THEN company_id
      WHEN EXISTS (
        SELECT 1 FROM profiles p 
        JOIN departments d ON p.department_id = d.id 
        WHERE p.id = auth.uid() 
        AND d.name ILIKE ANY(ARRAY['ventas', 'administración', 'operaciones'])
        AND p.company_id = company_id
      ) THEN company_id
      ELSE NULL
    END
    FROM profiles 
    WHERE id = auth.uid()
  )
);
