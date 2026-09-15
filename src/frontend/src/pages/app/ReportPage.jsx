/**
 * ReportPage — AI-assisted waste reporting wizard + My Reports feed.
 *
 * Tab 1 — "New Report":  4-step wizard
 *   Step 1: Photo       → ImageUploader (upload or camera)
 *   Step 2: Location    → LocationPicker (GPS + map) + duplicate detection
 *   Step 3: AI Review   → AI analysis + report-type/description form
 *   Step 4: Confirm     → summary before submit
 *
 * Tab 2 — "My Reports": filterable list with status timeline progress,
 *   link to detail view, upvote, delete
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Camera, MapPin, Zap, CheckCircle, FileText,
  ChevronRight, ChevronLeft, Send, RefreshCw,
  Trash2, ThumbsUp, AlertTriangle, ClipboardList,
  PlusCircle, Clock, Loader2, Info, Filter,
  XCircle, ExternalLink,
} from 'lucide-react'

import { PageLayout, PageHeader } from '../../components/layout/AppLayout'
import { Card, CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { InputGroup, Textarea } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { useDialog } from '../../components/ui/ConfirmDialog'

import ImageUploader from '../../components/report/ImageUploader'
import LocationPicker from '../../components/report/LocationPicker'
import AIAnalysisResult, {
  AIAnalysisLoading,
  AIAnalysisError,
} from '../../components/report/AIAnalysisResult'

import {
  analyzeImage,
  submitReport,
  fetchMyReports,
  upvoteReport,
  deleteReport,
  checkDuplicate,
  validateImage,
  isActiveStatus,
  isTerminalStatus,
  REPORT_TYPE_META,
  REPORT_STATUS,
  REPORT_STATUS_META,
  STATUS_ORDER,
  URGENCY_META,
} from '../../services/reportService'

import { useAuth } from '../../context/AuthContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Photo',     icon: Camera },
  { id: 2, label: 'Location',  icon: MapPin },
  { id: 3, label: 'AI Review', icon: Zap },
  { id: 4, label: 'Confirm',   icon: CheckCircle },
]
const MAX_DESCRIPTION = 400

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center max-w-sm mx-auto" aria-label={`Step ${current} of ${STEPS.length}`}>
      {STEPS.map((step, i) => {
        const Icon   = step.icon
        const done   = i + 1 < current
        const active = i + 1 === current
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  done   ? 'bg-green-500 border-green-500 text-white' : '',
                  active ? 'bg-white dark:bg-bg-primary border-green-500 text-green-500 shadow-sm' : '',
                  !done && !active ? 'bg-bg-secondary border-token-default text-token-disabled' : '',
                ].join(' ')}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <CheckCircle size={14} /> : <Icon size={14} />}
              </div>
              <span className={[
                'text-[11px] mt-1 font-medium whitespace-nowrap hidden sm:block',
                active ? 'text-green-600 dark:text-green-400' : 'text-token-disabled',
              ].join(' ')}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={[
                'h-0.5 w-6 sm:w-10 mx-1 sm:mb-4 transition-colors duration-300',
                done ? 'bg-green-500' : 'bg-token-default',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Waste category selector ────────────────────────────────────────────────────
// Categories aligned with the model's 9-class output + common extras
const WASTE_CATEGORIES = [
  { key: 'plastic',         label: 'Plastic',       emoji: '🧴' },
  { key: 'paper',           label: 'Paper',         emoji: '📄' },
  { key: 'cardboard',       label: 'Cardboard',     emoji: '📦' },
  { key: 'glass',           label: 'Glass',         emoji: '🫙' },
  { key: 'metal',           label: 'Metal',         emoji: '🥫' },
  { key: 'food organics',   label: 'Organic',       emoji: '🍃' },
  { key: 'textile trash',   label: 'Textile',       emoji: '👕' },
  { key: 'vegetation',      label: 'Vegetation',    emoji: '🌿' },
  { key: 'miscellaneous trash', label: 'General',   emoji: '🗑️' },
  { key: 'hazardous',       label: 'Hazardous',     emoji: '☣️' },
  { key: 'ewaste',          label: 'E-Waste',       emoji: '📱' },
  { key: 'other',           label: 'Other',         emoji: '❓' },
]

function WasteCategoryGrid({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Waste category">
      {WASTE_CATEGORIES.map(cat => {
        const selected = value && value.toLowerCase() === cat.key.toLowerCase()
        return (
          <button
            key={cat.key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(cat.key)}
            className={[
              'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center transition-all duration-150',
              selected
                ? 'border-green-500 bg-[var(--brand-subtle)] shadow-sm'
                : 'border-token-default bg-bg-secondary hover:border-token-strong hover:bg-bg-overlay',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="text-lg" aria-hidden="true">{cat.emoji}</span>
            <span className={[
              'text-[10px] font-semibold leading-tight',
              selected ? 'text-green-700 dark:text-green-400' : 'text-token-secondary',
            ].join(' ')}>
              {cat.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Report type selector ───────────────────────────────────────────────────────
function ReportTypeGrid({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Report type">
      {Object.entries(REPORT_TYPE_META).map(([key, meta]) => {
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={[
              'flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all duration-150',
              selected
                ? 'border-green-500 bg-[var(--brand-subtle)] shadow-sm'
                : 'border-token-default bg-bg-secondary hover:border-token-strong hover:bg-bg-overlay',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            <span className="text-xl" aria-hidden="true">{meta.emoji}</span>
            <span className={[
              'text-xs font-semibold leading-tight',
              selected ? 'text-green-700 dark:text-green-400' : 'text-token-secondary',
            ].join(' ')}>
              {meta.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Confirmation summary row ───────────────────────────────────────────────────
function SummaryRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-token-subtle last:border-0">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${color || 'bg-bg-tertiary text-token-tertiary'}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-token-tertiary">{label}</p>
        <p className="text-sm font-medium text-token-primary mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

// ── Success screen ─────────────────────────────────────────────────────────────
function SuccessScreen({ reportId, xpEarned, onNewReport, onViewReports }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="text-center space-y-6 py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto shadow-lg"
      >
        <CheckCircle size={42} className="text-white" />
      </motion.div>
      <div>
        <h2 className="text-xl font-semibold text-token-primary">Report Submitted!</h2>
        <p className="text-sm text-token-tertiary mt-1 max-w-xs mx-auto">
          Your report has been received and will be reviewed by the municipal team.
        </p>
      </div>
      {xpEarned > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-subtle)] border border-[var(--brand-border)] text-green-700 dark:text-green-400 text-sm font-semibold"
        >
          <Zap size={15} />
          +{xpEarned} XP earned
        </motion.div>
      )}
      <p className="text-xs text-token-disabled font-mono">Report ID: {reportId}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="secondary" onClick={onViewReports} icon={<ClipboardList size={16} />}>
          View My Reports
        </Button>
        <Button variant="primary" onClick={onNewReport} icon={<PlusCircle size={16} />}>
          New Report
        </Button>
      </div>
    </motion.div>
  )
}

// ── Compact status progress bar ───────────────────────────────────────────────
function StatusProgress({ status }) {
  const isRejected = status === REPORT_STATUS.REJECTED
  const steps      = STATUS_ORDER  // submitted → under_review → accepted → in_progress → resolved
  const currentIdx = steps.indexOf(status)

  if (isRejected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
        <XCircle size={12} aria-hidden="true" />
        Rejected
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5" role="progressbar"
      aria-valuenow={currentIdx + 1} aria-valuemin={1} aria-valuemax={steps.length}
      aria-label={`Status: ${REPORT_STATUS_META[status]?.label}`}>
      {steps.map((s, i) => {
        const reached = i <= currentIdx
        const isCur   = i === currentIdx
        const meta    = REPORT_STATUS_META[s]
        return (
          <div
            key={s}
            className="h-1.5 flex-1 rounded-full transition-all"
            style={{
              background: reached
                ? isCur ? meta.color : '#22C55E'
                : 'var(--color-border-default, #374151)',
              opacity: reached ? 1 : 0.3,
            }}
            title={meta.label}
          />
        )
      })}
    </div>
  )
}

// ── My Reports — single card ───────────────────────────────────────────────────
function ReportCard({ report, onUpvote, onDelete, upvoting, deleting }) {
  const typeMeta   = REPORT_TYPE_META[report.reportType]  || { label: report.reportType, emoji: '📋', color: '#6B7280' }
  const statusMeta = REPORT_STATUS_META[report.status]    || REPORT_STATUS_META[REPORT_STATUS.SUBMITTED]
  const isActive   = isActiveStatus(report.status)
  const age        = Date.now() - new Date(report.createdAt).getTime()
  const isStale    = isActive && age > 7 * 24 * 60 * 60 * 1000

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="card p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-bg-tertiary shrink-0 border border-token-default">
          {report.imageUrl ? (
            <img src={report.imageUrl} alt="Report" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl" aria-hidden="true">
              {typeMeta.emoji}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-token-primary">
              {typeMeta.emoji} {typeMeta.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass} border`}
              style={{ borderColor: `${statusMeta.color}30` }}
            >
              {statusMeta.icon} {statusMeta.label}
            </span>
          </div>
          {report.location?.address && (
            <p className="text-xs text-token-tertiary mt-1 flex items-center gap-1 truncate">
              <MapPin size={11} className="shrink-0" aria-hidden="true" />
              {report.location.address}
            </p>
          )}
          <p className="text-xs text-token-disabled mt-0.5 flex items-center gap-1">
            <Clock size={11} className="shrink-0" aria-hidden="true" />
            {new Date(report.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            {isStale && (
              <span className="text-amber-500 ml-1 flex items-center gap-0.5">
                <AlertTriangle size={10} aria-hidden="true" />
                7+ days
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <StatusProgress status={report.status} />

      {/* AI badge */}
      {report.aiResult?.category && report.aiResult.category !== 'unknown' && (
        <div className="flex items-center gap-1.5 text-xs text-token-tertiary">
          <Zap size={11} className="text-green-500 shrink-0" aria-hidden="true" />
          AI: <span className="font-medium text-token-secondary capitalize">
            {report.aiResult.label || report.aiResult.category}
          </span>
          {report.aiResult.confidence && (
            <span className="text-token-disabled">
              ({Math.round(report.aiResult.confidence * 100)}%)
            </span>
          )}
        </div>
      )}

      {report.description && (
        <p className="text-xs text-token-secondary leading-relaxed line-clamp-2 border-l-2 border-token-default pl-2">
          {report.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onUpvote(report.id)}
          disabled={upvoting === report.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-token-default text-token-secondary hover:text-green-500 hover:border-green-400 transition-colors disabled:opacity-50"
          aria-label={`Upvote, count ${report.upvotes || 0}`}
        >
          {upvoting === report.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
          {report.upvotes || 0}
        </button>

        {/* Detail link */}
        <Link
          to={`/app/report/${report.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-token-default text-token-secondary hover:text-token-primary hover:bg-bg-overlay transition-colors"
          aria-label="View report details"
        >
          <ExternalLink size={12} aria-hidden="true" />
          View
        </Link>

        <span className="flex-1" />

        <button
          type="button"
          onClick={() => onDelete(report.id)}
          disabled={deleting === report.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-token-tertiary hover:text-red-500 hover:bg-[var(--danger-subtle)] transition-colors disabled:opacity-50"
          aria-label="Delete report"
        >
          {deleting === report.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Delete
        </button>
      </div>
    </motion.div>
  )
}

// ── My Reports panel ───────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'active', label: 'Active' },
  { key: REPORT_STATUS.SUBMITTED,    label: 'Submitted' },
  { key: REPORT_STATUS.UNDER_REVIEW, label: 'Under Review' },
  { key: REPORT_STATUS.ACCEPTED,     label: 'Accepted' },
  { key: REPORT_STATUS.IN_PROGRESS,  label: 'In Progress' },
  { key: REPORT_STATUS.RESOLVED,     label: 'Resolved' },
  { key: REPORT_STATUS.REJECTED,     label: 'Rejected' },
]

function MyReportsPanel({ refreshSignal }) {
  const [reports,    setReports]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [filter,     setFilter]     = useState('all')
  const [upvoting,   setUpvoting]   = useState(null)
  const [deleting,   setDeleting]   = useState(null)

  const { dialog, confirmAction } = useDialog()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyReports()
      setReports(data)
    } catch (err) {
      setError(err.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshSignal])

  const handleUpvote = useCallback(async (id) => {
    setUpvoting(id)
    try {
      await upvoteReport(id)
      setReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r))
    } finally { setUpvoting(null) }
  }, [])

  const handleDelete = useCallback(async (id) => {
    const confirmed = await confirmAction({
      variant: 'danger',
      title: 'Delete this report?',
      message: 'This will permanently remove the report. This cannot be undone.',
      confirmLabel: 'Delete',
    })
    if (!confirmed) return
    setDeleting(id)
    try {
      await deleteReport(id)
      setReports(prev => prev.filter(r => r.id !== id))
    } finally { setDeleting(null) }
  }, [confirmAction])

  const filtered = reports.filter(r => {
    if (filter === 'all')    return true
    if (filter === 'active') return isActiveStatus(r.status)
    return r.status === filter
  })

  // Count badges per filter
  const counts = {
    all:    reports.length,
    active: reports.filter(r => isActiveStatus(r.status)).length,
  }
  STATUS_FILTERS.slice(2).forEach(f => {
    counts[f.key] = reports.filter(r => r.status === f.key).length
  })

  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-16">
      <Spinner size="md" />
      <p className="text-sm text-token-tertiary">Loading your reports…</p>
    </div>
  )

  if (error) return (
    <Alert variant="danger" title="Could not load reports">
      {error}
      <button onClick={load} className="ml-2 underline text-xs">Retry</button>
    </Alert>
  )

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div
        className="flex gap-1.5 flex-wrap"
        role="group"
        aria-label="Filter reports by status"
      >
        {STATUS_FILTERS.filter(f => counts[f.key] > 0 || f.key === 'all' || f.key === 'active').map(f => {
          const count  = counts[f.key] || 0
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={[
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                active
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-bg-secondary border-token-default text-token-secondary hover:border-token-strong',
              ].join(' ')}
              aria-pressed={active}
            >
              {f.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold ${active ? 'opacity-80' : 'text-token-disabled'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <ClipboardList size={28} className="text-token-disabled mx-auto" aria-hidden="true" />
          <p className="text-sm font-medium text-token-secondary">
            {filter === 'all' ? 'No reports yet' : `No ${filter.replace('_', ' ')} reports`}
          </p>
          {filter === 'all' && (
            <p className="text-xs text-token-tertiary max-w-xs mx-auto">
              Submit your first waste report using the New Report tab.
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-token-tertiary">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''}
          </p>
          <AnimatePresence mode="popLayout">
            {filtered.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onUpvote={handleUpvote}
                onDelete={handleDelete}
                upvoting={upvoting}
                deleting={deleting}
              />
            ))}
          </AnimatePresence>
        </>
      )}
      {dialog}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReportPage() {
  const { refreshUser }                   = useAuth()
  const [activeTab,      setActiveTab]    = useState('new')
  const [reportsRefresh, setReportsRefresh] = useState(0)

  // Wizard state
  const [step,          setStep]          = useState(1)
  const [imageFile,     setImageFile]     = useState(null)
  const [imagePreview,  setImagePreview]  = useState(null)
  const [imageError,    setImageError]    = useState(null)
  const [location,      setLocation]      = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [duplicate,     setDuplicate]     = useState(null)
  const [aiStatus,      setAiStatus]      = useState('idle')
  const [aiResult,      setAiResult]      = useState(null)
  const [aiError,       setAiError]       = useState(null)
  const [reportType,    setReportType]    = useState(null)
  const [wasteCategory, setWasteCategory] = useState(null)   // user-confirmed waste category
  const [description,   setDescription]  = useState('')
  const [formError,     setFormError]     = useState(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState(null)
  const [submitted,     setSubmitted]     = useState(null)

  const analysisTriggered = useRef(false)

  const goNext = () => setStep(s => s + 1)
  const goBack = () => setStep(s => s - 1)

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const handleFile = useCallback((file, url, err) => {
    setImageError(err || null)
    setImageFile(file || null)
    setImagePreview(url || null)
    if (file) { setAiStatus('idle'); setAiResult(null); setAiError(null) }
  }, [])

  const handleClear = useCallback(() => {
    setImageFile(null); setImagePreview(null); setImageError(null)
    setAiStatus('idle'); setAiResult(null); setAiError(null)
  }, [])

  const validateStep1 = () => {
    if (!imageFile) { setImageError('Please select or capture a photo.'); return false }
    const { valid, error } = validateImage(imageFile)
    if (!valid) { setImageError(error); return false }
    return true
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const validateStep2 = () => {
    if (!location?.lat || !location?.lon) {
      setLocationError('Please set a location before continuing.')
      return false
    }
    setLocationError(null)
    return true
  }

  // Check for duplicate whenever location or reportType changes
  useEffect(() => {
    if (!location?.lat || !reportType) { setDuplicate(null); return }
    setDuplicate(checkDuplicate(reportType, location))
  }, [location, reportType])

  // ── Step 3: AI ────────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!imageFile || aiStatus === 'loading' || aiStatus === 'done') return
    setAiStatus('loading')
    setAiError(null)
    try {
      const result = await analyzeImage(imageFile)
      setAiResult(result)
      setAiStatus('done')
      // Auto-suggest report type from AI category
      if (!reportType) {
        if (result.category === 'hazardous' || result.category === 'Hazardous') setReportType('hazardous_waste')
        else if (result.category === 'ewaste' || result.category === 'E-Waste') setReportType('illegal_dumping')
        else setReportType('overflowing_bin')
      }
      // Auto-suggest waste category from AI result (user can still change)
      if (!wasteCategory && result.category && result.category !== 'unknown') {
        setWasteCategory(result.category.toLowerCase())
      }
      if (result.gamification) refreshUser().catch(() => {})
    } catch (err) {
      setAiStatus('error')
      const msg = err?.response?.status === 503
        ? 'AI model unavailable. You can still submit manually.'
        : err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')
          ? 'AI analysis timed out. You can still submit.'
          : err?.message || 'AI analysis failed. You can still submit.'
      setAiError(msg)
    }
  }, [imageFile, aiStatus, reportType, wasteCategory, refreshUser])

  useEffect(() => {
    if (step === 3 && !analysisTriggered.current) {
      analysisTriggered.current = true
      runAnalysis()
    }
    if (step < 3) analysisTriggered.current = false
  }, [step, runAnalysis])

  const validateStep3 = () => {
    if (!reportType) { setFormError('Please select a report type.'); return false }
    if (!wasteCategory) { setFormError('Please select a waste category.'); return false }
    setFormError(null); return true
  }

  // ── Step 4: submit ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await submitReport({
        reportType,
        wasteCategory,
        description: description.trim(),
        location,
        aiResult: aiResult ? {
          category:   aiResult.category,
          label:      aiResult.label,
          confidence: aiResult.confidence,
          urgency:    aiResult.urgency,
          source:     aiResult.source,
        } : null,
      }, imageFile)
      setSubmitted({ id: result.id, xpEarned: result.xpEarned || 0 })
      setStep('done')
      setReportsRefresh(n => n + 1)
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [reportType, wasteCategory, description, location, aiResult, imageFile])

  const resetWizard = useCallback(() => {
    setStep(1); setImageFile(null); setImagePreview(null); setImageError(null)
    setLocation(null); setLocationError(null); setDuplicate(null)
    setAiStatus('idle'); setAiResult(null); setAiError(null)
    setReportType(null); setWasteCategory(null); setDescription(''); setFormError(null)
    setSubmitError(null); setSubmitted(null)
    analysisTriggered.current = false
  }, [])

  const tabs = [
    { id: 'new',  label: 'New Report', icon: PlusCircle },
    { id: 'mine', label: 'My Reports', icon: ClipboardList },
  ]

  return (
    <PageLayout>
      <PageHeader
        title="Report Waste Issue"
        subtitle="Report overflowing bins, illegal dumping, or hazardous waste in your area"
      />

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl mb-6 border border-token-default w-fit">
        {tabs.map(tab => {
          const Icon   = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-bg-primary text-token-primary shadow-sm border border-token-default'
                  : 'text-token-tertiary hover:text-token-primary',
              ].join(' ')}
            >
              <Icon size={15} aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ── New Report wizard ── */}
        {activeTab === 'new' && (
          <motion.div key="new-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {step === 'done' && submitted ? (
              <Card padded>
                <SuccessScreen
                  reportId={submitted.id}
                  xpEarned={submitted.xpEarned}
                  onNewReport={resetWizard}
                  onViewReports={() => { resetWizard(); setActiveTab('mine') }}
                />
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <StepIndicator current={step} />
                </div>

                <AnimatePresence mode="wait">
                  {/* Step 1: Photo */}
                  {step === 1 && (
                    <motion.div key="s1"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <Card padded>
                        <CardHeader title="Step 1 — Add a Photo"
                          description="Take a photo or upload an image. Clear photos improve AI accuracy." />
                        <ImageUploader onFile={handleFile} onClear={handleClear}
                          error={imageError} disabled={false} />
                        {!imageFile && (
                          <div className="mt-4 flex items-start gap-2 text-xs text-token-tertiary">
                            <Info size={13} className="shrink-0 mt-0.5 text-blue-400" aria-hidden="true" />
                            For best results: clear lighting, item fills the frame. Max 10 MB (JPEG/PNG/WEBP).
                          </div>
                        )}
                        <div className="flex justify-end mt-5">
                          <Button variant="primary" onClick={() => { if (validateStep1()) goNext() }}
                            icon={<ChevronRight size={16} />} disabled={!!imageError}>
                            Next: Location
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Step 2: Location */}
                  {step === 2 && (
                    <motion.div key="s2"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <Card padded>
                        <CardHeader title="Step 2 — Confirm Location"
                          description="Drag the pin or tap the map to set the exact location." />
                        <LocationPicker value={location}
                          onChange={loc => { setLocation(loc); setLocationError(null) }}
                          error={locationError} disabled={false} />

                        {/* Duplicate warning */}
                        {duplicate && (
                          <Alert variant="warning" className="mt-4" title="Similar report exists">
                            A {REPORT_TYPE_META[duplicate.reportType]?.label || duplicate.reportType} report
                            was already submitted near this location within the past 24 hours
                            (status: {REPORT_STATUS_META[duplicate.status]?.label}).
                            Consider upvoting the existing report instead.
                            <Link
                              to={`/app/report/${duplicate.id}`}
                              className="ml-1 underline font-semibold"
                            >
                              View it →
                            </Link>
                          </Alert>
                        )}

                        <div className="flex justify-between mt-5">
                          <Button variant="ghost" onClick={goBack} icon={<ChevronLeft size={16} />}>Back</Button>
                          <Button variant="primary" onClick={() => { if (validateStep2()) goNext() }}
                            icon={<ChevronRight size={16} />}>
                            Next: AI Analysis
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Step 3: AI Review */}
                  {step === 3 && (
                    <motion.div key="s3"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <Card padded>
                        <CardHeader title="Step 3 — AI Analysis & Details"
                          description="AI is analysing your photo. Review the result, then describe the issue." />
                        {imagePreview && (
                          <div className="mb-4 rounded-xl overflow-hidden border border-token-default" style={{ maxHeight: 180 }}>
                            <img src={imagePreview} alt="Uploaded waste" className="w-full object-cover" style={{ maxHeight: 180 }} />
                          </div>
                        )}
                        <div className="mb-5">
                          {aiStatus === 'loading' && <AIAnalysisLoading />}
                          {aiStatus === 'error' && (
                            <AIAnalysisError error={aiError} onRetry={() => {
                              analysisTriggered.current = false
                              setAiStatus('idle'); setAiError(null); runAnalysis()
                            }} />
                          )}
                          {aiStatus === 'done' && aiResult && <AIAnalysisResult result={aiResult} editable={false} />}
                          {aiStatus === 'done' && aiResult?.source === 'mock' && (
                            <Alert variant="warning" className="mt-3">
                              Demo result — set <code className="font-mono text-xs">AI_SOURCE = 'backend'</code> in reportService.js for real AI.
                            </Alert>
                          )}
                        </div>

                        <InputGroup label="Report Type" required error={formError}>
                          <ReportTypeGrid value={reportType}
                            onChange={v => { setReportType(v); setFormError(null) }}
                            disabled={aiStatus === 'loading'} />
                        </InputGroup>

                        {/* ── Waste Category (required) ── */}
                        <div className="mt-4">
                          <InputGroup
                            label="Waste Category"
                            required
                            helper={aiResult && aiResult.confidence < 0.6
                              ? '⚠️ AI is uncertain — please select the correct category.'
                              : aiResult
                                ? `AI suggested: ${aiResult.label || aiResult.category} (${Math.round((aiResult.confidence || 0) * 100)}%) — confirm or change.`
                                : 'Select the type of waste in your photo.'
                            }
                          >
                            <WasteCategoryGrid
                              value={wasteCategory}
                              onChange={v => { setWasteCategory(v); setFormError(null) }}
                              disabled={aiStatus === 'loading'}
                            />
                          </InputGroup>
                        </div>

                        {/* Re-check duplicate when type is set */}
                        {duplicate && reportType === duplicate.reportType && (
                          <Alert variant="warning" className="mt-3" title="Duplicate warning">
                            You already have an open {REPORT_TYPE_META[duplicate.reportType]?.label} report nearby.
                          </Alert>
                        )}

                        <div className="mt-4">
                          <InputGroup label="Description"
                            helper="Optional — add any details to help the team respond.">
                            <Textarea value={description}
                              onChange={e => setDescription(e.target.value)}
                              placeholder="e.g. The bin on the corner has been overflowing since yesterday…"
                              rows={3} maxLength={MAX_DESCRIPTION} />
                          </InputGroup>
                        </div>

                        <div className="flex justify-between mt-5">
                          <Button variant="ghost" onClick={goBack} icon={<ChevronLeft size={16} />}>Back</Button>
                          <Button variant="primary"
                            onClick={() => { if (validateStep3()) goNext() }}
                            disabled={aiStatus === 'loading'}
                            icon={<ChevronRight size={16} />}>
                            Review & Submit
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Step 4: Confirm */}
                  {step === 4 && (
                    <motion.div key="s4"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <Card padded>
                        <CardHeader title="Step 4 — Review & Submit"
                          description="Confirm the details below before submitting your report." />
                        <div className="flex gap-4 mb-5">
                          {imagePreview && (
                            <div className="w-20 h-20 rounded-xl overflow-hidden border border-token-default shrink-0">
                              <img src={imagePreview} alt="Report" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <SummaryRow icon={FileText} label="Report Type"
                              value={REPORT_TYPE_META[reportType]
                                ? `${REPORT_TYPE_META[reportType].emoji} ${REPORT_TYPE_META[reportType].label}`
                                : reportType} />
                            {wasteCategory && (
                              <SummaryRow icon={Zap} label="Waste Category"
                                value={wasteCategory.charAt(0).toUpperCase() + wasteCategory.slice(1)}
                                color="bg-green-500/10 text-green-600" />
                            )}
                            <SummaryRow icon={MapPin} label="Location"
                              value={location?.address || `${location?.lat?.toFixed(5)}, ${location?.lon?.toFixed(5)}`} />
                            {aiResult && (
                              <SummaryRow icon={Zap} label="AI Category"
                                value={`${aiResult.label}${aiResult.confidence ? ` (${Math.round(aiResult.confidence * 100)}%)` : ''}`}
                                color="bg-green-500/10 text-green-500" />
                            )}
                            {description.trim() && (
                              <SummaryRow icon={Info} label="Description" value={description.trim()} />
                            )}
                          </div>
                        </div>

                        {aiResult?.urgency && (() => {
                          const meta = URGENCY_META[aiResult.urgency]
                          return (
                            <div className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium border"
                              style={{ background: `${meta.color}12`, borderColor: `${meta.color}30`, color: meta.color }}>
                              {meta.icon} {meta.label} urgency — {meta.description}
                            </div>
                          )
                        })()}

                        {duplicate && (
                          <Alert variant="warning" className="mb-4" title="Possible duplicate">
                            A similar report exists near this location.{' '}
                            <Link to={`/app/report/${duplicate.id}`} className="underline font-semibold">
                              View existing report →
                            </Link>
                          </Alert>
                        )}

                        {submitError && (
                          <Alert variant="danger" className="mb-4" title="Submission failed">
                            {submitError}
                          </Alert>
                        )}

                        <p className="text-xs text-token-disabled mb-5 leading-relaxed">
                          By submitting you confirm this information is accurate.
                          {aiResult?.source === 'mock'
                            ? ' AI classification is from a demo model.'
                            : aiResult?.source === 'backend'
                              ? ' AI classification is a model estimate and has not been independently verified.'
                              : null}
                        </p>

                        <div className="flex justify-between">
                          <Button variant="ghost" onClick={goBack} disabled={submitting}
                            icon={<ChevronLeft size={16} />}>Back</Button>
                          <Button variant="primary" onClick={handleSubmit} loading={submitting}
                            icon={!submitting ? <Send size={16} /> : undefined}>
                            {submitting ? 'Submitting…' : 'Submit Report'}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* ── My Reports tab ── */}
        {activeTab === 'mine' && (
          <motion.div key="mine-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MyReportsPanel refreshSignal={reportsRefresh} />
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  )
}
