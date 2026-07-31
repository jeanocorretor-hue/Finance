const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MONTHS_PT_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/** "2026-07" -> "Julho 2026" */
export function formatMonthLong(mesRef: string): string {
  const [year, month] = mesRef.split('-').map(Number)
  return `${MONTHS_PT[month - 1]} ${year}`
}

/** "2026-07" -> "jul/26" */
export function formatMonthShort(mesRef: string): string {
  const [year, month] = mesRef.split('-').map(Number)
  return `${MONTHS_PT_SHORT[month - 1]}/${String(year).slice(-2)}`
}

/** Shift a "YYYY-MM" reference by a number of months. */
export function addMonths(mesRef: string, delta: number): string {
  const [year, month] = mesRef.split('-').map(Number)
  const base = new Date(Date.UTC(year, month - 1 + delta, 1))
  const y = base.getUTCFullYear()
  const m = String(base.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}
