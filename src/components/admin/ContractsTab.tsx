'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Loader2 } from 'lucide-react'

import { ResourceCalendarPanel } from '@/components/admin/dashboard/shared/ResourceCalendarPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'

interface ContractPeriod {
  id: string
  courierId: string | null
  startDate: string
  endDate: string
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
  paid: boolean
  autoRenew: boolean
  enabledWeekdays: unknown
  disabledDates: unknown
  courier?: { id: string; name: string } | null
}

interface Contract {
  id: string
  status: 'ENABLED' | 'DISABLED' | 'DELETED'
  paid: boolean
  autoRenew: boolean
  customer: { id: string; name: string; phone: string; isActive: boolean }
  courier: { id: string; name: string; phone: string; isActive: boolean } | null
  periods: ContractPeriod[]
}

function dateLabel(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale)
}

export function ContractsTab() {
  const { language } = useLanguage()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const locale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'
  const text = language === 'ru'
    ? { title: 'Контракты', empty: 'Контрактов пока нет', loading: 'Загрузка', paid: 'Оплачен', unpaid: 'Не оплачен', auto: 'Автопродление', disabled: 'Отключен' }
    : language === 'uz'
      ? { title: 'Shartnomalar', empty: 'Shartnomalar yo‘q', loading: 'Yuklanmoqda', paid: 'To‘langan', unpaid: 'To‘lanmagan', auto: 'Avtomatik uzaytirish', disabled: "O'chirilgan" }
      : { title: 'Contracts', empty: 'No contracts', loading: 'Loading', paid: 'Paid', unpaid: 'Unpaid', auto: 'Auto-renew', disabled: 'Disabled' }

  const fetchContracts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/contracts')
      if (!response.ok) return
      const data = await response.json()
      setContracts(Array.isArray(data?.contracts) ? data.contracts : [])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchContracts()
  }, [fetchContracts])

  return (
    <Card className="min-h-0 border-border/70">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70">
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" />{text.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{text.loading}</div> : contracts.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{text.empty}</p> : contracts.map((contract) => {
          const expanded = expandedId === contract.id
          const lastPeriod = contract.periods.at(-1)
          return (
            <div key={contract.id} className="border-b border-border/60 last:border-b-0">
              <div className="flex items-center gap-2 p-3">
                <Button type="button" variant="ghost" size="icon" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpandedId(expanded ? null : contract.id)}>
                  {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{contract.customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{contract.courier?.name ?? '—'} · {lastPeriod ? `${dateLabel(lastPeriod.startDate, locale)} — ${dateLabel(lastPeriod.endDate, locale)}` : '—'}</p>
                </div>
                <Badge variant={contract.status === 'ENABLED' ? 'default' : 'outline'}>{contract.status === 'ENABLED' ? (contract.paid ? text.paid : text.unpaid) : text.disabled}</Badge>
              </div>
              {expanded ? (
                <div className="grid gap-3 border-t border-border/60 bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {contract.autoRenew ? <Badge variant="outline">{text.auto}</Badge> : null}
                      {contract.periods.map((period) => (
                        <Badge key={period.id} variant={period.status === 'ENABLED' ? 'secondary' : 'outline'}>
                          {dateLabel(period.startDate, locale)} — {dateLabel(period.endDate, locale)} · {period.courier?.name ?? contract.courier?.name ?? '—'}
                        </Badge>
                      ))}
                    </div>
                    {contract.periods.map((period) => (
                      <div key={period.id} className="border-l-2 border-primary/50 pl-3 text-xs">
                        <p>{Array.isArray(period.enabledWeekdays) ? period.enabledWeekdays.join(', ') : '—'}</p>
                        <p className="text-muted-foreground">{Array.isArray(period.disabledDates) && period.disabledDates.length > 0 ? period.disabledDates.join(', ') : '—'}</p>
                      </div>
                    ))}
                  </div>
                  <ResourceCalendarPanel resourceType="CONTRACT" resourceId={contract.id} compact />
                </div>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
