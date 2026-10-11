'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type ResourceDetailEntity = 'order' | 'client' | 'admin' | 'chat-contact'

export type ResourceDetailTransaction = {
  id: string
  amount: number
  type: string
  category?: string | null
  description?: string | null
  createdAt: string
  admin?: { id?: string; name?: string; role?: string } | null
  customer?: { id?: string; name?: string; phone?: string } | null
}

export type ResourceDetailContract = {
  id: string
  type: string
  title: string
  status: string
  startedAt: string
  endsAt?: string | null
  terms: Record<string, unknown>
}

export type ResourceDetailAction = {
  id: string
  action?: string
  entityType?: string | null
  entityId?: string | null
  description?: string | null
  details?: string | null
  createdAt: string
  eventType?: string
  message?: string | null
  actorName?: string | null
  previousStatus?: string | null
  nextStatus?: string | null
  admin?: { name?: string; role?: string } | null
}

export type ResourceDetailOrder = {
  id: string
  orderNumber: number
  orderStatus: string
  paymentStatus: string
  deliveryDate?: string | null
  createdAt: string
  amountReceived?: number | null
  customer?: { id?: string; name?: string; phone?: string } | null
}

export type ResourceDetailProvisioningMessage = {
  id: string
  content: string
  createdAt: string
  systemCode?: string | null
}

export type ResourceDetailPayload = {
  entity: ResourceDetailEntity
  id: string
  resource: Record<string, unknown>
  transactions: ResourceDetailTransaction[]
  contracts: ResourceDetailContract[]
  actions: ResourceDetailAction[]
  relatedOrders: ResourceDetailOrder[]
}

type ResourceDetailSectionsProps = {
  detail: ResourceDetailPayload
  locale?: string
}

function formatAmount(value: number, locale = 'ru-RU') {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale)
}

export type ChatContactProfile = {
  id: string
  name: string
  phone: string
  state?: string
  type?: string
  color?: string
  icon?: string
  createdAt?: string
  admin?: { id?: string; name?: string; email?: string; phone?: string | null; role?: string; isActive?: boolean; createdAt?: string } | null
  provisioningMessages?: ResourceDetailProvisioningMessage[]
}

type DetailLabels = {
  transactions: string
  records: string
  contracts: string
  actions: string
  relatedOrders: string
  noTransactions: string
  noContracts: string
  noActions: string
  noRelatedOrders: string
  yes: string
  no: string
  system: string
  action: string
  contactProfile: string
  contactAccount: string
  contactState: string
  provisioning: string
}

function getDetailLabels(locale: string): DetailLabels {
  if (locale.toLowerCase().startsWith('ru')) {
    return {
      transactions: 'Транзакции', records: 'записей', contracts: 'Контракты', actions: 'Действия', relatedOrders: 'Связанные заказы',
      noTransactions: 'Нет транзакций', noContracts: 'Нет контрактов', noActions: 'Нет действий', noRelatedOrders: 'Нет связанных заказов',
      yes: 'Да', no: 'Нет', system: 'Система', action: 'Действие',
      contactProfile: 'Профиль контакта', contactAccount: 'Аккаунт', contactState: 'Состояние', provisioning: 'Системные сообщения',
    }
  }
  if (locale.toLowerCase().startsWith('uz')) {
    return {
      transactions: 'Tranzaksiyalar', records: 'yozuv', contracts: 'Shartnomalar', actions: 'Amallar', relatedOrders: 'Bog‘liq buyurtmalar',
      noTransactions: 'Tranzaksiyalar yo‘q', noContracts: 'Shartnomalar yo‘q', noActions: 'Amallar yo‘q', noRelatedOrders: 'Bog‘liq buyurtmalar yo‘q',
      yes: 'Ha', no: 'Yo‘q', system: 'Tizim', action: 'Amal',
      contactProfile: 'Kontakt profili', contactAccount: 'Akkaunt', contactState: 'Holat', provisioning: 'Tizim xabarlari',
    }
  }
  return {
    transactions: 'Transactions', records: 'records', contracts: 'Contracts', actions: 'Actions', relatedOrders: 'Related orders',
    noTransactions: 'No transactions', noContracts: 'No contracts', noActions: 'No actions', noRelatedOrders: 'No related orders',
    yes: 'Yes', no: 'No', system: 'System', action: 'Action',
    contactProfile: 'Contact profile', contactAccount: 'Account', contactState: 'State', provisioning: 'System messages',
  }
}

function formatTerm(value: unknown, locale: string, labels: DetailLabels): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? labels.yes : labels.no
  if (typeof value === 'number') return formatAmount(value, locale)
  if (typeof value === 'string') return value
  if (value instanceof Date) return formatDate(value.toISOString(), locale)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-4 text-sm text-muted-foreground">{text}</p>
}

export function ResourceDetailSections({ detail, locale = 'ru-RU' }: ResourceDetailSectionsProps) {
  const labels = useMemo(() => getDetailLabels(locale), [locale])
  const total = useMemo(
    () => detail.transactions.reduce((sum, transaction) => sum + (transaction.type === 'EXPENSE' ? -transaction.amount : transaction.amount), 0),
    [detail.transactions]
  )

  const contactProfile = detail.entity === 'chat-contact'
    ? (detail.resource as unknown as ChatContactProfile)
    : null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {contactProfile ? (
        <Card className="border bg-card lg:col-span-2" data-reference-chat-contact-details="true">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{labels.contactProfile}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md text-sm font-semibold text-white" style={{ backgroundColor: contactProfile.color ?? '#64748b' }}>
                {contactProfile.type === 'SYSTEM' ? 'S' : contactProfile.name?.[0] || '?'}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{contactProfile.name}</p>
                <p className="truncate text-xs text-muted-foreground">{contactProfile.phone}</p>
              </div>
              <Badge variant="outline" className="ml-auto">{contactProfile.state ?? '—'}</Badge>
            </div>
            {contactProfile.admin ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">{labels.contactAccount}</dt>
                <dd className="truncate text-right">{contactProfile.admin.name} · {contactProfile.admin.role ?? ''}</dd>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate text-right">{contactProfile.admin.email ?? '—'}</dd>
                <dt className="text-muted-foreground">{labels.contactState}</dt>
                <dd className="truncate text-right">{contactProfile.admin.isActive === false ? labels.no : labels.yes}</dd>
                <dt className="text-muted-foreground">{labels.records}</dt>
                <dd className="truncate text-right">{formatDate(contactProfile.admin.createdAt ?? null, locale)}</dd>
              </dl>
            ) : null}
            {contactProfile.provisioningMessages && contactProfile.provisioningMessages.length > 0 ? (
              <div className="space-y-1.5 border-t pt-2">
                <p className="text-xs font-medium text-muted-foreground">{labels.provisioning}</p>
                {contactProfile.provisioningMessages.map((message) => (
                  <div key={message.id} className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                    <p>{message.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(message.createdAt, locale)}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      <Card className="border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{labels.transactions}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {detail.transactions.length === 0 ? <EmptyState text={labels.noTransactions} /> : (
            <>
              <div className="flex items-center justify-between border-b pb-2 text-xs text-muted-foreground">
                <span>{detail.transactions.length} {labels.records}</span>
                <span className={total >= 0 ? 'text-emerald-600' : 'text-destructive'}>{formatAmount(total, locale)}</span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {detail.transactions.map((transaction) => (
                  <div key={transaction.id} className="grid grid-cols-[1fr_auto] gap-2 border-b pb-2 text-sm last:border-0">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{transaction.description || transaction.category || transaction.type}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt, locale)}{transaction.customer?.name ? ` · ${transaction.customer.name}` : ''}</p>
                    </div>
                    <span className={transaction.type === 'EXPENSE' ? 'text-destructive' : 'text-emerald-600'}>
                      {transaction.type === 'EXPENSE' ? '−' : '+'}{formatAmount(transaction.amount, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{labels.contracts}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.contracts.length === 0 ? <EmptyState text={labels.noContracts} /> : detail.contracts.map((contract) => (
            <div key={contract.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{contract.title}</span>
                <Badge variant="outline">{contract.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{contract.type} · {formatDate(contract.startedAt, locale)}{contract.endsAt ? ` → ${formatDate(contract.endsAt, locale)}` : ''}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {Object.entries(contract.terms).map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd className="truncate text-right">{formatTerm(value, locale, labels)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{labels.actions}</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.actions.length === 0 ? <EmptyState text={labels.noActions} /> : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {detail.actions.map((action) => (
                <div key={action.id} className="border-b pb-2 text-sm last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{action.message || action.description || action.action || action.eventType || labels.action}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(action.createdAt, locale)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{action.actorName || action.admin?.name || labels.system}{action.previousStatus || action.nextStatus ? ` · ${action.previousStatus || '—'} → ${action.nextStatus || '—'}` : ''}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{labels.relatedOrders}</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.relatedOrders.length === 0 ? <EmptyState text={labels.noRelatedOrders} /> : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {detail.relatedOrders.map((order) => (
                <div key={order.id} className="grid grid-cols-[1fr_auto] gap-2 border-b pb-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">Order #{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{order.customer?.name || ''} · {formatDate(order.deliveryDate || order.createdAt, locale)}</p>
                  </div>
                  <Badge variant="outline">{order.orderStatus}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
