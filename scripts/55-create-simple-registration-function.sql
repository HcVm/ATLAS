-- Crear una función simple para registrar usuarios
CREATE OR REPLACE FUNCTION public.register_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_department_id integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  default_dept_id integer;
  result json;
BEGIN
  -- Si no se proporciona department_id, buscar el departamento "ASIGNAR"
  IF p_department_id IS NULL THEN
    SELECT id INTO default_dept_id 
    FROM departments 
    WHERE name = 'ASIGNAR' 
    LIMIT 1;
    
    IF default_dept_id IS NULL THEN
      RETURN json_build_object('error', 'Departamento por defecto no encontrado');
    END IF;
    
    p_department_id := default_dept_id;
  END IF;

  -- Generar un UUID para el nuevo usuario
  new_user_id := gen_random_uuid();

  -- Insertar en auth.users (tabla de autenticación)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    json_build_object('full_name', p_full_name),
    false,
    'authenticated'
  );

  -- Insertar en profiles
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    department_id,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    p_full_name,
    'user'::user_role,
    p_department_id,
    now(),
    now()
  );

  -- Insertar en auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    json_build_object('sub', new_user_id::text, 'email', p_email),
    'email',
    now(),
    now()
  );

  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'Usuario creado exitosamente'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'error', SQLERRM,
    'success', false
  );
END;
$$;

-- Dar permisos a la función
GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated, service_role;
