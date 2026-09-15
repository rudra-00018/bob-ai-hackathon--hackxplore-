/**
 * ConfirmDialog — replaces window.confirm(), window.prompt(), and alert()
 *
 * Variants:
 *   confirm  — yes/no confirmation
 *   prompt   — text input + confirm
 *   alert    — dismissible information/error message
 *
 * Usage:
 *   const { dialog, confirmAction, promptAction, alertAction } = useDialog()
 *   ...
 *   await confirmAction({ title: 'Delete report?', message: '...', confirmLabel: 'Delete', variant: 'danger' })
 *   const note = await promptAction({ title: 'Enter note', message: '...', placeholder: '...' })
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, CheckCircle, XCircle, X, Loader2 } from 'lucide-react'
import Button from './Button'

// ── Modal primitive ───────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-md bg-bg-primary border border-token-default rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  )
}

const VARIANT_META = {
  danger:  { icon: XCircle,       iconClass: 'text-red-500',    titleClass: 'text-red-600 dark:text-red-400'  },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-500',  titleClass: 'text-amber-600 dark:text-amber-400' },
  info:    { icon: Info,           iconClass: 'text-blue-500',   titleClass: 'text-blue-600 dark:text-blue-400' },
  success: { icon: CheckCircle,   iconClass: 'text-green-500',  titleClass: 'text-green-600 dark:text-green-400' },
}

// ── ConfirmDialog component ───────────────────────────────────────────────────
export default function ConfirmDialog({ config, onConfirm, onCancel }) {
  const [value,    setValue]    = useState(config?.defaultValue || '')
  const [loading,  setLoading]  = useState(false)
  const inputRef               = useRef(null)

  useEffect(() => {
    if (config?.type === 'prompt') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [config])

  if (!config) return null

  const {
    type         = 'confirm',
    variant      = 'warning',
    title        = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    cancelLabel  = 'Cancel',
    placeholder  = '',
    required     = false,
  } = config

  const meta = VARIANT_META[variant] || VARIANT_META.warning
  const Icon = meta.icon

  const handleConfirm = async () => {
    if (type === 'prompt' && required && !value.trim()) {
      inputRef.current?.focus()
      return
    }
    setLoading(true)
    try {
      await onConfirm(type === 'prompt' ? value.trim() : true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <ModalOverlay onClose={type === 'alert' ? onCancel : undefined}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.iconClass} bg-current/10`}
              style={{ background: `color-mix(in srgb, currentColor 10%, transparent)` }}>
              <Icon size={20} className={meta.iconClass} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`text-base font-semibold ${meta.titleClass}`}>{title}</h2>
              {message && (
                <p className="text-sm text-token-secondary mt-1 leading-relaxed">{message}</p>
              )}
            </div>
            {type === 'alert' && (
              <button
                type="button"
                onClick={onCancel}
                className="shrink-0 text-token-tertiary hover:text-token-primary transition-colors p-1"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Prompt input */}
          {type === 'prompt' && (
            <div className="mb-4">
              <textarea
                ref={inputRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className={[
                  'w-full text-sm px-3 py-2.5 rounded-lg border bg-bg-secondary text-token-primary',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
                  required && !value.trim() ? 'border-red-400' : 'border-token-default',
                ].join(' ')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) handleConfirm()
                }}
              />
              {required && !value.trim() && (
                <p className="text-xs text-red-500 mt-1">A note is required.</p>
              )}
              <p className="text-xs text-token-disabled mt-1">Ctrl+Enter to confirm</p>
            </div>
          )}

          {/* Buttons */}
          <div className={`flex gap-2 ${type === 'alert' ? 'justify-end' : 'justify-between'}`}>
            {type !== 'alert' && (
              <Button
                variant="ghost"
                size="md"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="md"
              onClick={handleConfirm}
              disabled={loading || (type === 'prompt' && required && !value.trim())}
              icon={loading ? <Loader2 size={15} className="animate-spin" /> : undefined}
            >
              {loading ? 'Please wait…' : (type === 'alert' ? 'OK' : confirmLabel)}
            </Button>
          </div>
        </div>
      </ModalOverlay>
    </AnimatePresence>
  )
}

// ── useDialog hook ────────────────────────────────────────────────────────────
/**
 * Drop-in replacements for window.confirm, window.prompt, and alert.
 * Returns { dialog, confirmAction, promptAction, alertAction }
 *
 * confirmAction — resolves true (confirmed) or false (cancelled)
 * promptAction  — resolves with string value or null (cancelled)
 * alertAction   — resolves when dismissed
 */
export function useDialog() {
  const [config,  setConfig]  = useState(null)
  const resolveRef            = useRef(null)

  const open = useCallback((cfg) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setConfig(cfg)
    })
  }, [])

  const handleConfirm = useCallback((value) => {
    setConfig(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    setConfig(null)
    resolveRef.current?.(config?.type === 'prompt' ? null : false)
    resolveRef.current = null
  }, [config])

  // Confirm dialog — returns true/false
  const confirmAction = useCallback((opts) => open({ type: 'confirm', ...opts }), [open])

  // Prompt dialog — returns string or null
  const promptAction = useCallback((opts) => open({ type: 'prompt', ...opts }), [open])

  // Alert dialog — returns true when dismissed
  const alertAction = useCallback((opts) => open({ type: 'alert', ...opts }), [open])

  const dialog = config ? (
    <ConfirmDialog config={config} onConfirm={handleConfirm} onCancel={handleCancel} />
  ) : null

  return { dialog, confirmAction, promptAction, alertAction }
}
