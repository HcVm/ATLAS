-- Función para crear usuarios directamente en auth.users
CREATE OR REPLACE FUNCTION admin_create_user(
  p_user_id UUID,
  p_email TEXT,
  p_password_hash TEXT,
  p_full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insertar en auth.users
  INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data,
    created_at,
    updated_at,
    email_confirmed_at,
    is_sso_user,
    banned_until,
    reauthentication_token,
    is_anonymous,
    last_sign_in_at
  )
  VALUES (
    p_user_id,
    p_email,
    jsonb_build_object('full_name', p_full_name),
    NOW(),
    NOW(),
    NOW(), -- Email ya confirmado
    FALSE,
    NULL,
    NULL,
    FALSE,
    NULL
  );
  
  -- Insertar en auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at,
    last_sign_in_at
  )
  VALUES (
    p_user_id,
    p_user_id,
    jsonb_build_object('sub', p_user_id::text, 'email', p_email),
    'email',
    NOW(),
    NOW(),
    NULL
  );
END;
$$;

-- Función para eliminar usuarios
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eliminar de auth.identities
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  
  -- Eliminar de auth.users
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- Desactivar completamente el trigger problemático
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
