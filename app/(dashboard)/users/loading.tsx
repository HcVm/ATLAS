export default function UsersLoading() {
  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-10 w-full sm:w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      <div className="rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}