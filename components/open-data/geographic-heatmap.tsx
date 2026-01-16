"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MapPin, ArrowRight } from "lucide-react"

interface GeographicHeatmapProps {
  data: Array<{ region: string; amount: number }>
}

export function GeographicHeatmap({ data }: GeographicHeatmapProps) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1)

  return (
    <Card className="h-full bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-500" />
          Mapa de Calor Regional
        </CardTitle>
        <CardDescription>
          Regiones con mayor volumen de compra pública
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.map((item, index) => (
          <div key={item.region} className="group">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">
                    {index + 1}
                </span>
                {item.region}
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                S/ {(item.amount / 1000000).toFixed(1)}M
              </span>
            </div>
            <Progress 
                value={(item.amount / maxAmount) * 100} 
                className="h-2 bg-slate-100 dark:bg-slate-800"
                // Custom indicator color logic would go here if Progress component supported it directly, 
                // but we rely on the default or global theme.
            />
          </div>
        ))}
        {data.length === 0 && (
            <div className="text-center text-slate-400 py-8">No hay datos regionales disponibles</div>
        )}
      </CardContent>
    </Card>
  )
}
