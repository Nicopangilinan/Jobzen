import { useState } from 'react'
import { X, Zap, Download, CheckCircle2, Copy, Check, Sparkles, FolderArchive, ToggleRight, Puzzle, ArrowRight } from 'lucide-react'

export default function ExtensionModal({ onClose }) {
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    // Create a temporary link to download extension.zip from API
    const link = document.createElement('a')
    link.href = '/api/v1/extension/download'
    link.download = 'JobZen-Extension.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Advance to setup guide step
    setStep(2)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('chrome://extensions')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-3 backdrop-blur-md" onClick={onClose}>
      <div 
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
              <Zap size={20} className="fill-brand-500/20" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">JobZen Chrome Extension</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {step === 1 ? 'Automate your job application tracking' : 'Quick Setup Guide (Step 2 of 2)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-5 text-white shadow-lg">
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                    <Sparkles size={12} /> Fast Track Feature
                  </span>
                  <h4 className="mt-2 text-xl font-extrabold tracking-tight">Capture Jobs in 1 Click</h4>
                  <p className="mt-1 text-xs text-brand-100 leading-relaxed">
                    Stop manually copying & pasting job listings. Capture roles directly from LinkedIn, Indeed, Glassdoor & more straight into your JobZen tracker.
                  </p>
                </div>
                {/* Decorative background glow */}
                <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Why use the Extension?
                </h5>
                <div className="grid gap-3">
                  <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h6 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Instant Auto-Fill</h6>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Automatically extracts Company Name, Job Title, Salary, Location & Link.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <h6 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Direct Dashboard Sync</h6>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Saves directly into your active job applications list seamlessly.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h6 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Full Job Description Capture</h6>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Grabs the entire description for high-accuracy AI resume matching.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 active:scale-[0.99]"
                >
                  <Download size={18} />
                  Download & Setup Extension
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Skip for now, continue manually
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Success Notification */}
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs">
                  <span className="font-bold">JobZen-Extension.zip downloaded!</span> Follow these quick steps to enable it in Chrome:
                </div>
              </div>

              {/* Setup Steps */}
              <div className="space-y-3.5">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                    1
                  </div>
                  <div className="space-y-1">
                    <h6 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <FolderArchive size={14} className="text-amber-500" /> Extract the ZIP file
                    </h6>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Unzip <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">JobZen-Extension.zip</code> to a folder on your computer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                    2
                  </div>
                  <div className="space-y-1">
                    <h6 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Puzzle size={14} className="text-blue-500" /> Open Chrome Extensions
                    </h6>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Type <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">chrome://extensions</code> in your browser address bar.
                    </p>
                    <button
                      onClick={handleCopyUrl}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copied ? 'Copied to clipboard!' : 'Copy chrome://extensions'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                    3
                  </div>
                  <div className="space-y-1">
                    <h6 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <ToggleRight size={14} className="text-purple-500" /> Enable Developer Mode & Load Unpacked
                    </h6>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Toggle <strong>Developer mode</strong> in the top-right corner, then click <strong>Load unpacked</strong> and select the extracted folder.
                    </p>
                  </div>
                </div>
              </div>

              {/* Done / Re-download Button */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={onClose}
                  className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white shadow transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Got it, I'm all set!
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full py-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  Download ZIP file again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
