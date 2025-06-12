import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from("departments").select("*").eq("id", params.id).maybeSingle()

    if (error) {
      console.error("Error fetching department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Unexpected error in GET /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error al obtener el departamento" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { name, description, color } = body

    // Primero verificamos que el departamento existe
    const { data: existingDept, error: checkError } = await supabase
      .from("departments")
      .select("id")
      .eq("id", params.id)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking department:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (!existingDept) {
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 })
    }

    // Realizamos la actualización sin intentar devolver datos
    const { error: updateError } = await supabase
      .from("departments")
      .update({
        name,
        description,
        color,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)

    if (updateError) {
      console.error("Error updating department:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Obtenemos los datos actualizados en una consulta separada
    const { data: updatedDept, error: fetchError } = await supabase
      .from("departments")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()

    if (fetchError) {
      console.error("Error fetching updated department:", fetchError)
      // Aún así devolvemos éxito porque la actualización funcionó
      return NextResponse.json({ success: true, message: "Departamento actualizado correctamente" })
    }

    return NextResponse.json(updatedDept || { success: true })
  } catch (error: any) {
    console.error("Unexpected error in PUT /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error al actualizar el departamento" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Primero verificamos que el departamento existe
    const { data: existingDept, error: checkError } = await supabase
      .from("departments")
      .select("id")
      .eq("id", params.id)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking department:", checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (!existingDept) {
      return NextResponse.json({ error: "Departamento no encontrado" }, { status: 404 })
    }

    const { error } = await supabase.from("departments").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting department:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Unexpected error in DELETE /api/departments/[id]:", error)
    return NextResponse.json({ error: "Error al eliminar el departamento" }, { status: 500 })
  }
}
