import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, approver_user_id, department_id, request_types, is_active } = body

    // Validate required fields
    if (!company_id || !approver_user_id || !request_types || request_types.length === 0) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: company_id, approver_user_id, request_types" },
        { status: 400 },
      )
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Validate that the approver user exists and has appropriate role
    const { data: approverUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", approver_user_id)
      .single()

    if (userError || !approverUser) {
      return NextResponse.json({ error: "Usuario aprobador no encontrado" }, { status: 404 })
    }

    if (!["supervisor", "admin"].includes(approverUser.role)) {
      return NextResponse.json(
        { error: "El usuario debe tener rol de supervisor o admin para ser aprobador" },
        { status: 400 },
      )
    }

    // Check if approver already exists for this company and user
    const { data: existingApprover } = await supabaseAdmin
      .from("request_approvers")
      .select("id")
      .eq("company_id", company_id)
      .eq("approver_user_id", approver_user_id)
      .eq("department_id", department_id || null)
      .single()

    if (existingApprover) {
      return NextResponse.json({ error: "Ya existe un aprobador para este usuario y departamento" }, { status: 409 })
    }

    // Create the approver using admin client to bypass RLS
    const { data: newApprover, error: insertError } = await supabaseAdmin
      .from("request_approvers")
      .insert({
        company_id,
        approver_user_id,
        department_id: department_id || null,
        request_types,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        profiles!request_approvers_approver_user_id_fkey(full_name),
        departments(name)
      `)
      .single()

    if (insertError) {
      console.error("Error creating approver:", insertError)
      return NextResponse.json({ error: "Error al crear el aprobador" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newApprover,
        approver_name: newApprover.profiles?.full_name || "Usuario Desconocido",
        department_name: newApprover.departments?.name,
      },
    })
  } catch (error) {
    console.error("Error in POST /api/requests/approvers:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("company_id")

    let query = supabase
      .from("request_approvers")
      .select(`
        *,
        profiles!request_approvers_approver_user_id_fkey(full_name),
        departments(name)
      `)
      .eq("is_active", true)

    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching approvers:", error)
      return NextResponse.json({ error: "Error al obtener aprobadores" }, { status: 500 })
    }

    const approvers =
      data?.map((approver) => ({
        ...approver,
        approver_name: approver.profiles?.full_name || "Usuario Desconocido",
        department_name: approver.departments?.name,
      })) || []

    return NextResponse.json({ success: true, data: approvers })
  } catch (error) {
    console.error("Error in GET /api/requests/approvers:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      },
    )

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { id, approver_user_id, department_id, request_types, is_active } = body

    if (!id) {
      return NextResponse.json({ error: "ID del aprobador es requerido" }, { status: 400 })
    }

    const { data: updatedApprover, error: updateError } = await supabase
      .from("request_approvers")
      .update({
        approver_user_id,
        department_id: department_id || null,
        request_types,
        is_active,
      })
      .eq("id", id)
      .select(`
        *,
        profiles!request_approvers_approver_user_id_fkey(full_name),
        departments(name)
      `)
      .single()

    if (updateError) {
      console.error("Error updating approver:", updateError)
      return NextResponse.json({ error: "Error al actualizar el aprobador" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedApprover,
        approver_name: updatedApprover.profiles?.full_name || "Usuario Desconocido",
        department_name: updatedApprover.departments?.name,
      },
    })
  } catch (error) {
    console.error("Error in PUT /api/requests/approvers:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
