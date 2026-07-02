import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Settings, LogOut, Sun, Moon, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'
import monogram from '../album/JZdark.png'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',      icon: Briefcase,       label: 'Jobs' },
  { to: '/settings',  icon: Settings,        label: 'Settings' },
]

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout, updateUser } = useAuth()

  const toggleTheme = async () => {
    const nextMode = !user?.dark_mode
    updateUser({ dark_mode: nextMode })
    localStorage.setItem('theme', nextMode ? 'dark' : 'light')
    try {
      await authApi.update({ dark_mode: nextMode })
    } catch (err) {
      console.error('Failed to update theme in profile:', err)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-zinc-950/45 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[86vw] max-w-72 flex-col border-r border-zinc-200 bg-white/95 shadow-2xl shadow-zinc-950/10 backdrop-blur-md transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-black/40 lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:bg-white lg:shadow-none dark:lg:bg-zinc-900 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand logo - Corporate minimalist */}
        <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <img src={monogram} alt="Jobzen" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">jobzen</span>
                <span className="block text-[10px] uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                  Career OS
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                v2.0
              </span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 lg:hidden"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
            Navigation
          </p>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                }`
              }
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition group-hover:border-zinc-300 group-hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-zinc-700 dark:group-hover:text-zinc-100">
                <Icon size={16} />
              </span>
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Area with Theme Toggle & User */}
        <div className="space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                {user?.dark_mode ? <Sun size={14} /> : <Moon size={14} />}
              </span>
              <div className="text-left">
                <span className="block">{user?.dark_mode ? 'Light Mode' : 'Dark Mode'}</span>
                <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">Adjust your workspace appearance</span>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Toggle</span>
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/70">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-full border border-zinc-200 object-cover dark:border-zinc-700" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">{user?.name}</p>
              <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
