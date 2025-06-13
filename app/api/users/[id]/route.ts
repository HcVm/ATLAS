import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, updateUserWithAdmin, deleteUserWithAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Consulta separada para evitar problemas de relaciones múltiples
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .single()

    if (profileError) {
      console.error("Error fetching user profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Si el usuario tiene un departamento, obtenerlo por separado
    let department = null
    if (profile.department_id) {
      const { data: deptData, error: deptError } = await supabaseAdmin
        .from("departments")
        .select("id, name")
        .eq("id", profile.department_id)
        .single()

      if (!deptError && deptData) {
        department = deptData
      }
    }

    // Combinar los datos
    const userWithDepartment = {
      ...profile,
      departments: department,
    }

    return NextResponse.json(userWithDepartment)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/users/[id]:", error)
    return NextResponse.json({ error: "Error al obtener el usuario" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { full_name, email, role, department_id, company_id = null, phone = null } = body

    const { error } = await updateUserWithAdmin({
      userId: params.id,
      fullName: full_name,
      email,
      role,
      departmentId: department_id,
      companyId: company_id,
      phone,
    })

    if (error) {
      console.error("Error updating user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/users/[id]:", error)
    return NextResponse.json({ error: "Error al actualizar el usuario" }, { status: 500 })
  }
}



export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await deleteUserWithAdmin(params.id)

    if (error) {
      console.error("Error deleting user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/users/[id]:", error)
    return NextResponse.json({ error: "Error al eliminar el usuario" }, { status: 500 })
  }
}
