import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react'

const ICONS = {
  info:    Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger:  XCircle,
}

const STYLES = {
  info: {
    wrapper: 'border-l-4 border-blue-500 bg-[var(--info-subtle)] shadow-sm',
    icon:    'text-blue-500',
    title:   'text-blue-900 dark:text-blue-200',
    body:    'text-blue-700 dark:text-blue-300',
  },
  success: {
    wrapper: 'border-l-4 border-green-500 bg-[var(--success-subtle)] shadow-sm',
    icon:    'text-green-500',
    title:   'text-green-900 dark:text-green-200',
    body:    'text-green-700 dark:text-green-300',
  },
  warning: {
    wrapper: 'border-l-4 border-amber-500 bg-[var(--warning-subtle)] shadow-sm',
    icon:    'text-amber-500',
    title:   'text-amber-900 dark:text-amber-200',
    body:    'text-amber-700 dark:text-amber-300',
  },
  danger: {
    wrapper: 'border-l-4 border-red-500 bg-[var(--danger-subtle)] shadow-sm',
    icon:    'text-red-500',
    title:   'text-red-900 dark:text-red-200',
    body:    'text-red-700 dark:text-red-300',
  },
}

/**
 * Alert — inline alert with optional title and dismiss
 * @param {'info'|'success'|'warning'|'danger'} [variant]
 * @param {string} [title]
 * @param {boolean} [dismissible]
 * @param {function} [onDismiss]
 */
export function Alert({
  variant    = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className   = '',
}) {
  const styles  = STYLES[variant] || STYLES.info
  const Icon    = ICONS[variant]

  return (
    <div
      role="alert"
      className={[
        'flex gap-3 rounded-xl p-4',
        styles.wrapper,
        className,
      ].join(' ')}
    >
      {Icon && (
        <Icon size={18} className={`shrink-0 mt-0.5 ${styles.icon}`} aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
        )}
        {children && (
          <p className={`text-sm ${title ? 'mt-0.5' : ''} ${styles.body}`}>{children}</p>
        )}
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={`shrink-0 hover:opacity-70 transition-opacity ${styles.icon}`}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/**
 * FormError — compact error message for forms
 */
export function FormError({ error, className = '' }) {
  if (!error) return null
  return (
    <Alert variant="danger" className={className}>
      {error}
    </Alert>
  )
}

export default Alert
