export default function StatsCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:   'text-zinc-900 bg-zinc-100 dark:text-zinc-100 dark:bg-zinc-800',
    blue:    'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20',
    amber:   'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20',
    emerald: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20',
    red:     'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/20',
    slate:   'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800',
  }

  return (
    <div className="card p-3 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{value ?? '—'}</p>
        {sub && <p className="mt-0.5 text-[10px] text-zinc-500 truncate">{sub}</p>}
      </div>
      <div className={`p-1.5 rounded ${colors[color] || colors.brand} shrink-0`}>
        <Icon size={14} />
      </div>
    </div>
  )
}
