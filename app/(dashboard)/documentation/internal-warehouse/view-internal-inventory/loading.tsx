import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <Skeleton className="h-4 w-48" /> {/* Back button placeholder */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" /> {/* Icon placeholder */}
        <Skeleton className="h-8 w-64" /> {/* Title placeholder */}
      </div>
      <Skeleton className="h-5 w-full max-w-2xl" /> {/* Description placeholder */}
      <Skeleton className="h-0.5 w-full" /> {/* Separator placeholder */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-3/4" /> {/* Card title */}
            <Skeleton className="h-4 w-1/2" /> {/* Card description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" /> {/* Paragraph */}
              <Skeleton className="h-4 w-full" /> {/* Paragraph */}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
