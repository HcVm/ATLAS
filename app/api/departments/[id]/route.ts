import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Usar el service role key para operaciones administrativas
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`Fetching department with ID: ${params.id}`)

    const { data, error } = await supabaseAdmin.from("departments").select("*").eq("id", params.id).limit(1)

    if (error) {
      console.error("Supabase error fetching department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.log(`Department not found with ID: ${params.id}`)
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 })
    }

    console.log(`Department found:`, data[0])
    return NextResponse.json(data[0])
  } catch (error: any) {
    console.error("Unexpected error in GET /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`Updating department with ID: ${params.id}`)

    const body = await request.json()
    console.log("Update data:", body)

    const { name, description, color } = body

    if (!name || !color) {
      return NextResponse.json({ error: "Nombre y color son requeridos" }, { status: 400 })
    }

    // Verificar que el departamento existe
    const { data: existingDept, error: checkError } = await supabaseAdmin
      .from("departments")
      .select("id")
      .eq("id", params.id)
      .limit(1)

    if (checkError) {
      console.error("Error checking department existence:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (!existingDept || existingDept.length === 0) {
      console.log(`Department not found for update: ${params.id}`)
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 })
    }

    // Realizar la actualización
    const updateData = {
      name,
      description: description || null,
      color,
      updated_at: new Date().toISOString(),
    }

    console.log("Updating with data:", updateData)

    const { error: updateError } = await supabaseAdmin.from("departments").update(updateData).eq("id", params.id)

    if (updateError) {
      console.error("Error updating department:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`Department updated successfully: ${params.id}`)

    // Devolver los datos actualizados
    const { data: updatedDept, error: fetchError } = await supabaseAdmin
      .from("departments")
      .select("*")
      .eq("id", params.id)
      .limit(1)

    if (fetchError) {
      console.error("Error fetching updated department:", fetchError)
      return NextResponse.json({
        success: true,
        message: "Departamento actualizado correctamente",
      })
    }

    const result = updatedDept && updatedDept.length > 0 ? updatedDept[0] : { success: true }
    console.log("Returning updated department:", result)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`Deleting department with ID: ${params.id}`)

    // Verificar que el departamento existe
    const { data: existingDept, error: checkError } = await supabaseAdmin
      .from("departments")
      .select("id")
      .eq("id", params.id)
      .limit(1)

    if (checkError) {
      console.error("Error checking department existence:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (!existingDept || existingDept.length === 0) {
      console.log(`Department not found for deletion: ${params.id}`)
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 })
    }

    const { error } = await supabaseAdmin.from("departments").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Department deleted successfully: ${params.id}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
