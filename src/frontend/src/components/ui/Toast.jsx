/**
 * BinIQ Toast System
 * Wraps react-hot-toast with consistent styling and a simple API.
 *
 * Usage:
 *   import toast from './components/ui/Toast'
 *   toast.success('Item scanned!')
 *   toast.error('Something went wrong')
 *   toast.info('Finding nearby bins…')
 */
import { Toaster, toast as hotToast } from 'react-hot-toast'
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'

// ── Toaster container — render once in App root ───────────────────────────────
export function ToastContainer() {
  return (
    <Toaster
      position="bottom-right"
      gutter={8}
      containerStyle={{ zIndex: 9999 }}
      toastOptions={{
        duration: 4000,
        style: {
          background:   '#171717',   // neutral-900 always — visible on both themes
          color:        '#FAFAFA',
          border:       '1px solid #3F3F46',
          borderRadius: '12px',
          padding:      '14px 16px',
          fontSize:     '14px',
          fontWeight:   '500',
          maxWidth:     '360px',
          boxShadow:    '0 20px 25px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.10)',
        },
        success: { duration: 3500 },
        error:   { duration: 6000 },
      }}
    />
  )
}

// ── Icon helper ───────────────────────────────────────────────────────────────
function ToastContent({ icon, message }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span>{message}</span>
    </div>
  )
}

// ── Toast API ─────────────────────────────────────────────────────────────────
const toast = {
  success: (message, options = {}) =>
    hotToast.custom(
      <ToastContent
        icon={<CheckCircle size={18} className="text-green-400 shrink-0" />}
        message={message}
      />,
      { duration: 3500, ...options }
    ),

  error: (message, options = {}) =>
    hotToast.custom(
      <ToastContent
        icon={<XCircle size={18} className="text-red-400 shrink-0" />}
        message={message}
      />,
      { duration: 6000, ...options }
    ),

  info: (message, options = {}) =>
    hotToast.custom(
      <ToastContent
        icon={<Info size={18} className="text-blue-400 shrink-0" />}
        message={message}
      />,
      { duration: 4000, ...options }
    ),

  warning: (message, options = {}) =>
    hotToast.custom(
      <ToastContent
        icon={<AlertTriangle size={18} className="text-amber-400 shrink-0" />}
        message={message}
      />,
      { duration: 5000, ...options }
    ),

  dismiss: hotToast.dismiss,
  promise: hotToast.promise,
}

export default toast
