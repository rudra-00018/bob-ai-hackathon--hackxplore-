import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Navigation2, AlertTriangle, RefreshCw,
  Clock, MapPin, Wifi, WifiOff, Info,
} from 'lucide-react'
import {
  BIN_STATUS, BIN_STATUS_META, BIN_TYPE_META,
  distanceKm, formatDistance, reportBinFull,
} from '../../services/binService'
import Button from '../ui/Button'
import { Badge } from '../ui/Badge'

// ── Fill level gauge ──────────────────────────────────────────────────────────
function FillGauge({ fillLevel, status }) {
  const meta = BIN_STATUS_META[status] || BIN_STATUS_META[BIN_STATUS.UNKNOWN]

  if (fillLevel === null || fillLevel === undefined) {
    return (
      <div className="rounded-lg bg-bg-secondary border border-token-default p-4 text-center">
        <WifiOff size={20} className="text-token-disabled mx-auto mb-2" />
        <p className="text-xs text-token-tertiary">No sensor data available</p>
        <p className="text-xs text-token-disabled mt-0.5">Fill level based on community reports</p>
      </div>
    )
  }

  const pct   = Math.min(100, Math.max(0, fillLevel))
  const color = meta.color

  return (
    <div className="rounded-lg bg-bg-secondary border border-token-default p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-token-secondary">Fill Level</span>
        <span className="text-xl font-bold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      {/* Bar */}
      <div className="h-3 rounded-full bg-bg-tertiary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      {/* Scale labels */}
      <div className="flex justify-between text-xs text-token-disabled mt-1.5">
        <span>Empty</span>
        <span>60%</span>
        <span>Full</span>
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = BIN_STATUS_META[status] || BIN_STATUS_META[BIN_STATUS.UNKNOWN]
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bgClass} ${meta.textClass}`}
      style={{ borderColor: `${meta.color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

// ── Last updated text ─────────────────────────────────────────────────────────
function LastUpdated({ isoString, dataSource }) {
  if (!isoString) {
    return (
      <span className="flex items-center gap-1 text-xs text-token-disabled">
        <Info size={11} /> No update time available
      </span>
    )
  }

  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(mins / 60)

  const timeStr = mins < 1 ? 'just now'
    : mins < 60 ? `${mins}m ago`
    : hrs < 24  ? `${hrs}h ago`
    : new Date(isoString).toLocaleDateString()

  const sourceLabel = {
    mock:          'Simulated data',
    openstreetmap: 'OpenStreetMap',
    iot:           'Live sensor',
    crowdsource:   'Community report',
  }[dataSource] || dataSource

  return (
    <span className="flex items-center gap-1.5 text-xs text-token-tertiary">
      <Clock size={11} />
      Updated {timeStr}
      <span className="text-token-disabled">· {sourceLabel}</span>
      {dataSource === 'mock' && (
        <span className="px-1.5 py-0.5 rounded text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
          Demo data
        </span>
      )}
    </span>
  )
}

// ── Main BinDetailSheet ───────────────────────────────────────────────────────
/**
 * @param {object} bin - bin object from binService
 * @param {object|null} userLocation - { lat, lon } or null
 * @param {function} onClose
 * @param {function} onReportFull - called when user reports bin full
 */
export default function BinDetailSheet({ bin, userLocation, onClose, onReportFull }) {
  const [reporting,   setReporting]   = useState(false)
  const [reported,    setReported]    = useState(false)
  const [reportError, setReportError] = useState(null)
  const sheetRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!bin) return null

  const typeMeta   = BIN_TYPE_META[bin.type]   || { label: 'Bin', color: '#6B7280', emoji: '🗑️', accepts: [] }
  const statusMeta = BIN_STATUS_META[bin.status] || BIN_STATUS_META[BIN_STATUS.UNKNOWN]

  const distance = userLocation
    ? formatDistance(distanceKm(userLocation.lat, userLocation.lon, bin.lat, bin.lon))
    : null

  const mapsUrl = `https://www.google.com/maps?q=${bin.lat},${bin.lon}`
  const osmUrl  = `https://www.openstreetmap.org/?mlat=${bin.lat}&mlon=${bin.lon}&zoom=17`

  const handleReportFull = async () => {
    setReporting(true)
    setReportError(null)
    try {
      await reportBinFull(bin.id)
      setReported(true)
      if (onReportFull) onReportFull(bin.id)
    } catch (err) {
      setReportError(err.message || 'Failed to submit report')
    } finally {
      setReporting(false)
    }
  }

  // Attention banner content
  const attentionBanner = (() => {
    if (bin.status === BIN_STATUS.FULL)
      return { icon: <AlertTriangle size={14} />, text: 'This bin is full — please use the next nearest bin.', color: 'var(--danger)', bg: 'var(--danger-subtle)', border: 'var(--danger-border)' }
    if (bin.status === BIN_STATUS.NEARLY_FULL)
      return { icon: <AlertTriangle size={14} />, text: 'This bin is nearly full. It may not accept more items.', color: '#D97706', bg: 'var(--warning-subtle)', border: 'var(--warning-border)' }
    if (bin.status === BIN_STATUS.MAINTENANCE)
      return { icon: <AlertTriangle size={14} />, text: 'This bin is currently out of service.', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' }
    if (bin.status === BIN_STATUS.OFFLINE)
      return { icon: <WifiOff size={14} />, text: 'Sensor offline — fill data not available. Use visual inspection.', color: '#6B7280', bg: 'var(--bg-secondary)', border: 'var(--border-default)' }
    return null
  })()

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={handleBackdrop}
        aria-modal="true"
        role="dialog"
        aria-label={`Bin details: ${typeMeta.label}`}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Sheet */}
        <motion.div
          ref={sheetRef}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative z-10 w-full sm:max-w-md bg-bg-primary border border-token-default rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-token-default" />
          </div>

          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-token-default">
            {/* Type icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: `${typeMeta.color}18`, border: `1px solid ${typeMeta.color}30` }}
            >
              {typeMeta.emoji}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-token-primary">{typeMeta.label}</h2>
                <StatusBadge status={bin.status} />
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {bin.address && (
                  <span className="flex items-center gap-1 text-xs text-token-tertiary">
                    <MapPin size={11} /> {bin.address}
                  </span>
                )}
                {distance && (
                  <span className="text-xs text-token-tertiary">{distance} away</span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-token-tertiary hover:text-token-primary hover:bg-bg-overlay transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Attention banner */}
          {attentionBanner && (
            <div
              className="mx-5 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-medium"
              style={{ background: attentionBanner.bg, border: `1px solid ${attentionBanner.border}`, color: attentionBanner.color }}
            >
              <span className="shrink-0 mt-0.5">{attentionBanner.icon}</span>
              {attentionBanner.text}
            </div>
          )}

          {/* Body */}
          <div className="px-5 py-4 space-y-4">

            {/* Fill gauge */}
            <FillGauge fillLevel={bin.fillLevel} status={bin.status} />

            {/* Accepts section */}
            {typeMeta.accepts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-token-secondary mb-2">Accepts</p>
                <div className="flex flex-wrap gap-1.5">
                  {typeMeta.accepts.map(item => (
                    <span key={item} className="px-2 py-0.5 rounded text-xs bg-bg-secondary border border-token-default text-token-secondary">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extra OSM data (name, opening hours, website) */}
            {(bin.name || bin.openingHours || bin.website) && (
              <div className="rounded-lg bg-bg-secondary border border-token-default p-3 space-y-1.5 text-xs">
                {bin.name && (
                  <div className="flex items-start gap-2">
                    <span className="text-token-disabled w-16 shrink-0">Name</span>
                    <span className="text-token-primary font-medium">{bin.name}</span>
                  </div>
                )}
                {bin.openingHours && (
                  <div className="flex items-start gap-2">
                    <span className="text-token-disabled w-16 shrink-0">Hours</span>
                    <span className="text-token-secondary">{bin.openingHours}</span>
                  </div>
                )}
                {bin.website && (
                  <div className="flex items-start gap-2">
                    <span className="text-token-disabled w-16 shrink-0">Website</span>
                    <a href={bin.website} target="_blank" rel="noreferrer" className="text-token-link hover:underline truncate">{bin.website}</a>
                  </div>
                )}
              </div>
            )}

            {/* Community reports count */}
            {bin.crowdReports > 0 && (
              <div className="flex items-center gap-2 text-xs text-token-tertiary">
                <Users size={13} />
                <span>{bin.crowdReports} community report{bin.crowdReports !== 1 ? 's' : ''} of being full</span>
              </div>
            )}

            {/* Last updated */}
            <LastUpdated isoString={bin.lastUpdated} dataSource={bin.dataSource} />
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 space-y-2">
            {/* Directions */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
              >
                <Navigation2 size={15} /> Directions
              </a>
              <a
                href={osmUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-token-default text-token-secondary hover:bg-bg-overlay text-sm font-semibold transition-colors"
              >
                View on map
              </a>
            </div>

            {/* Report full */}
            {!reported && bin.status !== BIN_STATUS.MAINTENANCE && (
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                loading={reporting}
                onClick={handleReportFull}
                icon={!reporting ? <AlertTriangle size={15} /> : undefined}
              >
                Mark this bin as full
              </Button>
            )}

            {reported && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-500 font-medium">
                <RefreshCw size={14} /> Report submitted — thank you!
              </div>
            )}

            {reportError && (
              <p className="text-xs text-red-500 text-center">{reportError}</p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Missing import fix
function Users({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
