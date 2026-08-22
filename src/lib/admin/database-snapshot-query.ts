export type SnapshotDateRange = {
  start: Date
  end: Date
}

export class InvalidSnapshotDateRangeError extends Error {
  constructor() {
    super('Invalid snapshot date range')
    this.name = 'InvalidSnapshotDateRangeError'
  }
}

export function parseSnapshotDateRange(startParam: string | null, endParam: string | null): SnapshotDateRange | null {
  if (!startParam && !endParam) return null
  if (!startParam || !endParam) throw new InvalidSnapshotDateRangeError()

  const start = new Date(startParam)
  const end = new Date(endParam)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new InvalidSnapshotDateRangeError()
  }

  return { start, end }
}
