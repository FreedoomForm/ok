import dynamic from 'next/dynamic'
import { useLanguage } from '@/contexts/LanguageContext'
import type { DateRange } from 'react-day-picker'
import type { Dispatch, FormEvent, SetStateAction } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CalendarRangeSelector } from '@/components/admin/dashboard/shared/CalendarRangeSelector'
import { Checkbox } from '@/components/ui/checkbox'
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
import { PLAN_TYPES, getDailyPrice } from '@/lib/menuData'
import { formatLatLng } from '@/lib/geo'
import type {
  ClientFormData,
  DeliveryDays,
} from '@/components/admin/dashboard/types'
const MiniLocationPickerMap = dynamic(
  () => import('@/components/admin/dashboard/shared/MiniLocationPickerMap').then((module) => module.MiniLocationPickerMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse border bg-muted/30" /> },
)

export interface ClientEditorGroupOption {
  id: string
  name: string
  price: number | null
}

export interface ClientEditorSet {
  id: string
  name: string
  isActive?: boolean
}

export interface ClientEditorText {
  createTitle: string
  editTitle: string
  createDescription: string
  editDescription: string
  nickname: string
  nicknamePlaceholder: string
  phoneFormat: string
  mapLink: string
  map: string
  mapHint: string
  autoSet: string
  active: string
  enableAutoOrderCreation: string
  saving: string
  cancel: string
  save: string
  create: string
}

export interface ClientEditorCourierOption {
  id: string
  name: string
  isActive?: boolean
}

export interface ClientEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingClientId: string | null
  clientFormData: ClientFormData
  setClientFormData: Dispatch<SetStateAction<ClientFormData>>
  clientSelectedGroupId: string
  setClientSelectedGroupId: (id: string) => void
  clientGroupOptions: ClientEditorGroupOption[]
  clientSelectedGroup: ClientEditorGroupOption | null
  availableSets: ClientEditorSet[]
  clientError: string
  isCreatingClient: boolean
  texts: ClientEditorText
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  onAddressChange: (value: string) => void | Promise<void>
  onDeliveryDayChange: (day: keyof DeliveryDays, checked: boolean) => void
  // C6 / R8: the contract window — courier, payment flag and the period
  // picked in a calendar — appears in the create flow only.
  courierOptions?: ClientEditorCourierOption[]
  contractCourierId?: string
  onContractCourierChange?: (id: string) => void
  contractPaid?: boolean
  onContractPaidChange?: (paid: boolean) => void
  contractPeriod?: DateRange
  onContractPeriodChange?: (range: DateRange | undefined) => void
}

const DELIVERY_DAYS: Array<[keyof DeliveryDays, string]> = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
]

export function ClientEditorDialog({
  open,
  onOpenChange,
  editingClientId,
  clientFormData,
  setClientFormData,
  clientSelectedGroupId,
  setClientSelectedGroupId,
  clientGroupOptions,
  clientSelectedGroup,
  availableSets,
  clientError,
  isCreatingClient,
  texts,
  onSubmit,
  onAddressChange,
  onDeliveryDayChange,
  courierOptions = [],
  contractCourierId = '',
  onContractCourierChange,
  contractPaid = false,
  onContractPaidChange,
  contractPeriod,
  onContractPeriodChange,
}: ClientEditorDialogProps) {
  const { language } = useLanguage()
  const contractLabels = language === 'uz'
    ? { courier: 'Mas’ul kuryer', paid: 'To‘langan', unpaid: 'To‘lanmagan', period: 'Shartnoma davri', periodHint: 'Kalendar orqali davrni tanlang' }
    : { courier: 'Курьер-ответственный', paid: 'Оплачен', unpaid: 'Не оплачен', period: 'Период контракта', periodHint: 'Выберите период в календаре' }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingClientId ? texts.editTitle : texts.createTitle}</DialogTitle>
          <DialogDescription>
            {editingClientId ? texts.editDescription : texts.createDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientName" className="text-right">{language === 'uz' ? 'Ism' : 'Имя'}</Label>
              <Input
                id="clientName"
                value={clientFormData.name}
                onChange={(event) => setClientFormData((previous) => ({ ...previous, name: event.target.value }))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientNickName" className="text-right">{texts.nickname}</Label>
              <Input
                id="clientNickName"
                value={clientFormData.nickName}
                onChange={(event) => setClientFormData((previous) => ({ ...previous, nickName: event.target.value }))}
                className="col-span-3"
                placeholder={texts.nicknamePlaceholder}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientPhone" className="text-right">Phone</Label>
              <div className="col-span-3">
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="+998 XX XXX XX XX"
                  value={clientFormData.phone}
                  onChange={(event) => setClientFormData((previous) => ({ ...previous, phone: event.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">{texts.phoneFormat}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientAddress" className="text-right">Address</Label>
              <Input
                id="clientAddress"
                value={clientFormData.address}
                onChange={(event) => setClientFormData((previous) => ({ ...previous, address: event.target.value }))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="googleMapsLink" className="text-right">{texts.mapLink}</Label>
              <Input
                id="googleMapsLink"
                placeholder="https://maps.google.com/..."
                value={clientFormData.googleMapsLink}
                onChange={(event) => void onAddressChange(event.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-2">
              <Label className="text-right">{texts.map}</Label>
              <div className="col-span-3 space-y-2">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="h-[190px] w-full">
                    <MiniLocationPickerMap
                      value={
                        typeof clientFormData.latitude === 'number' && typeof clientFormData.longitude === 'number'
                          ? { lat: clientFormData.latitude, lng: clientFormData.longitude }
                          : null
                      }
                      onChange={(point) => void onAddressChange(formatLatLng(point))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{texts.mapHint}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientPlanType" className="text-right">Plan</Label>
              <div className="col-span-3">
                <Select
                  value={clientFormData.planType}
                  onValueChange={(value) => {
                    const planType = value as ClientFormData['planType']
                    setClientFormData((previous) => ({
                      ...previous,
                      planType,
                      dailyPrice: previous.assignedSetId ? previous.dailyPrice : getDailyPrice(planType, previous.calories),
                    }))
                  }}
                >
                  <SelectTrigger id="clientPlanType" className="w-full"><SelectValue placeholder={language === 'uz' ? 'Tarif' : 'План'} /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientSet" className="text-right">Set</Label>
              <div className="col-span-3">
                <Select
                  value={clientFormData.assignedSetId || '__auto__'}
                  onValueChange={(value) => {
                    setClientSelectedGroupId('')
                    setClientFormData((previous) => ({
                      ...previous,
                      assignedSetId: value === '__auto__' ? '' : value,
                    }))
                  }}
                >
                  <SelectTrigger id="clientSet" className="w-full"><SelectValue placeholder={texts.autoSet} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">{texts.autoSet}</SelectItem>
                    {availableSets.map((set) => (
                      <SelectItem key={set.id} value={set.id}>{set.name} {set.isActive ? texts.active : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientGroup" className="text-right">Group</Label>
              <div className="col-span-3">
                <Select
                  value={clientSelectedGroupId || '__none__'}
                  onValueChange={(value) => {
                    if (value === '__none__') return
                    const group = clientGroupOptions.find((option) => option.id === value)
                    if (!group) return
                    setClientSelectedGroupId(group.id)
                    setClientFormData((previous) => ({
                      ...previous,
                      dailyPrice: typeof group.price === 'number' && Number.isFinite(group.price) ? group.price : previous.dailyPrice,
                    }))
                  }}
                  disabled={!clientFormData.assignedSetId || clientGroupOptions.length === 0}
                >
                  <SelectTrigger id="clientGroup" className="w-full">
                    <SelectValue placeholder={clientFormData.assignedSetId ? 'Select group' : 'Select set first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{clientFormData.assignedSetId ? 'Select group' : 'Select set first'}</SelectItem>
                    {clientGroupOptions.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientPrice" className="text-right">Price (UZS)</Label>
              <Input
                id="clientPrice"
                type="number"
                value={clientSelectedGroup ? clientFormData.dailyPrice : ''}
                onChange={(event) => setClientFormData((previous) => ({ ...previous, dailyPrice: Number.parseInt(event.target.value, 10) }))}
                className="col-span-3"
                disabled={!clientSelectedGroup}
                placeholder={clientSelectedGroup ? undefined : 'Select group'}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientNotes" className="text-right">Notes</Label>
              <Input
                id="clientNotes"
                value={clientFormData.notes}
                onChange={(event) => setClientFormData((previous) => ({ ...previous, notes: event.target.value }))}
                className="col-span-3"
                placeholder="Individual preferences..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="clientSpecialFeatures" className="text-right">Special features</Label>
              <Input
                id="clientSpecialFeatures"
                value={clientFormData.specialFeatures}
                onChange={(event) => setClientFormData((previous) => ({ ...previous, specialFeatures: event.target.value }))}
                className="col-span-3"
                placeholder="Special requests (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-2">
              <Label className="pt-2 text-right">{language === 'uz' ? 'Yetkazish kunlari' : 'Дни доставки'}</Label>
              <div className="col-span-3 space-y-2">
                <div className="mb-2 text-xs text-slate-500">{language === 'uz' ? 'Avtomatik buyurtmalar uchun hafta kunlarini tanlang' : 'Выберите дни недели для автоматического создания заказов'}</div>
                <div className="grid grid-cols-2 gap-2">
                  {DELIVERY_DAYS.map(([day, label]) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={clientFormData.deliveryDays[day]}
                        onCheckedChange={(checked) => onDeliveryDayChange(day, checked === true)}
                      />
                      <Label htmlFor={day} className="text-sm">{label}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="autoOrdersEnabled"
                    checked={clientFormData.autoOrdersEnabled}
                    onCheckedChange={(checked) => setClientFormData((previous) => ({ ...previous, autoOrdersEnabled: checked === true }))}
                  />
                  <Label htmlFor="autoOrdersEnabled" className="text-sm">{texts.enableAutoOrderCreation}</Label>
                </div>
              </div>
            </div>
            {!editingClientId ? (
              <div className="grid grid-cols-4 items-start gap-2" data-reference-contract-window="true">
                <Label className="pt-2 text-right">{contractLabels.courier}</Label>
                <div className="col-span-3 space-y-2">
                  <Select value={contractCourierId || '__none__'} onValueChange={(value) => onContractCourierChange?.(value === '__none__' ? '' : value)}>
                    <SelectTrigger className="w-full" data-reference-contract-courier="true"><SelectValue placeholder={contractLabels.courier} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {courierOptions.filter((courier) => courier.isActive !== false).map((courier) => (
                        <SelectItem key={courier.id} value={courier.id}>{courier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={contractPaid}
                        onChange={(event) => onContractPaidChange?.(event.target.checked)}
                        data-reference-contract-paid="true"
                      />
                      {contractPaid ? contractLabels.paid : contractLabels.unpaid}
                    </label>
                  </div>
                  <div className="text-xs text-muted-foreground">{contractLabels.period}</div>
                  <CalendarRangeSelector
                    value={contractPeriod}
                    onChange={(next) => onContractPeriodChange?.(next)}
                    locale={language === 'uz' ? 'uz-UZ' : 'ru-RU'}
                    uiText={{
                      calendar: contractLabels.period,
                      today: language === 'uz' ? 'Bugun' : 'Сегодня',
                      thisWeek: language === 'uz' ? 'Bu hafta' : 'Эта неделя',
                      thisMonth: language === 'uz' ? 'Bu oy' : 'Этот месяц',
                      clearRange: language === 'uz' ? 'Tozalash' : 'Очистить',
                      allTime: language === 'uz' ? 'Davr tanlanmagan' : 'Период не выбран',
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{contractLabels.periodHint}</p>
                </div>
              </div>
            ) : null}
          </div>
          {clientError && <Alert className="mb-4"><AlertDescription>{clientError}</AlertDescription></Alert>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{texts.cancel}</Button>
            <Button type="submit" disabled={isCreatingClient}>{isCreatingClient ? texts.saving : (editingClientId ? texts.save : texts.create)}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
