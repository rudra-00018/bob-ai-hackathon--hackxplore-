/**
 * Card components for BinIQ design system
 */

/**
 * Card — base container
 * @param {object} props
 * @param {boolean} [props.interactive] - adds hover state
 * @param {boolean} [props.padded] - adds default padding (default: true)
 * @param {string} [props.className]
 */
export function Card({ children, interactive = false, padded = true, className = '', ...props }) {
  return (
    <div
      className={[
        'card',
        padded ? 'p-6' : '',
        interactive
          ? 'cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-token-strong hover:-translate-y-0.5'
          : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * CardHeader — title + optional description inside a card
 */
export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-token-primary leading-tight">{title}</h3>
        {description && (
          <p className="text-sm text-token-tertiary leading-relaxed">{description}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0">{action}</div>
      )}
    </div>
  )
}

/**
 * StatCard — KPI display card
 * @param {object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {React.ReactNode} [props.icon]
 * @param {string} [props.delta] - e.g. "+12% vs last week"
 * @param {'positive'|'negative'|'neutral'} [props.deltaType]
 */
export function StatCard({ label, value, icon, delta, deltaType = 'neutral', className = '' }) {
  const deltaColor = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral:  'text-token-tertiary',
  }[deltaType]

  return (
    <Card className={`flex flex-col gap-4 ${className}`}>
      {icon && (
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
          {icon}
        </div>
      )}
      <div>
        <div className="text-3xl font-bold tabular-nums text-token-primary leading-none mb-1.5">
          {value}
        </div>
        <div className="text-sm font-medium text-token-secondary">{label}</div>
        {delta && (
          <div className={`text-xs mt-1.5 font-medium ${deltaColor}`}>{delta}</div>
        )}
      </div>
    </Card>
  )
}

/**
 * CardDivider — horizontal divider inside a card
 */
export function CardDivider({ className = '' }) {
  return <div className={`border-t border-token-default my-5 -mx-6 ${className}`} />
}

export default Card
