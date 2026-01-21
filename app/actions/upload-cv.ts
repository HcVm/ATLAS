"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"

export async function uploadCV(formData: FormData) {
    const file = formData.get("file") as File
    const jobId = formData.get("jobId") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const docType = formData.get("docType") as string || "CV"

    if (!file || !jobId) {
        return { error: "Faltan datos requeridos (archivo o ID del trabajo)" }
    }

    try {
        const fileExt = file.name.split('.').pop()

        // Sanitize
        const sanitizedFirstName = firstName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
        const sanitizedLastName = lastName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");

        const fileName = `${sanitizedFirstName}_${sanitizedLastName}_${docType}_${Date.now()}.${fileExt}`
        const filePath = `${jobId}/${fileName}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError, data } = await supabaseAdmin.storage
            .from('candidates_cv')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error("Server upload error:", uploadError)
            return { error: "Error subiendo el archivo al servidor: " + uploadError.message }
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('candidates_cv')
            .getPublicUrl(filePath)

        return { publicUrl }
    } catch (error: any) {
        console.error("Unexpected upload error:", error)
        return { error: "Error inesperado al subir el CV" }
    }
}
