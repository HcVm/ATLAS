-- Crear tabla de notificaciones si no existe
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  related_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Configurar RLS para la tabla de notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propias notificaciones
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios solo puedan actualizar sus propias notificaciones
DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
CREATE POLICY notifications_update_policy ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los usuarios solo puedan eliminar sus propias notificaciones
DROP POLICY IF EXISTS notifications_delete_policy ON public.notifications;
CREATE POLICY notifications_delete_policy ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Política para que los usuarios puedan insertar notificaciones (para uso interno)
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Función para crear notificaciones automáticamente cuando se crea un documento
CREATE OR REPLACE FUNCTION public.create_document_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear notificación para el usuario que creó el documento
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    NEW.created_by,
    'Documento creado con éxito',
    'Has creado el documento "' || NEW.title || '" con número ' || NEW.document_number,
    'document_created',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS document_notification_trigger ON public.documents;

-- Crear trigger para documentos
CREATE TRIGGER document_notification_trigger
AFTER INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.create_document_notification();

-- Función para crear notificaciones automáticamente cuando se crea una noticia
CREATE OR REPLACE FUNCTION public.create_news_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear notificación para el usuario que creó la noticia
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (
    NEW.created_by,
    'Noticia publicada con éxito',
    'Has publicado la noticia "' || NEW.title || '"',
    'news_published',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS news_notification_trigger ON public.news;

-- Crear trigger para noticias
CREATE TRIGGER news_notification_trigger
AFTER INSERT ON public.news
FOR EACH ROW
EXECUTE FUNCTION public.create_news_notification();
