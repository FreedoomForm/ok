export type PeriodIngredient = { amount: number; unit: string }

export function calculatePeriodIngredients<TDate>(
  dates: readonly TDate[],
  calculateForDate: (date: TDate, allowManualOverrides: boolean) => Map<string, PeriodIngredient>,
): Map<string, PeriodIngredient> {
  const total = new Map<string, PeriodIngredient>()
  dates.forEach((date, index) => {
    const daily = calculateForDate(date, dates.length === 1 && index === 0)
    daily.forEach(({ amount, unit }, name) => {
      const existing = total.get(name)
      total.set(name, existing
        ? { amount: Math.round((existing.amount + amount) * 10) / 10, unit: existing.unit }
        : { amount: Math.round(amount * 10) / 10, unit })
    })
  })
  return total
}
