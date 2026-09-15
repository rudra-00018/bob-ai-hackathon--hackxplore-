/**
 * Badge / Pill component
 * @param {'success'|'danger'|'warning'|'info'|'neutral'|'brand'} [variant]
 * @param {'sm'|'md'} [size]
 */
export function Badge({ children, variant = 'neutral', size = 'md', className = '' }) {
  const styles = {
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    danger:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    info:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    neutral: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20',
    brand:   'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold',
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1 border rounded-full shadow-sm',
        styles[variant] || styles.neutral,
        sizes[size],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

/**
 * StatusPill — convenience wrapper for common status values
 */
export function StatusPill({ status, className = '' }) {
  const map = {
    recyclable:     { label: 'Recyclable',     variant: 'success' },
    'non-recyclable':{ label: 'Non-Recyclable', variant: 'danger' },
    pending:        { label: 'Pending',         variant: 'warning' },
    acknowledged:   { label: 'Acknowledged',    variant: 'info' },
    in_progress:    { label: 'In Progress',     variant: 'info' },
    resolved:       { label: 'Resolved',        variant: 'success' },
    full:           { label: 'Full',            variant: 'danger' },
    normal:         { label: 'Normal',          variant: 'success' },
    offline:        { label: 'Offline',         variant: 'neutral' },
  }

  const { label, variant } = map[status] || { label: status, variant: 'neutral' }
  return <Badge variant={variant} className={className}>{label}</Badge>
}

export default Badge
