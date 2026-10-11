'use client'

import { useCallback, useEffect, useState } from 'react'
import { Headphones, MessageSquarePlus, Briefcase, Building2, ClipboardList, Shield, Star, Truck, UserCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// C8 / R27: the contacts layer is a second left rail with the same grammar as
// ResourcePageRail (width, size-14 icon squares) — colored with the contact
// color. On narrow screens the layer collapses into a Sheet.

export const CONTACT_ICON_COMPONENTS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  shield: Shield,
  truck: Truck,
  clipboard: ClipboardList,
  'user-check': UserCheck,
  headphones: Headphones,
  building: Building2,
  star: Star,
}

export function getContactIconComponent(icon: string): LucideIcon {
  return CONTACT_ICON_COMPONENTS[icon] ?? UserCheck
}

export interface ChatContactsRailContact {
  id: string
  type: 'ADMIN' | 'SYSTEM'
  state: 'ENABLED' | 'DISABLED' | 'DELETED'
  name: string
  color: string
  icon: string
  conversationId: string | null
  adminId: string | null
  unreadCount: number
}

type ChatContactsRailProps = {
  contacts: readonly ChatContactsRailContact[]
  onCreateContact: () => void
  onOpenContact: (contact: ChatContactsRailContact) => void
  activeConversationId?: string | null
  labels: { title: string; create: string; narrowOpen: string }
}

const contactSquare =
  'relative flex size-14 shrink-0 items-center justify-center rounded-[8px] border shadow-none transition-transform duration-150 active:scale-[.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function ContactSquare({ contact, active, onOpen, narrow = false }: { contact: ChatContactsRailContact; active: boolean; onOpen: () => void; narrow?: boolean }) {
  const Icon = getContactIconComponent(contact.icon)
  return (
    <button
      type="button"
      aria-label={contact.name}
      title={contact.name}
      data-reference-chat-contact-square={narrow ? undefined : contact.id}
      data-reference-chat-contact-square-narrow={narrow ? contact.id : undefined}
      onClick={onOpen}
      className={cn(
        contactSquare,
        'border-transparent hover:scale-[1.04]',
        active && 'ring-2 ring-ring ring-offset-1 ring-offset-background',
        contact.state === 'DISABLED' && 'opacity-50',
      )}
      style={{ backgroundColor: contact.color }}
    >
      <Icon className="size-6 text-white" strokeWidth={1.9} aria-hidden="true" />
      {contact.unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white" aria-label={`${contact.unreadCount}`}>
          {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
        </span>
      ) : null}
    </button>
  )
}

export function ChatContactsRail({ contacts, onCreateContact, onOpenContact, activeConversationId, labels }: ChatContactsRailProps) {
  const [isNarrowSheetOpen, setIsNarrowSheetOpen] = useState(false)
  const openContact = useCallback((contact: ChatContactsRailContact) => {
    setIsNarrowSheetOpen(false)
    onOpenContact(contact)
  }, [onOpenContact])

  const squares = (onOpen: (contact: ChatContactsRailContact) => void, narrow = false) => (
    <>
      {contacts.map((contact) => (
        <ContactSquare key={contact.id} contact={contact} active={Boolean(contact.conversationId) && contact.conversationId === activeConversationId} onOpen={() => onOpen(contact)} narrow={narrow} />
      ))}
    </>
  )

  return (
    <>
      {/* Desktop: the second left layer, grammatically equal to the page rail. */}
      <nav
        aria-label={labels.title}
        data-reference-chat-contacts-rail="true"
        className="hidden w-16 shrink-0 flex-col border-r border-border/40 bg-background py-2 lg:flex lg:w-[72px]"
      >
        <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-1">
          {squares(openContact)}
        </div>
        <button
          type="button"
          aria-label={labels.create}
          title={labels.create}
          data-reference-chat-contact-create="true"
          onClick={onCreateContact}
          className="mx-1 flex size-14 shrink-0 items-center justify-center rounded-[8px] border border-primary/45 bg-primary/[0.10] text-primary/85 shadow-none transition-colors duration-150 active:scale-[.95] hover:border-primary/60 hover:bg-primary/[0.14] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageSquarePlus className="size-6" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </nav>

      {/* Narrow screens: the same layer as a Sheet. */}
      <div className="lg:hidden" data-reference-chat-contacts-sheet-root="true">
        <Sheet open={isNarrowSheetOpen} onOpenChange={setIsNarrowSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={labels.narrowOpen}
              title={labels.narrowOpen}
              data-reference-chat-contacts-sheet-trigger="true"
              className="absolute left-2 top-2 z-30 flex size-9 items-center justify-center rounded-[8px] border border-border bg-background/90 text-foreground shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex flex-col items-center gap-0.5">
                <span className="h-1 w-4 rounded-full bg-primary/70" />
                <span className="h-1 w-4 rounded-full bg-primary/40" />
                <span className="h-1 w-4 rounded-full bg-primary/70" />
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-20 p-2">
            <SheetHeader className="sr-only">
              <SheetTitle>{labels.title}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col items-center gap-2 overflow-y-auto">
              {squares(openContact, true)}
              <button
                type="button"
                aria-label={labels.create}
                data-reference-chat-contact-create-narrow="true"
                onClick={() => { setIsNarrowSheetOpen(false); onCreateContact() }}
                className="flex size-14 shrink-0 items-center justify-center rounded-[8px] border border-primary/45 bg-primary/[0.10] text-primary/85 shadow-none active:scale-[.95]"
              >
                <MessageSquarePlus className="size-6" aria-hidden="true" />
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

export function useChatContactsRailData(refreshSignal: number) {
  const [contacts, setContacts] = useState<ChatContactsRailContact[]>([])
  const load = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const bearer = window.localStorage.getItem('token')
      const response = await fetch('/api/chat/contacts', { headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined })
      if (!response.ok) return
      const data = await response.json().catch(() => null)
      if (Array.isArray(data?.contacts)) setContacts(data.contacts as ChatContactsRailContact[])
    } catch {
      // transient polling errors are ignored
    }
  }, [])
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(timer)
  }, [load, refreshSignal])
  return { contacts, reload: load }
}
