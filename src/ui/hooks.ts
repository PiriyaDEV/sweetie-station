import { useEffect, useRef, useState } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

/** Escape to close, Tab focus trap, initial focus and focus restore for modal dialogs. */
export function useDialogAccessibility(dialogRef: { current: HTMLElement | null }, onEscape: () => void) {
  const onEscapeRef = useRef(onEscape)
  useEffect(() => { onEscapeRef.current = onEscape }, [onEscape])
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const initialFocus = dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')
    const focusableSelector = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
    const visibleFocusableElements = () => [...dialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => !element.closest('[hidden]') && element.getClientRects().length > 0)
    initialFocus?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = visibleFocusableElements()
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [dialogRef])
}
