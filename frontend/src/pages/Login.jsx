import { Briefcase } from 'lucide-react'
import monogram from '../album/JZmonogram.png'

export default function Login() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded mb-3 select-none overflow-hidden">
            <img src={monogram} alt="Jobzen" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">jobzen</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-xs">
            Enterprise Job Application Pipeline
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-6 bg-white dark:bg-zinc-900/40">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Access your workspace
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-5">
            Authenticate via your corporate or personal Google account.
          </p>

          <a
            href="/auth/google"
            className="flex items-center justify-center gap-2.5 w-full py-2 px-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-medium rounded border border-transparent transition-all select-none"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          <div className="mt-4 border-t border-zinc-150 dark:border-zinc-800/80 pt-3">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center leading-relaxed">
              By proceeding, you agree to our Service Terms and confirm that access is authorized under company policy.
            </p>
          </div>
        </div>

        {/* Small Footer / Features */}
        <div className="mt-6 flex justify-center gap-4 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <Briefcase size={10} /> Pipeline tracking
          </span>
          <span>•</span>
          <span>AI matching</span>
          <span>•</span>
          <span>Security first</span>
        </div>
      </div>
    </div>
  )
}
