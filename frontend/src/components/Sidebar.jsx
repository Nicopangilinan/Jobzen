import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, Settings, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'
import monogram from '../album/JZmonogram.png'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',      icon: Briefcase,       label: 'Jobs' },
  { to: '/settings',  icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
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
    <aside className="w-56 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shrink-0 select-none">
      {/* Brand logo - Corporate minimalist */}
      <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded overflow-hidden flex items-center justify-center">
              <img src={monogram} alt="Jobzen" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">jobzen</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
            v1.0
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`
            }
          >
            <Icon size={14} className="opacity-70" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer Area with Theme Toggle & User */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-2 py-1 rounded text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            {user?.dark_mode ? (
              <>
                <Sun size={13} className="opacity-70" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={13} className="opacity-70" />
                <span>Dark Mode</span>
              </>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500">Toggle</span>
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-1 rounded text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut size={13} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
