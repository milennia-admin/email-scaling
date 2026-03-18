interface SkeletonTableProps {
  rows?: number
  cols?: number
}

export default function SkeletonTable({ rows = 8, cols = 6 }: SkeletonTableProps) {
  return (
    <div className="animate-pulse">
      {/* Header row */}
      <div className="flex gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-gray-200 rounded"
            style={{ width: `${[20, 12, 12, 10, 10, 8][i] ?? 10}%` }}
          />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-4 px-6 py-4 border-b border-gray-100 items-center"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <div
              key={col}
              className="h-4 bg-gray-100 rounded"
              style={{ width: `${[20, 12, 12, 10, 10, 8][col] ?? 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
