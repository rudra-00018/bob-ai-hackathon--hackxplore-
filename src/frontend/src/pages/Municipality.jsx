import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ExternalLink, CheckCircle, Clock, MapPin, Loader2, AlertCircle, Truck, Navigation, FileDown, Eye, Image as ImageIcon } from 'lucide-react'
import { municipalityApi } from '../services/api'
import { getBins } from '../services/binService'
import { PageLayout, PageHeader } from '../components/layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { SkeletonCard } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { useDialog } from '../components/ui/ConfirmDialog'
import MunicipalRouteOptimizer from '../components/municipality/MunicipalRouteOptimizer'
import MunicipalReportExportModal from '../components/municipality/MunicipalReportExportModal'
import {
  REPORT_STATUS,
  REPORT_STATUS_META,
  REPORT_TYPE_META,
  transitionStatus,
} from '../services/reportService'

const COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#6B7280', '#D97706', '#EF4444']

// Chart tooltip uses CSS vars so it works in both themes
const tooltipStyle = {
  background:   'var(--surface-raised)',
  border:       '1px solid var(--border-default)',
  borderRadius: '8px',
  color:        'var(--text-primary)',
  fontSize:     '13px',
}

// ── Report Preview Modal ───────────────────────────────────────────────────────
function ReportPreviewModal({ report, onClose, onUpdateStatus, updatingReport }) {
  const typeMeta   = REPORT_TYPE_META[report.reportType] || { label: report.reportType, emoji: '📋', color: '#6B7280' }
  const statusMeta = REPORT_STATUS_META[report.status]   || REPORT_STATUS_META[REPORT_STATUS.SUBMITTED]
  const isUpdating = updatingReport === report.id

  const nextOptions = (
    report.status === REPORT_STATUS.SUBMITTED    ? [REPORT_STATUS.UNDER_REVIEW, REPORT_STATUS.REJECTED] :
    report.status === REPORT_STATUS.UNDER_REVIEW ? [REPORT_STATUS.ACCEPTED, REPORT_STATUS.REJECTED] :
    report.status === REPORT_STATUS.ACCEPTED     ? [REPORT_STATUS.IN_PROGRESS, REPORT_STATUS.REJECTED] :
    report.status === REPORT_STATUS.IN_PROGRESS  ? [REPORT_STATUS.RESOLVED, REPORT_STATUS.REJECTED] :
    []
  )

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Report details">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl bg-bg-primary border border-token-default rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-token-default shrink-0">
          <div>
            <h2 className="text-base font-semibold text-token-primary">
              {typeMeta.emoji} {typeMeta.label}
            </h2>
            <p className="text-xs text-token-disabled font-mono mt-0.5">ID: {report.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-token-tertiary hover:text-token-primary hover:bg-bg-secondary transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Image */}
          {report.imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-token-default" style={{ maxHeight: 300 }}>
              <img
                src={report.imageUrl}
                alt="Report photo"
                className="w-full object-cover"
                style={{ maxHeight: 300 }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-token-default bg-bg-secondary flex items-center justify-center gap-2 py-8 text-token-tertiary">
              <ImageIcon size={20} />
              <span className="text-sm">No photo attached</span>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide">Citizen</p>
              <p className="text-token-primary font-medium">{report.username || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide">Status</p>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusMeta.bgClass} ${statusMeta.textClass}`}
                style={{ borderColor: `${statusMeta.color}30` }}>
                {statusMeta.icon} {statusMeta.label}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide">Waste Category</p>
              <p className="text-token-primary capitalize">{report.wasteCategory || report.aiResult?.label || report.aiResult?.category || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide">Submitted</p>
              <p className="text-token-primary">{new Date(report.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
            </div>
            {report.location && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide">Location</p>
                <p className="text-token-primary flex items-center gap-1.5">
                  <MapPin size={13} className="text-token-tertiary shrink-0" />
                  {report.location.address || `${report.location.lat?.toFixed(5)}, ${report.location.lon?.toFixed(5)}`}
                </p>
              </div>
            )}
            {report.description && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide">Description</p>
                <p className="text-token-secondary leading-relaxed">{report.description}</p>
              </div>
            )}
            {report.adminNote && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide">Officer Note</p>
                <p className="text-token-secondary leading-relaxed border-l-2 border-blue-400 pl-2">{report.adminNote}</p>
              </div>
            )}
          </div>

          {/* AI Analysis */}
          {report.aiResult && (
            <div className="rounded-xl border border-token-default bg-bg-secondary p-4">
              <p className="text-xs font-semibold text-token-tertiary uppercase tracking-wide mb-2">⚡ AI Analysis</p>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-token-primary capitalize flex-1">
                  {report.aiResult.label || report.aiResult.category}
                </p>
                {report.aiResult.confidence != null && (
                  <span className="text-xs font-medium tabular-nums"
                    style={{ color: report.aiResult.confidence >= 0.75 ? '#22C55E' : report.aiResult.confidence >= 0.5 ? '#F59E0B' : '#EF4444' }}>
                    {Math.round(report.aiResult.confidence * 100)}% confidence
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {nextOptions.length > 0 && (
          <div className="shrink-0 px-5 py-4 border-t border-token-default bg-bg-secondary flex flex-wrap items-center gap-2">
            <p className="text-xs text-token-tertiary flex-1">Update status — citizen will be notified:</p>
            {nextOptions.map(opt => {
              const optMeta = REPORT_STATUS_META[opt]
              const isReject = opt === REPORT_STATUS.REJECTED
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onUpdateStatus(report.id, opt)}
                  disabled={isUpdating}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5',
                    isReject
                      ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400'
                      : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400',
                    isUpdating ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {isUpdating ? <Loader2 size={12} className="animate-spin" /> : optMeta.icon}
                  {optMeta.label}
                </button>
              )
            })}
            <Link
              to={`/app/report/${report.id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-token-default text-token-secondary hover:text-token-primary hover:bg-bg-tertiary transition-colors flex items-center gap-1"
            >
              <ExternalLink size={12} /> Full view
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Municipality() {
  const [data,          setData]          = useState(null)
  const [users,         setUsers]         = useState([])
  const [reports,       setReports]       = useState([])
  const [bins,          setBins]          = useState([])
  const [reportFilter,  setReportFilter]  = useState('all')
  const [tab,           setTab]           = useState('overview')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [updatingReport, setUpdatingReport] = useState(null)
  const [statusError,   setStatusError]   = useState(null)
  const [isExportOpen,  setIsExportOpen]  = useState(false)
  const [previewReport, setPreviewReport] = useState(null)

  const { dialog, promptAction, alertAction } = useDialog()

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      municipalityApi.dashboard().catch(() => null),
      municipalityApi.users().catch(() => ({ users: [] })),
      municipalityApi.reports().catch(() => ({ reports: [] })),
      getBins(28.6139, 77.2090, 20000).catch(() => []),
    ])
      .then(([d, u, r, b]) => {
        setData(d || {})
        setUsers(u?.users || (Array.isArray(u) ? u : []))
        setReports(r?.reports || (Array.isArray(r) ? r : []))
        setBins(b || [])
      })
      .catch(e => setError(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpdateStatus = async (reportId, nextStatus) => {
    const statusMeta = REPORT_STATUS_META[nextStatus]
    const isReject   = nextStatus === REPORT_STATUS.REJECTED

    // For rejection/changes, require a note; for forward transitions, optional
    const note = await promptAction({
      variant:      isReject ? 'danger' : 'info',
      title:        `Mark as ${statusMeta?.label || nextStatus}`,
      message:      isReject
        ? 'Please provide a reason for rejection. The citizen will be notified.'
        : 'Add an officer note (optional). The citizen will be notified of this status change.',
      placeholder:  isReject
        ? 'e.g. Duplicate report, area already serviced...'
        : `e.g. Report accepted, team dispatched...`,
      confirmLabel: `Confirm: ${statusMeta?.label}`,
      required:     isReject,
    })

    if (note === null) return  // user cancelled

    setUpdatingReport(reportId)
    setStatusError(null)
    try {
      const updated = await transitionStatus(reportId, nextStatus, note || `Status updated to ${nextStatus}`)
      setReports(prev => prev.map(r => r.id === reportId ? updated : r))
      // If the preview modal is open for this report, update it too
      if (previewReport?.id === reportId) setPreviewReport(updated)
    } catch (err) {
      await alertAction({
        variant: 'danger',
        title:   'Status update failed',
        message: err.message || 'Failed to update report status. Please try again.',
      })
    } finally {
      setUpdatingReport(null)
    }
  }

  const byCategory = (data?.by_category || []).map(c => ({
    name: c._id, count: c.count, carbon: parseFloat((c.carbon_saved || 0).toFixed(2)),
  }))

  const pendingReportsCount = reports.filter(r => r.status === REPORT_STATUS.SUBMITTED || r.status === REPORT_STATUS.UNDER_REVIEW).length
  const criticalBinsCount = bins.filter(b => b.status === 'full' || (b.fillLevel !== null && b.fillLevel >= 85) || b.status === 'nearly_full').length
  const activeReportsCount = reports.filter(r => r.status === 'submitted' || r.status === 'under_review' || r.status === 'accepted' || r.status === 'in_progress').length

  const kpis = [
    { label: 'Total Classified', value: data?.total_classified ?? 0, icon: '📊' },
    { label: 'Recycling Rate',   value: `${data?.recycling_rate ?? 0}%`, icon: '♻️' },
    { label: 'Active Reports',   value: pendingReportsCount, icon: '📋' },
    { label: 'Critical Bins',    value: criticalBinsCount, icon: '🚨' },
  ]

  const filteredReports = reports.filter(r => {
    if (reportFilter === 'all') return true
    if (reportFilter === 'active') return r.status !== REPORT_STATUS.RESOLVED && r.status !== REPORT_STATUS.REJECTED
    return r.status === reportFilter
  })

  if (loading) {
    return (
      <PageLayout>
        <PageHeader title="Municipality Dashboard" subtitle="City-wide waste classification and report management" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <PageHeader title="Municipality Dashboard" />
        <ErrorState description={error} onRetry={load} />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        title="Municipality Dashboard"
        subtitle="City-wide waste classification, dynamic fleet routing, and citizen reports management"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsExportOpen(true)}
              icon={<FileDown size={15} />}
            >
              Export Report
            </Button>
            <Button
              variant={tab === 'route' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTab('route')}
              icon={<Truck size={15} />}
            >
              Route Optimizer
            </Button>
          </div>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'route',    label: `🚚 Route Optimizer (${criticalBinsCount + activeReportsCount})` },
          { key: 'reports',  label: `📋 Citizen Reports (${reports.length})` },
          { key: 'users',    label: `👥 All Users (${users.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2 rounded-md text-sm font-semibold transition-all',
              tab === t.key
                ? 'bg-blue-500 text-white shadow-sm'
                : 'card text-token-secondary hover:text-token-primary',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Route Optimizer Callout Banner */}
          {(criticalBinsCount > 0 || activeReportsCount > 0) && (
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-token-primary">
                    {criticalBinsCount} Full Bins & {activeReportsCount} Action Reports Ready for Collection
                  </h3>
                  <p className="text-xs text-token-tertiary mt-0.5">
                    Generate an optimized TSP collection route starting from Central Depot to cut diesel consumption.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setTab('route')}
                  icon={<Navigation size={14} />}
                >
                  Launch Route Optimizer
                </Button>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpis.map(k => (
              <StatCard key={k.label} label={k.label} value={k.value}
                icon={<span className="text-xl">{k.icon}</span>} />
            ))}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <h2 className="text-base font-semibold text-token-primary mb-4">Waste by Category</h2>
              {byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byCategory}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-sm text-token-tertiary">No data yet</p>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-token-primary mb-4">Distribution</h2>
              {byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="count" nameKey="name"
                      cx="50%" cy="50%" innerRadius={60} outerRadius={90}>
                      {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-sm text-token-tertiary">No data yet</p>
              )}
            </Card>
          </div>

          {/* Top recyclers */}
          {data?.top_users?.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-token-primary mb-4">🏆 Top Recyclers</h2>
              <div className="space-y-2">
                {data.top_users.map((u, i) => (
                  <div key={i}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg bg-bg-secondary">
                    <span className="text-xl">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                    <span className="font-semibold flex-1 text-sm text-token-primary">{u.username}</span>
                    <span className="text-sm text-token-tertiary">{u.scans} scans</span>
                    <span className="text-sm font-medium text-green-500">{u.carbon} kg CO₂</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'route' && (
        <MunicipalRouteOptimizer
          bins={bins}
          reports={reports}
        />
      )}


      {tab === 'reports' && (
        <Card padded={false} className="overflow-hidden">
          <div className="px-6 py-4 border-b border-token-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-token-primary">
                Citizen Waste Reports ({reports.length})
              </h2>
              <p className="text-xs text-token-tertiary mt-0.5">Review, action, and update status of local waste reports</p>
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: REPORT_STATUS.SUBMITTED, label: 'Submitted' },
                { key: REPORT_STATUS.UNDER_REVIEW, label: 'Under Review' },
                { key: REPORT_STATUS.ACCEPTED, label: 'Accepted' },
                { key: REPORT_STATUS.IN_PROGRESS, label: 'In Progress' },
                { key: REPORT_STATUS.RESOLVED, label: 'Resolved' },
                { key: REPORT_STATUS.REJECTED, label: 'Rejected' },
              ].map(f => {
                const active = reportFilter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setReportFilter(f.key)}
                    className={[
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-bg-secondary border-token-default text-token-secondary hover:border-token-strong',
                    ].join(' ')}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <p className="text-center py-12 text-sm text-token-tertiary">No reports found for this filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-token-default bg-bg-secondary">
                    {['Photo', 'Type', 'Citizen', 'Location', 'AI Category', 'Status', 'Submitted', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-token-tertiary whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((r) => {
                    const typeMeta = REPORT_TYPE_META[r.reportType] || { label: r.reportType, emoji: '📋' }
                    const statusMeta = REPORT_STATUS_META[r.status] || REPORT_STATUS_META[REPORT_STATUS.SUBMITTED]
                    const isUpdating = updatingReport === r.id

                    // Next transitions
                    const nextOptions = (
                      r.status === REPORT_STATUS.SUBMITTED    ? [REPORT_STATUS.UNDER_REVIEW, REPORT_STATUS.REJECTED] :
                      r.status === REPORT_STATUS.UNDER_REVIEW ? [REPORT_STATUS.ACCEPTED, REPORT_STATUS.REJECTED] :
                      r.status === REPORT_STATUS.ACCEPTED     ? [REPORT_STATUS.IN_PROGRESS, REPORT_STATUS.REJECTED] :
                      r.status === REPORT_STATUS.IN_PROGRESS  ? [REPORT_STATUS.RESOLVED, REPORT_STATUS.REJECTED] :
                      []
                    )

                    return (
                      <tr key={r.id} className="border-b border-token-subtle hover:bg-bg-overlay transition-colors">
                        {/* Photo thumbnail */}
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-token-default bg-bg-secondary shrink-0">
                            {r.imageUrl ? (
                              <img
                                src={r.imageUrl}
                                alt={`Report ${r.id}`}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setPreviewReport(r)}
                                title="Click to preview"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-token-disabled">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{typeMeta.emoji}</span>
                            <span className="font-semibold text-token-primary">{typeMeta.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-token-secondary whitespace-nowrap">
                          <span className="font-medium text-token-primary">{r.username || 'Citizen'}</span>
                        </td>
                        <td className="px-4 py-3 text-token-secondary max-w-xs truncate">
                          {r.location?.address || (r.location?.lat ? `${r.location.lat.toFixed(4)}, ${r.location.lon.toFixed(4)}` : '—')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(r.wasteCategory || r.aiResult) ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary font-medium capitalize">
                              {r.wasteCategory || r.aiResult?.label || r.aiResult?.category}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass} border inline-flex items-center gap-1`}
                            style={{ borderColor: `${statusMeta.color}30` }}
                          >
                            <span>{statusMeta.icon}</span> {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-token-tertiary whitespace-nowrap text-xs">
                          {new Date(r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {/* View detail */}
                            <button
                              type="button"
                              onClick={() => setPreviewReport(r)}
                              className="px-2 py-1 rounded text-xs text-token-secondary hover:text-token-primary hover:bg-bg-tertiary transition-colors inline-flex items-center gap-1 border border-token-default"
                              title="View report details"
                            >
                              <Eye size={12} /> View
                            </button>
                            {nextOptions.map(opt => {
                              const optMeta = REPORT_STATUS_META[opt]
                              const isReject = opt === REPORT_STATUS.REJECTED
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => handleUpdateStatus(r.id, opt)}
                                  disabled={isUpdating}
                                  className={[
                                    'px-2 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1',
                                    isReject
                                      ? 'border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                                      : 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20',
                                    isUpdating ? 'opacity-50 cursor-not-allowed' : '',
                                  ].join(' ')}
                                  title={`Advance to ${optMeta.label}`}
                                >
                                  {isUpdating ? <Loader2 size={10} className="animate-spin" /> : optMeta.icon}
                                  {optMeta.label}
                                </button>
                              )
                            })}
                            <Link
                              to={`/app/report/${r.id}`}
                              className="px-2 py-1 rounded text-xs text-token-secondary hover:text-token-primary hover:bg-bg-tertiary transition-colors inline-flex items-center gap-1"
                              title="View full report"
                            >
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'users' && (
        <Card padded={false} className="overflow-hidden">
          <div className="px-6 py-4 border-b border-token-default">
            <h2 className="text-base font-semibold text-token-primary">
              All Citizens ({users.length})
            </h2>
            <p className="text-xs text-token-tertiary mt-0.5">Complete user activity and recycling stats</p>
          </div>

          {users.length === 0 ? (
            <p className="text-center py-12 text-sm text-token-tertiary">No citizen users registered yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-token-default bg-bg-secondary">
                    {['#','Username','Email','Scans','Recycled','CO₂','XP','Streak','Joined'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-token-tertiary whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className="border-b border-token-subtle hover:bg-bg-overlay transition-colors">
                      <td className="px-4 py-3 text-token-tertiary">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-token-primary">{u.username}</td>
                      <td className="px-4 py-3 text-token-tertiary">{u.email}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-500">{u.total_scans || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success-subtle)] text-green-700 dark:text-green-400">
                          {u.recyclable_scans || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-green-500">{u.carbon_saved || 0} kg</td>
                      <td className="px-4 py-3 text-center text-blue-400">⚡ {u.xp || 0}</td>
                      <td className="px-4 py-3 text-center text-orange-400">
                        {(u.streak || 0) > 0 ? `🔥 ${u.streak}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-token-tertiary whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ESG / Operations Export Report Modal */}
      <MunicipalReportExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        municipalityData={data}
        reports={reports}
        bins={bins}
        users={users}
      />

      {/* Report Preview Modal */}
      {previewReport && (
        <ReportPreviewModal
          report={previewReport}
          onClose={() => setPreviewReport(null)}
          onUpdateStatus={handleUpdateStatus}
          updatingReport={updatingReport}
        />
      )}

      {/* Confirmation / prompt dialogs */}
      {dialog}
    </PageLayout>
  )
}
