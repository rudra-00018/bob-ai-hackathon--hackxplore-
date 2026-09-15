/**
 * BinIQ — Dashboard Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates data from multiple sources into a single dashboard payload.
 * The dashboard UI never calls backend APIs directly — it uses loadDashboard().
 *
 * Data sources:
 *   /api/stats        → scan totals, carbon saved, XP, streak, badges
 *   /api/history      → recent scans (last 30)
 *   reportService     → user's local/API-backed waste reports
 *   binService        → nearby bin mock/live data (requires user location)
 *
 * Each section resolves independently so a failure in one source (e.g. bins
 * when the user denies location) does not block the rest of the dashboard.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { historyApi } from './api'
import { fetchMyReports, REPORT_STATUS } from './reportService'
import { getBins, getUserLocation, BIN_STATUS } from './binService'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Settle all promises independently; never throws. */
async function allSettledMap(map) {
  const keys    = Object.keys(map)
  const results = await Promise.allSettled(Object.values(map))
  return Object.fromEntries(
    keys.map((k, i) => [
      k,
      results[i].status === 'fulfilled'
        ? { data: results[i].value, error: null }
        : { data: null, error: results[i].reason?.message || 'Failed to load' },
    ])
  )
}

/**
 * Build a weekly scan-count series from the raw history array.
 * Returns the last 7 days as [{ day: 'Mon', scans: 2, carbon: 0.12 }, …]
 */
export function buildWeeklySeries(historyItems = []) {
  const days  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()

  // Create a map of ISO-date → { scans, carbon }
  const buckets = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = { day: days[d.getDay()], date: key, scans: 0, carbon: 0 }
  }

  for (const item of historyItems) {
    const dateKey = item.timestamp?.slice(0, 10)
    if (dateKey && buckets[dateKey]) {
      buckets[dateKey].scans  += 1
      buckets[dateKey].carbon += item.carbon_saved || 0
    }
  }

  return Object.values(buckets).map(b => ({
    ...b,
    carbon: Math.round(b.carbon * 1000) / 1000,
  }))
}

/**
 * Build category breakdown from history items.
 * Returns top-5 categories as [{ category, count, pct }]
 */
export function buildCategoryBreakdown(historyItems = []) {
  if (!historyItems.length) return []
  const counts = {}
  for (const item of historyItems) {
    const cat = item.prediction || 'unknown'
    counts[cat] = (counts[cat] || 0) + 1
  }
  const total   = historyItems.length
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({
      category,
      count,
      pct: Math.round((count / total) * 100),
    }))
}

/**
 * Derive AI recommendations from the user's actual data.
 * These are rule-based — clearly labelled, not hallucinated.
 */
export function deriveRecommendations(stats, historyItems = [], reports = []) {
  const recs = []

  // Low recycling rate
  if (stats && stats.total > 3) {
    const rate = stats.total ? stats.recyclable_count / stats.total : 0
    if (rate < 0.5) {
      recs.push({
        id:    'rec-low-recycle',
        type:  'insight',
        title: 'Improve your recycling rate',
        body:  `${Math.round(rate * 100)}% of your scanned items were recyclable. Try sorting items before binning — rinse containers and remove lids.`,
        cta:   { label: 'Ask EcoBot how', href: '/app/assistant' },
      })
    }
  }

  // No streak — encourage habit
  if (stats && stats.streak === 0 && stats.total > 0) {
    recs.push({
      id:    'rec-streak',
      type:  'habit',
      title: 'Build a daily scanning habit',
      body:  'Scan one item per day to start your streak and earn bonus XP. Streaks reset if you miss a day.',
      cta:   { label: 'Start scanning', href: '/app/scanner' },
    })
  }

  // Active high-urgency reports
  const urgentReports = reports.filter(
    r => r.status === REPORT_STATUS.SUBMITTED &&
         r.aiResult?.urgency === 'critical'
  )
  if (urgentReports.length > 0) {
    recs.push({
      id:    'rec-urgent-report',
      type:  'warning',
      title: `${urgentReports.length} critical report${urgentReports.length > 1 ? 's' : ''} pending`,
      body:  'You have unacknowledged reports flagged as critical. Consider following up with your local council.',
      cta:   { label: 'View reports', href: '/app/report' },
    })
  }

  // Dominant category guidance
  const topCat = buildCategoryBreakdown(historyItems)[0]
  if (topCat && topCat.pct >= 40) {
    const tips = {
      plastic:   'For plastic items, always check the resin code (1–7) on the bottom. Codes 1 and 2 are most widely accepted.',
      paper:     'Shredded paper can clog sorting machines — put it in a sealed paper bag before recycling.',
      cardboard: 'Break down boxes fully flat and remove adhesive tape — it contaminates paper pulp.',
      metal:     'Crushed cans save space in collection vehicles and improve sortability.',
      glass:     'Glass bottles must go to a glass bank, not the general recycling bin in most areas.',
      trash:     'For general waste items, check if they can be repaired or donated before binning.',
    }
    const tip = tips[topCat.category]
    if (tip) {
      recs.push({
        id:    `rec-tip-${topCat.category}`,
        type:  'tip',
        title: `Tip for your most scanned category`,
        body:  tip,
        cta:   { label: 'Ask EcoBot', href: '/app/assistant' },
      })
    }
  }

  // First scan nudge
  if (!stats || stats.total === 0) {
    recs.push({
      id:    'rec-first-scan',
      type:  'onboarding',
      title: 'Scan your first item',
      body:  'Point the scanner at any waste item to get instant AI classification and disposal instructions.',
      cta:   { label: 'Open scanner', href: '/app/scanner' },
    })
  }

  return recs.slice(0, 3) // cap at 3 to avoid clutter
}

// ── Main load function ────────────────────────────────────────────────────────
/**
 * Loads all dashboard data independently.
 * Returns a structured object — each section has { data, error, loading: false }.
 *
 * @returns {Promise<DashboardPayload>}
 */
export async function loadDashboard() {
  // Fire all requests in parallel
  const [locationResult, settled] = await Promise.all([
    // Location runs separately — it uses a browser API, not a network request
    getUserLocation().catch(err => ({ error: err.message })),

    allSettledMap({
      stats:   historyApi.stats(),
      history: historyApi.list(30),
      reports: fetchMyReports(),
    }),
  ])

  const { stats, history, reports } = settled

  // Bins depend on location — attempt if we have coords
  let binsResult = { data: null, error: 'Location not available' }
  if (locationResult && !locationResult.error) {
    try {
      const bins = await getBins(locationResult.lat, locationResult.lon, 800)
      binsResult = { data: bins, error: null }
    } catch (err) {
      binsResult = { data: null, error: err.message || 'Could not load nearby bins' }
    }
  } else {
    binsResult.error = locationResult?.error || 'Location unavailable'
  }

  const historyItems = history.data?.history || []
  const statsData    = stats.data || null
  const reportsData  = reports.data || []

  // Derived / computed
  const weeklySeries    = buildWeeklySeries(historyItems)
  const categoryBreakdown = buildCategoryBreakdown(historyItems)
  const recommendations = deriveRecommendations(statsData, historyItems, reportsData)

  // Summarise nearby bins (full list kept for detail)
  let binSummary = null
  if (binsResult.data) {
    const bins = binsResult.data
    binSummary = {
      total:        bins.length,
      full:         bins.filter(b => b.status === BIN_STATUS.FULL).length,
      nearlyFull:   bins.filter(b => b.status === BIN_STATUS.NEARLY_FULL).length,
      available:    bins.filter(b => b.status === BIN_STATUS.AVAILABLE).length,
      // Closest 4 bins regardless of status
      closest: [...bins]
        .map(b => ({
          ...b,
          _dist: Math.hypot(
            b.lat - locationResult.lat,
            b.lon - locationResult.lon
          ),
        }))
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 4),
    }
  }

  // Active reports = not yet resolved
  const activeReports = reportsData.filter(
    r => r.status !== REPORT_STATUS.RESOLVED
  )

  return {
    location:    locationResult.error ? null : locationResult,

    stats: {
      data:  statsData,
      error: stats.error,
    },

    recentScans: {
      data:  historyItems.slice(0, 5),
      error: history.error,
    },

    reports: {
      active:  activeReports,
      recent:  reportsData.slice(0, 3),
      total:   reportsData.length,
      error:   reports.error,
    },

    bins: {
      summary: binSummary,
      error:   binsResult.error,
    },

    chart: {
      weekly:    weeklySeries,
      breakdown: categoryBreakdown,
    },

    recommendations,
  }
}
