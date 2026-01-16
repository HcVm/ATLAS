import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="h-[calc(100vh-4rem)] p-4 sm:p-6 space-y-6 overflow-y-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50">
            <CardContent className="p-4 flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <Card className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 rounded-2xl">
        <CardContent className="p-6 space-y-4">
           <div className="flex justify-between gap-4">
              <Skeleton className="h-11 flex-1 rounded-xl" />
              <Skeleton className="h-11 w-48 rounded-xl" />
           </div>
           <div className="flex gap-3">
              <Skeleton className="h-11 w-24 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
              <Skeleton className="h-11 w-24 rounded-xl" />
           </div>
        </CardContent>
      </Card>

      {/* Table/List Skeleton */}
      <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 rounded-2xl">
        <CardContent className="p-0">
          <div className="p-6 space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[30%]" />
                  <Skeleton className="h-3 w-[20%]" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
