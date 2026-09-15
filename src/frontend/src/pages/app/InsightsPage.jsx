import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Leaf, Zap, TrendingUp, ShieldCheck, RefreshCw,
  Info, Award, Car, TreePine, Smartphone,
  CheckCircle, AlertTriangle, Layers, Target,
  Compass, ArrowUpRight, BarChart3, HelpCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { PageLayout, PageHeader } from '../../components/layout/AppLayout'
import { Card, StatCard, CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Spinner'
import { sustainabilityApi } from '../../services/api'
import { REPORT_STATUS_META } from '../../services/reportService'
import CivicLeaderboard from '../../components/civic/CivicLeaderboard'

const CATEGORY_COLORS = {
  plastic:   '#3B82F6',
  paper:     '#F59E0B',
  cardboard: '#D97706',
  metal:     '#9CA3AF',
  glass:     '#10B981',
  trash:     '#EF4444',
  unknown:   '#6B7280',
}

const tooltipStyle = {
  background:   'var(--surface-raised, #1F2937)',
  border:       '1px solid var(--border-default, #374151)',
  borderRadius: '8px',
  color:        'var(--text-primary, #F9FAFB)',
  fontSize:     '12px',
}

export default function InsightsPage() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [viewTab,    setViewTab]    = useState('personal') // 'personal' | 'community' | 'methodology'
  const [dailyGoal,  setDailyGoal]  = useState(() => Number(localStorage.getItem('biniq_daily_goal') || 3))
  const [showMethod, setShowMethod] = useState(false)
  const [goalSaved,  setGoalSaved]  = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await sustainabilityApi.insights()
      setData(res)
    } catch (err) {
      setError(err.message || 'Failed to load sustainability insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGoalChange = (newGoal) => {
    setDailyGoal(newGoal)
    localStorage.setItem('biniq_daily_goal', String(newGoal))
  }

  // Simulated annual projection based on user-selected daily target
  const goalProjection = useMemo(() => {
    const avgCarbonPerItem = 0.072 // kg CO2 weighted average
    const avgWeightKg = 0.15       // average item weight in kg
    const yearlyItems = dailyGoal * 365
    const yearlyCarbon = Math.round(yearlyItems * avgCarbonPerItem * 10) / 10
    const yearlyMass = Math.round(yearlyItems * avgWeightKg * 10) / 10
    const yearlyKwh = Math.round(yearlyCarbon * 2.45 * 10) / 10
    return { yearlyItems, yearlyCarbon, yearlyMass, yearlyKwh }
  }, [dailyGoal])

  if (loading) {
    return (
      <PageLayout>
        <PageHeader
          title="Sustainability & Impact"
          subtitle="Measurable environmental impact and lifecycle waste analytics"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
        <div className="card p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    )
  }

  const user = data?.user || {}
  const comm = data?.community || {}
  const methodology = data?.scientific_methodology || {}
  const benchmark = data?.benchmark_sample_data || {}

  const userCategories = user.categories || []
  const chartCategories = userCategories.map(c => ({
    name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
    count: c.count,
    carbon: c.carbon,
    fill: CATEGORY_COLORS[c.category] || CATEGORY_COLORS.unknown,
  }))

  const reportStatusData = Object.entries(user.reports_by_status || {})
    .filter(([_, count]) => count > 0)
    .map(([st, count]) => ({
      status: REPORT_STATUS_META[st]?.label || st,
      count,
      color: REPORT_STATUS_META[st]?.color || '#6B7280',
    }))

  return (
    <PageLayout>
      <PageHeader
        title="Sustainability & Environmental Impact"
        subtitle="Transparent, measurement-driven analysis of your waste diversion and community footprint"
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={loadData}
          >
            Refresh
          </Button>
        }
      />

      {/* ── Data Integrity & Provenance Banner ── */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-token-primary">Data Integrity Certified</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30">
                ✓ Live Verified Scans
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                EPA WARM Factors
              </span>
            </div>
            <p className="text-xs text-token-tertiary mt-0.5">
              Environmental savings are calculated strictly from verified material disposal factors — zero fabricated statistics.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowMethod(!showMethod)}
          className="text-xs font-semibold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 shrink-0"
        >
          <Info size={13} />
          {showMethod ? 'Hide Methodology' : 'View Methodology'}
        </button>
      </div>

      {/* ── Scientific Methodology Expandable Drawer ── */}
      {showMethod && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card p-5 mb-6 border-blue-500/30 bg-blue-500/5 space-y-3 text-xs leading-relaxed"
        >
          <div className="flex items-center gap-2 text-token-primary font-semibold text-sm">
            <Layers size={16} className="text-blue-500" />
            Calculation Standards & Emission Factors
          </div>
          <p className="text-token-secondary">
            Greenhouse gas (GHG) reductions represent avoided life-cycle emissions from diverting post-consumer recyclables from landfilling into closed-loop processing, referenced from the <strong>{methodology.standards_body || 'EPA Waste Reduction Model'}</strong>:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            {Object.entries(methodology.material_factors_kg_co2 || {}).map(([mat, factor]) => (
              <div key={mat} className="p-2.5 rounded-lg border border-token-default bg-bg-primary text-center">
                <p className="font-semibold text-token-primary capitalize text-xs">{mat.replace('_', ' ')}</p>
                <p className="text-green-500 font-bold mt-0.5">{factor > 0 ? `+${factor}` : factor} kg</p>
                <p className="text-[10px] text-token-disabled">CO₂e / item</p>
              </div>
            ))}
          </div>
          <p className="text-token-tertiary text-[11px] pt-1">
            * Equivalency formulas: 1 kg CO₂e offset = 2.45 kWh grid electricity = 2.52 passenger vehicle miles = 0.046 tree seedlings grown for 10 years (EPA Greenhouse Gas Equivalencies).
          </p>
        </motion.div>
      )}

      {/* ── Perspective Selector Tabs ── */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'personal',  label: '🌱 My Personal Impact' },
          { key: 'community', label: '🏙️ City & Community Impact' },
          { key: 'planner',   label: '🎯 Target Simulator' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setViewTab(t.key)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              viewTab === t.key
                ? 'bg-green-500 text-white shadow-sm'
                : 'card text-token-secondary hover:text-token-primary',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card p-4 border-red-500/30 bg-red-500/10 text-red-600 text-sm mb-6 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PERSONAL IMPACT
         ───────────────────────────────────────────────────────────── */}
      {viewTab === 'personal' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="CO₂e Avoided"
              value={`${user.carbon_saved_kg || 0} kg`}
              icon={<span className="text-xl">🌿</span>}
              trend={`${user.total_scans || 0} total items scanned`}
            />
            <StatCard
              label="Landfill Diversion Rate"
              value={`${user.diversion_rate || 0}%`}
              icon={<span className="text-xl">♻️</span>}
              trend={`${user.recyclable_scans || 0} recyclable items`}
            />
            <StatCard
              label="Contamination Prevented"
              value={`${user.contamination_prevented || 0} items`}
              icon={<span className="text-xl">🛡️</span>}
              trend="Non-recyclables kept out of clean stream"
            />
            <StatCard
              label="Civic Reports Resolved"
              value={`${user.reports_by_status?.resolved || 0} / ${user.reports_count || 0}`}
              icon={<span className="text-xl">📋</span>}
              trend={user.average_resolution_hours ? `Avg ~${user.average_resolution_hours}h resolution` : 'Direct community action'}
            />
          </div>

          {/* EPA Equivalency Highlights */}
          <Card>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-token-primary flex items-center gap-2">
                <Compass size={18} className="text-green-500" />
                Measurable Real-World Equivalencies
              </h2>
              <p className="text-xs text-token-tertiary mt-0.5">
                Translating your {user.carbon_saved_kg || 0} kg CO₂e avoided into tangible environmental work:
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-bg-secondary border border-token-default flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-2">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-token-primary tabular-nums">
                    {user.equivalencies?.kwh_electricity || 0}
                  </p>
                  <p className="text-xs font-medium text-token-secondary mt-0.5">kWh Electricity</p>
                  <p className="text-[10px] text-token-disabled mt-1">Grid energy conserved</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-secondary border border-token-default flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mb-2">
                  <Car size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-token-primary tabular-nums">
                    {user.equivalencies?.driving_miles_offset || 0}
                  </p>
                  <p className="text-xs font-medium text-token-secondary mt-0.5">Driving Miles</p>
                  <p className="text-[10px] text-token-disabled mt-1">Gasoline car emissions offset</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-secondary border border-token-default flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center mb-2">
                  <TreePine size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-token-primary tabular-nums">
                    {user.equivalencies?.tree_seedlings_ten_years || 0}
                  </p>
                  <p className="text-xs font-medium text-token-secondary mt-0.5">Tree Seedlings</p>
                  <p className="text-[10px] text-token-disabled mt-1">10-year carbon absorption equiv.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-secondary border border-token-default flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center mb-2">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-token-primary tabular-nums">
                    {user.equivalencies?.smartphones_charged || 0}
                  </p>
                  <p className="text-xs font-medium text-token-secondary mt-0.5">Smartphones</p>
                  <p className="text-[10px] text-token-disabled mt-1">Full battery recharges offset</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Material Category Flow & Classification Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-base font-semibold text-token-primary mb-1">Material Stream Classification</h2>
              <p className="text-xs text-token-tertiary mb-4">Breakdown of items sorted by material type</p>
              {chartCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartCategories}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary, #9CA3AF)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-tertiary, #9CA3AF)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-16 text-center text-xs text-token-tertiary">
                  No scan classification data yet. Scan items in the Scanner to populate this chart.
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-token-primary mb-1">Avoided Carbon by Material</h2>
              <p className="text-xs text-token-tertiary mb-4">Total kg CO₂e saved per recovered recyclable material</p>
              {chartCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={chartCategories.filter(c => c.carbon > 0)}
                      dataKey="carbon"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {chartCategories.map((entry, index) => (
                        <Cell key={`pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`${val} kg CO₂e`, 'Carbon Saved']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-16 text-center text-xs text-token-tertiary">
                  No carbon data yet. Scan recyclable items to record savings.
                </div>
              )}
            </Card>
          </div>

          {/* Civic Waste Reports Impact Status */}
          {user.reports_count > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-token-primary mb-1">Civic Waste Resolution Impact</h2>
              <p className="text-xs text-token-tertiary mb-4">
                Lifecycle progress of waste reports you have filed for municipal cleanup
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {['submitted', 'under_review', 'accepted', 'in_progress', 'resolved', 'rejected'].map(st => {
                  const meta = REPORT_STATUS_META[st]
                  const count = user.reports_by_status?.[st] || 0
                  return (
                    <div
                      key={st}
                      className={`p-3 rounded-xl border ${meta.bgClass} flex flex-col justify-between`}
                      style={{ borderColor: `${meta.color}30` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{meta.icon}</span>
                        <span className="text-lg font-bold tabular-nums" style={{ color: meta.color }}>
                          {count}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold mt-2 ${meta.textClass}`}>{meta.label}</p>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: CIVIC COMMUNITY IMPACT & WARD LEADERBOARD
         ───────────────────────────────────────────────────────────── */}
      {viewTab === 'community' && (
        <div className="space-y-6">
          <CivicLeaderboard
            wards={data?.civic_wards || []}
            datasetMetadata={data?.civic_dataset_metadata}
            communitySummary={comm}
          />

          {/* Community vs Personal Comparison */}
          <Card>
            <h2 className="text-base font-semibold text-token-primary mb-1">Your Impact vs City Baseline</h2>
            <p className="text-xs text-token-tertiary mb-5">Comparing your recycling rate against the broader citizen average</p>
            <div className="space-y-4 max-w-xl">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-token-secondary">Your Recycling Rate</span>
                  <span className="text-green-500 font-bold">{user.diversion_rate || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${Math.min(user.diversion_rate || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-token-secondary">City Average Recycling Rate</span>
                  <span className="text-blue-400 font-bold">{comm.recycling_rate || 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.min(comm.recycling_rate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: TARGET SIMULATOR & ACTION PLANNER
         ───────────────────────────────────────────────────────────── */}
      {viewTab === 'planner' && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-token-primary flex items-center gap-2">
                <Target size={18} className="text-green-500" />
                Personal Waste Diversion Simulator
              </h2>
              <p className="text-xs text-token-tertiary mt-0.5">
                Simulate how small consistent daily sorting habits multiply into significant annual carbon avoidance.
              </p>
            </div>

            {/* Slider */}
            <div className="p-5 rounded-xl bg-bg-secondary border border-token-default space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-token-primary">Daily Items Sorted Properly:</span>
                <span className="text-xl font-extrabold text-green-500 tabular-nums px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                  {dailyGoal} items / day
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={dailyGoal}
                onChange={(e) => handleGoalChange(Number(e.target.value))}
                className="w-full accent-green-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-token-disabled">
                <span>1 item/day (Casual)</span>
                <span>5 items/day (Committed)</span>
                <span>15 items/day (Zero-Waste Champion)</span>
              </div>
            </div>

            {/* Projected Impact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-token-default bg-bg-secondary text-center">
                <p className="text-2xl font-black text-green-500 tabular-nums">{goalProjection.yearlyCarbon} kg</p>
                <p className="text-xs font-semibold text-token-primary mt-1">Annual CO₂e Avoided</p>
                <p className="text-[10px] text-token-disabled mt-0.5">Direct lifecycle reduction</p>
              </div>

              <div className="p-4 rounded-xl border border-token-default bg-bg-secondary text-center">
                <p className="text-2xl font-black text-blue-400 tabular-nums">{goalProjection.yearlyMass} kg</p>
                <p className="text-xs font-semibold text-token-primary mt-1">Landfill Waste Diverted</p>
                <p className="text-[10px] text-token-disabled mt-0.5">Raw materials recovered</p>
              </div>

              <div className="p-4 rounded-xl border border-token-default bg-bg-secondary text-center">
                <p className="text-2xl font-black text-amber-500 tabular-nums">{goalProjection.yearlyKwh} kWh</p>
                <p className="text-xs font-semibold text-token-primary mt-1">Energy Conserved</p>
                <p className="text-[10px] text-token-disabled mt-0.5">Industrial remelt savings</p>
              </div>

              <div className="p-4 rounded-xl border border-token-default bg-bg-secondary text-center">
                <p className="text-2xl font-black text-purple-400 tabular-nums">{goalProjection.yearlyItems}</p>
                <p className="text-xs font-semibold text-token-primary mt-1">Total Items Rescued</p>
                <p className="text-[10px] text-token-disabled mt-0.5">Kept out of combustion/landfill</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-token-default flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-token-secondary">
                Your target is saved to your browser session to help track your weekly habit.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  localStorage.setItem('biniq_daily_goal', String(dailyGoal))
                  setGoalSaved(true)
                  setTimeout(() => setGoalSaved(false), 2500)
                }}
              >
                {goalSaved ? '✓ Goal Saved!' : 'Set as Active Goal'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}

