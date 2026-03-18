import SkeletonTable from '@/components/ui/SkeletonTable'

export default function CampaignsLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2" />
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Filter skeleton */}
        <div className="h-9 w-64 bg-gray-100 rounded-lg animate-pulse" />

        {/* Table skeleton */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <SkeletonTable rows={8} cols={7} />
        </div>
      </div>
    </div>
  )
}
