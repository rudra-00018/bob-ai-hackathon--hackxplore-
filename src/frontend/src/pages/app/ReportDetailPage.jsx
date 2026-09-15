/**
 * ReportDetailPage — Full view of a single report.
 *
 * Shows:
 *   - Photo + type + location
 *   - Status timeline (all 6 states, reached/pending/rejected)
 *   - AI analysis result summary
 *   - Status history log (timestamped)
 *   - Actions: Withdraw (if active), Delete
 *
 * Accessed via /app/report/:id
 * Refreshing the page reloads from localStorage — state is never lost.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, Trash2, XCircle,
  AlertTriangle, Zap, CheckCircle, RefreshCw,
  Flag, Info, Loader2, ThumbsUp, ShieldCheck,
} from 'lucide-react'

import { PageLayout } from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Skeleton } from '../../components/ui/Spinner'
import { useDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../context/AuthContext'

import {
  fetchReport,
  transitionStatus,
  withdrawReport,
  upvoteReport,
  deleteReport,
  isActiveStatus,
  isTerminalStatus,
  isValidTransition,
  REPORT_TYPE_META,
  REPORT_STATUS,
  REPORT_STATUS_META,
  STATUS_ORDER,
  URGENCY_META,
} from '../../services/reportService'


// ── Status timeline ───────────────────────────────────────────────────────────
function StatusTimeline({ report }) {
  const history     = report.statusHistory || []
  const reachedSet  = new Set(history.map(h => h.status))
  const isRejected  = report.status === REPORT_STATUS.REJECTED

  // Build the visible steps:
  //   If rejected, show the normal chain up to where it was rejected, then
  //   append REJECTED as the terminal step.
  const steps = isRejected
    ? [...STATUS_ORDER.filter(s => reachedSet.has(s) && s !== REPORT_STATUS.RESOLVED), REPORT_STATUS.REJECTED]
    : STATUS_ORDER

  return (
    <div role="list" aria-label="Report status timeline" className="space-y-0">
      {steps.map((status, i) => {
        const meta       = REPORT_STATUS_META[status]
        const reached    = reachedSet.has(status)
        const isCurrent  = report.status === status
        const histEntry  = history.find(h => h.status === status)
        const isLast     = i === steps.length - 1

        return (
          <div key={status} role="listitem" className="flex gap-3">
            {/* Column: dot + connector line */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm shrink-0 transition-all',
                  reached && isCurrent && status === REPORT_STATUS.RESOLVED
                    ? 'bg-green-500 border-green-500 text-white'
                    : reached && isCurrent && status === REPORT_STATUS.REJECTED
                      ? 'bg-red-500 border-red-500 text-white'
                      : reached && isCurrent
                        ? 'bg-white dark:bg-bg-primary border-2 shadow-sm'
                        : reached
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-bg-secondary border-token-default text-token-disabled',
                ].join(' ')}
                style={
                  reached && isCurrent && !isTerminalStatus(status)
                    ? { borderColor: meta.color, color: meta.color }
                    : undefined
                }
                aria-current={isCurrent ? 'step' : undefined}
              >
                {reached && !isCurrent ? (
                  <CheckCircle size={14} />
                ) : (
                  <span>{meta.icon}</span>
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  className="w-0.5 flex-1 my-1 min-h-[20px]"
                  style={{ background: reached ? '#22C55E' : 'var(--color-border-default, #374151)', opacity: reached ? 1 : 0.3 }}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={[
                    'text-sm font-semibold',
                    isCurrent ? 'text-token-primary' : reached ? 'text-token-secondary' : 'text-token-disabled',
                  ].join(' ')}
                >
                  {meta.label}
                </span>
                {isCurrent && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border"
                    style={{ color: meta.color, background: `${meta.color}15`, borderColor: `${meta.color}30` }}
                  >
                    CURRENT
                  </span>
                )}
              </div>

              {histEntry && (
                <p className="text-xs text-token-tertiary mt-0.5">
                  {new Date(histEntry.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}

              {histEntry?.note && isCurrent && (
                <p className="text-xs text-token-secondary mt-1 leading-relaxed">{histEntry.note}</p>
              )}

              {!reached && !isRejected && (
                <p className="text-xs text-token-disabled mt-0.5 italic">{meta.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── AI summary ────────────────────────────────────────────────────────────────
function AISummary({ aiResult }) {
  if (!aiResult) return null
  const urgencyMeta = URGENCY_META[aiResult.urgency]
  const conf        = aiResult.confidence != null ? Math.round(aiResult.confidence * 100) : null

  return (
    <div className="rounded-xl border border-token-default bg-bg-secondary p-4 space-y-3">
      <p className="text-xs font-semibold text-token-secondary uppercase tracking-wide flex items-center gap-1.5">
        <Zap size={12} className="text-green-500" aria-hidden="true" />
        AI Classification
      </p>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-token-primary capitalize">{aiResult.label || aiResult.category}</p>
          {conf !== null && (
            <div className="mt-1.5">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-token-tertiary">Confidence</span>
                <span className="font-medium tabular-nums"
                  style={{ color: conf >= 75 ? '#22C55E' : conf >= 50 ? '#F59E0B' : '#EF4444' }}>
                  {conf}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${conf}%`,
                    background: conf >= 75 ? '#22C55E' : conf >= 50 ? '#F59E0B' : '#EF4444',
                  }}
                />
              </div>
            </div>
          )}
        </div>
        {urgencyMeta && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border shrink-0"
            style={{ color: urgencyMeta.color, background: `${urgencyMeta.color}12`, borderColor: `${urgencyMeta.color}30` }}
          >
            {urgencyMeta.icon} {urgencyMeta.label}
          </span>
        )}
      </div>

      {aiResult.source === 'mock' && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Info size={10} aria-hidden="true" />
          Demo result — AI model not connected
        </p>
      )}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading report">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-6 w-48 rounded" />
      <Skeleton className="h-4 w-64 rounded" />
      <div className="space-y-3 mt-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [report,         setReport]         = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [withdrawing,    setWithdrawing]    = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [upvoting,       setUpvoting]       = useState(false)
  const [transitioning,  setTransitioning]  = useState(false)
  const [officerNote,    setOfficerNote]    = useState('')
  const [actionError,    setActionError]    = useState(null)

  const isMunicipality = user?.role === 'municipality'

  const { dialog, confirmAction } = useDialog()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReport(id)
      setReport(data)
    } catch (err) {
      setError(err.message || 'Report not found')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Poll for simulated / server status updates every 30 s when report is active
  useEffect(() => {
    if (!report || isTerminalStatus(report.status)) return
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [report, load])

  const handleUpvote = async () => {
    if (upvoting) return
    setUpvoting(true)
    try {
      await upvoteReport(id)
      setReport(prev => prev ? { ...prev, upvotes: (prev.upvotes || 0) + 1 } : prev)
    } catch (err) {
      setActionError(err.message || 'Could not upvote')
    } finally {
      setUpvoting(false)
    }
  }

  const handleWithdraw = async () => {
    const confirmed = await confirmAction({
      variant: 'warning',
      title: 'Withdraw this report?',
      message: 'This will mark the report as rejected. This action cannot be undone.',
      confirmLabel: 'Withdraw',
    })
    if (!confirmed) return
    setWithdrawing(true)
    setActionError(null)
    try {
      const updated = await withdrawReport(id)
      setReport(updated)
    } catch (err) {
      setActionError(err.message || 'Could not withdraw report')
    } finally {
      setWithdrawing(false)
    }
  }

  const handleStatusTransition = async (nextStatus) => {
    setTransitioning(true)
    setActionError(null)
    try {
      const updated = await transitionStatus(id, nextStatus, officerNote.trim() || undefined)
      setReport(updated)
      setOfficerNote('')
    } catch (err) {
      setActionError(err.message || `Failed to transition to ${nextStatus}`)
    } finally {
      setTransitioning(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirmAction({
      variant: 'danger',
      title: 'Permanently delete this report?',
      message: 'This will remove the report and all its history from the database. This cannot be undone.',
      confirmLabel: 'Delete permanently',
    })
    if (!confirmed) return
    setDeleting(true)
    setActionError(null)
    try {
      await deleteReport(id)
      navigate(isMunicipality ? '/municipality' : '/app/report', { replace: true })
    } catch (err) {
      setActionError(err.message || 'Could not delete report')
      setDeleting(false)
    }
  }

  const typeMeta   = report ? (REPORT_TYPE_META[report.reportType] || { label: report.reportType, emoji: '📋', color: '#6B7280' }) : null
  const statusMeta = report ? (REPORT_STATUS_META[report.status]   || REPORT_STATUS_META[REPORT_STATUS.SUBMITTED]) : null
  const isActive   = report ? isActiveStatus(report.status) : false

  // Next possible transitions for municipality
  const nextStatuses = report ? (
    report.status === REPORT_STATUS.SUBMITTED    ? [REPORT_STATUS.UNDER_REVIEW, REPORT_STATUS.REJECTED] :
    report.status === REPORT_STATUS.UNDER_REVIEW ? [REPORT_STATUS.ACCEPTED, REPORT_STATUS.REJECTED] :
    report.status === REPORT_STATUS.ACCEPTED     ? [REPORT_STATUS.IN_PROGRESS, REPORT_STATUS.REJECTED] :
    report.status === REPORT_STATUS.IN_PROGRESS  ? [REPORT_STATUS.RESOLVED, REPORT_STATUS.REJECTED] :
    []
  ) : []

  return (
    <PageLayout>
      {/* Back link */}
      <div className="mb-4">
        <Link
          to={isMunicipality ? "/municipality" : "/app/report"}
          className="inline-flex items-center gap-1.5 text-sm text-token-tertiary hover:text-token-primary transition-colors"
          aria-label="Back to reports list"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          {isMunicipality ? "Municipality Dashboard" : "My Reports"}
        </Link>
      </div>

      {loading ? (
        <div className="card p-6"><DetailSkeleton /></div>
      ) : error ? (
        <div className="card p-6">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle size={28} className="text-amber-500" />
            <p className="text-sm font-medium text-token-primary">{error}</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={load} icon={<RefreshCw size={14} />}>Retry</Button>
              <Button variant="ghost" onClick={() => navigate(isMunicipality ? '/municipality' : '/app/report')}>
                Back to reports
              </Button>
            </div>
          </div>
        </div>
      ) : report && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* ── Hero card ── */}
          <div className="card p-0 overflow-hidden">
            {/* Photo */}
            {report.imageUrl ? (
              <div className="relative" style={{ maxHeight: 280 }}>
                <img
                  src={report.imageUrl}
                  alt={`Photo for report: ${typeMeta.label}`}
                  className="w-full object-cover"
                  style={{ maxHeight: 280 }}
                />
                {/* Status badge overlay */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${statusMeta.bgClass} ${statusMeta.textClass} border`}
                    style={{ borderColor: `${statusMeta.color}40` }}
                  >
                    {statusMeta.icon} {statusMeta.label}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center text-5xl"
                style={{ height: 140, background: `${typeMeta.color}12` }}
                aria-hidden="true"
              >
                {typeMeta.emoji}
              </div>
            )}

            <div className="p-5 space-y-3">
              {/* Type + ID */}
              <div>
                <h1 className="text-lg font-semibold text-token-primary">
                  {typeMeta.emoji} {typeMeta.label}
                </h1>
                <p className="text-xs text-token-disabled font-mono mt-0.5">ID: {report.id}</p>
                {report.username && (
                  <p className="text-xs text-token-tertiary mt-0.5">Submitted by: <span className="font-semibold text-token-secondary">{report.username}</span></p>
                )}
              </div>

              {/* Location */}
              {report.location?.address && (
                <p className="flex items-start gap-1.5 text-sm text-token-secondary">
                  <MapPin size={14} className="shrink-0 mt-0.5 text-token-tertiary" aria-hidden="true" />
                  {report.location.address}
                </p>
              )}

              {/* Dates */}
              <div className="flex gap-4 text-xs text-token-disabled">
                <span className="flex items-center gap-1">
                  <Clock size={11} aria-hidden="true" />
                  Submitted {new Date(report.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                {report.updatedAt !== report.createdAt && (
                  <span className="flex items-center gap-1">
                    <RefreshCw size={11} aria-hidden="true" />
                    Updated {new Date(report.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                )}
              </div>

              {/* Description */}
              {report.description && (
                <p className="text-sm text-token-secondary leading-relaxed border-l-2 pl-3"
                  style={{ borderColor: typeMeta.color }}>
                  {report.description}
                </p>
              )}

              {/* Status description */}
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border ${statusMeta.bgClass}`}
                style={{ borderColor: `${statusMeta.color}25` }}
                role="status"
                aria-live="polite"
              >
                <span aria-hidden="true">{statusMeta.icon}</span>
                <span className={statusMeta.textClass}>{statusMeta.description}</span>
              </div>
            </div>
          </div>

          {/* ── Timeline + sidebar grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Status timeline */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-token-primary mb-4">Status timeline</h2>
              {/* Auto-refresh note for active reports */}
              {isActive && (
                <p className="text-xs text-token-disabled mb-4 flex items-center gap-1">
                  <RefreshCw size={10} aria-hidden="true" />
                  Live tracker — updates automatically.
                </p>
              )}
              <StatusTimeline report={report} />
            </div>

            {/* AI + actions */}
            <div className="space-y-4">
              {/* AI summary */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-token-primary mb-3">AI analysis</h2>
                {report.aiResult ? (
                  <AISummary aiResult={report.aiResult} />
                ) : (
                  <p className="text-xs text-token-tertiary flex items-center gap-1.5">
                    <Info size={12} aria-hidden="true" />
                    No AI analysis was recorded for this report.
                  </p>
                )}
              </div>

              {/* Upvotes */}
              <div className="card p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-token-primary">Community upvotes</p>
                  <p className="text-xs text-token-tertiary mt-0.5">Flagged by local residents</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-token-primary tabular-nums">{report.upvotes || 0}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={upvoting ? <Loader2 size={13} className="animate-spin" /> : <ThumbsUp size={13} />}
                    onClick={handleUpvote}
                    disabled={upvoting}
                  >
                    Upvote
                  </Button>
                </div>
              </div>

              {/* Municipality Review Controls */}
              {isMunicipality && isActive && nextStatuses.length > 0 && (
                <div className="card p-5 space-y-3 border-2 border-blue-500/20 bg-[var(--info-subtle)]">
                  <h2 className="text-sm font-semibold text-token-primary flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-blue-500" />
                    Municipal Officer Action
                  </h2>
                  <p className="text-xs text-token-tertiary">
                    Update report status. The citizen will be notified immediately.
                  </p>

                  <input
                    type="text"
                    value={officerNote}
                    onChange={(e) => setOfficerNote(e.target.value)}
                    placeholder="Officer note / instructions (optional)..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-token-default bg-bg-primary text-token-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    {nextStatuses.map((st) => {
                      const meta = REPORT_STATUS_META[st]
                      const isReject = st === REPORT_STATUS.REJECTED
                      return (
                        <Button
                          key={st}
                          variant={isReject ? "danger-ghost" : "primary"}
                          size="sm"
                          icon={transitioning ? <Loader2 size={13} className="animate-spin" /> : <span>{meta.icon}</span>}
                          onClick={() => handleStatusTransition(st)}
                          disabled={transitioning}
                        >
                          Mark as {meta.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-token-primary">Report Actions</h2>

                {actionError && (
                  <Alert variant="danger" className="text-xs">{actionError}</Alert>
                )}

                {isActive && !isMunicipality && (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    icon={withdrawing ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                    onClick={handleWithdraw}
                    loading={withdrawing}
                    disabled={withdrawing || deleting}
                  >
                    Withdraw report
                  </Button>
                )}

                <Button
                  variant="danger-ghost"
                  size="md"
                  className="w-full"
                  icon={deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  onClick={handleDelete}
                  loading={deleting}
                  disabled={withdrawing || deleting || transitioning}
                >
                  Delete report
                </Button>

                <p className="text-xs text-token-disabled">
                  {isActive
                    ? 'Withdrawing marks the report as rejected without erasing history. Deleting removes it permanently.'
                    : 'Delete removes this report permanently from the database.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {dialog}
    </PageLayout>
  )
}

