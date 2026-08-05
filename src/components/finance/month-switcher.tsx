import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinance } from '@/lib/finance-store'
import { formatMonthLong } from '@/lib/format'

export function MonthSwitcher() {
  const { month, goToMonth } = useFinance()

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        onClick={() => goToMonth(-1)}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-40 text-center text-sm font-medium tabular-nums">
        {formatMonthLong(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full"
        onClick={() => goToMonth(1)}
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
