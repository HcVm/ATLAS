export default function SupportLoading() {
  return (
    <div className="container mx-auto p-6 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-t-4 border-slate-200 dark:border-slate-700 rounded-full animate-spin reverse"></div>
        </div>
        <p className="text-muted-foreground animate-pulse font-medium">Cargando soporte...</p>
      </div>
    </div>
  )
}
