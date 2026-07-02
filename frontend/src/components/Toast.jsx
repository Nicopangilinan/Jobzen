import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'

export default function Toast({ type = 'info', message, duration = 4000, onClose }) {
  useEffect(() => {
    if (type === 'loading' || !duration) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [type, duration, onClose])

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'border-emerald-500/20 bg-emerald-50/95 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200',
          icon: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
        }
      case 'error':
        return {
          bg: 'border-red-500/20 bg-red-50/95 text-red-800 dark:bg-red-950/80 dark:text-red-200',
          icon: <AlertTriangle size={16} className="text-red-400 shrink-0" />,
        }
      case 'loading':
        return {
          bg: 'border-brand-500/20 bg-white/95 text-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-100',
          icon: <Loader2 size={16} className="text-brand-400 animate-spin shrink-0" />,
        }
      default:
        return {
          bg: 'border-zinc-200 bg-white/95 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-200',
          icon: <Loader2 size={16} className="text-zinc-400 shrink-0" />,
        }
    }
  }

  const theme = getTheme()

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 animate-slide-in sm:inset-x-auto sm:bottom-5 sm:right-5">
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-zinc-950/10 backdrop-blur-md transition-all dark:shadow-black/30 sm:max-w-md ${theme.bg}`}>
        {theme.icon}
        <span className="min-w-0 flex-1 text-sm font-medium leading-5">{message}</span>
        {type !== 'loading' && (
          <button
            onClick={onClose}
            className="ml-1 rounded-xl p-1 text-current opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
