// app/api/system-status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const requiredVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SECRET_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY"
];

export async function GET() {
  const missingVars = requiredVars.filter((v) => !process.env[v]);

  const results: { envCheck: any; bucketCheck?: any } = {
    envCheck: {
      status: missingVars.length === 0 ? "success" : "error",
      message:
        missingVars.length === 0
          ? "Todas las variables de entorno están configuradas"
          : `Faltan: ${missingVars.join(", ")}`,
      missingVars,
    },
  };

  if (missingVars.length === 0) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) throw error;

      const requiredBuckets = ["images", "documents", "avatars"];
      const availableBuckets = buckets.map((b) => b.name);
      const missingBuckets = requiredBuckets.filter((b) => !availableBuckets.includes(b));

      results.bucketCheck = {
        status: missingBuckets.length === 0 ? "success" : "error",
        message:
          missingBuckets.length === 0
            ? "Todos los buckets requeridos están presentes"
            : `Faltan buckets: ${missingBuckets.join(", ")}`,
        availableBuckets,
        missingBuckets,
      };
    } catch (error: any) {
      results.bucketCheck = {
        status: "error",
        message: `Error al listar buckets: ${error.message}`,
      };
    }
  }

  return NextResponse.json(results);
}
