import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const variants = {
  primary: [
    'bg-green-500 text-white border-transparent shadow-sm',
    'hover:bg-green-600 hover:shadow-md hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-sm',
    'disabled:bg-neutral-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
  ].join(' '),

  secondary: [
    'bg-bg-secondary text-token-primary border-token-default shadow-sm',
    'hover:bg-bg-tertiary hover:border-token-strong',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  ghost: [
    'bg-transparent text-token-secondary border-transparent',
    'hover:bg-bg-overlay hover:text-token-primary',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),

  danger: [
    'bg-red-500 text-white border-transparent shadow-sm',
    'hover:bg-red-600 hover:shadow-md hover:-translate-y-0.5',
    'active:translate-y-0 active:shadow-sm',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
  ].join(' '),

  'danger-ghost': [
    'bg-transparent text-red-500 border-[var(--danger-border)]',
    'hover:bg-[var(--danger-subtle)] hover:border-red-400',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' '),
}

const sizes = {
  sm: 'h-9 px-3 text-xs gap-1.5 min-w-[72px] rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 min-w-[88px] rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 min-w-[104px] rounded-xl',
}

const iconSizes = { sm: 14, md: 16, lg: 18 }

/**
 * Button component
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'|'danger-ghost'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.iconOnly] - square button, no text
 * @param {React.ReactNode} [props.icon] - icon element
 * @param {string} [props.className]
 */
const Button = forwardRef(function Button(
  {
    variant  = 'primary',
    size     = 'md',
    loading  = false,
    iconOnly = false,
    icon,
    children,
    className = '',
    disabled,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading
  const spinnerSize = iconSizes[size]
  const iconSize = iconSizes[size]

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        // Base
        'inline-flex items-center justify-center font-semibold border',
        'transition-all duration-200 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
        // Variant
        variants[variant] || variants.primary,
        // Size
        iconOnly
          ? size === 'sm' ? 'h-9 w-9 p-0 rounded-lg' : size === 'lg' ? 'h-12 w-12 p-0 rounded-xl' : 'h-11 w-11 p-0 rounded-lg'
          : sizes[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <Loader2 size={spinnerSize} className="animate-spin" aria-hidden="true" />
      ) : icon ? (
        <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      ) : null}
      {!iconOnly && children && (
        <span>{children}</span>
      )}
    </button>
  )
})

export default Button
