import { forwardRef, useState, useId } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

/**
 * InputGroup — label + input + optional error/helper text with proper A11y relationships
 */
export function InputGroup({
  label,
  error,
  helper,
  required,
  id: customId,
  className = '',
  children,
}) {
  const generatedId = useId()
  const inputId = customId || `field-${generatedId}`
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-token-secondary"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
          )}
          {required && (
            <span className="sr-only"> (required)</span>
          )}
        </label>
      )}
      {children}
      {error && (
        <p
          id={errorId}
          className="flex items-center gap-1 text-xs text-red-500"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle size={12} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {!error && helper && (
        <p id={helperId} className="text-xs text-token-tertiary">
          {helper}
        </p>
      )}
    </div>
  )
}

/**
 * Input — base text input
 */
const Input = forwardRef(function Input(
  {
    error,
    className = '',
    type      = 'text',
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={[
        'input-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-transparent',
        error ? 'input-error focus-visible:ring-red-500' : '',
        className,
      ].join(' ')}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={ariaDescribedBy}
      {...props}
    />
  )
})

/**
 * PasswordInput — input with show/hide toggle
 */
export function PasswordInput({ error, className = '', ...props }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        error={error}
        className={`pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-token-tertiary hover:text-token-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded p-0.5 transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  )
}

/**
 * Textarea
 */
export const Textarea = forwardRef(function Textarea(
  {
    error,
    className = '',
    rows = 4,
    maxLength,
    value,
    'aria-describedby': ariaDescribedBy,
    ...props
  },
  ref
) {
  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={rows}
        maxLength={maxLength}
        value={value}
        className={[
          'input-base h-auto py-2.5 resize-y transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-transparent',
          error ? 'input-error focus-visible:ring-red-500' : '',
          className,
        ].join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={ariaDescribedBy}
        {...props}
      />
      {maxLength && value !== undefined && (
        <span
          className="absolute bottom-2 right-3 text-xs text-token-tertiary pointer-events-none"
          aria-hidden="true"
        >
          {String(value).length}/{maxLength}
        </span>
      )}
    </div>
  )
})

export default Input
