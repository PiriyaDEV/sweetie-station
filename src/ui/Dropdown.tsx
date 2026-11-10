import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type OptionElement = ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>
type DropdownOption = { value: string; label: ReactNode; disabled?: boolean }

function optionsFrom(children: ReactNode): DropdownOption[] {
  const options: DropdownOption[] = []
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return
      const element = child as OptionElement
      if (element.type === 'option') options.push({ value: String(element.props.value ?? ''), label: element.props.children, disabled: element.props.disabled })
      else walk(element.props.children)
    })
  }
  walk(children)
  return options
}

/**
 * Styled replacement for a native <select>. Takes the same <option> children and an
 * onChange that receives `{ target: { value } }`, so call sites read like a select.
 * The open list uses DaisyUI's `menu` and flips upward when there is no room below.
 */
export function Dropdown({
  value,
  onChange,
  children,
  className = '',
  variant = 'field',
  disabled = false,
  triggerContent,
  align = 'start',
  ...rest
}: {
  value: string | number
  onChange: (event: { target: { value: string } }) => void
  children: ReactNode
  className?: string
  variant?: 'field' | 'pill' | 'bar' | 'status'
  disabled?: boolean
  triggerContent?: ReactNode
  align?: 'start' | 'end'
  'aria-label'?: string
}) {
  const options = optionsFrom(children)
  const selected = options.find((option) => option.value === String(value))
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setDropUp(spaceBelow < 300 && rect.top > spaceBelow)
    const current = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    current?.focus({ preventScroll: true })
    current?.scrollIntoView({ block: 'nearest' })
  }, [open])

  const choose = (option: DropdownOption) => {
    if (option.disabled) return
    setOpen(false)
    triggerRef.current?.focus()
    if (option.value !== String(value)) onChange({ target: { value: option.value } })
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'ArrowDown') { event.preventDefault(); items[Math.min(items.length - 1, index + 1)]?.focus() }
    else if (event.key === 'ArrowUp') { event.preventDefault(); items[Math.max(0, index - 1)]?.focus() }
    else if (event.key === 'Home') { event.preventDefault(); items[0]?.focus() }
    else if (event.key === 'End') { event.preventDefault(); items[items.length - 1]?.focus() }
    else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); triggerRef.current?.focus() }
      setOpen(false)
    }
  }

  return (
    <div className={`dd dd-${variant}${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`dd-trigger ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={rest['aria-label']}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
      >
        {triggerContent ?? <>
          <span className="dd-value">{selected?.label ?? '—'}</span>
          <ChevronDown size={variant === 'pill' ? 14 : 16} className="dd-chevron" aria-hidden="true" />
        </>}
      </button>
      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={rest['aria-label']}
          className={`menu dd-menu${dropUp ? ' drop-up' : ''}${align === 'end' ? ' align-end' : ''}`}
          onKeyDown={onListKeyDown}
        >
          {options.map((option) => {
            const isSelected = option.value === String(value)
            return (
              <li key={option.value}>
                <button type="button" role="option" aria-selected={isSelected} className={isSelected ? 'menu-active' : ''} disabled={option.disabled} onClick={() => choose(option)}>
                  <span className="dd-option-label">{option.label}</span>
                  {isSelected && <Check size={16} strokeWidth={2.6} aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
