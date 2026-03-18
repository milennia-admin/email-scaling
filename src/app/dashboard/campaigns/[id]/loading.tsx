export default function CampaignDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="px-6 pt-5">
        <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
      </div>
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="h-6 w-40 bg-gray-200 rounded" />
      </div>
      <div className="px-6 py-6 space-y-4">
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
