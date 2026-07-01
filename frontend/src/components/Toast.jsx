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
          bg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200',
          icon: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
        }
      case 'error':
        return {
          bg: 'bg-red-950/80 border-red-500/30 text-red-200',
          icon: <AlertTriangle size={16} className="text-red-400 shrink-0" />,
        }
      case 'loading':
        return {
          bg: 'bg-brand-950/85 border-brand-500/30 text-brand-200',
          icon: <Loader2 size={16} className="text-brand-400 animate-spin shrink-0" />,
        }
      default:
        return {
          bg: 'bg-surface-800/90 border-slate-700/50 text-slate-200',
          icon: <Loader2 size={16} className="text-slate-400 shrink-0" />,
        }
    }
  }

  const theme = getTheme()

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg transition-all ${theme.bg}`}>
        {theme.icon}
        <span className="text-xs font-medium tracking-wide">{message}</span>
        {type !== 'loading' && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-current opacity-70 hover:opacity-100 transition-opacity ml-2"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
