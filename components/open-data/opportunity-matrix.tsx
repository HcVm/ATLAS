"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts"
import { Target, Loader2 } from "lucide-react"

interface OpportunityMatrixProps {
  period: string
}

export function OpportunityMatrix({ period }: OpportunityMatrixProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/open-data/rankings-by-category?period=${period}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data.rankings.map((r: any) => ({
            x: r.totalOrders,
            y: Math.round(r.totalAmount / r.totalOrders), // Avg Ticket
            z: r.totalAmount, // Size
            name: r.categoria,
            fill: '#10b981'
          })))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [period])

  if (loading) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>

  return (
    <Card className="border-none shadow-lg bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-500" />
          Matriz de Oportunidades
        </CardTitle>
        <CardDescription>
          Mapa de Categorías: Volumen de Órdenes (X) vs Ticket Promedio (Y). El tamaño indica el monto total.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Órdenes" 
                unit="" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: 'Volumen de Órdenes', position: 'bottom', fill: '#94a3b8', fontSize: 12 }} 
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Ticket Promedio" 
                unit=" S/" 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                label={{ value: 'Ticket Promedio (S/)', angle: -90, position: 'left', fill: '#94a3b8', fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 500]} name="Monto Total" unit=" S/" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                            <div className="bg-white/95 dark:bg-slate-900/95 p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                                <p className="font-bold text-slate-800 dark:text-slate-200">{data.name}</p>
                                <p className="text-xs text-slate-500">Órdenes: {data.x.toLocaleString()}</p>
                                <p className="text-xs text-slate-500">Ticket Prom: S/ {data.y.toLocaleString()}</p>
                                <p className="text-xs font-semibold text-emerald-600">Total: S/ {data.z.toLocaleString()}</p>
                            </div>
                        );
                    }
                    return null;
                }}
              />
              <Scatter name="Categorías" data={data} fill="#10b981" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
