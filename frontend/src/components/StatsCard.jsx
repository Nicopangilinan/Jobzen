export default function StatsCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:   'border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
    blue:    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-400',
    amber:   'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400',
    red:     'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400',
    slate:   'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-[1.75rem]">{value ?? '—'}</p>
          {sub && <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{sub}</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${colors[color] || colors.brand}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}
