import { put } from '@vercel/blob';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verificar token de Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("❌ BLOB_READ_WRITE_TOKEN no está configurado");
      return NextResponse.json(
        { error: "Token de Blob no configurado" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const acuerdoMarco = formData.get('acuerdoMarco') as string;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!acuerdoMarco) {
      return NextResponse.json({ error: "Acuerdo marco is required" }, { status: 400 });
    }

    console.log("📁 Archivo recibido:", file.name, file.type, file.size);

    // Validar tipo de archivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}` },
        { status: 400 }
      );
    }

    // Validar tamaño (100MB máximo)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generar nombre único para evitar conflictos
    const timestamp = Date.now();
    const codigoAcuerdo = acuerdoMarco.split(' ')[0];
    const fileName = `${codigoAcuerdo}-${timestamp}-${file.name}`;

    console.log("🔄 Subiendo archivo a Vercel Blob...");

    // Subir usando put directamente
    const blob = await put(fileName, file, {
      access: 'public',
    });

    console.log("✅ Upload completed:", blob.url);

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      contentType: file.type,
      size: file.size,
      originalName: file.name,
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("token")) {
        return NextResponse.json(
          { error: "Error de autenticación con Vercel Blob. Verifica tu BLOB_READ_WRITE_TOKEN." },
          { status: 401 }
        );
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(
      { error: "Error desconocido en la subida" },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};