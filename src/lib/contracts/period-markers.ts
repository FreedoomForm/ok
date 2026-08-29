export interface ContractPeriodMarker {
  id: string
  startDate: string
  endDate: string
  status: string
  color?: string | null
  courierName?: string | null
}

export interface PeriodFirstDayMarker {
  markerId: string
  date: string
  color: string | null
  courierName: string | null
}

const ENABLED_PERIOD_STATUS = 'ENABLED'

/**
 * Returns one marker per enabled contract period whose first day falls inside
 * the visible calendar window and whose effective day state is enabled on that
 * date. Pure: neither the marker list nor the date window is mutated.
 */
export function collectEnabledPeriodFirstDays(
  markers: readonly ContractPeriodMarker[],
  dates: readonly string[],
  isEffectiveOn: (marker: ContractPeriodMarker, date: string) => boolean,
): PeriodFirstDayMarker[] {
  if (!Array.isArray(markers) || markers.length === 0) return []
  if (!Array.isArray(dates) || dates.length === 0) return []
  const visibleDates = new Set(dates)
  const result: PeriodFirstDayMarker[] = []
  for (const marker of markers) {
    if (!marker || marker.status !== ENABLED_PERIOD_STATUS) continue
    const startDate = typeof marker.startDate === 'string' ? marker.startDate : ''
    if (!startDate || !visibleDates.has(startDate)) continue
    if (!isEffectiveOn(marker, startDate)) continue
    result.push({
      markerId: marker.id,
      date: startDate,
      color: marker.color ?? null,
      courierName: marker.courierName ?? null,
    })
  }
  return result
}
