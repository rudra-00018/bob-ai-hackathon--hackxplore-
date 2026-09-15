/**
 * Spinner — animated loading indicator
 * @param {'sm'|'md'|'lg'} [size]
 * @param {string} [className]
 */
export function Spinner({ size = 'md', className = '' }) {
  const dimensions = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  const stroke     = { sm: 1.5, md: 2, lg: 2 }

  return (
    <svg
      className={[
        'animate-spin text-green-500',
        dimensions[size] || dimensions.md,
        className,
      ].join(' ')}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
      role="status"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth={stroke[size]}
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

/**
 * PageSpinner — centered full-page loading state
 */
export function PageSpinner({ label = 'Loading…' }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-64 gap-3"
      role="status"
      aria-label={label}
    >
      <Spinner size="lg" />
      <span className="text-sm text-token-tertiary">{label}</span>
    </div>
  )
}

/**
 * Skeleton — shimmer placeholder
 * @param {string} [className] - include width, height classes
 */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * SkeletonText — line(s) of skeleton text
 * @param {number} [lines]
 * @param {string} [className]
 */
export function SkeletonText({ lines = 1, className = '' }) {
  const widths = ['w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-4/5']

  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 rounded-full ${widths[i % widths.length]}`} />
      ))}
    </div>
  )
}

/**
 * SkeletonCard — placeholder for a stat card
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card p-6 ${className}`} aria-hidden="true">
      <Skeleton className="h-8 w-8 rounded-md mb-3" />
      <Skeleton className="h-8 w-24 rounded-md mb-2" />
      <Skeleton className="h-3.5 w-32 rounded-full" />
    </div>
  )
}

/**
 * SkeletonTable — placeholder rows for a table
 */
export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`card p-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-token-default">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 rounded-full flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 px-4 py-4 border-b border-token-subtle last:border-0">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className={`h-3.5 rounded-full flex-1 ${j === 0 ? 'max-w-[120px]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default Spinner
