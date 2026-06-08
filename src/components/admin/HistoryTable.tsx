'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { enUS, ru, uz } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconButton } from '@/components/ui/icon-button'
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLanguage } from '@/contexts/LanguageContext'
import { CalendarDateSelector } from '@/components/admin/dashboard/shared/CalendarDateSelector'
import type { DateRange } from 'react-day-picker'

interface ActionLog {
  id: string
  action: string
  entityType: string
  description: string
  createdAt: string
  admin: {
    name: string
    email: string
    role: string
  }
}

interface User {
  id: string
  name: string
  role: string
}

interface HistoryTableProps {
  role?: string
  limit?: number
  compactMode?: boolean
  selectedDate?: Date | null
  applySelectedDate?: (date: Date | null) => void
  shiftSelectedDate?: (days: number) => void
  selectedDateLabel?: string
  selectedPeriod?: DateRange | undefined
  applySelectedPeriod?: (range: DateRange | undefined) => void
  selectedPeriodLabel?: string
  profileUiText?: any
}

export function HistoryTable({ 
  role: _role, 
  limit = 10, 
  compactMode = false,
  selectedDate,
  applySelectedDate,
  shiftSelectedDate,
  selectedDateLabel,
  selectedPeriod,
  applySelectedPeriod,
  selectedPeriodLabel,
  profileUiText
}: HistoryTableProps) {
  const { t, language } = useLanguage()
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const dateLocale = language === 'ru' ? ru : language === 'uz' ? uz : enUS
  const calendarLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users-list', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch {
      // ignore transient dashboard loading failures
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      })

      if (selectedUser !== 'all') {
        params.append('adminId', selectedUser)
      }

      if (selectedPeriod?.from) {
        const toLocalIsoDate = (d: Date) => {
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          return `${yyyy}-${mm}-${dd}`
        }

        params.append('from', toLocalIsoDate(selectedPeriod.from))
        params.append('to', toLocalIsoDate(selectedPeriod.to ?? selectedPeriod.from))
      } else if (selectedDate) {
        params.append('date', selectedDate.toISOString())
      }

      const response = await fetch(`/api/admin/action-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
        setHasMore(data.hasMore || false)
      }
    } finally {
      setIsLoading(false)
    }
  }, [limit, page, selectedPeriod, selectedUser, selectedDate])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    setPage(0)
  }, [selectedUser, selectedPeriod, selectedDate])

  function getActionBadgeColor(action: string) {
    if (action.includes('CREATE')) return 'border-0 bg-background text-foreground'
    if (action.includes('UPDATE')) return 'border-0 bg-background text-foreground'
    if (action.includes('DELETE')) return 'border-0 bg-background text-foreground'
    return 'border-0 bg-background text-foreground'
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'SUPER_ADMIN':
        return t.admin.superAdmin
      case 'MIDDLE_ADMIN':
        return t.admin.middleAdmin
      case 'LOW_ADMIN':
        return t.admin.lowAdmin
      case 'COURIER':
        return t.courier.title
      case 'WORKER':
        return t.admin.worker
      default:
        return role
    }
  }

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return logs.filter((log) => {
      if (!query) return true

      const haystack = [
        log.action,
        log.entityType,
        log.description,
        log.admin.name,
        log.admin.role,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [logs, searchTerm])

  const pageRangeLabel = useMemo(() => {
    if (total === 0 || logs.length === 0) return `0 / ${total}`
    const start = page * limit + 1
    const end = page * limit + logs.length
    return `${start}-${end} / ${total}`
  }, [limit, logs.length, page, total])

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{t.admin.actionHistory}</CardTitle>
            <CardDescription>{t.admin.totalRecords}: {total}</CardDescription>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {users.length > 0 ? (
            <div className="min-w-0 md:max-w-[260px]">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="border-border bg-background">
                  <SelectValue placeholder={t.admin.allUsers} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.admin.allUsers}</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({getRoleLabel(user.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div />
          )}

          {/* Orders-tab style: wrap on mobile so actions never disappear off-screen. */}
          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
            <RefreshIconButton
              label={profileUiText?.refresh ?? 'Refresh'}
              onClick={() => void fetchLogs()}
              isLoading={isLoading}
              iconSize="sm"
            />

            {applySelectedDate &&
            (applySelectedPeriod ? Boolean(selectedPeriodLabel) : Boolean(selectedDateLabel)) &&
            profileUiText ? (
              <CalendarDateSelector
                selectedDate={selectedDate || null}
                applySelectedDate={applySelectedDate}
                shiftSelectedDate={shiftSelectedDate}
                selectedDateLabel={selectedPeriodLabel ?? selectedDateLabel}
                selectedPeriod={selectedPeriod}
                applySelectedPeriod={applySelectedPeriod}
                locale={calendarLocale}
                profileUiText={profileUiText}
              />
            ) : null}

            <SearchPanel
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t.admin.searchPlaceholder || 'Search logs'}
              className="w-full md:w-[320px] sm:w-[260px] flex-none basis-full sm:basis-auto"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="hidden rounded-lg border-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.user}</TableHead>
                <TableHead>{t.common.action}</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>{t.common.description}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {searchTerm ? t.admin.noMatches : t.admin.emptyHistory}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className={compactMode ? 'h-8' : ''}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{log.admin.name}</span>
                        <span className="text-xs text-muted-foreground">{getRoleLabel(log.admin.role)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entityType || 'UNKNOWN'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate" title={log.description}>
                      {log.description}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {isLoading && logs.length === 0 ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchTerm ? t.admin.noMatches : t.admin.emptyHistory}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="glass-card overflow-hidden">
                <CardHeader className="bg-muted/30 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{log.admin.name}</p>
                      <p className="text-xs text-muted-foreground">{getRoleLabel(log.admin.role)}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: dateLocale })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={getActionBadgeColor(log.action)}>
                      {log.action}
                    </Badge>
                    <Badge variant="outline">{log.entityType || 'UNKNOWN'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <IconButton
            label={t.common.back}
            variant="outline"
            iconSize="sm"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <div className="text-sm text-muted-foreground">
            {t.common.page} {page + 1} - {pageRangeLabel}
          </div>
          <IconButton
            label={t.common.next}
            variant="outline"
            iconSize="sm"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasMore || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </CardContent>
    </Card>
  )
}

