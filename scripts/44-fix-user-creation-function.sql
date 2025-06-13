-- Corregir la función para generar correctamente el UUID
CREATE OR REPLACE FUNCTION admin_create_user_simple(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_role user_role;
BEGIN
  -- Generar un nuevo UUID para el usuario
  v_user_id := gen_random_uuid();
  
  -- Convertir el rol de texto a enum
  BEGIN
    v_role := p_role::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'user'::user_role;
  END;

  -- Crear el usuario en auth.users
  INSERT INTO auth.users (
    id,  -- Especificar explícitamente el ID
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    raw_user_meta_data
  )
  VALUES (
    v_user_id,  -- Usar el UUID generado
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    'authenticated',
    'authenticated',
    jsonb_build_object('full_name', p_full_name)
  );
  
  -- Crear la identidad para el usuario
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider
  )
  VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email'
  );
  
  -- Crear el perfil manualmente
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role
  )
  VALUES (
    v_user_id,
    p_email,
    p_full_name,
    v_role
  );
  
  RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
  -- Registrar el error para depuración
  RAISE NOTICE 'Error en admin_create_user_simple: %', SQLERRM;
  -- Re-lanzar la excepción
  RAISE;
END;
$$;
