import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, Info, Leaf, RefreshCw, Zap } from 'lucide-react'
import {
  URGENCY, URGENCY_META,
  WASTE_CATEGORY,
} from '../../services/reportService'

// Category emoji map
const CATEGORY_EMOJI = {
  plastic:   '🧴',
  paper:     '📄',
  cardboard: '📦',
  metal:     '🥫',
  glass:     '🍶',
  ewaste:    '📱',
  hazardous: '☣️',
  organic:   '🌱',
  trash:     '🗑️',
  unknown:   '❓',
}

// ── Confidence bar ─────────────────────────────────────────────────────────────
function ConfidenceBar({ confidence }) {
  if (confidence === null || confidence === undefined) return null
  const pct   = Math.round(confidence * 100)
  const color = confidence >= 0.75 ? '#22C55E' : confidence >= 0.5 ? '#F59E0B' : '#EF4444'

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-token-tertiary font-medium">Confidence</span>
        <span className="font-semibold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      {confidence < 0.6 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
          <AlertTriangle size={11} />
          Low confidence — please verify this classification
        </p>
      )}
    </div>
  )
}

// ── Urgency badge ─────────────────────────────────────────────────────────────
function UrgencyBadge({ urgency }) {
  const meta = URGENCY_META[urgency] || URGENCY_META[URGENCY.MEDIUM]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{
        color:       meta.color,
        background:  `${meta.color}12`,
        borderColor: `${meta.color}30`,
      }}
    >
      {meta.icon} {meta.label} urgency
    </span>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
export function AIAnalysisLoading() {
  return (
    <div className="card p-6 space-y-4" aria-busy="true" aria-label="AI analysis in progress">
      {/* Animated scan indicator */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--brand-subtle)] border-2 border-green-500 flex items-center justify-center">
          <Zap size={20} className="text-green-500 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold text-token-primary">Analysing image…</p>
          <p className="text-xs text-token-tertiary mt-0.5">AI is classifying your waste item</p>
        </div>
      </div>
      {/* Skeleton lines */}
      <div className="space-y-2.5" aria-hidden="true">
        <div className="h-3 rounded-full skeleton w-3/4" />
        <div className="h-3 rounded-full skeleton w-full" />
        <div className="h-3 rounded-full skeleton w-5/6" />
        <div className="h-8 rounded-md skeleton w-1/2 mt-4" />
      </div>
    </div>
  )
}

// ── Error state ────────────────────────────────────────────────────────────────
export function AIAnalysisError({ error, onRetry }) {
  return (
    <div className="card p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-[var(--warning-subtle)] border border-[var(--warning-border)] flex items-center justify-center mx-auto">
        <AlertTriangle size={22} className="text-amber-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-token-primary">Analysis failed</p>
        <p className="text-xs text-token-tertiary mt-1 max-w-xs mx-auto">{error}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-md border border-token-default text-sm font-medium text-token-secondary hover:bg-bg-overlay transition-colors"
        >
          <RefreshCw size={15} /> Try again
        </button>
      )}
    </div>
  )
}

// ── Main AIAnalysisResult ─────────────────────────────────────────────────────
/**
 * Displays structured AI analysis result.
 *
 * @param {object}   result  - from analyzeImage()
 * @param {function} [onOverride] - called when user manually changes category
 * @param {boolean}  [editable]  - show manual override option
 */
export default function AIAnalysisResult({ result, onOverride, editable = true }) {
  if (!result) return null

  const emoji = CATEGORY_EMOJI[result.category] || '❓'

  // Determine header style based on urgency
  const urgencyMeta = URGENCY_META[result.urgency] || URGENCY_META[URGENCY.MEDIUM]
  const topBorderColor = urgencyMeta.color

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card overflow-hidden"
    >
      {/* Top urgency border */}
      <div className="h-1" style={{ background: topBorderColor }} />

      <div className="p-5 space-y-4">
        {/* Header: emoji + label + urgency */}
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: `${topBorderColor}15`, border: `1px solid ${topBorderColor}30` }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-token-primary capitalize">{result.label}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <UrgencyBadge urgency={result.urgency} />
              {result.source === 'mock' && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Demo result
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Confidence */}
        <ConfidenceBar confidence={result.confidence} />

        {/* Disposal recommendation */}
        <div className="rounded-lg bg-bg-secondary border border-token-default p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-token-secondary uppercase tracking-wide">
            <CheckCircle size={13} className="text-green-500" />
            Recommended disposal
          </div>
          <p className="text-sm font-medium text-token-primary">{result.disposalMethod}</p>
          <p className="text-xs text-token-tertiary leading-relaxed">{result.disposalAction}</p>
        </div>

        {/* Details / extra info */}
        {result.details && (
          <div className="flex gap-2 text-xs text-token-tertiary">
            <Info size={13} className="shrink-0 mt-0.5 text-blue-400" />
            <span className="leading-relaxed">{result.details}</span>
          </div>
        )}

        {/* Resin code (plastic only) */}
        {result.resinCode && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 px-3 py-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center font-black text-lg shrink-0">
              {result.resinCode.code}
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Resin Code {result.resinCode.code}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{result.resinCode.info}</p>
            </div>
          </div>
        )}

        {/* CO₂ saving */}
        {result.carbonSaved > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--success-subtle)] border border-[var(--success-border)] px-3 py-2">
            <Leaf size={14} className="text-green-500 shrink-0" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              +{result.carbonSaved} kg CO₂ saved by recycling correctly
            </span>
          </div>
        )}

        {/* Top-3 alternatives */}
        {result.top3?.length > 1 && (
          <details className="group">
            <summary className="text-xs text-token-tertiary cursor-pointer hover:text-token-primary transition-colors list-none flex items-center gap-1.5">
              <span className="group-open:hidden">▶</span>
              <span className="hidden group-open:inline">▼</span>
              Other possibilities
            </summary>
            <div className="mt-2 space-y-1.5">
              {result.top3.slice(1).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-token-tertiary w-20 capitalize truncate">{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-token-tertiary opacity-50"
                      style={{ width: `${Math.round(item.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-token-disabled w-9 text-right tabular-nums">
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Confidence disclaimer */}
        {result.confidenceNote && (
          <p className="text-xs text-token-disabled italic leading-relaxed border-t border-token-subtle pt-3">
            {result.confidenceNote}
          </p>
        )}
      </div>
    </motion.div>
  )
}
