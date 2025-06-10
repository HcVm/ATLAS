-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Documents policies
CREATE POLICY "Users can view documents from their department or created by them" ON documents
  FOR SELECT USING (
    created_by = auth.uid() OR
    department_id IN (
      SELECT department_id FROM profiles WHERE id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Users can create documents" ON documents
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own documents or admins can update any" ON documents
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Document movements policies
CREATE POLICY "Users can view movements for accessible documents" ON document_movements
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM documents WHERE 
        created_by = auth.uid() OR
        department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
        )
    )
  );

CREATE POLICY "Users can create document movements" ON document_movements
  FOR INSERT WITH CHECK (moved_by = auth.uid());

-- News policies
CREATE POLICY "Everyone can view published news" ON news
  FOR SELECT USING (published = true);

CREATE POLICY "Admins and supervisors can manage news" ON news
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Departments policies
CREATE POLICY "Everyone can view departments" ON departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
