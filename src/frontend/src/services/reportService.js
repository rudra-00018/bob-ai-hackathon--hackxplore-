/**
 * BinIQ — Report Service  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE
 *   All AI analysis and report CRUD flows through this module.
 *   The UI never calls AI or report APIs directly.
 *
 *   AI_SOURCE:
 *     'mock'    → deterministic mock responses, no network calls
 *     'backend' → calls /api/predict (FastAPI + PyTorch model)   ← default
 *     'groq'    → future: calls /api/report-analyze
 *
 *   REPORT_SOURCE:
 *     'local'   → localStorage (demo/offline mode)               ← default
 *     'api'     → calls /api/reports backend (Phase 2)
 *
 * REPORT LIFECYCLE
 *   submitted → under_review → accepted → in_progress → resolved
 *                                       ↘ rejected
 *
 *   State machine rules (enforced by transitionStatus):
 *     submitted    → under_review | rejected
 *     under_review → accepted     | rejected
 *     accepted     → in_progress  | rejected
 *     in_progress  → resolved     | rejected
 *     resolved     → (terminal)
 *     rejected     → (terminal)
 *
 *   In localStorage mode, status progression is simulated by a deterministic
 *   "age-based" rule so developers can see the full lifecycle without a backend.
 *   In production ('api' mode) transitions come from the server.
 *
 * DUPLICATE DETECTION
 *   checkDuplicate(reportType, location) looks for an open report of the same
 *   type within 200 m that was submitted in the past 24 hours.
 *
 * PERSISTENCE
 *   localStorage key: REPORTS_KEY (versioned). On version mismatch old data is
 *   migrated rather than discarded.
 *
 * NOTIFICATIONS
 *   submitReport / transitionStatus both call notificationService.addNotification
 *   so the notification bell updates automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import api, { reportsApi } from './api'
import { addNotification } from './notificationService'

// ── Source toggles ────────────────────────────────────────────────────────────
const AI_SOURCE     = 'backend' // 'mock' | 'backend' | 'groq'
const REPORT_SOURCE = 'api'     // 'api' | 'local'

// ── Storage versioning ────────────────────────────────────────────────────────
const REPORTS_KEY         = 'biniq_reports_v2'
const LEGACY_REPORTS_KEY  = 'biniq_reports'   // v1 key — migrated on first load


// ── Waste category constants ──────────────────────────────────────────────────
export const WASTE_CATEGORY = {
  PLASTIC:   'plastic',
  PAPER:     'paper',
  CARDBOARD: 'cardboard',
  METAL:     'metal',
  GLASS:     'glass',
  EWASTE:    'ewaste',
  HAZARDOUS: 'hazardous',
  ORGANIC:   'organic',
  GENERAL:   'trash',
  UNKNOWN:   'unknown',
}

export const URGENCY = {
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
}

// ── Report type constants ─────────────────────────────────────────────────────
export const REPORT_TYPE = {
  OVERFLOWING:  'overflowing_bin',
  ILLEGAL_DUMP: 'illegal_dumping',
  HAZARDOUS:    'hazardous_waste',
  DAMAGED_BIN:  'damaged_bin',
  FLYTIPING:    'fly_tipping',
  OTHER:        'other',
}

export const REPORT_TYPE_META = {
  [REPORT_TYPE.OVERFLOWING]:  { label: 'Overflowing Bin',   emoji: '🗑️', color: '#F59E0B' },
  [REPORT_TYPE.ILLEGAL_DUMP]: { label: 'Illegal Dumping',   emoji: '⚠️', color: '#EF4444' },
  [REPORT_TYPE.HAZARDOUS]:    { label: 'Hazardous Waste',   emoji: '☣️', color: '#8B5CF6' },
  [REPORT_TYPE.DAMAGED_BIN]:  { label: 'Damaged Bin',       emoji: '🔧', color: '#6B7280' },
  [REPORT_TYPE.FLYTIPING]:    { label: 'Fly-Tipping',       emoji: '🚫', color: '#EF4444' },
  [REPORT_TYPE.OTHER]:        { label: 'Other Issue',        emoji: '📋', color: '#3B82F6' },
}

// ── Report status constants ───────────────────────────────────────────────────
export const REPORT_STATUS = {
  SUBMITTED:    'submitted',
  UNDER_REVIEW: 'under_review',
  ACCEPTED:     'accepted',
  IN_PROGRESS:  'in_progress',
  RESOLVED:     'resolved',
  REJECTED:     'rejected',
}

export const REPORT_STATUS_META = {
  [REPORT_STATUS.SUBMITTED]: {
    label:     'Submitted',
    color:     '#6B7280',
    bgClass:   'bg-bg-secondary',
    textClass: 'text-token-tertiary',
    icon:      '📤',
    description: 'Your report has been received and is awaiting review.',
  },
  [REPORT_STATUS.UNDER_REVIEW]: {
    label:     'Under Review',
    color:     '#3B82F6',
    bgClass:   'bg-[var(--info-subtle)]',
    textClass: 'text-blue-700 dark:text-blue-400',
    icon:      '🔍',
    description: 'A council officer is reviewing your report.',
  },
  [REPORT_STATUS.ACCEPTED]: {
    label:     'Accepted',
    color:     '#8B5CF6',
    bgClass:   'bg-purple-50 dark:bg-purple-900/20',
    textClass: 'text-purple-700 dark:text-purple-400',
    icon:      '✅',
    description: 'Your report has been accepted and will be actioned.',
  },
  [REPORT_STATUS.IN_PROGRESS]: {
    label:     'In Progress',
    color:     '#F59E0B',
    bgClass:   'bg-[var(--warning-subtle)]',
    textClass: 'text-amber-700 dark:text-amber-400',
    icon:      '🔧',
    description: 'A team is actively working on this issue.',
  },
  [REPORT_STATUS.RESOLVED]: {
    label:     'Resolved',
    color:     '#22C55E',
    bgClass:   'bg-[var(--success-subtle)]',
    textClass: 'text-green-700 dark:text-green-400',
    icon:      '🎉',
    description: 'This issue has been resolved. Thank you for reporting it!',
  },
  [REPORT_STATUS.REJECTED]: {
    label:     'Rejected',
    color:     '#EF4444',
    bgClass:   'bg-[var(--danger-subtle)]',
    textClass: 'text-red-700 dark:text-red-400',
    icon:      '❌',
    description: 'This report could not be actioned. See the note for details.',
  },
}

// Ordered list for timeline rendering
export const STATUS_ORDER = [
  REPORT_STATUS.SUBMITTED,
  REPORT_STATUS.UNDER_REVIEW,
  REPORT_STATUS.ACCEPTED,
  REPORT_STATUS.IN_PROGRESS,
  REPORT_STATUS.RESOLVED,
]

// ── State machine ─────────────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  [REPORT_STATUS.SUBMITTED]:    [REPORT_STATUS.UNDER_REVIEW, REPORT_STATUS.REJECTED],
  [REPORT_STATUS.UNDER_REVIEW]: [REPORT_STATUS.ACCEPTED,     REPORT_STATUS.REJECTED],
  [REPORT_STATUS.ACCEPTED]:     [REPORT_STATUS.IN_PROGRESS,  REPORT_STATUS.REJECTED],
  [REPORT_STATUS.IN_PROGRESS]:  [REPORT_STATUS.RESOLVED,     REPORT_STATUS.REJECTED],
  [REPORT_STATUS.RESOLVED]:     [],
  [REPORT_STATUS.REJECTED]:     [],
}

export function isValidTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to)
}

export function isTerminalStatus(status) {
  return status === REPORT_STATUS.RESOLVED || status === REPORT_STATUS.REJECTED
}

export function isActiveStatus(status) {
  return !isTerminalStatus(status)
}

// ── Urgency meta ──────────────────────────────────────────────────────────────
export const URGENCY_META = {
  [URGENCY.LOW]:      { label: 'Low',      color: '#22C55E', icon: '🟢', description: 'Not urgent — report for awareness' },
  [URGENCY.MEDIUM]:   { label: 'Medium',   color: '#F59E0B', icon: '🟡', description: 'Attention needed soon' },
  [URGENCY.HIGH]:     { label: 'High',     color: '#EF4444', icon: '🔴', description: 'Requires prompt attention' },
  [URGENCY.CRITICAL]: { label: 'Critical', color: '#8B5CF6', icon: '🚨', description: 'Immediate action required' },
}

// ── Image validation ──────────────────────────────────────────────────────────
const MAX_FILE_SIZE_MB  = 10
const MIN_FILE_SIZE_B   = 1024   // 1 KB minimum — reject empty/corrupt files
const MAX_DIMENSION_PX  = 8192   // reject unreasonably large images
const MIN_DIMENSION_PX  = 32     // reject micro images
const ACCEPTED_TYPES    = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Synchronous first-pass validation (type + size).
 * Call this immediately on file select to give fast feedback.
 */
export function validateImage(file) {
  if (!file) return { valid: false, error: 'Please select an image.' }

  // Validate MIME type — don't trust extension
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid waste image. Accepted formats: JPG, PNG, WEBP.',
    }
  }

  if (file.size < MIN_FILE_SIZE_B) {
    return { valid: false, error: 'The file appears to be empty or corrupted.' }
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `Image is too large (max ${MAX_FILE_SIZE_MB} MB). Please choose a smaller photo.` }
  }

  return { valid: true, error: null }
}

/**
 * Async deep validation — checks actual image dimensions and that the file
 * is a decodable image (not a renamed .txt or corrupted file).
 * Call this before the AI step or before submission.
 */
export function validateImageDeep(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.naturalWidth < MIN_DIMENSION_PX || img.naturalHeight < MIN_DIMENSION_PX) {
        return resolve({ valid: false, error: `Image is too small (${img.naturalWidth}×${img.naturalHeight}px). Please use a clearer photo.` })
      }
      if (img.naturalWidth > MAX_DIMENSION_PX || img.naturalHeight > MAX_DIMENSION_PX) {
        return resolve({ valid: false, error: 'Image dimensions are too large. Please reduce image size.' })
      }
      resolve({ valid: true, error: null, width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ valid: false, error: 'Could not read the image file. It may be corrupted or not a valid image.' })
    }

    img.src = url
  })
}

export async function compressImage(file, maxDim = 1024, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const scale  = Math.min(1, maxDim / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(width  * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
          resolve(compressed.size < file.size ? compressed : file)
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ── Urgency inference ─────────────────────────────────────────────────────────
function inferUrgency(category, confidence) {
  if (category === WASTE_CATEGORY.HAZARDOUS)               return URGENCY.CRITICAL
  if (category === WASTE_CATEGORY.EWASTE)                   return URGENCY.HIGH
  if (category === WASTE_CATEGORY.GENERAL)                  return URGENCY.MEDIUM
  if (confidence !== null && confidence < 0.5)              return URGENCY.LOW
  return URGENCY.MEDIUM
}

// ── Disposal actions ──────────────────────────────────────────────────────────
const DISPOSAL_ACTIONS = {
  [WASTE_CATEGORY.PLASTIC]:   { method: 'Recycling bin (blue)',      action: 'Rinse, flatten, and place in blue recycling bin' },
  [WASTE_CATEGORY.PAPER]:     { method: 'Recycling bin (blue)',      action: 'Keep dry, fold flat, place in blue recycling bin' },
  [WASTE_CATEGORY.CARDBOARD]: { method: 'Recycling bin (blue)',      action: 'Break down flat, remove tape, place in blue bin' },
  [WASTE_CATEGORY.METAL]:     { method: 'Recycling bin (blue)',      action: 'Rinse cans, crush to save space, blue recycling bin' },
  [WASTE_CATEGORY.GLASS]:     { method: 'Glass bank (green)',        action: 'Rinse bottles, remove lids, take to green glass bank' },
  [WASTE_CATEGORY.EWASTE]:    { method: 'E-waste drop-off point',    action: 'Take to designated e-waste collection point' },
  [WASTE_CATEGORY.HAZARDOUS]: { method: 'Hazardous waste facility',  action: 'Contact your local authority — do NOT bin' },
  [WASTE_CATEGORY.ORGANIC]:   { method: 'Compost / organic bin',     action: 'Place in compost or brown organic waste bin' },
  [WASTE_CATEGORY.GENERAL]:   { method: 'General waste (black)',     action: 'If cannot be recycled, place in general waste bin' },
  [WASTE_CATEGORY.UNKNOWN]:   { method: 'Check local guidelines',    action: 'Unable to determine — check your local recycling guide' },
}

// ── Mock AI scenarios ─────────────────────────────────────────────────────────
let _mockCallCount = 0
function getMockAnalysis(fileName = '') {
  _mockCallCount++
  const scenarios = [
    { category: WASTE_CATEGORY.PLASTIC,   confidence: 0.94, label: 'Plastic Bottle',    details: 'Appears to be a PET plastic bottle. Check resin code on bottom.' },
    { category: WASTE_CATEGORY.GENERAL,   confidence: 0.72, label: 'Mixed Waste',        details: 'Contains mixed materials — general waste unless separated.' },
    { category: WASTE_CATEGORY.HAZARDOUS, confidence: 0.88, label: 'Hazardous Material', details: 'Potentially hazardous — do not place in standard bins.' },
    { category: WASTE_CATEGORY.EWASTE,    confidence: 0.91, label: 'Electronic Waste',   details: 'Electronic device — requires specialist disposal.' },
    { category: WASTE_CATEGORY.UNKNOWN,   confidence: 0.41, label: 'Unrecognised Item',  details: 'Confidence too low to classify. Please confirm manually.' },
  ]
  const idx      = (_mockCallCount - 1) % scenarios.length
  const scenario = scenarios[idx]
  const disposal = DISPOSAL_ACTIONS[scenario.category] || DISPOSAL_ACTIONS[WASTE_CATEGORY.UNKNOWN]
  return {
    category:       scenario.category,
    label:          scenario.label,
    confidence:     scenario.confidence,
    confidenceNote: 'Model accuracy based on validation dataset — not guaranteed for all images.',
    disposalMethod: disposal.method,
    disposalAction: disposal.action,
    urgency:        inferUrgency(scenario.category, scenario.confidence),
    details:        scenario.details,
    source:         'mock',
    modelVersion:   'mock-v0 (demo)',
  }
}

// ── Backend analysis ──────────────────────────────────────────────────────────
async function analyzeWithBackend(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/predict', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
  const cat      = data.prediction || WASTE_CATEGORY.UNKNOWN
  const conf     = data.confidence ?? null
  const disposal = DISPOSAL_ACTIONS[cat] || DISPOSAL_ACTIONS[WASTE_CATEGORY.UNKNOWN]
  return {
    category:       cat,
    label:          cat.charAt(0).toUpperCase() + cat.slice(1),
    confidence:     conf,
    confidenceNote: conf !== null ? 'Based on MobileNetV3 model — accuracy may vary by image quality.' : null,
    disposalMethod: disposal.method,
    disposalAction: disposal.action,
    urgency:        inferUrgency(cat, conf),
    details:        data.overlay || '',
    resinCode:      data.resin   || null,
    top3:           data.top3    || [],
    source:         'backend',
    modelVersion:   'mobilenet_v3_small',
    recyclable:     data.recyclable,
    carbonSaved:    data.carbon_saved,
    gamification:   data.gamification || null,
  }
}

async function analyzeWithGroq(_file) {
  throw new Error('Groq Vision analysis not yet implemented.')
}

export async function analyzeImage(file) {
  switch (AI_SOURCE) {
    case 'backend': return analyzeWithBackend(file)
    case 'groq':    return analyzeWithGroq(file)
    default:        return getMockAnalysis(file?.name)
  }
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function getStoredReports() {
  try {
    // Migrate v1 data on first load
    const legacy = localStorage.getItem(LEGACY_REPORTS_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate: add missing fields
        const migrated = parsed.map(r => ({
          ...r,
          statusHistory: r.statusHistory || [
            { status: r.status || REPORT_STATUS.SUBMITTED, timestamp: r.createdAt || new Date().toISOString(), note: 'Migrated from previous version' },
          ],
          status: r.status || REPORT_STATUS.SUBMITTED,
        }))
        saveStoredReports(migrated)
      }
      localStorage.removeItem(LEGACY_REPORTS_KEY)
    }
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveStoredReports(reports) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
}

// ── Duplicate detection ───────────────────────────────────────────────────────
const DUPLICATE_WINDOW_MS     = 24 * 60 * 60 * 1000  // 24 hours
const DUPLICATE_DISTANCE_DEGS = 0.002                 // ~200 m in lat/lon degrees

/**
 * Returns a duplicate report if one exists within 200 m, same type, in the
 * past 24 hours, and not yet rejected/resolved.
 */
export function checkDuplicate(reportType, location) {
  if (!location?.lat || !location?.lon) return null
  const reports = getStoredReports()
  const cutoff  = Date.now() - DUPLICATE_WINDOW_MS
  return reports.find(r => {
    if (r.reportType !== reportType)           return false
    if (isTerminalStatus(r.status))            return false
    if (new Date(r.createdAt).getTime() < cutoff) return false
    if (!r.location?.lat || !r.location?.lon) return false
    const dLat = Math.abs(r.location.lat - location.lat)
    const dLon = Math.abs(r.location.lon - location.lon)
    return dLat < DUPLICATE_DISTANCE_DEGS && dLon < DUPLICATE_DISTANCE_DEGS
  }) || null
}

// ── Simulated status progression (local mode only) ───────────────────────────
/**
 * In localStorage mode the backend isn't real, so we simulate status
 * progression based on how long ago the report was submitted.
 * This lets developers see the full lifecycle in the UI without a backend.
 *
 * Production: remove this function and let the real API drive status.
 */
function simulateStatusProgression(report) {
  if (REPORT_SOURCE !== 'local')  return report
  if (isTerminalStatus(report.status)) return report

  const ageMs   = Date.now() - new Date(report.createdAt).getTime()
  const ageMin  = ageMs / 60000

  // Progression thresholds (minutes since submission):
  //   2 min  → under_review
  //   5 min  → accepted
  //  10 min  → in_progress
  //  20 min  → resolved
  const THRESHOLDS = [
    { mins: 2,  status: REPORT_STATUS.UNDER_REVIEW, note: 'Report is being reviewed by the system.' },
    { mins: 5,  status: REPORT_STATUS.ACCEPTED,      note: 'Report accepted and queued for action.' },
    { mins: 10, status: REPORT_STATUS.IN_PROGRESS,   note: 'A team has been dispatched.' },
    { mins: 20, status: REPORT_STATUS.RESOLVED,      note: 'Issue resolved. Thank you for reporting!' },
  ]

  let target = report
  for (const threshold of THRESHOLDS) {
    if (ageMin >= threshold.mins && !_hasReachedStatus(report, threshold.status)) {
      target = _applyTransition(target, threshold.status, threshold.note)
    }
  }

  if (target !== report) {
    // Persist updated status
    const all = getStoredReports()
    const idx = all.findIndex(r => r.id === report.id)
    if (idx !== -1) {
      all[idx] = target
      saveStoredReports(all)
      // Fire notifications for each new status
      _fireSimulatedNotifications(report, target)
    }
  }

  return target
}

function _hasReachedStatus(report, status) {
  return report.statusHistory?.some(h => h.status === status) || report.status === status
}

function _applyTransition(report, newStatus, note) {
  return {
    ...report,
    status:        newStatus,
    updatedAt:     new Date().toISOString(),
    statusHistory: [
      ...(report.statusHistory || []),
      { status: newStatus, timestamp: new Date().toISOString(), note },
    ],
  }
}

function _fireSimulatedNotifications(before, after) {
  const beforeStatuses = new Set((before.statusHistory || []).map(h => h.status))
  for (const entry of (after.statusHistory || [])) {
    if (!beforeStatuses.has(entry.status)) {
      const meta = REPORT_STATUS_META[entry.status]
      if (!meta) continue
      addNotification({
        type:     entry.status === REPORT_STATUS.RESOLVED ? 'success'
                : entry.status === REPORT_STATUS.REJECTED ? 'danger'
                : 'info',
        title:   `Report ${meta.label}`,
        body:     meta.description,
        reportId: after.id,
        status:   entry.status,
      })
    }
  }
}

// ── API Implementation ────────────────────────────────────────────────────────
async function apiSubmitReport(reportData, imageFile) {
  let imageUrl = reportData.imageUrl || null
  if (imageFile && !imageUrl) {
    imageUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(imageFile)
    })
  }

  const payload = {
    ...reportData,
    imageUrl,
  }

  const res = await reportsApi.create(payload)
  
  // Cache in local storage for offline resilience
  if (res.report) {
    const existing = getStoredReports().filter(r => r.id !== res.report.id)
    saveStoredReports([res.report, ...existing])
  }

  // Ensure notification is recorded in client notification store
  addNotification({
    type:     'success',
    title:    'Report submitted',
    body:     'Your waste report has been received and will be reviewed shortly.',
    reportId: res.id,
    status:   REPORT_STATUS.SUBMITTED,
  })

  return res
}

async function apiFetchReports() {
  try {
    const res = await reportsApi.listMine()
    const reports = res.reports || []
    saveStoredReports(reports)
    return reports
  } catch (err) {
    console.warn('Falling back to local storage reports:', err)
    return getStoredReports()
  }
}

async function apiFetchReport(id) {
  try {
    const report = await reportsApi.getById(id)
    const existing = getStoredReports().filter(r => r.id !== id)
    saveStoredReports([report, ...existing])
    return report
  } catch (err) {
    console.warn('Falling back to cached report:', err)
    const stored = getStoredReports().find(r => r.id === id)
    if (stored) return stored
    throw err
  }
}

async function apiTransitionStatus(id, newStatus, note = '') {
  const updated = await reportsApi.updateStatus(id, newStatus, note)
  
  // Update local storage
  const existing = getStoredReports().map(r => r.id === id ? updated : r)
  saveStoredReports(existing)

  // Notify locally
  const meta = REPORT_STATUS_META[newStatus]
  if (meta) {
    addNotification({
      type:     newStatus === REPORT_STATUS.RESOLVED ? 'success'
              : newStatus === REPORT_STATUS.REJECTED ? 'danger'
              : 'info',
      title:   `Report ${meta.label}`,
      body:     note || meta.description,
      reportId: id,
      status:   newStatus,
    })
  }

  return updated
}

// ── PUBLIC: Submit report ─────────────────────────────────────────────────────
export async function submitReport(reportData, imageFile) {
  if (REPORT_SOURCE === 'api') {
    try {
      return await apiSubmitReport(reportData, imageFile)
    } catch (err) {
      console.warn('Backend submit failed, using local storage fallback:', err)
    }
  }

  let imageUrl = null
  if (imageFile) {
    imageUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(imageFile)
    })
  }

  const id     = `report-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now    = new Date().toISOString()
  const report = {
    id,
    ...reportData,
    imageUrl,
    status:        REPORT_STATUS.SUBMITTED,
    statusHistory: [
      { status: REPORT_STATUS.SUBMITTED, timestamp: now, note: 'Report submitted by user.' },
    ],
    createdAt:  now,
    updatedAt:  now,
    upvotes:    0,
    xpEarned:   5,
  }

  const existing = getStoredReports()
  saveStoredReports([report, ...existing])

  // Notify
  addNotification({
    type:     'success',
    title:    'Report submitted',
    body:     'Your waste report has been received and will be reviewed shortly.',
    reportId: id,
    status:   REPORT_STATUS.SUBMITTED,
  })

  return { id, status: REPORT_STATUS.SUBMITTED, xpEarned: 5, report }
}

// ── PUBLIC: Fetch user's reports ──────────────────────────────────────────────
export async function fetchMyReports() {
  if (REPORT_SOURCE === 'api') {
    return apiFetchReports()
  }
  const reports = getStoredReports()
  return reports.map(r => isActiveStatus(r.status) ? simulateStatusProgression(r) : r)
}

// ── PUBLIC: Fetch single report ───────────────────────────────────────────────
export async function fetchReport(id) {
  if (REPORT_SOURCE === 'api') {
    return apiFetchReport(id)
  }
  const reports = getStoredReports()
  const report  = reports.find(r => r.id === id)
  if (!report) throw new Error('Report not found')
  return isActiveStatus(report.status) ? simulateStatusProgression(report) : report
}

// ── PUBLIC: Transition status (manual override, e.g. withdraw / officer review) ──
export async function transitionStatus(id, newStatus, note = '') {
  if (REPORT_SOURCE === 'api') {
    try {
      return await apiTransitionStatus(id, newStatus, note)
    } catch (err) {
      console.warn('API transition failed, attempting local transition:', err)
    }
  }

  const reports = getStoredReports()
  const idx     = reports.findIndex(r => r.id === id)
  if (idx === -1) throw new Error('Report not found')

  const report = reports[idx]
  if (!isValidTransition(report.status, newStatus)) {
    throw new Error(`Cannot transition from ${report.status} to ${newStatus}`)
  }

  const updated = _applyTransition(report, newStatus, note || REPORT_STATUS_META[newStatus]?.description || '')
  reports[idx]  = updated
  saveStoredReports(reports)

  // Notify on meaningful status changes
  const meta = REPORT_STATUS_META[newStatus]
  if (meta) {
    addNotification({
      type:     newStatus === REPORT_STATUS.RESOLVED ? 'success'
              : newStatus === REPORT_STATUS.REJECTED ? 'danger'
              : 'info',
      title:   `Report ${meta.label}`,
      body:     note || meta.description,
      reportId: id,
      status:   newStatus,
    })
  }

  return updated
}

// ── PUBLIC: Withdraw a report (user-initiated cancellation) ──────────────────
export async function withdrawReport(id) {
  return transitionStatus(id, REPORT_STATUS.REJECTED, 'Withdrawn by user.')
}

// ── PUBLIC: Upvote ────────────────────────────────────────────────────────────
export async function upvoteReport(id) {
  if (REPORT_SOURCE === 'api') {
    try {
      await reportsApi.upvote(id)
    } catch (err) {
      console.warn('Backend upvote failed, updating locally:', err)
    }
  }
  const reports = getStoredReports()
  const updated = reports.map(r => r.id === id ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r)
  saveStoredReports(updated)
}

// ── PUBLIC: Delete report ─────────────────────────────────────────────────────
export async function deleteReport(id) {
  if (REPORT_SOURCE === 'api') {
    try {
      await reportsApi.delete(id)
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err)
    }
  }
  saveStoredReports(getStoredReports().filter(r => r.id !== id))
}

// ── PUBLIC: Fetch municipality reports ───────────────────────────────────────
export async function fetchMunicipalityReports(status) {
  try {
    const data = await reportsApi.municipalityList(status)
    return data.reports || []
  } catch (err) {
    const stored = getStoredReports()
    if (!status || status === 'all') return stored
    return stored.filter(r => r.status === status)
  }
}

