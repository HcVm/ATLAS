"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, Truck } from "lucide-react"

interface LeaderboardProps {
  entities: Array<{ name: string; amount: number }>
  suppliers: Array<{ name: string; amount: number }>
}

export function Leaderboard({ entities, suppliers }: LeaderboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Buyers */}
      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Building2 className="h-5 w-5" />
            Top Compradores (Entidades)
          </CardTitle>
          <CardDescription>Instituciones con mayor ejecución de gasto</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-xs md:text-sm max-w-[200px] truncate" title={e.name}>
                    {e.name}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-700 dark:text-slate-300">
                    S/ {(e.amount / 1000000).toFixed(2)}M
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Sellers */}
      <Card className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Truck className="h-5 w-5" />
            Top Proveedores
          </CardTitle>
          <CardDescription>Empresas con mayor volumen de ventas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-xs md:text-sm max-w-[200px] truncate" title={s.name}>
                    {s.name}
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                    S/ {(s.amount / 1000000).toFixed(2)}M
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
