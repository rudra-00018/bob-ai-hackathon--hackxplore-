import { AlertTriangle, RefreshCw, Inbox, Search, Bell, Flag } from 'lucide-react'
import Button from './Button'

/**
 * EmptyState — generic empty content placeholder
 * @param {React.ReactNode} [icon] - override default icon
 * @param {string} title
 * @param {string} [description]
 * @param {string} [actionLabel]
 * @param {function} [onAction]
 * @param {string} [className]
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 px-6 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-bg-secondary to-bg-tertiary flex items-center justify-center text-token-tertiary mb-5 shadow-sm border border-token-subtle">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-token-primary">{title}</h3>
      {description && (
        <p className="text-sm text-token-tertiary mt-2 max-w-md leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

// ── Preset empty states ────────────────────────────────────────────────────────

export function NoScansEmpty({ onAction }) {
  return (
    <EmptyState
      icon={<Inbox size={28} />}
      title="No scans yet"
      description="Scan your first item to start building your impact record."
      actionLabel="Start scanning"
      onAction={onAction}
    />
  )
}

export function NoReportsEmpty({ onAction }) {
  return (
    <EmptyState
      icon={<Flag size={28} />}
      title="No reports yet"
      description="Report overflowing bins or illegal dumping in your area."
      actionLabel="Report an issue"
      onAction={onAction}
    />
  )
}

export function NoNotificationsEmpty() {
  return (
    <EmptyState
      icon={<Bell size={28} />}
      title="You're all caught up"
      description="Notifications about badges, streaks, and report updates will appear here."
    />
  )
}

export function NoResultsEmpty({ query, onClear }) {
  return (
    <EmptyState
      icon={<Search size={28} />}
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try adjusting your filters or search terms."
      actionLabel={onClear ? 'Clear filters' : undefined}
      onAction={onClear}
    />
  )
}

/**
 * ErrorState — section-level error with retry
 * @param {string} [title]
 * @param {string} [description]
 * @param {function} [onRetry]
 * @param {string} [className]
 */
export function ErrorState({
  title       = 'Something went wrong',
  description = 'We had trouble loading this content. Please try again.',
  onRetry,
  className   = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5 shadow-sm">
        <AlertTriangle size={26} />
      </div>
      <h3 className="text-lg font-bold text-token-primary">{title}</h3>
      <p className="text-sm text-token-tertiary mt-2 max-w-md leading-relaxed">{description}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          className="mt-6"
          onClick={onRetry}
          icon={<RefreshCw size={16} />}
        >
          Try again
        </Button>
      )}
    </div>
  )
}

/**
 * NotFoundPage — 404
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <p className="text-4xl font-bold text-token-tertiary">404</p>
      <h1 className="text-xl font-semibold text-token-primary mt-3">Page not found</h1>
      <p className="text-sm text-token-tertiary mt-2 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button variant="primary" size="md" className="mt-6" onClick={() => window.location.href = '/app'}>
        Go to dashboard
      </Button>
    </div>
  )
}

/**
 * AdminGate — shown for restricted routes (Phase 2+)
 */
export function AdminGate({ routeName = 'This area' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-14 h-14 rounded-full bg-bg-tertiary flex items-center justify-center text-token-tertiary mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-token-primary">Restricted area</h1>
      <p className="text-sm text-token-tertiary mt-2 max-w-xs">
        {routeName} is available in a future phase. Contact us to request early access.
      </p>
      <Button variant="secondary" size="md" className="mt-6" onClick={() => window.location.href = '/app'}>
        ← Back to dashboard
      </Button>
    </div>
  )
}

export default EmptyState
