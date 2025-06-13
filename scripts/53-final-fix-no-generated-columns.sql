-- Script final para corregir campos sin tocar NINGUNA columna generada
-- Este script evita actualizar cualquier columna que sea generada automáticamente

-- Verificar si el tipo enum user_role existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'user');
    END IF;
END$$;

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS admin_create_user_simple(text, text, text, text);

-- Crear la función actualizada sin columnas generadas
CREATE OR REPLACE FUNCTION admin_create_user_simple(
    p_email text,
    p_password text,
    p_name text,
    p_role text DEFAULT 'user'
) RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_encrypted_pw text;
    v_now timestamp with time zone;
BEGIN
    -- Generar un UUID para el usuario
    v_user_id := gen_random_uuid();
    
    -- Obtener la hora actual para varios campos de timestamp
    v_now := NOW();
    
    -- Hashear la contraseña con el algoritmo Blowfish (compatible con Supabase)
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    
    -- Insertar el usuario en auth.users (solo campos no generados)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        confirmation_token,
        recovery_token,
        email_change,
        email_change_confirm_status,
        is_sso_user
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        v_encrypted_pw,
        v_now,
        v_now,
        v_now,
        v_now,
        '{"provider":"email","providers":["email"]}',
        '{"name":"' || p_name || '"}',
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        0,
        FALSE
    );
    
    -- Insertar la identidad en auth.identities (solo campos no generados)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        p_email,
        v_now,
        v_now,
        v_now
    );
    
    -- Insertar el perfil en public.profiles
    INSERT INTO public.profiles (
        id,
        updated_at,
        username,
        full_name,
        avatar_url,
        role,
        email
    ) VALUES (
        v_user_id,
        v_now,
        p_email,
        p_name,
        NULL,
        p_role::user_role,
        p_email
    );
    
    RETURN v_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error en admin_create_user_simple: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar solo los campos que NO son generados en auth.users
DO $$
DECLARE
    v_count int;
    v_now timestamp with time zone := NOW();
BEGIN
    -- Actualizar solo los campos básicos que NO son columnas generadas en auth.users
    UPDATE auth.users
    SET 
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change = COALESCE(email_change, ''),
        email_confirmed_at = COALESCE(email_confirmed_at, v_now),
        created_at = COALESCE(created_at, v_now),
        updated_at = COALESCE(updated_at, v_now),
        last_sign_in_at = COALESCE(last_sign_in_at, v_now),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'),
        aud = COALESCE(aud, 'authenticated'),
        role = COALESCE(role, 'authenticated'),
        is_sso_user = COALESCE(is_sso_user, FALSE)
    WHERE 
        confirmation_token IS NULL 
        OR recovery_token IS NULL
        OR email_change IS NULL
        OR email_confirmed_at IS NULL
        OR created_at IS NULL
        OR updated_at IS NULL
        OR last_sign_in_at IS NULL
        OR raw_app_meta_data IS NULL
        OR raw_user_meta_data IS NULL
        OR aud IS NULL
        OR role IS NULL
        OR is_sso_user IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Actualizados % usuarios con campos NULL básicos', v_count;
    
    -- Intentar actualizar campos adicionales si existen (sin columnas generadas)
    BEGIN
        UPDATE auth.users
        SET 
            email_change_confirm_status = COALESCE(email_change_confirm_status, 0)
        WHERE 
            email_change_confirm_status IS NULL;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Actualizados % usuarios con email_change_confirm_status', v_count;
    EXCEPTION
        WHEN undefined_column THEN
            RAISE NOTICE 'Campo email_change_confirm_status no existe en esta versión';
    END;
    
    -- Intentar actualizar tokens adicionales si existen
    BEGIN
        UPDATE auth.users
        SET 
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, '')
        WHERE 
            email_change_token_new IS NULL 
            OR email_change_token_current IS NULL;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Actualizados % usuarios con tokens de email_change', v_count;
    EXCEPTION
        WHEN undefined_column THEN
            RAISE NOTICE 'Algunos campos de tokens no existen en esta versión';
    END;
    
    -- Actualizar solo campos NO generados en identidades
    UPDATE auth.identities
    SET 
        provider_id = COALESCE(provider_id, (SELECT email FROM auth.users WHERE auth.users.id = auth.identities.user_id)),
        created_at = COALESCE(created_at, v_now),
        updated_at = COALESCE(updated_at, v_now),
        last_sign_in_at = COALESCE(last_sign_in_at, v_now)
    WHERE 
        provider_id IS NULL 
        OR created_at IS NULL
        OR updated_at IS NULL
        OR last_sign_in_at IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Actualizadas % identidades con campos NULL (sin email)', v_count;
    
    -- Verificaciones finales (sin verificar columnas generadas)
    SELECT COUNT(*) INTO v_count FROM auth.users WHERE email_change IS NULL;
    RAISE NOTICE 'Usuarios restantes con email_change NULL: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM auth.users WHERE confirmation_token IS NULL;
    RAISE NOTICE 'Usuarios restantes con confirmation_token NULL: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM auth.users WHERE created_at IS NULL;
    RAISE NOTICE 'Usuarios restantes con created_at NULL: %', v_count;
    
    SELECT COUNT(*) INTO v_count FROM auth.identities WHERE provider_id IS NULL;
    RAISE NOTICE 'Identidades restantes con provider_id NULL: %', v_count;
    
    -- Verificar si hay usuarios problemáticos
    SELECT COUNT(*) INTO v_count FROM auth.users 
    WHERE email_change IS NULL 
       OR confirmation_token IS NULL 
       OR recovery_token IS NULL;
    RAISE NOTICE 'Total de usuarios con campos críticos NULL: %', v_count;
    
END$$;

-- Mostrar mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '=== SCRIPT COMPLETADO ===';
    RAISE NOTICE 'Se han corregido todos los campos posibles sin tocar columnas generadas.';
    RAISE NOTICE 'Los usuarios ahora deberían poder iniciar sesión sin errores.';
    RAISE NOTICE 'Si persisten errores, puede ser necesario recrear los usuarios problemáticos.';
END$$;
