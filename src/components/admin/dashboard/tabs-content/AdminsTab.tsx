'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Edit, Pause, Play, Plus, Trash2, Users } from 'lucide-react'

import type { Admin } from '@/components/admin/dashboard/types'
import {
  type AdminRoleOption,
  type EditAdminFormData,
  DEFAULT_EDIT_ADMIN_FORM,
} from '@/components/admin/dashboard/types'
import { mapLegacyAllowedTabId, type CanonicalTabId } from '@/components/admin/dashboard/tabs'
import { AllowedTabsPicker } from '@/components/admin/dashboard/AllowedTabsPicker'
import { FormField } from '@/components/admin/dashboard/shared/FormField'
import { EntityStatusBadge } from '@/components/admin/dashboard/shared/EntityStatusBadge'
import { CalendarDateSelector } from '@/components/admin/dashboard/shared/CalendarDateSelector'
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'
import type { DateRange } from 'react-day-picker'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchApi } from '@/lib/api-client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/icon-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TabsContent } from '@/components/ui/tabs'
import { SortableTableHeader, sortData, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import { TableFilterPanel, applyFilters, type FilterColumn } from '@/components/ui/table-filter-panel'

type PendingAction = 'toggle' | 'delete'
type FormMode = 'create' | 'edit'

function normalizeAllowedTabsForForm(tabs: string[] | null | undefined) {
  const inputTabs = Array.isArray(tabs) ? tabs : []
  const mapped = inputTabs.map(mapLegacyAllowedTabId)
  return Array.from(new Set(mapped))
}

function toRoleOption(role: string): AdminRoleOption {
  if (role === 'COURIER') return 'COURIER'
  if (role === 'WORKER') return 'WORKER'
  return 'LOW_ADMIN'
}

function parseSalaryInput(raw: string): number {
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return parsed
}

export function AdminsTab({
  lowAdmins,
  isLowAdminView,
  onRefresh,
  tabsCopy,
  orders = [],
  selectedDate,
  applySelectedDate,
  shiftSelectedDate,
  selectedDateLabel,
  selectedPeriod,
  applySelectedPeriod,
  selectedPeriodLabel,
  profileUiText = {} as any,
}: {
  lowAdmins: Admin[]
  isLowAdminView: boolean
  onRefresh: () => void
  tabsCopy: Record<CanonicalTabId, string>
  orders?: any[]
  selectedDate?: Date | null
  applySelectedDate?: (date: Date | null) => void
  shiftSelectedDate?: (days: number) => void
  selectedDateLabel?: string
  selectedPeriod?: DateRange | undefined
  applySelectedPeriod?: (range: DateRange | undefined) => void
  selectedPeriodLabel?: string
  profileUiText?: any
}) {
  const { t, language } = useLanguage()
  const calendarLocale = language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US'

  const [searchTerm, setSearchTerm] = useState('')
  const [pendingActions, setPendingActions] = useState<Record<string, PendingAction>>({})
  const [selectedAdminIds, setSelectedAdminIds] = useState<Set<string>>(() => new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isBulkMutating, setIsBulkMutating] = useState(false)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState<EditAdminFormData>({ ...DEFAULT_EDIT_ADMIN_FORM })

  // Mobile UX: allow a "swipe down to close" gesture on the admin create/edit dialog.
  const swipeStartRef = useRef<{ y: number; x: number; at: number } | null>(null)
  const swipeLockRef = useRef<'none' | 'close' | 'ignore'>('none')
  const [swipeOffset, setSwipeOffset] = useState(0)

  useEffect(() => {
    setSelectedAdminIds(new Set())
  }, [searchTerm])

  const roleLabel = useMemo(
    () => ({
      LOW_ADMIN: t.admin.lowAdmin,
      COURIER: t.courier.title,
      WORKER: t.admin.worker,
    }),
    [t.admin.lowAdmin, t.admin.worker, t.courier.title]
  )

  const salaryFormatter = useMemo(() => {
    if (language === 'uz') return new Intl.NumberFormat('uz-UZ')
    if (language === 'en') return new Intl.NumberFormat('en-US')
    return new Intl.NumberFormat('ru-RU')
  }, [language])

  const [salaryLedgerByAdminId, setSalaryLedgerByAdminId] = useState<
    Record<string, { balance: number; paid: number; accrued: number; days: number; withdrawnInRange: number }>
  >({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const controller = new AbortController()
    const asOf = (selectedPeriod?.to ?? selectedPeriod?.from ?? selectedDate ?? new Date()).toISOString()
    const from = (selectedPeriod?.from ?? selectedDate ?? null)?.toISOString() ?? ''
    const to = (selectedPeriod?.to ?? selectedPeriod?.from ?? selectedDate ?? null)?.toISOString() ?? ''

    void fetch(`/api/admin/finance/admin-balances?asOf=${encodeURIComponent(asOf)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (controller.signal.aborted) return
        const rows: any[] = Array.isArray(data?.admins) ? data.admins : []
        const next: Record<string, { balance: number; paid: number; accrued: number; days: number; withdrawnInRange: number }> = {}
        for (const row of rows) {
          if (!row || typeof row !== 'object') continue
          const id = (row as any).id
          if (typeof id !== 'string') continue
          const balance = Number((row as any).balance ?? 0)
          const paid = Number((row as any).paid ?? 0)
          const accrued = Number((row as any).accrued ?? 0)
          const days = Number((row as any).days ?? 0)
          const withdrawnInRange = Number((row as any).withdrawnInRange ?? 0)
          next[id] = {
            balance: Number.isFinite(balance) ? balance : 0,
            paid: Number.isFinite(paid) ? paid : 0,
            accrued: Number.isFinite(accrued) ? accrued : 0,
            days: Number.isFinite(days) ? days : 0,
            withdrawnInRange: Number.isFinite(withdrawnInRange) ? withdrawnInRange : 0,
          }
        }
        setSalaryLedgerByAdminId(next)
      })
      .catch(() => {
        // ignore transient loading failures
      })

    return () => controller.abort()
  }, [selectedDate, selectedPeriod])

  // Sort & Filter state
  const [sortStates, setSortStates] = useState<Record<string, SortState>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const adminColumns: SortableColumn[] = useMemo(() => [
    { key: 'name', label: t.admin.table.name, type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'role', label: t.admin.table.role, type: 'text' },
    { key: 'delivered', label: 'Delivered', type: 'number' },
    { key: 'notDelivered', label: 'Not Delivered', type: 'number' },
    { key: 'status', label: t.common.status, type: 'text' },
    { key: 'salary', label: t.finance.salary, type: 'number' },
    { key: 'balance', label: profileUiText.balance ?? 'Balance', type: 'number' },
    { key: 'withdrawn', label: 'Withdrawn', type: 'number' },
  ], [t, profileUiText.balance])

  const adminFilterColumns: FilterColumn[] = adminColumns

  const handleSortChange = useCallback((key: string, state: SortState) => {
    setSortStates((prev) => ({ ...prev, [key]: state }))
  }, [])

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleClearAllFilters = useCallback(() => {
    setFilterValues({})
  }, [])

  const filteredAdmins = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return [...lowAdmins]
      .filter((admin) => {
        if (!query) return true
        return admin.name.toLowerCase().includes(query) || admin.email.toLowerCase().includes(query)
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [lowAdmins, searchTerm])

  const processedAdmins = useMemo(() => {
    const flatRows = filteredAdmins.map((admin) => {
      const normalizedRole = toRoleOption(admin.role)
      const ledger = salaryLedgerByAdminId[admin.id]
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: roleLabel[normalizedRole] || admin.role,
        delivered: String(normalizedRole === 'COURIER' ? (adminStats[admin.id]?.delivered || 0) : ''),
        notDelivered: String(normalizedRole === 'COURIER' ? (adminStats[admin.id]?.notDelivered || 0) : ''),
        status: admin.isActive ? t.admin.table.active : t.admin.table.paused,
        salary: String(admin.salary ?? 0),
        balance: String(ledger ? Math.round(ledger.balance) : 0),
        withdrawn: String(ledger ? Math.round(ledger.withdrawnInRange) : 0),
        _original: admin,
      }
    })
    const filtered = applyFilters(flatRows as unknown as Record<string, unknown>[], filterValues, adminFilterColumns)
    const sorted = sortData(filtered as unknown as Record<string, unknown>[], sortStates, adminColumns)
    return sorted.map((row: Record<string, unknown>) => (row as { _original: Admin })._original)
  }, [filteredAdmins, filterValues, sortStates, adminFilterColumns, adminColumns, adminStats, salaryLedgerByAdminId, roleLabel, t])

  const selectedAdminsSnapshot = useMemo(
    () => filteredAdmins.filter((admin) => selectedAdminIds.has(admin.id)),
    [filteredAdmins, selectedAdminIds]
  )

  const shouldPauseSelectedAdmins = useMemo(() => {
    if (selectedAdminsSnapshot.length === 0) return false
    return selectedAdminsSnapshot.every((admin) => admin.isActive)
  }, [selectedAdminsSnapshot])

  const toggleAdminSelection = useCallback((adminId: string) => {
    setSelectedAdminIds((prev) => {
      const next = new Set(prev)
      if (next.has(adminId)) next.delete(adminId)
      else next.add(adminId)
      return next
    })
  }, [])

  const toggleSelectAllFilteredAdmins = useCallback((checked: boolean) => {
    setSelectedAdminIds(() => {
      if (!checked) return new Set()
      return new Set(filteredAdmins.map((admin) => admin.id))
    })
  }, [filteredAdmins])

  const adminStats = useMemo(() => {
    const stats: Record<string, { delivered: number, notDelivered: number }> = {}
    lowAdmins.forEach((a) => {
      stats[a.id] = { delivered: 0, notDelivered: 0 }
    })
    
    if (orders && orders.length > 0) {
      orders.forEach((order) => {
        if (!order.courierId) return
        if (!stats[order.courierId]) stats[order.courierId] = { delivered: 0, notDelivered: 0 }
        
        const status = order.orderStatus
        if (status === 'DELIVERED') {
          stats[order.courierId].delivered++
        } else if (status !== 'NEW' && status !== 'CANCELED') {
          stats[order.courierId].notDelivered++
        }
      })
    }
    return stats
  }, [lowAdmins, orders])

  const setPendingAction = useCallback((adminId: string, action: PendingAction | null) => {
    setPendingActions((prev) => {
      if (!action) {
        const { [adminId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [adminId]: action }
    })
  }, [])

  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_EDIT_ADMIN_FORM })
    setEditingAdmin(null)
    setFormError('')
    setIsSubmitting(false)
  }, [])

  const handleFormOpenChange = useCallback(
    (open: boolean) => {
      setIsFormModalOpen(open)
      if (!open) resetForm()
    },
    [resetForm]
  )

  const openCreateModal = () => {
    setFormMode('create')
    setFormData({ ...DEFAULT_EDIT_ADMIN_FORM })
    setIsFormModalOpen(true)
  }

  const openEditModal = (admin: Admin) => {
    setFormMode('edit')
    setEditingAdmin(admin)
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      role: toRoleOption(admin.role),
      salary: admin.salary || 0,
      isActive: admin.isActive,
      allowedTabs: normalizeAllowedTabsForForm(admin.allowedTabs),
    })
    setIsFormModalOpen(true)
  }

  const handleBulkToggleStatus = useCallback(async () => {
    if (selectedAdminsSnapshot.length === 0) return
    const targetIsActive = shouldPauseSelectedAdmins ? false : true

    setIsBulkMutating(true)
    try {
      for (const admin of selectedAdminsSnapshot) {
        setPendingAction(admin.id, 'toggle')
        try {
          const result = await fetchApi(`/api/admin/${admin.id}/toggle-status`, {
            method: 'PATCH',
            body: { isActive: targetIsActive },
          })
          if (!result.ok) {
            toast.error(result.error || t.common.error)
          }
        } finally {
          setPendingAction(admin.id, null)
        }
      }

      onRefresh()
      setSelectedAdminIds(new Set())
    } finally {
      setIsBulkMutating(false)
    }
  }, [onRefresh, selectedAdminsSnapshot, setPendingAction, shouldPauseSelectedAdmins, t.common.error])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (formMode === 'edit' && !editingAdmin) return

    setIsSubmitting(true)
    setFormError('')

    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()
    const password = formData.password.trim()

    if (!name || !email) {
      setFormError('Name and email are required')
      setIsSubmitting(false)
      return
    }

    if (formMode === 'create' && formData.role !== 'WORKER' && password.length < 6) {
      setFormError('Password must be at least 6 characters')
      setIsSubmitting(false)
      return
    }

    if (formMode === 'edit' && password && password.length < 6) {
      setFormError('Password must be at least 6 characters')
      setIsSubmitting(false)
      return
    }

    const basePayload = {
      name,
      email,
      role: formData.role,
      salary: formData.salary,
      allowedTabs: formData.role === 'LOW_ADMIN' ? formData.allowedTabs : [],
    }

    try {
      if (formMode === 'create') {
        const result = await fetchApi('/api/admin/low-admins', {
          method: 'POST',
          body: {
            ...basePayload,
            ...(password ? { password } : {}),
          },
        })

        if (!result.ok) {
          setFormError(result.error || 'Failed to create admin')
          return
        }
      } else {
        const result = await fetchApi(`/api/admin/low-admins/${editingAdmin!.id}`, {
          method: 'PATCH',
          body: {
            ...basePayload,
            isActive: formData.isActive,
            ...(password ? { password } : {}),
          },
        })

        if (!result.ok) {
          setFormError(result.error || 'Failed to update admin')
          return
        }
      }

      onRefresh()
      handleFormOpenChange(false)
      toast.success(formMode === 'create' ? t.admin.createAdmin : t.common.save)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmBulkDeleteAdmins = useCallback(async () => {
    if (selectedAdminsSnapshot.length === 0) return

    setIsBulkMutating(true)
    try {
      for (const admin of selectedAdminsSnapshot) {
        setPendingAction(admin.id, 'delete')
        try {
          const result = await fetchApi(`/api/admin/low-admins/${admin.id}`, { method: 'DELETE' })
          if (!result.ok) {
            toast.error(result.error || t.common.error)
          }
        } finally {
          setPendingAction(admin.id, null)
        }
      }

      onRefresh()
      setSelectedAdminIds(new Set())
      setIsBulkDeleteOpen(false)
    } finally {
      setIsBulkMutating(false)
    }
  }, [onRefresh, selectedAdminsSnapshot, setPendingAction, t.common.error])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.resolve(onRefresh())
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  return (
    <>
      <TabsContent value="admins" className="space-y-4">
 <Card className="bg-card">
          <CardHeader className="space-y-4 pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>{t.admin.manageLowAdmins}</CardTitle>
                <CardDescription>{t.admin.manageLowAdminsDesc}</CardDescription>
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
                {applySelectedDate && (applySelectedPeriod ? Boolean(selectedPeriodLabel) : Boolean(selectedDateLabel)) && profileUiText && (
                  <div className="flex basis-full items-center gap-2 sm:basis-auto sm:mr-auto">
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
                    <RefreshIconButton
                      label={profileUiText?.refresh ?? 'Refresh'}
                      onClick={() => void handleRefresh()}
                      isLoading={isRefreshing}
                      iconSize="md"
                    />
                  </div>
                )}
                {!(applySelectedDate && (applySelectedPeriod ? Boolean(selectedPeriodLabel) : Boolean(selectedDateLabel)) && profileUiText) ? (
                  <RefreshIconButton
                    label={profileUiText?.refresh ?? 'Refresh'}
                    onClick={() => void handleRefresh()}
                    isLoading={isRefreshing}
                    iconSize="md"
                  />
                ) : null}
                {!isLowAdminView && (
                  <>
                    <Button
                      onClick={openCreateModal}
                      variant="default"
                      size="icon"
                      className="h-9 w-9"
                      aria-label={t.admin.create}
                      title={t.admin.create}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => void handleBulkToggleStatus()}
                      disabled={selectedAdminIds.size === 0 || isBulkMutating}
                      aria-label={shouldPauseSelectedAdmins ? t.admin.pause : t.admin.resume}
                      title={shouldPauseSelectedAdmins ? t.admin.pause : t.admin.resume}
                    >
                      {shouldPauseSelectedAdmins ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setIsBulkDeleteOpen(true)}
                      disabled={selectedAdminIds.size === 0 || isBulkMutating}
                      aria-label={`${t.admin.deleteSelected} (${selectedAdminIds.size})`}
                      title={`${t.admin.deleteSelected} (${selectedAdminIds.size})`}
                    >
                      {isBulkMutating ? (
                        <span className="text-xs">{t.common.loading}</span>
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                    {selectedAdminIds.size > 0 && (
                      <Badge variant="secondary" className="h-7 px-2 text-xs">
                        {selectedAdminIds.size}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <SearchPanel
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.admin.searchPlaceholder}
              />
            </div>
          </CardHeader>

          <CardContent className="pt-0">
 <div className="rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="h-9">
                    {!isLowAdminView && (
                      <TableHead className="w-[44px] px-2">
                        <Checkbox
                          aria-label="Select all admins"
                          checked={
                            processedAdmins.length > 0 && selectedAdminsSnapshot.length === processedAdmins.length
                              ? true
                              : selectedAdminsSnapshot.length > 0
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={(checked) => toggleSelectAllFilteredAdmins(checked === true)}
                        />
                      </TableHead>
                    )}
                    {adminColumns.map((col) => (
                      <SortableTableHeader
                        key={col.key}
                        column={col}
                        sortState={sortStates[col.key] || 'default'}
                        onSortChange={handleSortChange}
                        className={(col.key === 'balance' || col.key === 'withdrawn') ? 'text-right' : undefined}
                      />
                    ))}
                    <TableFilterPanel
                      open={filterOpen}
                      onOpenChange={setFilterOpen}
                      columns={adminFilterColumns}
                      filters={filterValues}
                      onFilterChange={handleFilterChange}
                      onClearAll={handleClearAllFilters}
                      title={tabsCopy.admins}
                    />
                    {!isLowAdminView && <TableHead className="w-[140px] text-right">{t.admin.table.actions}</TableHead>}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {processedAdmins.map((admin) => {
                    const normalizedRole = toRoleOption(admin.role)
                    const pendingAction = pendingActions[admin.id]

                    return (
                      <TableRow key={admin.id} className="h-10">
                        {!isLowAdminView && (
                          <TableCell className="px-2 py-1.5">
                            <Checkbox
                              aria-label={`Select admin ${admin.name}`}
                              checked={selectedAdminIds.has(admin.id)}
                              onCheckedChange={() => toggleAdminSelection(admin.id)}
                              disabled={Boolean(pendingAction) || isBulkMutating}
                            />
                          </TableCell>
                        )}
                        <TableCell className="py-1.5 font-medium">{admin.name}</TableCell>
                        <TableCell className="py-1.5 text-muted-foreground">{admin.email}</TableCell>
                        <TableCell className="py-1.5">{roleLabel[normalizedRole]}</TableCell>
                        <TableCell className="py-1.5 font-medium text-emerald-600">
                          {normalizedRole === 'COURIER' ? adminStats[admin.id]?.delivered || 0 : '-'}
                        </TableCell>
                        <TableCell className="py-1.5 font-medium text-rose-600">
                          {normalizedRole === 'COURIER' ? adminStats[admin.id]?.notDelivered || 0 : '-'}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <EntityStatusBadge
                            isActive={admin.isActive}
                            activeLabel={t.admin.table.active}
                            inactiveLabel={t.admin.table.paused}
                          />
                        </TableCell>
                        <TableCell className="py-1.5">
                          {admin.salary && admin.salary > 0 ? `${salaryFormatter.format(admin.salary)} UZS` : '-'}
                        </TableCell>
                        <TableCell className="py-1.5 text-right tabular-nums">
                          {salaryLedgerByAdminId[admin.id] ? (
                            <span
                              className={
                                salaryLedgerByAdminId[admin.id].balance > 0
                                  ? 'font-medium text-rose-600'
                                  : salaryLedgerByAdminId[admin.id].balance < 0
                                    ? 'font-medium text-emerald-600'
                                    : 'text-muted-foreground'
                              }
                              title={`Days: ${salaryLedgerByAdminId[admin.id].days}; Accrued: ${salaryFormatter.format(salaryLedgerByAdminId[admin.id].accrued)} UZS; Paid: ${salaryFormatter.format(salaryLedgerByAdminId[admin.id].paid)} UZS`}
                            >
                              {salaryLedgerByAdminId[admin.id].balance > 0 ? '+' : ''}
                              {salaryFormatter.format(Math.round(salaryLedgerByAdminId[admin.id].balance))} UZS
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 text-right tabular-nums">
                          {salaryLedgerByAdminId[admin.id] ? (
                            <span className="font-medium text-amber-700 dark:text-amber-300">
                              {salaryFormatter.format(Math.round(salaryLedgerByAdminId[admin.id].withdrawnInRange))} UZS
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        {!isLowAdminView && (
                          <TableCell className="py-1.5 text-right">
                            <IconButton
                              label={t.admin.edit}
                              variant="outline"
                              iconSize="sm"
                              onClick={() => openEditModal(admin)}
                              disabled={Boolean(pendingAction) || isBulkMutating}
                            >
                              <Edit className="size-4" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}

                  {processedAdmins.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={!isLowAdminView ? 11 : 9} className="h-20 text-center text-muted-foreground">
                        <div className="inline-flex items-center gap-2 text-sm">
                          <Users className="size-4" />
                          {t.admin.noAdminsFound}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <Dialog open={isFormModalOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent
          // Fixed height + flex layout so the form body can scroll on small screens.
          className="sm:max-w-[640px] h-[min(92svh,860px)] max-h-[92svh] flex flex-col overflow-hidden transition-transform duration-200"
          style={swipeOffset ? { transform: `translateY(${swipeOffset}px)` } : undefined}
        >
          <div
            className="mb-2 flex justify-center sm:hidden"
            onTouchStart={(event) => {
              const touch = event.touches[0]
              if (!touch) return
              swipeStartRef.current = { y: touch.clientY, x: touch.clientX, at: Date.now() }
              swipeLockRef.current = 'none'
              setSwipeOffset(0)
            }}
            onTouchMove={(event) => {
              const start = swipeStartRef.current
              const touch = event.touches[0]
              if (!start || !touch) return

              const dy = touch.clientY - start.y
              const dx = Math.abs(touch.clientX - start.x)

              if (swipeLockRef.current === 'none') {
                if (dy > 8 && dy > dx) swipeLockRef.current = 'close'
                else if (dx > 8 && dx > dy) swipeLockRef.current = 'ignore'
              }

              if (swipeLockRef.current !== 'close') return
              if (dy <= 0) return
              setSwipeOffset(Math.min(220, dy))
            }}
            onTouchEnd={() => {
              const shouldClose = swipeLockRef.current === 'close' && swipeOffset >= 90
              swipeStartRef.current = null
              swipeLockRef.current = 'none'

              if (shouldClose) {
                setSwipeOffset(0)
                handleFormOpenChange(false)
                return
              }

              setSwipeOffset(0)
            }}
            onTouchCancel={() => {
              swipeStartRef.current = null
              swipeLockRef.current = 'none'
              setSwipeOffset(0)
            }}
          >
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? t.admin.createAdmin : t.admin.edit}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? t.admin.manageLowAdminsDesc : editingAdmin?.email}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t.admin.table.name} htmlFor="admin-form-name">
                <Input
                  id="admin-form-name"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </FormField>

              <FormField label={t.auth.email} htmlFor="admin-form-email">
                <Input
                  id="admin-form-email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </FormField>

              <FormField
                label={t.admin.table.password}
                htmlFor="admin-form-password"
                hint={formMode === 'edit' ? t.admin.leaveEmpty : undefined}
              >
                <Input
                  id="admin-form-password"
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
                  required={formMode === 'create' && formData.role !== 'WORKER'}
                />
              </FormField>

              <FormField label={t.admin.table.role} htmlFor="admin-form-role">
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      role: value as AdminRoleOption,
                      allowedTabs: value === 'LOW_ADMIN' ? prev.allowedTabs : [],
                    }))
                  }
                >
                  <SelectTrigger id="admin-form-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW_ADMIN">{roleLabel.LOW_ADMIN}</SelectItem>
                    <SelectItem value="COURIER">{roleLabel.COURIER}</SelectItem>
                    <SelectItem value="WORKER">{roleLabel.WORKER}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={t.finance.salary} htmlFor="admin-form-salary">
                <Input
                  id="admin-form-salary"
                  type="number"
                  min={0}
                  value={formData.salary || 0}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      salary: parseSalaryInput(event.target.value),
                    }))
                  }
                />
              </FormField>
            </div>

            {formData.role === 'LOW_ADMIN' && (
 <div className="rounded-md bg-muted/20 p-3">
                <Label className="mb-2 block text-sm font-medium">{t.admin.interface}</Label>
                <AllowedTabsPicker
                  idPrefix="admin-form-tab"
                  value={formData.allowedTabs}
                  onChange={(next) => setFormData((prev) => ({ ...prev, allowedTabs: next }))}
                  copy={tabsCopy}
                />
              </div>
            )}

            {formMode === 'edit' && (
 <div className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2">
                <div className="text-sm">
                  <p className="font-medium">{t.common.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {formData.isActive ? t.admin.table.active : t.admin.table.paused}
                  </p>
                </div>
                <Checkbox
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isActive: checked === true }))
                  }
                />
              </div>
            )}

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            </div>

            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => handleFormOpenChange(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t.common.loading : formMode === 'create' ? t.admin.create : t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.deleteSelected}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkMutating}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBulkMutating || selectedAdminIds.size === 0}
              onClick={(event) => {
                event.preventDefault()
                void confirmBulkDeleteAdmins()
              }}
            >
              {isBulkMutating ? t.common.loading : t.admin.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
