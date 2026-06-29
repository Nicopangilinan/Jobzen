const STATUS_CONFIG = {
  applied:      { label: 'Applied',      className: 'status-applied' },
  interviewing: { label: 'Interviewing', className: 'status-interviewing' },
  offer:        { label: 'Offer',        className: 'status-offer' },
  rejected:     { label: 'Rejected',     className: 'status-rejected' },
  withdrawn:    { label: 'Withdrawn',    className: 'status-withdrawn' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.applied
  const sizeClass = size === 'lg' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center gap-1 rounded font-medium select-none ${sizeClass} ${config.className}`}>
      <span className="w-1 h-1 rounded-full bg-current" />
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
