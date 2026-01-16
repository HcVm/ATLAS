export default function NewsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-10 w-full sm:w-32 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl p-6 space-y-6">
        <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 overflow-hidden h-96 flex flex-col">
                <div className="h-48 bg-slate-200 dark:bg-slate-800 animate-pulse w-full" />
                <div className="p-5 flex-1 space-y-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-6 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
