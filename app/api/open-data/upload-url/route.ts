import { put } from '@vercel/blob';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
  try {
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

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }
    const timestamp = Date.now();
    const codigoAcuerdo = acuerdoMarco.split(' ')[0];
    const fileName = `${codigoAcuerdo}-${timestamp}-${file.name}`;


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