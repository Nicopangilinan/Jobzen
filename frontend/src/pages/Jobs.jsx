import { useState, useEffect } from 'react'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { jobsApi } from '../api/client'
import StatusBadge, { STATUS_CONFIG } from '../components/StatusBadge'
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
    <div className="space-y-4 h-full flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Applications</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">
            {jobs.length} application{jobs.length !== 1 ? 's' : ''} in pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded p-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`p-1 rounded-sm transition-colors ${view === 'kanban' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1 rounded-sm transition-colors ${view === 'list' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <List size={13} />
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'kanban' ? (
          /* Kanban Board */
          <div className="flex gap-3 h-full overflow-x-auto pb-2 items-start">
            {STATUSES.map(status => (
              <div key={status} className="w-64 shrink-0 flex flex-col max-h-full">
                <div className="flex items-center justify-between mb-2 px-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 capitalize">{STATUS_CONFIG[status].label}</h3>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {jobsByStatus[status].length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
                  {jobsByStatus[status].map(job => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="block card p-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                      <div className="flex items-start justify-between mb-1.5">
                        {job.company_logo_url ? (
                          <img src={job.company_logo_url} alt="" className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-800 object-contain bg-white p-0.5 shrink-0" onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0 border border-zinc-200 dark:border-zinc-700">
                            {job.company_name[0]}
                          </div>
                        )}
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{formatDistanceToNow(new Date(job.created_at))} ago</span>
                      </div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs leading-tight mb-0.5">{job.job_title}</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{job.company_name}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-500">
                        <span>{job.location || 'Remote'}</span>
                        {job.salary_min && <span>${job.salary_min/1000}k+</span>}
                      </div>
                    </Link>
                  ))}
                  {jobsByStatus[status].length === 0 && (
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded p-3 text-center text-zinc-400 dark:text-zinc-600 text-[11px]">
                      No items
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="card overflow-hidden">
            <table className="w-full text-left whitespace-nowrap">
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
                    <td className="td">
                      <Link to={`/jobs/${job.id}`} className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-medium hover:text-brand-500 transition-colors">
                        {job.company_logo_url ? (
                          <img src={job.company_logo_url} alt="" className="w-5 h-5 rounded border border-zinc-200 dark:border-zinc-800 object-contain bg-white p-0.5 shrink-0" onError={e => { e.target.style.display = 'none' }} />
                        ) : (
                          <div className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0">
                            {job.company_name[0]}
                          </div>
                        )}
                        {job.company_name}
                      </Link>
                    </td>
                    <td className="td">{job.job_title}</td>
                    <td className="td"><StatusBadge status={job.status} /></td>
                    <td className="td">{job.location || '—'}</td>
                    <td className="td capitalize">{job.work_type || '—'}</td>
                    <td className="td text-right">{new Date(job.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="td text-center text-zinc-400 py-8">
                      No applications yet. Click "Add" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />}
    </div>
  )
}
