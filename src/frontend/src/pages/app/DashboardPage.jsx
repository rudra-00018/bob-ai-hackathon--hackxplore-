/**
 * DashboardPage — "What is happening with my waste reports and my local waste environment?"
 *
 * Layout (responsive 12-col grid):
 *   Row 1 — KPI strip (4 stat cards)
 *   Row 2 — [Weekly activity chart + category breakdown] | [Active reports]
 *   Row 3 — [Nearby bins]                                | [AI recommendations]
 *   Row 4 — Recent scans (compact list)
 *
 * Every section has loading, empty, and error states.
 * Charts use Recharts with aria labels and keyboard-accessible tooltips.
 * Data comes exclusively from dashboardService — no direct API calls here.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import {
  Flag, MapPin, Zap, Leaf, TrendingUp,
  RefreshCw, ChevronRight, AlertTriangle,
  CheckCircle, Clock, Lightbulb, Bot,
  ArrowUpRight, Flame, Award,
  Recycle, Trash2, Info,
} from 'lucide-react'

import { PageLayout, PageHeader } from '../../components/layout/AppLayout'
import { Card, CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Spinner'
import { ErrorState } from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'

import { loadDashboard } from '../../services/dashboardService'
import {
  REPORT_TYPE_META,
  REPORT_STATUS_META,
  REPORT_STATUS,
} from '../../services/reportService'
import { BIN_TYPE_META, BIN_STATUS_META, BIN_STATUS } from '../../services/binService'

// ── Design tokens for charts ──────────────────────────────────────────────────
const CHART_COLORS = {
  primary:    '#22C55E',
  secondary:  '#3B82F6',
  muted:      '#6B7280',
  plastic:    '#3B82F6',
  paper:      '#F59E0B',
  cardboard:  '#D97706',
  metal:      '#9CA3AF',
  glass:      '#10B981',
  ewaste:     '#F97316',
  hazardous:  '#8B5CF6',
  organic:    '#84CC16',
  trash:      '#EF4444',
  unknown:    '#6B7280',
}

const categoryColor = cat => CHART_COLORS[cat] || CHART_COLORS.unknown

// ── Fade-in animation wrapper ─────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      {children}
    </motion.div>
  )
}

// ── Section skeleton ──────────────────────────────────────────────────────────
function CardSkeleton({ rows = 3, height = 'h-4' }) {
  return (
    <div className="space-y-3 p-1" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          className={`${height} rounded-md ${i === 0 ? 'w-2/3' : i % 2 === 0 ? 'w-full' : 'w-5/6'}`}
        />
      ))}
    </div>
  )
}

// ── Section wrapper with header ───────────────────────────────────────────────
function Section({ title, subtitle, action, children, className = '' }) {
  return (
    <Card padded className={className}>
      {(title || action) && (
        <CardHeader title={title} description={subtitle} action={action} />
      )}
      {children}
    </Card>
  )
}

// ── KPI stat card ─────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, loading, href }) {
  const inner = (
    <div className="flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        aria-hidden="true"
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="space-y-1.5 mt-0.5">
            <Skeleton className="h-6 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold tabular-nums text-token-primary leading-none">{value}</p>
            <p className="text-xs text-token-tertiary mt-1">{label}</p>
            {sub && <p className="text-xs text-token-disabled mt-0.5">{sub}</p>}
          </>
        )}
      </div>
      {href && !loading && (
        <ArrowUpRight size={14} className="text-token-disabled shrink-0 mt-1" aria-hidden="true" />
      )}
    </div>
  )

  const cls = 'card p-4 transition-all duration-150 ' + (href ? 'hover:shadow-md hover:border-token-strong cursor-pointer' : '')

  return href ? (
    <Link to={href} className={cls} aria-label={`${label}: ${value}`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

// ── Weekly scans bar chart ────────────────────────────────────────────────────
function WeeklyChart({ data, loading, error }) {
  if (loading) return <div className="h-44"><CardSkeleton rows={4} height="h-8" /></div>
  if (error)   return <p className="text-xs text-token-tertiary py-8 text-center">{error}</p>

  const hasActivity = data.some(d => d.scans > 0)
  if (!hasActivity) {
    return (
      <div className="h-44 flex flex-col items-center justify-center gap-2 text-center">
        <Recycle size={24} className="text-token-disabled" />
        <p className="text-xs text-token-tertiary">No scans in the past 7 days</p>
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label="Bar chart showing daily scan counts for the past 7 days"
      className="h-44"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="30%">
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: 'var(--color-text-tertiary, #9CA3AF)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary, #9CA3AF)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background:   'var(--color-bg-secondary, #1F2937)',
              border:       '1px solid var(--color-border-default, #374151)',
              borderRadius: '8px',
              fontSize:     '12px',
              color:        'var(--color-text-primary, #F9FAFB)',
            }}
            cursor={{ fill: 'rgba(34,197,94,0.06)' }}
            formatter={(val, name) =>
              name === 'scans'
                ? [`${val} scan${val !== 1 ? 's' : ''}`, 'Scans']
                : [`${val} kg CO₂`, 'Carbon saved']
            }
          />
          <Bar dataKey="scans" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.scans > 0 ? CHART_COLORS.primary : '#374151'}
                opacity={entry.scans > 0 ? 1 : 0.35}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Category donut chart ──────────────────────────────────────────────────────
function CategoryChart({ data, loading, error }) {
  if (loading) return <CardSkeleton rows={3} height="h-3" />
  if (error || !data?.length) {
    return <p className="text-xs text-token-tertiary py-4 text-center">No category data yet</p>
  }

  const chartData = data.map(d => ({ name: d.category, value: d.count }))

  return (
    <div className="flex items-center gap-4">
      {/* Mini donut */}
      <div
        role="img"
        aria-label={`Donut chart: ${data.map(d => `${d.category} ${d.pct}%`).join(', ')}`}
        className="shrink-0"
      >
        <PieChart width={80} height={80}>
          <Pie
            data={chartData}
            cx={36}
            cy={36}
            innerRadius={22}
            outerRadius={36}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={categoryColor(entry.name)} />
            ))}
          </Pie>
        </PieChart>
      </div>

      {/* Legend */}
      <ul className="flex-1 space-y-1.5 min-w-0" aria-label="Category breakdown">
        {data.slice(0, 4).map(d => (
          <li key={d.category} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: categoryColor(d.category) }}
              aria-hidden="true"
            />
            <span className="text-xs text-token-secondary capitalize flex-1 truncate">{d.category}</span>
            <span className="text-xs font-medium text-token-tertiary tabular-nums">{d.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Active report row ─────────────────────────────────────────────────────────
function ReportRow({ report }) {
  const typeMeta   = REPORT_TYPE_META[report.reportType]   || { label: report.reportType, emoji: '📋' }
  const statusMeta = REPORT_STATUS_META[report.status]     || REPORT_STATUS_META[REPORT_STATUS.SUBMITTED]
  const isOld      = report.createdAt &&
    (Date.now() - new Date(report.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000

  return (
    <Link
      to="/app/report"
      className="flex items-center gap-3 py-2.5 border-b border-token-subtle last:border-0 hover:bg-bg-overlay -mx-2 px-2 rounded-lg transition-colors"
      aria-label={`${typeMeta.label} report, status: ${statusMeta.label}`}
    >
      <span className="text-lg shrink-0" aria-hidden="true">{typeMeta.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-token-primary truncate">{typeMeta.label}</p>
        <p className="text-xs text-token-tertiary truncate mt-0.5">
          {report.location?.address || 'Location unknown'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
          style={{ border: `1px solid ${statusMeta.color}30` }}
        >
          {statusMeta.label}
        </span>
        {isOld && report.status === REPORT_STATUS.SUBMITTED && (
          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
            <Clock size={9} />
            &gt;7 days
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Nearby bin card ───────────────────────────────────────────────────────────
function BinCard({ bin }) {
  const typeMeta   = BIN_TYPE_META[bin.type]     || { label: bin.type,   emoji: '🗑️', color: '#6B7280' }
  const statusMeta = BIN_STATUS_META[bin.status] || BIN_STATUS_META[BIN_STATUS.UNKNOWN]
  const isConcern  = bin.status === BIN_STATUS.FULL || bin.status === BIN_STATUS.NEARLY_FULL

  return (
    <Link
      to="/app/map"
      className="flex items-center gap-3 py-2.5 border-b border-token-subtle last:border-0 hover:bg-bg-overlay -mx-2 px-2 rounded-lg transition-colors group"
      aria-label={`${typeMeta.label} bin — ${statusMeta.label}`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
        style={{ background: `${typeMeta.color}18`, border: `1px solid ${typeMeta.color}30` }}
        aria-hidden="true"
      >
        {typeMeta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-token-primary">{typeMeta.label}</p>
        <p className="text-xs text-token-tertiary truncate mt-0.5">{bin.address || 'Nearby'}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
          style={{ border: `1px solid ${statusMeta.color}30` }}
        >
          {statusMeta.label}
        </span>
        {bin.fillLevel !== null && (
          <div className="w-16 h-1 rounded-full bg-bg-tertiary overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width:      `${bin.fillLevel}%`,
                background: isConcern
                  ? bin.status === BIN_STATUS.FULL ? '#EF4444' : '#F59E0B'
                  : '#22C55E',
              }}
            />
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Bin status summary strip ──────────────────────────────────────────────────
function BinStatusStrip({ summary }) {
  const items = [
    { label: 'Available',   count: summary.available,  color: '#22C55E' },
    { label: 'Nearly full', count: summary.nearlyFull, color: '#F59E0B' },
    { label: 'Full',        count: summary.full,       color: '#EF4444' },
  ]
  return (
    <div className="flex gap-3 mb-4" role="list" aria-label="Bin fill status summary">
      {items.map(item => (
        <div
          key={item.label}
          role="listitem"
          className="flex-1 flex flex-col items-center py-2 rounded-lg border"
          style={{ background: `${item.color}10`, borderColor: `${item.color}25` }}
        >
          <span className="text-lg font-bold tabular-nums" style={{ color: item.color }}>
            {item.count}
          </span>
          <span className="text-[10px] text-token-tertiary text-center leading-tight mt-0.5">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── AI recommendation card ────────────────────────────────────────────────────
const REC_STYLE = {
  insight:    { icon: TrendingUp,  color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-900/15',     border: 'border-blue-200 dark:border-blue-800' },
  habit:      { icon: Flame,       color: '#F97316', bg: 'bg-orange-50 dark:bg-orange-900/15', border: 'border-orange-200 dark:border-orange-800' },
  warning:    { icon: AlertTriangle,color:'#EF4444', bg: 'bg-red-50 dark:bg-red-900/15',        border: 'border-red-200 dark:border-red-800' },
  tip:        { icon: Lightbulb,   color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-900/15',   border: 'border-amber-200 dark:border-amber-800' },
  onboarding: { icon: Award,       color: '#22C55E', bg: 'bg-green-50 dark:bg-green-900/15',   border: 'border-green-200 dark:border-green-800' },
}

function RecommendationCard({ rec }) {
  const style = REC_STYLE[rec.type] || REC_STYLE.tip
  const Icon  = style.icon

  return (
    <div
      className={`rounded-xl p-3.5 border ${style.bg} ${style.border} space-y-2`}
      role="article"
      aria-label={rec.title}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={15} className="shrink-0 mt-0.5" style={{ color: style.color }} aria-hidden="true" />
        <p className="text-sm font-semibold text-token-primary leading-snug">{rec.title}</p>
      </div>
      <p className="text-xs text-token-secondary leading-relaxed pl-[22px]">{rec.body}</p>
      {rec.cta && (
        <div className="pl-[22px]">
          <Link
            to={rec.cta.href}
            className="text-xs font-semibold flex items-center gap-1 hover:underline"
            style={{ color: style.color }}
          >
            {rec.cta.label}
            <ChevronRight size={11} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Recent scan row ───────────────────────────────────────────────────────────
const CATEGORY_EMOJI = {
  plastic: '🧴', paper: '📄', cardboard: '📦', metal: '🥫',
  glass: '🍶', ewaste: '📱', hazardous: '☣️', organic: '🌱',
  trash: '🗑️', unknown: '❓',
}

function ScanRow({ item }) {
  const emoji = CATEGORY_EMOJI[item.prediction] || '❓'
  const conf  = item.confidence != null ? Math.round(item.confidence * 100) : null

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-token-subtle last:border-0">
      <span className="text-lg shrink-0" aria-hidden="true">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-token-primary capitalize">{item.prediction}</p>
        <p className="text-xs text-token-tertiary mt-0.5">
          {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {item.recyclable
          ? <Badge variant="success">Recyclable</Badge>
          : <Badge variant="neutral">General</Badge>
        }
        {conf !== null && (
          <span className="text-[10px] text-token-disabled tabular-nums">{conf}% conf.</span>
        )}
      </div>
    </div>
  )
}

// ── Streak badge ──────────────────────────────────────────────────────────────
function StreakBadge({ streak }) {
  if (!streak || streak < 2) return null
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400">
      <Flame size={12} aria-hidden="true" /> {streak} day streak
    </span>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [refreshed, setRefreshed] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loadDashboard()
      setData(result)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshed])

  const handleRefresh = () => setRefreshed(n => n + 1)

  // Derived values (safe even when data is null)
  const stats    = data?.stats?.data
  const reports  = data?.reports
  const bins     = data?.bins
  const chart    = data?.chart
  const scans    = data?.recentScans
  const recs     = data?.recommendations || []

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  if (error && !data) {
    return (
      <PageLayout>
        <ErrorState
          title="Dashboard unavailable"
          description={error}
          onRetry={handleRefresh}
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title={`${greeting}${user?.username ? `, ${user.username}` : ''}`}
        subtitle="Here's your waste management overview"
        action={
          <div className="flex items-center gap-3">
            {stats && <StreakBadge streak={stats.streak} />}
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh dashboard"
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <FadeIn delay={0}>
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          role="list"
          aria-label="Key metrics"
        >
          <div role="listitem">
            <KpiCard
              icon={Recycle}
              label="Total scans"
              value={loading ? '—' : (stats?.total ?? 0)}
              sub={stats?.recyclable_count != null ? `${stats.recyclable_count} recyclable` : undefined}
              color="#22C55E"
              loading={loading && !stats}
              href="/app/scanner"
            />
          </div>
          <div role="listitem">
            <KpiCard
              icon={Leaf}
              label="CO₂ saved"
              value={loading ? '—' : `${stats?.carbon_saved ?? 0} kg`}
              sub="through correct recycling"
              color="#16A34A"
              loading={loading && !stats}
            />
          </div>
          <div role="listitem">
            <KpiCard
              icon={Flag}
              label="Active reports"
              value={loading ? '—' : (reports?.active?.length ?? 0)}
              sub={reports?.total ? `${reports.total} total submitted` : undefined}
              color="#F59E0B"
              loading={loading && !reports}
              href="/app/report"
            />
          </div>
          <div role="listitem">
            <KpiCard
              icon={Zap}
              label="XP earned"
              value={loading ? '—' : (stats?.xp ?? 0)}
              sub={stats?.coins != null ? `${stats.coins} coins` : undefined}
              color="#8B5CF6"
              loading={loading && !stats}
              href="/app/profile"
            />
          </div>
        </div>
      </FadeIn>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column (2/3 width on lg) ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Activity chart */}
          <FadeIn delay={0.05}>
            <Section
              title="Weekly activity"
              subtitle="Scans in the past 7 days"
              action={
                <Link
                  to="/app/insights"
                  className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                  aria-label="View full insights"
                >
                  Full insights <ChevronRight size={12} aria-hidden="true" />
                </Link>
              }
            >
              <WeeklyChart
                data={chart?.weekly || []}
                loading={loading && !chart}
                error={scans?.error}
              />

              {/* Category breakdown below chart */}
              {(loading || chart?.breakdown?.length > 0) && (
                <>
                  <div className="border-t border-token-subtle mt-4 pt-4">
                    <p className="text-xs font-semibold text-token-secondary uppercase tracking-wide mb-3">
                      Top categories
                    </p>
                    <CategoryChart
                      data={chart?.breakdown}
                      loading={loading && !chart}
                      error={null}
                    />
                  </div>
                </>
              )}
            </Section>
          </FadeIn>

          {/* Active reports */}
          <FadeIn delay={0.1}>
            <Section
              title="My reports"
              subtitle={reports?.active?.length
                ? `${reports.active.length} active • ${reports?.total || 0} total`
                : 'Community waste issues you have flagged'}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Flag size={13} />}
                  onClick={() => navigate('/app/report')}
                >
                  New report
                </Button>
              }
            >
              {loading && !reports ? (
                <CardSkeleton rows={3} height="h-10" />
              ) : reports?.error ? (
                <p className="text-xs text-token-tertiary py-4 text-center flex items-center justify-center gap-1.5">
                  <AlertTriangle size={13} className="text-amber-500" />
                  {reports.error}
                </p>
              ) : !reports?.active?.length ? (
                <div className="py-8 text-center">
                  <Flag size={28} className="text-token-disabled mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-medium text-token-secondary">No active reports</p>
                  <p className="text-xs text-token-tertiary mt-1 max-w-xs mx-auto">
                    Spot an overflowing bin or illegal dumping? Report it to help your community.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/app/report')}
                  >
                    Submit a report
                  </Button>
                </div>
              ) : (
                <div role="list" aria-label="Active waste reports">
                  {reports.active.slice(0, 4).map(r => (
                    <div role="listitem" key={r.id}>
                      <ReportRow report={r} />
                    </div>
                  ))}
                  {reports.active.length > 4 && (
                    <Link
                      to="/app/report"
                      className="block text-center text-xs text-green-600 dark:text-green-400 hover:underline mt-3 font-medium"
                    >
                      View all {reports.active.length} reports →
                    </Link>
                  )}
                </div>
              )}
            </Section>
          </FadeIn>

          {/* Recent scans */}
          <FadeIn delay={0.15}>
            <Section
              title="Recent scans"
              subtitle="Last 5 items classified"
              action={
                <Link
                  to="/app/scanner"
                  className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                >
                  Open scanner <ChevronRight size={12} aria-hidden="true" />
                </Link>
              }
            >
              {loading && !scans ? (
                <CardSkeleton rows={4} height="h-10" />
              ) : scans?.error ? (
                <p className="text-xs text-token-tertiary py-4 text-center">{scans.error}</p>
              ) : !scans?.data?.length ? (
                <div className="py-8 text-center">
                  <Recycle size={26} className="text-token-disabled mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-medium text-token-secondary">No scans yet</p>
                  <p className="text-xs text-token-tertiary mt-1">
                    Scan your first item to start building your impact record.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/app/scanner')}
                  >
                    Start scanning
                  </Button>
                </div>
              ) : (
                <div role="list" aria-label="Recent scan history">
                  {scans.data.map((item, i) => (
                    <div role="listitem" key={`${item.timestamp}-${i}`}>
                      <ScanRow item={item} />
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </FadeIn>
        </div>

        {/* ── Right column (1/3 width on lg) ────────────────────────── */}
        <div className="space-y-5">

          {/* Nearby bins */}
          <FadeIn delay={0.08}>
            <Section
              title="Nearby bins"
              subtitle="Within ~800 m of your location"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<MapPin size={13} />}
                  onClick={() => navigate('/app/map')}
                  aria-label="Open map"
                >
                  Map
                </Button>
              }
            >
              {loading && !bins ? (
                <CardSkeleton rows={4} height="h-10" />
              ) : bins?.error ? (
                <div className="py-6 text-center">
                  <MapPin size={22} className="text-token-disabled mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xs text-token-tertiary max-w-[180px] mx-auto leading-relaxed">
                    {bins.error.includes('denied')
                      ? 'Allow location access to see nearby bins.'
                      : bins.error}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/app/map')}
                  >
                    Open map
                  </Button>
                </div>
              ) : bins?.summary ? (
                <>
                  <BinStatusStrip summary={bins.summary} />
                  <div role="list" aria-label="Nearest bins">
                    {bins.summary.closest.map(bin => (
                      <div role="listitem" key={bin.id}>
                        <BinCard bin={bin} />
                      </div>
                    ))}
                  </div>
                  {/* Mock data notice */}
                  <p className="text-[10px] text-token-disabled mt-3 flex items-center gap-1">
                    <Info size={10} aria-hidden="true" />
                    Bin fill data is simulated — real sensor data in Phase 2.
                  </p>
                </>
              ) : null}
            </Section>
          </FadeIn>

          {/* AI recommendations */}
          <FadeIn delay={0.12}>
            <Section
              title="Recommendations"
              subtitle="Based on your activity"
            >
              {loading && !data ? (
                <CardSkeleton rows={3} height="h-14" />
              ) : recs.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle size={22} className="text-green-500 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-xs text-token-secondary font-medium">All good!</p>
                  <p className="text-xs text-token-tertiary mt-1">
                    Keep scanning and reporting to unlock personalised tips.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recs.map(rec => (
                    <RecommendationCard key={rec.id} rec={rec} />
                  ))}
                  <p className="text-[10px] text-token-disabled flex items-center gap-1 pt-1">
                    <Info size={10} aria-hidden="true" />
                    Based on your scan history — not AI-generated.
                  </p>
                </div>
              )}
            </Section>
          </FadeIn>

          {/* Quick actions */}
          <FadeIn delay={0.16}>
            <Section title="Quick actions">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Scan item',    icon: Recycle,  href: '/app/scanner',   color: '#22C55E' },
                  { label: 'Report waste', icon: Flag,     href: '/app/report',    color: '#F59E0B' },
                  { label: 'Find bins',    icon: MapPin,   href: '/app/map',       color: '#3B82F6' },
                  { label: 'Ask EcoBot',   icon: Bot,      href: '/app/assistant', color: '#8B5CF6' },
                ].map(action => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.href}
                      to={action.href}
                      className="flex flex-col items-center gap-2 py-4 rounded-xl border border-token-default bg-bg-secondary hover:border-token-strong hover:bg-bg-overlay transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                      aria-label={action.label}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: `${action.color}18` }}
                        aria-hidden="true"
                      >
                        <Icon size={18} style={{ color: action.color }} />
                      </div>
                      <span className="text-xs font-medium text-token-secondary text-center leading-tight">
                        {action.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </Section>
          </FadeIn>
        </div>
      </div>
    </PageLayout>
  )
}
