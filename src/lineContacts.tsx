import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LoaderCircle, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import sweetieAvatar from './assets/sweetie-avatar.webp'

/** Compare LINE names ignoring case, spaces, emoji and punctuation ("Pound 🐻" matches "pound"). */
function normalizeLineName(name: string) {
  return name.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '')
}

export type LineContact = { lineUserId: string; displayName: string; pictureUrl: string; updatedAt: number }

type LineContactsState = { contacts: LineContact[]; loading: boolean; knownNames: string[] }
const LineContactsContext = createContext<LineContactsState>({ contacts: [], loading: false, knownNames: [] })

/** knownNames: LINE names already used in sheet orders, so customers who never messaged the LINE OA can still be found. */
export function LineContactsProvider({ enabled, knownNames = [], children }: { enabled: boolean; knownNames?: string[]; children: ReactNode }) {
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
  const value = useMemo(() => ({ contacts, loading, knownNames }), [contacts, loading, knownNames])
  return <LineContactsContext.Provider value={value}>{children}</LineContactsContext.Provider>
}

export function useLineContacts() {
  return useContext(LineContactsContext)
}

// An order is mapped to a contact when its LINE name matches the contact's display name.
export function useLineContactByName(lineName: string) {
  const { contacts } = useLineContacts()
  return useMemo(() => {
    const exactKey = lineName.trim().toLocaleLowerCase()
    if (!exactKey) return undefined
    const exact = contacts.find((contact) => contact.displayName.trim().toLocaleLowerCase() === exactKey)
    if (exact) return exact
    const looseKey = normalizeLineName(lineName)
    return looseKey ? contacts.find((contact) => normalizeLineName(contact.displayName) === looseKey) : undefined
  }, [contacts, lineName])
}

export function LineAvatar({ lineName }: { lineName: string; size?: number; initials?: boolean }) {
  const contact = useLineContactByName(lineName)
  const [failed, setFailed] = useState(false)
  if (contact?.pictureUrl && !failed) {
    return <img src={contact.pictureUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  }
  // No LINE photo: show the Sweetie Station logo.
  return <img src={sweetieAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
}

export function LineNameField({ id, value, onChange, onPick, placeholder, newLabel }: {
  id: string
  value: string
  onChange: (value: string) => void
  onPick: (contact: LineContact) => void
  placeholder: string
  newLabel: (name: string) => string
}) {
  const { contacts, loading, knownNames } = useLineContacts()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const key = value.trim().toLocaleLowerCase()
  // LINE OA contacts first, then names already used in the sheets that are not contacts yet.
  const pool = useMemo(() => {
    const seen = new Set(contacts.map((contact) => normalizeLineName(contact.displayName)))
    const fromSheets: LineContact[] = []
    for (const name of knownNames) {
      const normalized = normalizeLineName(name)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      fromSheets.push({ lineUserId: `sheet:${normalized}`, displayName: name.trim(), pictureUrl: '', updatedAt: 0 })
    }
    return [...contacts, ...fromSheets]
  }, [contacts, knownNames])
  const matches = useMemo(() => {
    const found = pool.filter((contact) => !key || contact.displayName.toLocaleLowerCase().includes(key))
    // Names that start with what was typed come first, so "p" finds "pound" before "aomsin p".
    found.sort((a, b) => Number(b.displayName.toLocaleLowerCase().startsWith(key)) - Number(a.displayName.toLocaleLowerCase().startsWith(key)))
    return found.slice(0, 8)
  }, [pool, key])
  const exact = pool.some((contact) => contact.displayName.trim().toLocaleLowerCase() === key)
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
          {loading && <li className="flex items-center gap-2 px-3 py-2 text-xs text-pink-ink" role="status"><LoaderCircle size={15} className="animate-spin" />{t('lineContacts.loading')}</li>}
          {matches.map((contact) => (
            <li key={contact.lineUserId}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onPick(contact); setOpen(false) }}>
                <span className="line-picker-avatar">{contact.pictureUrl ? <img src={contact.pictureUrl} alt="" referrerPolicy="no-referrer" /> : <img src={sweetieAvatar} alt="" />}</span>
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
