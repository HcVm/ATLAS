import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function QuotationsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-6 bg-slate-50/30 dark:bg-slate-900/30 flex flex-col md:flex-row gap-4 justify-between items-center">
          <Skeleton className="h-11 w-full md:max-w-md rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
