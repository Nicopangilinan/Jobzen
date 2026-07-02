import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

export default function Layout() {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  const pageMeta = useMemo(() => {
    if (location.pathname.startsWith('/jobs/')) {
      return {
        title: 'Application Detail',
        subtitle: 'Review notes, job match insights, and next actions.',
      }
    }

    const metaByPath = {
      '/dashboard': {
        title: 'Dashboard',
        subtitle: 'Track progress, outcomes, and recent momentum.',
      },
      '/jobs': {
        title: 'Applications',
        subtitle: 'Manage your pipeline in list or board view.',
      },
      '/settings': {
        title: 'Settings',
        subtitle: 'Update your profile, resume, and notification preferences.',
      },
    }

    return metaByPath[location.pathname] ?? {
      title: 'Jobzen',
      subtitle: 'Organize your search with clarity and momentum.',
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 lg:flex lg:h-screen lg:overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="relative flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/85 lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
                Jobzen
              </p>
              <h1 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {pageMeta.title}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>

        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mb-6 hidden lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
              Workspace
            </p>
            <div className="mt-1 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {pageMeta.title}
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {pageMeta.subtitle}
                </p>
              </div>
            </div>
          </div>

          <Outlet />
        </div>
      </main>
    </div>
  )
}
