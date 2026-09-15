/**
 * NotificationsPage — displays all persisted notifications.
 *
 * Shows:
 *   - Unread badge count in header
 *   - Per-notification: type icon, title, body, relative timestamp, read state
 *   - Link to related report when reportId is present
 *   - Mark all as read
 *   - Delete individual notification
 *   - Clear all
 *   - Empty state
 *
 * All data comes from notificationService (localStorage-backed, survives refresh).
 * Marks notifications as read on mount.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckCheck, Trash2, ExternalLink,
  Info, CheckCircle, AlertTriangle, XCircle,
  X,
} from 'lucide-react'

import { PageLayout, PageHeader } from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { useDialog } from '../../components/ui/ConfirmDialog'

import {
  getNotifications,
  fetchNotifications,
  markAllRead,
  markRead,
  deleteNotification,
  clearAllNotifications,
} from '../../services/notificationService'
import { REPORT_STATUS_META } from '../../services/reportService'

// ── Type icon + colours ───────────────────────────────────────────────────────
const TYPE_CONFIG = {
  info:    { Icon: Info,          bg: 'bg-[var(--info-subtle)]',    iconColor: 'text-blue-500',  border: 'border-blue-200 dark:border-blue-800' },
  success: { Icon: CheckCircle,   bg: 'bg-[var(--success-subtle)]', iconColor: 'text-green-500', border: 'border-green-200 dark:border-green-800' },
  warning: { Icon: AlertTriangle, bg: 'bg-[var(--warning-subtle)]', iconColor: 'text-amber-500', border: 'border-amber-200 dark:border-amber-800' },
  danger:  { Icon: XCircle,       bg: 'bg-[var(--danger-subtle)]',  iconColor: 'text-red-500',   border: 'border-red-200 dark:border-red-800' },
}

// ── Relative time formatter ───────────────────────────────────────────────────
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── Single notification row ───────────────────────────────────────────────────
function NotificationRow({ notif, onRead, onDelete }) {
  const cfg     = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info
  const { Icon } = cfg
  const statusMeta = notif.status ? REPORT_STATUS_META[notif.status] : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2 }}
      className={[
        'flex gap-3 p-4 rounded-xl border transition-colors',
        notif.read
          ? 'bg-bg-primary border-token-subtle opacity-60'
          : `${cfg.bg} ${cfg.border}`,
      ].join(' ')}
      role="article"
      aria-label={`${notif.read ? '' : 'Unread: '}${notif.title}`}
    >
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notif.read ? 'bg-bg-tertiary' : cfg.bg} border ${cfg.border}`}>
          {statusMeta
            ? <span className="text-sm" aria-hidden="true">{statusMeta.icon}</span>
            : <Icon size={15} className={cfg.iconColor} aria-hidden="true" />
          }
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${notif.read ? 'text-token-secondary' : 'text-token-primary'}`}>
            {notif.title}
            {!notif.read && (
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 ml-2 align-middle" aria-label="unread" />
            )}
          </p>
          <span className="text-[11px] text-token-disabled tabular-nums shrink-0">{relativeTime(notif.createdAt)}</span>
        </div>

        {notif.body && (
          <p className={`text-xs mt-1 leading-relaxed ${notif.read ? 'text-token-disabled' : 'text-token-secondary'}`}>
            {notif.body}
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-3 mt-2">
          {notif.reportId && (
            <Link
              to={`/app/report/${notif.reportId}`}
              onClick={() => onRead(notif.id)}
              className={`text-xs font-semibold flex items-center gap-1 hover:underline ${cfg.iconColor}`}
            >
              View report <ExternalLink size={10} aria-hidden="true" />
            </Link>
          )}
          {!notif.read && (
            <button
              type="button"
              onClick={() => onRead(notif.id)}
              className="text-xs text-token-tertiary hover:text-token-primary transition-colors"
              aria-label="Mark as read"
            >
              Mark read
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(notif.id)}
            className="text-xs text-token-disabled hover:text-red-500 transition-colors flex items-center gap-1 ml-auto"
            aria-label="Delete notification"
          >
            <X size={11} aria-hidden="true" />
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(getNotifications())

  const { dialog, confirmAction } = useDialog()

  const reload = useCallback(async () => {
    const list = await fetchNotifications()
    setNotifications(list)
  }, [])

  // Load on mount and mark all as read
  useEffect(() => {
    reload().then(() => {
      markAllRead()
    })
  }, [reload])


  const handleRead = useCallback((id) => {
    markRead(id)
    reload()
  }, [reload])

  const handleDelete = useCallback((id) => {
    deleteNotification(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmAction({
      variant: 'warning',
      title: 'Clear all notifications?',
      message: 'This will remove all notifications. This cannot be undone.',
      confirmLabel: 'Clear all',
    })
    if (!confirmed) return
    clearAllNotifications()
    setNotifications([])
  }, [confirmAction])

  const unread = notifications.filter(n => !n.read).length

  return (
    <PageLayout>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        action={
          notifications.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<CheckCheck size={14} />}
                onClick={() => { markAllRead(); reload() }}
                aria-label="Mark all notifications as read"
              >
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={handleClearAll}
                aria-label="Clear all notifications"
              >
                Clear all
              </Button>
            </div>
          )
        }
      />

      {notifications.length === 0 ? (
        <div className="card p-0">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-bg-secondary border border-token-default flex items-center justify-center mb-4">
              <Bell size={28} className="text-token-disabled" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-token-primary">You're all caught up</h3>
            <p className="text-sm text-token-tertiary mt-1 max-w-xs">
              Notifications about report status updates, badges, and streaks will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div
          role="feed"
          aria-label="Notifications"
          aria-live="polite"
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {notifications.map(notif => (
              <NotificationRow
                key={notif.id}
                notif={notif}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      {dialog}
    </PageLayout>
  )
}
