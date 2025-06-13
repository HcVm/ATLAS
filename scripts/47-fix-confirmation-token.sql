-- Script para corregir el problema del confirmation_token

-- Primero, actualizar la función admin_create_user_simple para inicializar correctamente el campo confirmation_token
CREATE OR REPLACE FUNCTION public.admin_create_user_simple(
    p_email text,
    p_password text,
    p_first_name text DEFAULT NULL::text,
    p_last_name text DEFAULT NULL::text,
    p_role text DEFAULT 'user'::text
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $function$
DECLARE
    v_user_id uuid;
    v_encrypted_pw text;
    v_role user_role;
BEGIN
    -- Generar un UUID para el nuevo usuario
    v_user_id := gen_random_uuid();
    
    -- Hashear la contraseña usando el algoritmo Blowfish (compatible con Supabase)
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    
    -- Convertir el texto del rol a enum
    BEGIN
        v_role := p_role::user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'user'::user_role;
    END;
    
    -- Insertar el usuario en auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_token,
        confirmation_token,
        is_sso_user,
        raw_app_meta_data,
        raw_user_meta_data
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        v_encrypted_pw,
        NOW(),  -- email_confirmed_at
        '',     -- recovery_token (cadena vacía en lugar de NULL)
        '',     -- confirmation_token (cadena vacía en lugar de NULL)
        FALSE,  -- is_sso_user
        '{"provider":"email","providers":["email"]}',  -- raw_app_meta_data
        jsonb_build_object(  -- raw_user_meta_data
            'first_name', p_first_name,
            'last_name', p_last_name
        )
    );
    
    -- Insertar la identidad en auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at
    ) VALUES (
        v_user_id,  -- Mismo ID que el usuario
        v_user_id,
        jsonb_build_object(
            'sub', v_user_id,
            'email', p_email
        ),
        'email',
        p_email,    -- provider_id es el email
        NOW()
    );
    
    -- Insertar el perfil en public.profiles
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        email,
        role
    ) VALUES (
        v_user_id,
        p_first_name,
        p_last_name,
        p_email,
        v_role
    );
    
    RETURN v_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user: %', SQLERRM;
    RETURN NULL;
END;
$function$;

-- Actualizar usuarios existentes para establecer valores no nulos en campos críticos
DO $$
BEGIN
    -- Actualizar confirmation_token para usuarios con valor NULL
    UPDATE auth.users
    SET 
        confirmation_token = '',
        recovery_token = COALESCE(recovery_token, ''),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        is_sso_user = COALESCE(is_sso_user, FALSE),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb)
    WHERE confirmation_token IS NULL;
    
    RAISE NOTICE 'Updated users with NULL confirmation_token';
    
    -- Verificar si hay identidades con provider_id NULL
    UPDATE auth.identities
    SET provider_id = email
    FROM auth.users
    WHERE auth.identities.user_id = auth.users.id
    AND auth.identities.provider_id IS NULL;
    
    RAISE NOTICE 'Updated identities with NULL provider_id';
END $$;

-- Verificar si hay usuarios con problemas
DO $$
DECLARE
    v_count int;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM auth.users
    WHERE confirmation_token IS NULL;
    
    RAISE NOTICE 'Users with NULL confirmation_token: %', v_count;
    
    SELECT COUNT(*) INTO v_count
    FROM auth.identities
    WHERE provider_id IS NULL;
    
    RAISE NOTICE 'Identities with NULL provider_id: %', v_count;
END $$;
