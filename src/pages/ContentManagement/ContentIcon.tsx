type IconName = 'video' | 'pending' | 'calendar' | 'published' | 'folder' | 'library' | 'events'

export default function ContentIcon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'video' && <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m10 8 6 4-6 4z" /></>}
    {name === 'pending' && <><path d="M6 3h12M6 21h12M7 3c0 4 1 6 5 9-4 3-5 5-5 9M17 3c0 4-1 6-5 9 4 3 5 5 5 9" /></>}
    {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2" /></>}
    {name === 'published' && <path d="m4 12 5 5L20 6" />}
    {name === 'folder' && <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
    {name === 'library' && <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m10 8 5 4-5 4z" /></>}
    {name === 'events' && <><path d="M5 21V4m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0" /></>}
  </svg>
}
