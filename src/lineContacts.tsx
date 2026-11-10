import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LoaderCircle, Plus, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type LineContact = { lineUserId: string; displayName: string; pictureUrl: string; updatedAt: number }

type LineContactsState = { contacts: LineContact[]; loading: boolean }
const LineContactsContext = createContext<LineContactsState>({ contacts: [], loading: false })

export function LineContactsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [contacts, setContacts] = useState<LineContact[]>([])
  const [loading, setLoading] = useState(enabled)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch('/api/line-contacts', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { contacts?: LineContact[] } | null) => { if (!cancelled && data?.contacts) setContacts(data.contacts) })
      .catch(() => { /* LINE contacts are optional; manual entry still works. */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [enabled])
  return <LineContactsContext.Provider value={{ contacts, loading }}>{children}</LineContactsContext.Provider>
}

export function useLineContacts() {
  return useContext(LineContactsContext)
}

// An order is mapped to a contact when its LINE name equals the contact's display name.
export function useLineContactByName(lineName: string) {
  const { contacts } = useLineContacts()
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

export function LineNameField({ id, value, onChange, onPick, placeholder, newLabel }: {
  id: string
  value: string
  onChange: (value: string) => void
  onPick: (contact: LineContact) => void
  placeholder: string
  newLabel: (name: string) => string
}) {
  const { contacts, loading } = useLineContacts()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const key = value.trim().toLocaleLowerCase()
  const matches = useMemo(
    () => contacts.filter((contact) => !key || contact.displayName.toLocaleLowerCase().includes(key)).slice(0, 6),
    [contacts, key],
  )
  const exact = contacts.some((contact) => contact.displayName.trim().toLocaleLowerCase() === key)
  const showNew = key !== '' && !exact
  return (
    <div className="line-picker">
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => { onChange(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {open && (loading || matches.length > 0 || showNew) && (
        <ul className="line-picker-list">
          {loading && <li className="flex items-center gap-2 px-3 py-2 text-xs text-rose-700" role="status"><LoaderCircle size={15} className="animate-spin" />{t('lineContacts.loading')}</li>}
          {matches.map((contact) => (
            <li key={contact.lineUserId}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onPick(contact); setOpen(false) }}>
                <span className="line-picker-avatar">{contact.pictureUrl ? <img src={contact.pictureUrl} alt="" referrerPolicy="no-referrer" /> : <UserRound size={16} />}</span>
                <span className="line-picker-name">{contact.displayName}</span>
              </button>
            </li>
          ))}
          {showNew && (
            <li>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen(false)}>
                <span className="line-picker-avatar"><Plus size={16} /></span>
                <span className="line-picker-name">{newLabel(value.trim())}</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
