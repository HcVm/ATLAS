import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { z } from "zod"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  fullName: z.string(),
  departmentId: z.string(),
  companyId: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.string().optional(),
  id: z.string().optional(),
})

// Helper para crear supabase client con SSR y cookies
function getSupabaseServerClient() {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: cookies(),
  })
}

// GET: listar usuarios
export async function GET(request: NextRequest) {
  const supabase = getSupabaseServerClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const companyId = searchParams.get("companyId")

  let query = supabase
    .from("profiles")
    .select(
      `*,
      departments!profiles_department_id_fkey (id, name),
      companies!profiles_company_id_fkey (id, name, code, color)`
    )
    .order("created_at", { ascending: false })

  if (companyId && companyId !== "null") {
    query = query.eq("company_id", companyId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data })
}

// POST: crear usuario
export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUser.id)
    .single()

  if (!adminProfile || adminProfile.role !== "admin") {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = userSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.format() }, { status: 400 })
  }

  const { email, password, fullName, departmentId, companyId, phone } = parsed.data

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: password!,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userData.user.id,
    email,
    full_name: fullName,
    role: "user",
    department_id: departmentId,
    company_id: companyId || null,
    phone: phone || null,
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, user: userData.user })
}

// PUT: actualizar usuario
export async function PUT(request: NextRequest) {
  const supabase = getSupabaseServerClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUser.id)
    .single()

  if (!adminProfile || adminProfile.role !== "admin") {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = userSchema.safeParse(body)
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "Datos inválidos o falta ID" }, { status: 400 })
  }

  const { id, email, fullName, departmentId, companyId, phone, role } = parsed.data

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      email,
      full_name: fullName,
      department_id: departmentId,
      company_id: companyId || null,
      phone: phone || null,
      role: role || "user",
    })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE: eliminar usuario
export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseServerClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authUser.id)
    .single()

  if (!adminProfile || adminProfile.role !== "admin") {
    return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
  }

  const body = await request.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: "Falta ID de usuario" }, { status: 400 })
  }

  const { error: deleteProfileError } = await supabaseAdmin.from("profiles").delete().eq("id", id)
  if (deleteProfileError) {
    return NextResponse.json({ error: deleteProfileError.message }, { status: 500 })
  }

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (deleteAuthError) {
    return NextResponse.json({ error: deleteAuthError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
