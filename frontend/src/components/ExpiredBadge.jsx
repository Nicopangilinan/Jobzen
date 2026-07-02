import { AlertTriangle } from 'lucide-react'

export default function ExpiredBadge({ compact = false }) {
  const sizeClass = compact
    ? 'gap-1 px-1.5 py-0.5 text-[9px]'
    : 'gap-1 px-2 py-1 text-[10px]'

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-amber-500/25 bg-amber-500/10 font-semibold leading-none text-amber-600 dark:text-amber-400 ${sizeClass}`}
    >
      <AlertTriangle size={compact ? 10 : 11} className="shrink-0" />
      <span>Expired</span>
    </span>
  )
}
