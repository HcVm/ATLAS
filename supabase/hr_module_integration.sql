-- ==============================================================================
-- MÓDULO DE RECURSOS HUMANOS - SCRIPT DE INTEGRACIÓN
-- ==============================================================================
-- Este script crea las tablas necesarias para el funcionamiento del módulo de RRHH.
-- Incluye: Detalles de empleados, Documentos, Solicitudes de Vacaciones/Permisos y Candidatos.
-- También configura las políticas de seguridad (RLS) para limitar el acceso.

-- 1. DETALLES EXTENDIDOS DEL EMPLEADO
-- Almacena información confidencial que no debería estar en la tabla pública de perfiles.
CREATE TABLE IF NOT EXISTS public.hr_employee_details (
  id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text, -- DNI, CE, Pasaporte
  document_number text,
  birth_date date,
  personal_email text,
  address text,
  phone_secondary text,
  emergency_contact_name text,
  emergency_contact_phone text,
  job_title text,
  contract_type text, -- Indeterminado, Plazo Fijo, RXH, Prácticas
  start_date date,
  end_date date, -- Para cese de personal
  salary_amount numeric(10,2),
  salary_currency text DEFAULT 'PEN',
  bank_name text,
  bank_account_number text,
  status text DEFAULT 'active', -- active, on_leave, terminated
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

-- 2. DOCUMENTOS DE RRHH
-- Para almacenar contratos, adendas, CVs, copias de DNI, certificados, etc.
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type text NOT NULL, -- Contrato, Identificación, CV, Certificado, Boleta, Otro
  file_url text NOT NULL,
  expiry_date date, -- Para documentos que vencen (ej. Contratos, habilitaciones)
  is_verified boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 3. SOLICITUDES DE LICENCIA / VACACIONES
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type text NOT NULL, -- Vacaciones, Descanso Médico, Permiso Personal, Licencia Paternidad/Maternidad
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric(4,1),
  reason text,
  status text DEFAULT 'pending', -- pending, approved, rejected, cancelled
  approved_by uuid REFERENCES public.profiles(id),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. CANDIDATOS (RECLUTAMIENTO)
-- Gestión básica de procesos de selección
CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  position_applied text,
  department_id uuid REFERENCES public.departments(id),
  status text DEFAULT 'applied', -- applied, screening, interview, offer, hired, rejected
  cv_url text,
  rating integer, -- 1-5 estrellas
  notes text,
  interview_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_hr_details_status ON public.hr_employee_details(status);
CREATE INDEX IF NOT EXISTS idx_hr_docs_profile ON public.hr_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_profile ON public.hr_leave_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_status ON public.hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_status ON public.hr_candidates(status);

-- ==============================================================================
-- SEGURIDAD (ROW LEVEL SECURITY)
-- ==============================================================================

ALTER TABLE public.hr_employee_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para determinar acceso (RRHH, Admin o Gerencia)
-- Busca coincidencias en el nombre del departamento del usuario actual
CREATE OR REPLACE FUNCTION public.is_hr_admin_or_manager()
RETURNS boolean AS $$
DECLARE
  v_role public.user_role;
  v_dept_name text;
BEGIN
  -- Verificar rol de administrador
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Verificar departamento (RRHH, Administración o Gerencia)
  SELECT d.name INTO v_dept_name
  FROM public.profiles p
  JOIN public.departments d ON p.department_id = d.id
  WHERE p.id = auth.uid();
  
  IF v_dept_name ILIKE '%recursos humanos%' 
     OR v_dept_name ILIKE '%rrhh%' 
     OR v_dept_name ILIKE '%administraci%' 
     OR v_dept_name ILIKE '%gerencia%' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICAS: hr_employee_details
CREATE POLICY "RRHH y Admin ver todo detalles" ON public.hr_employee_details
  FOR SELECT USING (is_hr_admin_or_manager());

CREATE POLICY "RRHH y Admin editar detalles" ON public.hr_employee_details
  FOR ALL USING (is_hr_admin_or_manager());

CREATE POLICY "Usuario ver sus detalles" ON public.hr_employee_details
  FOR SELECT USING (id = auth.uid());

-- POLÍTICAS: hr_documents
CREATE POLICY "RRHH y Admin ver todo documentos" ON public.hr_documents
  FOR SELECT USING (is_hr_admin_or_manager());

CREATE POLICY "RRHH y Admin gestionar documentos" ON public.hr_documents
  FOR ALL USING (is_hr_admin_or_manager());

CREATE POLICY "Usuario ver sus propios documentos" ON public.hr_documents
  FOR SELECT USING (profile_id = auth.uid());

-- POLÍTICAS: hr_leave_requests
CREATE POLICY "RRHH y Admin ver todas las solicitudes" ON public.hr_leave_requests
  FOR SELECT USING (is_hr_admin_or_manager());

CREATE POLICY "RRHH y Admin gestionar solicitudes" ON public.hr_leave_requests
  FOR UPDATE USING (is_hr_admin_or_manager());

CREATE POLICY "Usuario ver sus solicitudes" ON public.hr_leave_requests
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Usuario crear solicitudes" ON public.hr_leave_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Usuario cancelar (editar) sus solicitudes pendientes" ON public.hr_leave_requests
  FOR UPDATE USING (profile_id = auth.uid() AND status = 'pending');

-- POLÍTICAS: hr_candidates
CREATE POLICY "Solo RRHH y Admin acceden a candidatos" ON public.hr_candidates
  FOR ALL USING (is_hr_admin_or_manager());

-- Comentarios explicativos
COMMENT ON TABLE public.hr_employee_details IS 'Información extendida y privada de los empleados';
COMMENT ON TABLE public.hr_documents IS 'Repositorio de documentos laborales';
COMMENT ON TABLE public.hr_leave_requests IS 'Gestión de vacaciones y permisos';
COMMENT ON TABLE public.hr_candidates IS 'Base de datos de postulantes y procesos de selección';
