import { useState, useEffect } from 'react'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { jobsApi } from '../api/client'
import StatusBadge, { STATUS_CONFIG } from '../components/StatusBadge'
import ExpiredBadge from '../components/ExpiredBadge'
import AddJobModal from '../components/AddJobModal'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

const STATUSES = Object.keys(STATUS_CONFIG)

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchJobs = () => {
    setLoading(true)
    jobsApi.list({ limit: 500 }).then(r => setJobs(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchJobs() }, [])

  const handleCreated = (job) => {
    setJobs([job, ...jobs])
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-zinc-900 dark:border-zinc-50 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const jobsByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = jobs.filter(j => j.status === status)
    return acc
  }, {})

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title text-2xl sm:text-[2rem]">Applications</h1>
          <p className="page-subtitle">
            {jobs.length} application{jobs.length !== 1 ? 's' : ''} in pipeline
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center rounded-2xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setView('kanban')}
              className={`flex min-h-[2.5rem] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <LayoutGrid size={15} />
              <span>Board</span>
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex min-h-[2.5rem] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${view === 'list' ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <List size={15} />
              <span>List</span>
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary sm:min-w-[10rem]">
            <Plus size={16} /> Add Application
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'kanban' ? (
          <div className="flex h-full items-start gap-3 overflow-x-auto pb-2">
            {STATUSES.map(status => (
              <div key={status} className="flex max-h-full w-[85vw] max-w-sm shrink-0 flex-col sm:w-80">
                <div className="mb-2 flex shrink-0 items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold capitalize text-zinc-700 dark:text-zinc-300">{STATUS_CONFIG[status].label}</h3>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-mono text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                      {jobsByStatus[status].length}
                    </span>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  {jobsByStatus[status].map(job => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="block card p-4 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        {job.company_logo_url ? (
                          <img src={job.company_logo_url} alt="" className="h-9 w-9 shrink-0 rounded-2xl border border-zinc-200 bg-white p-1 object-contain dark:border-zinc-800" onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-xs font-bold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                            {job.company_name[0]}
                          </div>
                        )}
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{formatDistanceToNow(new Date(job.created_at))} ago</span>
                      </div>
                      <h4 className="mb-1 text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{job.job_title}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{job.company_name}</p>
                      {job.is_active === false && (
                        <div className="mt-1">
                          <ExpiredBadge compact />
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                        <span>{job.location || 'Remote'}</span>
                        {job.salary_min && <span>${job.salary_min/1000}k+</span>}
                      </div>
                    </Link>
                  ))}
                  {jobsByStatus[status].length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
                      No items
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mobile-card-list">
              {jobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="card block p-4">
                  <div className="flex items-start gap-3">
                    {job.company_logo_url ? (
                      <img src={job.company_logo_url} alt="" className="h-10 w-10 shrink-0 rounded-2xl border border-zinc-200 bg-white p-1 object-contain dark:border-zinc-800" onError={e => { e.target.style.display = 'none' }} />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sm font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800">
                        {job.company_name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{job.company_name}</p>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{job.job_title}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={job.status} />
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{job.location || 'No location'}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] capitalize text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{job.work_type || 'Unknown type'}</span>
                        {job.is_active === false && <ExpiredBadge />}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {jobs.length === 0 && (
                <div className="card p-6 text-center text-sm text-zinc-400">
                  No applications yet. Tap “Add Application” to get started.
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[780px] w-full text-left">
                    <thead>
                      <tr>
                        <th className="th">Company</th>
                        <th className="th">Role</th>
                        <th className="th">Status</th>
                        <th className="th">Location</th>
                        <th className="th">Type</th>
                        <th className="th text-right">Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map(job => (
                        <tr key={job.id} className="table-row">
                          <td className="td !py-2.5">
                            <Link to={`/jobs/${job.id}`} className="flex items-center gap-2 text-zinc-900 transition-colors hover:text-brand-500 dark:text-zinc-100">
                              {job.company_logo_url ? (
                                <img src={job.company_logo_url} alt="" className="h-8 w-8 shrink-0 rounded-2xl border border-zinc-200 bg-white p-1 object-contain dark:border-zinc-800" onError={e => { e.target.style.display = 'none' }} />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800">
                                  {job.company_name[0]}
                                </div>
                              )}
                              <span className="font-medium">{job.company_name}</span>
                            </Link>
                          </td>
                          <td className="td !py-2.5">{job.job_title}</td>
                          <td className="td !py-2.5">
                            <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                              <StatusBadge status={job.status} />
                              {job.is_active === false && <ExpiredBadge compact />}
                            </div>
                          </td>
                          <td className="td !py-2.5">{job.location || '—'}</td>
                          <td className="td !py-2.5 capitalize">{job.work_type || '—'}</td>
                          <td className="td !py-2.5 text-right">{new Date(job.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {jobs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="td py-8 text-center text-zinc-400">
                            No applications yet. Click "Add Application" to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />}
    </div>
  )
}
