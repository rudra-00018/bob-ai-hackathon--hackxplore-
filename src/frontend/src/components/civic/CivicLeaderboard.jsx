import React, { useState, useMemo } from 'react'
import {
  Building2,
  Users,
  CheckCircle2,
  TrendingUp,
  Award,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Leaf,
  Layers,
  ArrowUpDown,
  FileText,
  Info,
  Sparkles,
} from 'lucide-react'
import { Card, StatCard } from '../ui/Card'
import { Badge } from '../ui/Badge'
import Button from '../ui/Button'

export default function CivicLeaderboard({
  wards = [],
  datasetMetadata = null,
  communitySummary = null,
}) {
  const [sortBy, setSortBy] = useState('civic_score') // 'civic_score' | 'resolution_rate' | 'recyclable_rate' | 'reports_submitted'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' | 'desc'
  const [expandedWardId, setExpandedWardId] = useState(null)

  // Default fallback wards if none provided
  const baseWards = wards.length > 0 ? wards : [
    {
      id: 'ward-2',
      name: 'Ward 2: North Riverside & Tech Quarter',
      district: 'North District',
      population: 34200,
      reports_submitted: 42,
      reports_resolved: 40,
      resolution_rate: 95.2,
      avg_resolution_hours: 11.8,
      recycling_scans: 480,
      recyclable_rate: 91.2,
      carbon_saved_kg: 38.4,
      active_citizens: 224,
      civic_score: 93.1,
      primary_material: 'Plastic & E-Waste',
    },
    {
      id: 'ward-1',
      name: 'Ward 1: Central Commercial & Arts',
      district: 'Downtown Core',
      population: 28400,
      reports_submitted: 54,
      reports_resolved: 50,
      resolution_rate: 92.6,
      avg_resolution_hours: 14.2,
      recycling_scans: 390,
      recyclable_rate: 85.0,
      carbon_saved_kg: 29.5,
      active_citizens: 195,
      civic_score: 89.4,
      primary_material: 'Cardboard & Metal',
    },
    {
      id: 'ward-3',
      name: 'Ward 3: South Green & Parkside',
      district: 'South District',
      population: 22100,
      reports_submitted: 24,
      reports_resolved: 22,
      resolution_rate: 91.7,
      avg_resolution_hours: 16.5,
      recycling_scans: 260,
      recyclable_rate: 88.0,
      carbon_saved_kg: 21.2,
      active_citizens: 158,
      civic_score: 87.5,
      primary_material: 'Glass & Organic',
    },
    {
      id: 'ward-4',
      name: 'Ward 4: Westside Residential & Campus',
      district: 'West District',
      population: 41500,
      reports_submitted: 62,
      reports_resolved: 52,
      resolution_rate: 83.9,
      avg_resolution_hours: 18.0,
      recycling_scans: 560,
      recyclable_rate: 79.4,
      carbon_saved_kg: 42.1,
      active_citizens: 290,
      civic_score: 83.2,
      primary_material: 'Paper & Mixed Plastic',
    },
    {
      id: 'ward-5',
      name: 'Ward 5: East Harbor & Mill District',
      district: 'East District',
      population: 19800,
      reports_submitted: 35,
      reports_resolved: 27,
      resolution_rate: 77.1,
      avg_resolution_hours: 22.4,
      recycling_scans: 210,
      recyclable_rate: 75.0,
      carbon_saved_kg: 16.8,
      active_citizens: 112,
      civic_score: 77.8,
      primary_material: 'General & Metal',
    },
  ]

  // Sort wards
  const sortedWards = useMemo(() => {
    return [...baseWards].sort((a, b) => {
      let valA = a[sortBy] ?? 0
      let valB = b[sortBy] ?? 0
      return sortOrder === 'desc' ? valB - valA : valA - valB
    })
  }, [baseWards, sortBy, sortOrder])

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Calculate city totals
  const totalReports = baseWards.reduce((acc, w) => acc + (w.reports_submitted || 0), 0)
  const totalResolved = baseWards.reduce((acc, w) => acc + (w.reports_resolved || 0), 0)
  const avgResolutionRate = totalReports ? Math.round((totalResolved / totalReports) * 1000) / 10 : 0
  const totalCitizens = baseWards.reduce((acc, w) => acc + (w.active_citizens || 0), 0)
  const totalCarbon = Math.round(baseWards.reduce((acc, w) => acc + (w.carbon_saved_kg || 0), 0) * 10) / 10

  return (
    <div className="space-y-6">
      {/* ── Top Header & Transparency Ribbon ── */}
      <div className="rounded-xl border border-token-default bg-gradient-to-r from-bg-secondary via-bg-primary to-bg-secondary p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-token-primary">
                  Civic Community Impact & Ward Performance Index
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {datasetMetadata?.label || '🔬 SAMPLE CIVIC DATASET — Ward-Level Aggregation Model'}
                </span>
              </div>
              <p className="text-xs text-token-secondary mt-1 max-w-2xl leading-relaxed">
                Aggregates citizen reporting velocity, verified municipal resolutions, and measurable recycling diversion across administrative wards. Replaced by real municipal GIS census tracts and Open311 feeds in live deployments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── City-Wide Aggregate Impact KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Municipal Wards"
          value={`${baseWards.length} Wards`}
          icon={<span className="text-xl">🏙️</span>}
          trend="100% geographic coverage"
        />
        <StatCard
          label="Civic Resolution Rate"
          value={`${avgResolutionRate}%`}
          icon={<span className="text-xl">✅</span>}
          trend={`${totalResolved} of ${totalReports} issues resolved`}
        />
        <StatCard
          label="Participating Citizens"
          value={totalCitizens.toLocaleString()}
          icon={<span className="text-xl">👥</span>}
          trend="Verified active contributors"
        />
        <StatCard
          label="Measured CO₂e Avoided"
          value={`${totalCarbon} kg`}
          icon={<span className="text-xl">🌱</span>}
          trend="Cumulative landfill diversion"
        />
      </div>

      {/* ── Ward Leaderboard Table Card ── */}
      <Card padded={false} className="overflow-hidden">
        <div className="px-6 py-4 border-b border-token-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-secondary">
          <div>
            <h3 className="text-base font-bold text-token-primary flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Neighborhood Civic Impact Ranking
            </h3>
            <p className="text-xs text-token-tertiary mt-0.5">
              Comparative benchmark across municipal wards based on resolution rate and material diversion
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-token-tertiary font-medium">Sort by:</span>
            {[
              { key: 'civic_score', label: 'Civic Score' },
              { key: 'resolution_rate', label: 'Resolution %' },
              { key: 'recyclable_rate', label: 'Diversion %' },
              { key: 'reports_submitted', label: 'Reports' },
            ].map(s => {
              const active = sortBy === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSort(s.key)}
                  className={[
                    'px-2.5 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1',
                    active
                      ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                      : 'bg-bg-primary border-token-default text-token-secondary hover:border-token-strong',
                  ].join(' ')}
                >
                  {s.label}
                  {active && (
                    <ArrowUpDown size={10} className="opacity-80" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Wards Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-token-default bg-bg-primary text-token-tertiary uppercase font-semibold">
                <th className="text-left px-4 py-3">Rank & Ward</th>
                <th className="text-center px-4 py-3">Civic Impact Score</th>
                <th className="text-center px-4 py-3">Reports Resolved</th>
                <th className="text-center px-4 py-3">Response Time</th>
                <th className="text-center px-4 py-3">Diversion Rate</th>
                <th className="text-center px-4 py-3">CO₂e Offset</th>
                <th className="text-center px-4 py-3">Citizens</th>
                <th className="text-right px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedWards.map((ward, index) => {
                const isExpanded = expandedWardId === ward.id
                const rank = index + 1
                const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

                return (
                  <React.Fragment key={ward.id}>
                    <tr className="border-b border-token-subtle hover:bg-bg-overlay transition-colors">
                      {/* Rank & Ward */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm min-w-[20px] text-center">
                            {rankBadge}
                          </span>
                          <div>
                            <div className="font-bold text-token-primary text-xs">
                              {ward.name}
                            </div>
                            <div className="text-[11px] text-token-tertiary">
                              {ward.district} • Pop: {ward.population.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Civic Score */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                            {ward.civic_score}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden mt-1">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(100, ward.civic_score)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Reports Resolved */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="font-bold text-token-primary">
                          {ward.reports_resolved} / {ward.reports_submitted}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          {ward.resolution_rate}% Resolved
                        </span>
                      </td>

                      {/* Response Time */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="font-mono text-token-secondary font-medium">
                          {ward.avg_resolution_hours} hrs
                        </span>
                      </td>

                      {/* Diversion Rate */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-green-500/15 text-green-700 dark:text-green-300">
                          {ward.recyclable_rate}%
                        </span>
                      </td>

                      {/* CO2 Offset */}
                      <td className="px-4 py-3 text-center whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{ward.carbon_saved_kg} kg
                      </td>

                      {/* Active Citizens */}
                      <td className="px-4 py-3 text-center whitespace-nowrap font-semibold text-token-primary">
                        {ward.active_citizens}
                      </td>

                      {/* Expand Action */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedWardId(isExpanded ? null : ward.id)}
                          className="px-2.5 py-1 rounded text-xs font-semibold text-token-secondary hover:text-token-primary hover:bg-bg-tertiary transition-colors inline-flex items-center gap-1"
                        >
                          {isExpanded ? 'Hide' : 'View'}
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Ward Profile Drawer */}
                    {isExpanded && (
                      <tr className="bg-bg-secondary/70 border-b border-token-default">
                        <td colSpan={8} className="p-4">
                          <div className="grid sm:grid-cols-3 gap-4 text-xs">
                            <div className="p-3 rounded-lg bg-bg-primary border border-token-default space-y-1">
                              <span className="text-token-tertiary font-semibold uppercase text-[10px]">
                                Primary Waste Stream
                              </span>
                              <p className="font-bold text-token-primary text-sm">
                                {ward.primary_material}
                              </p>
                              <p className="text-[11px] text-token-secondary">
                                Highest concentration of citizen-reported recyclable items
                              </p>
                            </div>

                            <div className="p-3 rounded-lg bg-bg-primary border border-token-default space-y-1">
                              <span className="text-token-tertiary font-semibold uppercase text-[10px]">
                                Civic Resolution Velocity
                              </span>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                {ward.avg_resolution_hours} Hours Average Closure
                              </p>
                              <p className="text-[11px] text-token-secondary">
                                Municipal response time from citizen submission to resolved status
                              </p>
                            </div>

                            <div className="p-3 rounded-lg bg-bg-primary border border-token-default space-y-1">
                              <span className="text-token-tertiary font-semibold uppercase text-[10px]">
                                Municipal Recommendation
                              </span>
                              <p className="font-bold text-blue-500 text-sm">
                                {ward.resolution_rate >= 90 ? 'Maintain High Service Schedule' : 'Deploy Additional Collection Route'}
                              </p>
                              <p className="text-[11px] text-token-secondary">
                                Automated operational suggestion based on reporting volume
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Municipal Data Architecture & GIS Integration Card ── */}
      <div className="p-4 rounded-xl bg-bg-secondary border border-token-default flex items-start gap-3 text-xs text-token-tertiary">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-token-primary">
            Municipal GIS & Open311 Integration Architecture
          </h4>
          <p className="leading-relaxed">
            The civic impact engine is designed to ingest ESRI Shapefiles, GeoJSON administrative ward boundaries, and Open311 municipal ticket databases. All neighborhood aggregates are derived from verified citizen reporting timestamps and material classification logs.
          </p>
        </div>
      </div>
    </div>
  )
}
