import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { UserRound } from 'lucide-react'

export type LineContact = { lineUserId: string; displayName: string; pictureUrl: string; updatedAt: number }

const LineContactsContext = createContext<LineContact[]>([])

export function LineContactsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [contacts, setContacts] = useState<LineContact[]>([])
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch('/api/line-contacts', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { contacts?: LineContact[] } | null) => { if (!cancelled && data?.contacts) setContacts(data.contacts) })
      .catch(() => { /* LINE contacts are optional; manual entry still works. */ })
    return () => { cancelled = true }
  }, [enabled])
  return <LineContactsContext.Provider value={contacts}>{children}</LineContactsContext.Provider>
}

export function useLineContacts() {
  return useContext(LineContactsContext)
}

// An order is mapped to a contact when its LINE name equals the contact's display name.
export function useLineContactByName(lineName: string) {
  const contacts = useLineContacts()
  return useMemo(() => {
    const key = lineName.trim().toLocaleLowerCase()
    return key ? contacts.find((contact) => contact.displayName.trim().toLocaleLowerCase() === key) : undefined
  }, [contacts, lineName])
}

export function LineAvatar({ lineName, size }: { lineName: string; size: number }) {
  const contact = useLineContactByName(lineName)
  const [failed, setFailed] = useState(false)
  if (contact?.pictureUrl && !failed) {
    return <img src={contact.pictureUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  }
  return <UserRound size={size} />
}

export function LineContactPicker({ onPick, label }: { onPick: (contact: LineContact) => void; label: string }) {
  const contacts = useLineContacts()
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const key = query.trim().toLocaleLowerCase()
    return key ? contacts.filter((contact) => contact.displayName.toLocaleLowerCase().includes(key)).slice(0, 6) : []
  }, [contacts, query])
  if (!contacts.length) return null
  return (
    <div className="line-picker">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={label} aria-label={label} />
      {matches.length > 0 && (
        <ul className="line-picker-list">
          {matches.map((contact) => (
            <li key={contact.lineUserId}>
              <button type="button" onClick={() => { onPick(contact); setQuery('') }}>
                <span className="line-picker-avatar">{contact.pictureUrl ? <img src={contact.pictureUrl} alt="" referrerPolicy="no-referrer" /> : <UserRound size={16} />}</span>
                <span className="line-picker-name">{contact.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
