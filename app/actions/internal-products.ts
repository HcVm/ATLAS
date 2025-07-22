"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getSupabaseAdminClient() {
  const cookieStore = cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
      remove: (name: string, options: any) => cookieStore.set(name, "", options),
    },
  })
}

export async function deleteInternalProduct(productId: string) {
  const supabaseAdmin = await getSupabaseAdminClient()

  try {
    const { data: productToDelete, error: fetchProductError } = await supabaseAdmin
      .from("internal_products")
      .select("is_serialized")
      .eq("id", productId)
      .single()

    if (fetchProductError) throw fetchProductError

    if (productToDelete?.is_serialized) {
      const { error: deleteSerialsError } = await supabaseAdmin
        .from("internal_product_serials")
        .delete()
        .eq("product_id", productId)

      if (deleteSerialsError) throw deleteSerialsError
    }

    const { error } = await supabaseAdmin.from("internal_products").delete().eq("id", productId)

    if (error) throw error

    // Revalidate the path to refresh the product list
    revalidatePath("/warehouse/internal/products")
    // Server actions cannot directly call client-side toast, but you can log or return status
    // For client-side toast, the client component calling this action would handle it.
    console.log("Producto eliminado exitosamente (Server Action).")
    return { success: true, message: "Producto eliminado exitosamente." }
  } catch (error: any) {
    console.error("Error deleting product (Server Action):", error.message)
    return { success: false, message: error.message || "Error al eliminar el producto." }
  }
}
