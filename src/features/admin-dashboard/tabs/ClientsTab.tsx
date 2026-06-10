'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
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
import { SortableTableHeader, type SortState, type SortableColumn } from '@/components/ui/sortable-header'
import {
  Plus,
  Trash2,
  Pause,
  Play,
  Edit,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { Client, ClientFormData, Order } from '@/features/admin-dashboard/model'
import type { ProfileUiText } from '@/features/admin-dashboard/shell/types'
import { CalendarDateSelector } from '@/components/admin/dashboard/shared/CalendarDateSelector'
import { RefreshIconButton } from '@/components/admin/dashboard/shared/RefreshIconButton'
import { SearchPanel } from '@/components/ui/search-panel'
import { EntityStatusBadge } from '@/components/admin/dashboard/shared/EntityStatusBadge'
import { TableSkeleton, EmptyState } from '@/components/ui/states'
import { getDailyPrice, PLAN_TYPES } from '@/modules/warehouse/infrastructure/menu-data'
import { formatLatLng } from '@/modules/shared/geo'

const TableFilterPanel = dynamic(
  () => import('@/components/ui/table-filter-panel').then((mod) => mod.TableFilterPanel),
  { ssr: false }
)

const MiniLocationPickerMap = dynamic(
  () =>
    import('@/components/admin/dashboard/shared/MiniLocationPickerMap').then(
      (mod) => mod.MiniLocationPickerMap
    ),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-lg" /> }
)

export interface ClientsTabProps {
  // Data
  clients: Client[]
  orders: Order[]
  couriers: Array<{ id: string; name: string }>
  availableSets: Array<{ id: string; name: string; isActive?: boolean; calorieGroups?: any; groups?: any }>
  processedClients: Client[]
  filteredClients: Client[]
  selectedClients: Set<string>
  isMutatingClients: boolean
  isClientFinanceLoading: boolean
  clientFinanceById: Record<string, { balance: number; dailyPrice: number }>
  shouldPauseSelectedClients: boolean
  isLoading: boolean
  isDashboardRefreshing: boolean

  // Date selection
  selectedDate: Date | null
  applySelectedDate: (date: Date | null) => void
  shiftSelectedDate: (days: number) => void
  selectedPeriodLabel: string
  selectedPeriod: DateRange | undefined
  applySelectedPeriod: (period: DateRange | undefined) => void
  dateLocale: string

  // Search
  clientSearchTerm: string
  setClientSearchTerm: (term: string) => void

  // Client form state
  isCreateClientModalOpen: boolean
  setIsCreateClientModalOpen: (open: boolean) => void
  clientFormData: ClientFormData
  setClientFormData: React.Dispatch<React.SetStateAction<ClientFormData>>
  clientSelectedGroupId: string
  setClientSelectedGroupId: (id: string) => void
  clientGroupOptions: Array<{ id: string; name: string; price: number | null }>
  clientSelectedGroup: { id: string; name: string; price: number | null } | null
  clientAssignedSet: any
  editingClientId: string | null
  isCreatingClient: boolean
  clientError: string

  // Dialog states
  isDeleteClientsDialogOpen: boolean
  setIsDeleteClientsDialogOpen: (open: boolean) => void
  isPauseClientsDialogOpen: boolean
  setIsPauseClientsDialogOpen: (open: boolean) => void
  isResumeClientsDialogOpen: boolean
  setIsResumeClientsDialogOpen: (open: boolean) => void

  // Sort & filter state
  clientSortStates: Record<string, SortState>
  handleClientSortChange: (key: string, state: SortState) => void
  clientFilterOpen: boolean
  setClientFilterOpen: (open: boolean) => void
  clientFilterValues: Record<string, string>
  handleClientFilterChange: (key: string, value: string) => void
  handleClientClearAllFilters: () => void
  clientColumns: SortableColumn[]

  // Translations
  t: any
  language: string
  profileUiText: ProfileUiText

  // Callbacks
  onRefreshAll: () => void
  onCreateClient: (e: React.FormEvent) => void
  onOpenCreateClientModal: () => void
  onEditClient: (client: Client) => void
  onClientAddressChange: (value: string) => void
  onDeliveryDayChange: (day: string, checked: boolean) => void
  onToggleClientSelection: (clientId: string) => void
  onToggleClientStatus: (clientId: string, currentStatus: boolean) => void
  onDeleteSelectedClients: (opts?: { skipConfirm?: boolean }) => void
  onPauseSelectedClients: (opts?: { skipConfirm?: boolean }) => void
  onResumeSelectedClients: (opts?: { skipConfirm?: boolean }) => void
  onSetSelectedClients: React.Dispatch<React.SetStateAction<Set<string>>>
}

export function ClientsTab({
  clients,
  orders,
  couriers,
  availableSets,
  processedClients,
  filteredClients,
  selectedClients,
  isMutatingClients,
  isClientFinanceLoading,
  clientFinanceById,
  shouldPauseSelectedClients,
  isLoading,
  isDashboardRefreshing,
  selectedDate,
  applySelectedDate,
  shiftSelectedDate,
  selectedPeriodLabel,
  selectedPeriod,
  applySelectedPeriod,
  dateLocale,
  clientSearchTerm,
  setClientSearchTerm,
  isCreateClientModalOpen,
  setIsCreateClientModalOpen,
  clientFormData,
  setClientFormData,
  clientSelectedGroupId,
  setClientSelectedGroupId,
  clientGroupOptions,
  clientSelectedGroup,
  clientAssignedSet,
  editingClientId,
  isCreatingClient,
  clientError,
  isDeleteClientsDialogOpen,
  setIsDeleteClientsDialogOpen,
  isPauseClientsDialogOpen,
  setIsPauseClientsDialogOpen,
  isResumeClientsDialogOpen,
  setIsResumeClientsDialogOpen,
  clientSortStates,
  handleClientSortChange,
  clientFilterOpen,
  setClientFilterOpen,
  clientFilterValues,
  handleClientFilterChange,
  handleClientClearAllFilters,
  clientColumns,
  t,
  language,
  profileUiText,
  onRefreshAll,
  onCreateClient,
  onOpenCreateClientModal,
  onEditClient,
  onClientAddressChange,
  onDeliveryDayChange,
  onToggleClientSelection,
  onToggleClientStatus,
  onDeleteSelectedClients,
  onPauseSelectedClients,
  onResumeSelectedClients,
  onSetSelectedClients,
}: ClientsTabProps) {
  return (
    <>
      <Card className="bg-card">
        <CardHeader className="space-y-4 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>{t.admin.manageClients}</CardTitle>
              <CardDescription>
                {t.admin.manageClientsDesc}
              </CardDescription>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
              <CalendarDateSelector
                selectedDate={selectedDate}
                applySelectedDate={applySelectedDate}
                shiftSelectedDate={shiftSelectedDate}
                selectedDateLabel={selectedPeriodLabel}
                selectedPeriod={selectedPeriod}
                applySelectedPeriod={applySelectedPeriod}
                locale={dateLocale}
                profileUiText={profileUiText}
              />
              <RefreshIconButton
                label={profileUiText.refresh}
                onClick={() => void onRefreshAll()}
                isLoading={isLoading || isDashboardRefreshing}
                iconSize="md"
              />
              <Button
                size="icon"
                className="h-9 w-9"
                onClick={onOpenCreateClientModal}
                aria-label={profileUiText.createClient}
                title={profileUiText.createClient}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() =>
                  shouldPauseSelectedClients
                    ? setIsPauseClientsDialogOpen(true)
                    : setIsResumeClientsDialogOpen(true)
                }
                disabled={selectedClients.size === 0 || isMutatingClients}
                aria-label={shouldPauseSelectedClients ? t.admin.pause : t.admin.resume}
                title={shouldPauseSelectedClients ? t.admin.pause : t.admin.resume}
              >
                {shouldPauseSelectedClients ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsDeleteClientsDialogOpen(true)}
                disabled={selectedClients.size === 0 || isMutatingClients}
                aria-label={`${t.admin.deleteSelected} (${selectedClients.size})`}
                title={`${t.admin.deleteSelected} (${selectedClients.size})`}
              >
                {isMutatingClients ? (
                  <span className="text-xs">{t.common.loading}</span>
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
              {selectedClients.size > 0 && (
                <Badge variant="secondary" className="h-7 px-2 text-xs">
                  {selectedClients.size}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <SearchPanel
              value={clientSearchTerm}
              onChange={setClientSearchTerm}
              placeholder={profileUiText.searchClientPlaceholder}
            />
            <TableFilterPanel
              open={clientFilterOpen}
              onOpenChange={setClientFilterOpen}
              columns={clientColumns as any}
              filters={clientFilterValues}
              onFilterChange={handleClientFilterChange}
              onClearAll={handleClientClearAllFilters}
              title={language === 'ru' ? 'Фильтры клиентов' : language === 'uz' ? 'Mijozlar filtrlari' : 'Client Filters'}
            />
          </div>
              <Dialog open={isCreateClientModalOpen} onOpenChange={setIsCreateClientModalOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingClientId ? profileUiText.editClient : profileUiText.createClient}</DialogTitle>
                    <DialogDescription>
                      {editingClientId ? profileUiText.updateClientDetails : profileUiText.createClientDescription}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={onCreateClient}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientName" className="text-right">
                          {t.common.name}
                        </Label>
                        <Input
                          id="clientName"
                          value={clientFormData.name}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientNickName" className="text-right">
                          {profileUiText.nickname}
                        </Label>
                        <Input
                          id="clientNickName"
                          value={clientFormData.nickName || ''}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, nickName: e.target.value }))}
                          className="col-span-3"
                          placeholder={profileUiText.nicknamePlaceholder}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientPhone" className="text-right">
                          {t.common.phone}
                        </Label>
                        <div className="col-span-3">
                          <Input
                            id="clientPhone"
                            type="tel"
                            placeholder="+998 XX XXX XX XX"
                            value={clientFormData.phone}
                            onChange={(e) => setClientFormData(prev => ({ ...prev, phone: e.target.value }))}
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">{profileUiText.phoneFormat}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientAddress" className="text-right">
                          {t.common.address}
                        </Label>
                        <Input
                          id="clientAddress"
                          value={clientFormData.address}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, address: e.target.value }))}
                          className="col-span-3"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="googleMapsLink" className="text-right">
                          {profileUiText.mapLink}
                        </Label>

                        <Input
                          id="googleMapsLink"
                          placeholder="https://maps.google.com/..."
                          value={clientFormData.googleMapsLink || ''}
                          onChange={(e) => onClientAddressChange(e.target.value)}
                          className="col-span-3"
                        />
                      </div>

                      <div className="grid grid-cols-4 items-start gap-2">
                        <Label className="text-right">{profileUiText.map}</Label>
                        <div className="col-span-3 space-y-2">
                          <div className="rounded-xl overflow-hidden bg-card">
                            <div className="h-[190px] w-full">
                              <MiniLocationPickerMap
                                value={
                                  typeof clientFormData.latitude === 'number' && typeof clientFormData.longitude === 'number'
                                    ? { lat: clientFormData.latitude, lng: clientFormData.longitude }
                                    : null
                                }
                                onChange={(point) => void onClientAddressChange(formatLatLng(point))}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {profileUiText.mapHint}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientPlanType" className="text-right">
                          Plan
                        </Label>
                        <div className="col-span-3">
                          <Select
                            value={clientFormData.planType}
                            onValueChange={(value) => {
                              const val = value as any
                              setClientFormData(prev => ({
                                ...prev,
                                planType: val,
                                dailyPrice: prev.assignedSetId ? prev.dailyPrice : getDailyPrice(val, prev.calories)
                              }))
                            }}
                          >
                            <SelectTrigger id="clientPlanType" className="w-full">
                              <SelectValue placeholder="Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PLAN_TYPES).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientSet" className="text-right">
                          Set
                        </Label>
                        <div className="col-span-3">
                          <Select
                            value={clientFormData.assignedSetId || '__auto__'}
                            onValueChange={(value) => {
                              setClientSelectedGroupId('')
                              setClientFormData((prev) => ({
                                ...prev,
                                assignedSetId: value === '__auto__' ? '' : value,
                              }))
                            }}
                          >
                            <SelectTrigger id="clientSet" className="w-full">
                              <SelectValue placeholder={profileUiText.autoSet} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__auto__">{profileUiText.autoSet}</SelectItem>
                              {availableSets.map((set) => (
                                <SelectItem key={set.id} value={set.id}>
                                  {set.name} {set.isActive ? profileUiText.active : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientGroup" className="text-right">
                          Group
                        </Label>
                        <div className="col-span-3">
                          <Select
                            value={clientSelectedGroupId || '__none__'}
                            onValueChange={(value) => {
                              if (value === '__none__') return
                              const g = clientGroupOptions.find((x) => x.id === value)
                              if (!g) return
                              setClientSelectedGroupId(g.id)
                              setClientFormData((prev) => ({
                                ...prev,
                                dailyPrice:
                                  typeof g.price === 'number' && Number.isFinite(g.price) ? g.price : prev.dailyPrice,
                              }))
                            }}
                            disabled={!clientAssignedSet || clientGroupOptions.length === 0}
                          >
                            <SelectTrigger id="clientGroup" className="w-full">
                              <SelectValue placeholder={clientAssignedSet ? 'Select group' : 'Select set first'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">{clientAssignedSet ? 'Select group' : 'Select set first'}</SelectItem>
                              {clientGroupOptions.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientPrice" className="text-right">
                          Price (UZS)
                        </Label>
                        <Input
                          id="clientPrice"
                          type="number"
                          value={clientSelectedGroup ? clientFormData.dailyPrice : ''}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, dailyPrice: parseInt(e.target.value) }))}
                          className="col-span-3"
                          disabled={!clientSelectedGroup}
                          placeholder={clientSelectedGroup ? undefined : 'Select group'}
                        />
                      </div>

                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientNotes" className="text-right">
                          Notes
                        </Label>
                        <Input
                          id="clientNotes"
                          value={clientFormData.notes || ''}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, notes: e.target.value }))}
                          className="col-span-3"
                          placeholder="Individual preferences..."
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-2">
                        <Label htmlFor="clientSpecialFeatures" className="text-right">
                          Special features
                        </Label>
                        <Input
                          id="clientSpecialFeatures"
                          value={clientFormData.specialFeatures}
                          onChange={(e) => setClientFormData(prev => ({ ...prev, specialFeatures: e.target.value }))}
                          className="col-span-3"
                          placeholder="Special requests (optional)"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-start gap-2">
                        <Label className="text-right pt-2">
                          Delivery days
                        </Label>
                        <div className="col-span-3 space-y-2">
                          <div className="text-xs text-muted-hierarchy mb-2">
                            Select weekdays for automatic order creation
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="monday"
                                checked={clientFormData.deliveryDays.monday}
                                onCheckedChange={(checked) => onDeliveryDayChange('monday', checked === true)}
                              />
                              <Label htmlFor="monday" className="text-sm">Monday</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="tuesday"
                                checked={clientFormData.deliveryDays.tuesday}
                                onCheckedChange={(checked) => onDeliveryDayChange('tuesday', checked === true)}
                              />
                              <Label htmlFor="tuesday" className="text-sm">Tuesday</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="wednesday"
                                checked={clientFormData.deliveryDays.wednesday}
                                onCheckedChange={(checked) => onDeliveryDayChange('wednesday', checked === true)}
                              />
                              <Label htmlFor="wednesday" className="text-sm">Wednesday</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="thursday"
                                checked={clientFormData.deliveryDays.thursday}
                                onCheckedChange={(checked) => onDeliveryDayChange('thursday', checked === true)}
                              />
                              <Label htmlFor="thursday" className="text-sm">Thursday</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="friday"
                                checked={clientFormData.deliveryDays.friday}
                                onCheckedChange={(checked) => onDeliveryDayChange('friday', checked === true)}
                              />
                              <Label htmlFor="friday" className="text-sm">Friday</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="saturday"
                                checked={clientFormData.deliveryDays.saturday}
                                onCheckedChange={(checked) => onDeliveryDayChange('saturday', checked === true)}
                              />
                              <Label htmlFor="saturday" className="text-sm">Saturday</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="sunday"
                                checked={clientFormData.deliveryDays.sunday}
                                onCheckedChange={(checked) => onDeliveryDayChange('sunday', checked === true)}
                              />
                              <Label htmlFor="sunday" className="text-sm">Sunday</Label>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 pt-2">
                            <Label htmlFor="defaultCourier" className="text-sm w-full">
                              Default courier:
                              <Select
                                value={clientFormData.defaultCourierId || '__none__'}
                                onValueChange={(value) => setClientFormData(prev => ({ ...prev, defaultCourierId: value === '__none__' ? '' : value }))}
                              >
                                <SelectTrigger id="defaultCourier" className="mt-1 w-full">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">None</SelectItem>
                                  {couriers.map((courier) => (
                                    <SelectItem key={courier.id} value={courier.id}>
                                      {courier.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                              id="autoOrdersEnabled"
                              checked={clientFormData.autoOrdersEnabled}
                              onCheckedChange={(checked) => setClientFormData(prev => ({ ...prev, autoOrdersEnabled: checked === true }))}
                            />
                            <Label htmlFor="autoOrdersEnabled" className="text-sm">
                              {profileUiText.enableAutoOrderCreation}
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    {clientError && (
                      <Alert className="mb-4">
                        <AlertDescription>{clientError}</AlertDescription>
                      </Alert>
                    )}
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateClientModalOpen(false)}>
                        {t.common.cancel}
                      </Button>
                      <Button type="submit" disabled={isCreatingClient}>
                        {isCreatingClient ? profileUiText.saving : (editingClientId ? t.common.save : t.admin.create)}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
        </CardHeader>
        <CardContent>
          {/* Clients Table */}
          <div className="rounded-xl">
            {isLoading ? (
              <TableSkeleton rows={8} columns={6} />
            ) : processedClients.length === 0 ? (
              <EmptyState
                title={t.admin.noClients || 'No clients found'}
                description={clientSearchTerm ? 'Try adjusting your search or filters' : 'Add your first client to get started'}
                action={
                  <Button size="sm" onClick={onOpenCreateClientModal} className="gap-1.5">
                    <Plus className="size-3.5" />
                    {profileUiText.createClient}
                  </Button>
                }
              />
            ) : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="dense-row-header">
                    <TableHead className="w-[44px] px-2 py-0">
                      <Checkbox
                        aria-label="Select all clients"
                        checked={
                          processedClients.length > 0 && selectedClients.size === processedClients.length
                            ? true
                            : selectedClients.size > 0
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            onSetSelectedClients(new Set(processedClients.map((c) => c.id)))
                          } else {
                            onSetSelectedClients(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <SortableTableHeader column={clientColumns[0]} sortState={clientSortStates['name'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[1]} sortState={clientSortStates['nickname'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[2]} sortState={clientSortStates['phone'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[3]} sortState={clientSortStates['balance'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0 text-right" />
                    <SortableTableHeader column={clientColumns[4]} sortState={clientSortStates['days'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0 text-right" />
                    <SortableTableHeader column={clientColumns[5]} sortState={clientSortStates['address'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[6]} sortState={clientSortStates['calories'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[7]} sortState={clientSortStates['orders'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0 text-center" />
                    <SortableTableHeader column={clientColumns[8]} sortState={clientSortStates['deliveryDays'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[9]} sortState={clientSortStates['status'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[10]} sortState={clientSortStates['notes'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <SortableTableHeader column={clientColumns[11]} sortState={clientSortStates['created'] ?? 'default'} onSortChange={handleClientSortChange} className="py-0" />
                    <TableHead className="py-0 text-right">{t.admin.table.actions}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {processedClients.map((client) => (
                    <TableRow key={client.id} className="dense-row">
                      <TableCell className="px-2 py-0">
                        <Checkbox
                          aria-label={`Select client ${client.name}`}
                          checked={selectedClients.has(client.id)}
                          onCheckedChange={() => onToggleClientSelection(client.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate py-0 font-medium text-primary-hierarchy" title={client.name}>
                        {client.name}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate py-0 text-muted-hierarchy" title={client.nickName || ''}>
                        {client.nickName || '-'}
                      </TableCell>
                      <TableCell className="py-0 text-secondary-hierarchy">{client.phone}</TableCell>
                      <TableCell className="py-0 text-right tabular-nums">
                        {(() => {
                          const finance = clientFinanceById[client.id]
                          if (!finance || !Number.isFinite(finance.balance)) return isClientFinanceLoading ? '...' : '-'
                          const balance = Math.round(finance.balance)
                          return (
                            <span className={balance < 0 ? 'font-medium text-danger' : 'font-medium text-success'}>
                              {balance.toLocaleString(dateLocale)} UZS
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="py-0 text-right tabular-nums">
                        {(() => {
                          const finance = clientFinanceById[client.id]
                          if (!finance || !Number.isFinite(finance.balance)) return isClientFinanceLoading ? '...' : '-'
                          const daily = finance.dailyPrice || client.dailyPrice || 0
                          if (!daily || daily <= 0) return '-'
                          const days = Math.floor(finance.balance / daily)
                          return (
                            <span className={days < 0 ? 'font-medium text-danger' : 'font-medium text-muted-hierarchy'}>
                              {days}
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate py-0 text-secondary-hierarchy" title={client.address}>
                        {client.address}
                      </TableCell>
                      <TableCell className="py-0 text-secondary-hierarchy">{client.calories} kcal</TableCell>
                      <TableCell className="py-0 text-center">
                        {(() => {
                          const clientOrders = orders.filter((o) => o.customerPhone === client.phone)
                          if (clientOrders.length === 0) return <span className="text-muted-hierarchy">-</span>
                          const delivered = clientOrders.filter((o) => o.orderStatus === 'DELIVERED').length
                          const active = clientOrders.filter((o) => ['NEW','PENDING','IN_PROCESS','IN_DELIVERY','PAUSED'].includes(o.orderStatus)).length
                          const failed = clientOrders.length - delivered - active
                          return (
                            <div className="flex items-center justify-center gap-2 text-xs">
                              {delivered > 0 && <span className="font-bold text-success" title="Delivered">{delivered}</span>}
                              {failed > 0 && <span className="font-bold text-danger" title="Failed/Not Delivered">{failed}</span>}
                              {active > 0 && <span className="font-bold text-warning" title="Active">{active}</span>}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="py-0">
                        <div className="text-xs flex flex-wrap gap-0.5">
                          {client.deliveryDays?.monday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Mon</Badge>}
                          {client.deliveryDays?.tuesday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Tue</Badge>}
                          {client.deliveryDays?.wednesday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Wed</Badge>}
                          {client.deliveryDays?.thursday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Thu</Badge>}
                          {client.deliveryDays?.friday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Fri</Badge>}
                          {client.deliveryDays?.saturday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Sat</Badge>}
                          {client.deliveryDays?.sunday && <Badge variant="neutral" className="text-[10px] px-1 py-0">Sun</Badge>}
                          {(!client.deliveryDays || Object.values(client.deliveryDays).every((day) => !day)) && (
                            <span className="text-muted-hierarchy">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <EntityStatusBadge
                          isActive={client.isActive}
                          activeLabel={t.admin.table.active}
                          inactiveLabel={t.admin.table.paused}
                          inactiveTone="danger"
                          showDot
                          onClick={() => onToggleClientStatus(client.id, client.isActive)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate py-0 text-muted-hierarchy" title={client.specialFeatures || ''}>
                        {client.specialFeatures || '-'}
                      </TableCell>
                      <TableCell className="py-0 text-muted-hierarchy">{new Date(client.createdAt).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell className="py-0 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditClient(client)}>
                          <Edit className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {processedClients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} className="h-24 text-center">
                        <div className="empty-state py-0">
                          <p className="empty-state-title">{language === 'ru' ? 'Клиенты не найдены' : language === 'uz' ? 'Mijozlar topilmadi' : 'No clients found'}</p>
                          <p className="empty-state-desc">{language === 'ru' ? 'Измените фильтры или поисковый запрос.' : language === 'uz' ? 'Filtrlar yoki qidiruv so\'rovini o\'zgartiring.' : 'Adjust the filters or search query.'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Dialogs for client actions */}
      <AlertDialog open={isPauseClientsDialogOpen} onOpenChange={setIsPauseClientsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.toasts.pauseSelectedClients}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.toasts.pauseClientsConfirmation.replace('{count}', String(selectedClients.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutatingClients}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutatingClients}
              onClick={() => void onPauseSelectedClients({ skipConfirm: true })}
            >
              {isMutatingClients ? t.common.loading : t.admin.pause}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResumeClientsDialogOpen} onOpenChange={setIsResumeClientsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.toasts.resumeSelectedClients}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.toasts.resumeClientsConfirmation.replace('{count}', String(selectedClients.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutatingClients}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutatingClients}
              onClick={() => void onResumeSelectedClients({ skipConfirm: true })}
            >
              {isMutatingClients ? t.common.loading : t.admin.resume}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteClientsDialogOpen} onOpenChange={setIsDeleteClientsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.toasts.deleteSelectedClients}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.toasts.deleteClientsConfirmation.replace('{count}', String(selectedClients.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutatingClients}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutatingClients}
              onClick={() => void onDeleteSelectedClients({ skipConfirm: true })}
            >
              {isMutatingClients ? t.common.loading : t.admin.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
