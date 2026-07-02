import { Briefcase } from 'lucide-react'
import monogram from '../album/JZdark.png'

export default function Login() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-zinc-950 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="hidden lg:block">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
              Job Search Command Center
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              A calmer, sharper workspace for every application.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-zinc-500 dark:text-zinc-400">
              Track opportunities, evaluate fit, and keep your search moving with a UI that stays focused across desktop, tablet, and mobile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">Pipeline tracking</span>
              <span className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">AI role matching</span>
              <span className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">Google sign-in</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="mb-6 text-center lg:hidden">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <img src={monogram} alt="Jobzen" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">jobzen</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Enterprise Job Application Pipeline
            </p>
          </div>

          <div className="card overflow-hidden p-6 sm:p-8">
            <div className="mb-6 hidden items-center gap-3 lg:flex">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <img src={monogram} alt="Jobzen" className="h-full w-full object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Access your workspace</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Authenticate via your corporate or personal Google account.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-3xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/60 lg:hidden">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Access your workspace</h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Authenticate via your corporate or personal Google account.
              </p>
            </div>

            <a
              href="/auth/google"
              className="btn-primary flex w-full justify-center gap-2.5 text-sm"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800/80">
              <p className="text-center text-xs leading-6 text-zinc-400 dark:text-zinc-500">
                By proceeding, you agree to our Service Terms and confirm that access is authorized under company policy.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-zinc-400 dark:text-zinc-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800/80">
                <Briefcase size={12} /> Pipeline tracking
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800/80">AI matching</span>
              <span className="rounded-full bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800/80">Security first</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
