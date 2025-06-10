-- Create document_attachments table for secondary files
CREATE TABLE IF NOT EXISTS document_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_attachments_document ON document_attachments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_attachments_uploaded_by ON document_attachments(uploaded_by);

-- Enable Row Level Security
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for document_attachments
CREATE POLICY "Users can view attachments of documents they can access" ON document_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_attachments.document_id
      AND (
        auth.uid() IN (
          SELECT id FROM profiles WHERE role = 'admin'
        )
        OR d.department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
        OR d.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload attachments to documents they can access" ON document_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_attachments.document_id
      AND (
        auth.uid() IN (
          SELECT id FROM profiles WHERE role = 'admin'
        )
        OR d.department_id IN (
          SELECT department_id FROM profiles WHERE id = auth.uid()
        )
        OR d.created_by = auth.uid()
      )
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Users can delete their own attachments" ON document_attachments
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );
